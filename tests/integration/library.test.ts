import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { register } from "@/modules/auth";
import { issueDownload, redeemDownloadToken } from "@/modules/delivery";
import { saveReview } from "@/modules/engagement";
import { libraryEntries, setLibraryFlag } from "@/modules/library";
import { readerFile, readerManifest, saveProgress } from "@/modules/reader";
import { setSetting } from "@/modules/settings";
import { storage } from "@/modules/storage";
import { cookieJar } from "../helpers/cookie-jar";

const ctx = { ip: "203.0.113.20", userAgent: "vitest", requestId: "t" };
const KEYS: string[] = [];
const PDF = Buffer.from("%PDF-1.4\n% KRM test file\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");

async function ownedBook(userId: string, opts: { file?: boolean; title?: string } = {}) {
  const key = `test/${Math.random().toString(36).slice(2)}.pdf`;
  if (opts.file !== false) {
    await storage().put("private", key, PDF, "application/pdf");
    KEYS.push(key);
  }
  const product = await db.product.create({
    data: { slug: `book-${Math.random().toString(36).slice(2, 8)}`, title: opts.title ?? "Test Book", type: "book", status: "published", publishedAt: new Date(), tocEntries: { create: [{ position: 0, title: "Opening", pageNumber: 1 }] } },
  });
  const v1 = await db.productVersion.create({
    data: { productId: product.id, version: "1.0", status: "published", pageCount: 40, files: { create: { kind: "pdf", storageKey: key, fileName: "test-book.pdf", sizeBytes: PDF.length, mime: "application/pdf", pageCount: 40 } } },
  });
  await db.product.update({ where: { id: product.id }, data: { currentVersionId: v1.id } });
  const item = await db.libraryItem.create({ data: { userId, productId: product.id, source: "purchase", ownedVersionId: v1.id } });
  return { product, item, v1 };
}

async function user(email: string, verified = true) {
  cookieJar.clear();
  const { userId } = await register({ name: "Lib Reader", email, password: "readmore42" }, ctx);
  if (verified) await db.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date() } });
  return userId;
}

afterAll(async () => {
  for (const key of KEYS) await storage().delete("private", key);
});

describe("downloads", () => {
  let userId: string;
  beforeEach(async () => {
    userId = await user("owner@example.com");
  });

  it("issues a single-use, user-bound token and counts it against the limit", async () => {
    const { item } = await ownedBook(userId);
    const issued = await issueDownload({ userId, emailVerified: true, libraryItemId: item.id });
    expect(issued).toMatchObject({ used: 1, limit: 5, external: false, fileName: "test-book.pdf" });
    const token = issued.url.split("/").pop()!;
    expect(await redeemDownloadToken(token, "someone-else")).toEqual({ ok: false, reason: "unauthorized" });
    const first = await redeemDownloadToken(token, userId);
    expect(first.ok).toBe(true);
    if (first.ok) first.object.body.destroy();
    expect(await redeemDownloadToken(token, userId)).toEqual({ ok: false, reason: "used" });
    expect(await db.downloadEvent.count({ where: { userId, status: "completed" } })).toBe(1);
  });

  it("refuses non-owners, revoked items, unverified emails, missing files and the limit", async () => {
    const { item } = await ownedBook(userId);
    const otherId = await user("other@example.com");
    await expect(issueDownload({ userId: otherId, emailVerified: true, libraryItemId: item.id })).rejects.toMatchObject({ code: "DOWNLOAD_UNAUTHORIZED" });
    await expect(issueDownload({ userId, emailVerified: false, libraryItemId: item.id })).rejects.toMatchObject({ code: "EMAIL_NOT_VERIFIED" });

    const missing = await ownedBook(userId, { file: false });
    await expect(issueDownload({ userId, emailVerified: true, libraryItemId: missing.item.id })).rejects.toMatchObject({ code: "FILE_UNAVAILABLE" });

    await setSetting("downloads.limitPerProduct", 2);
    await issueDownload({ userId, emailVerified: true, libraryItemId: item.id });
    await issueDownload({ userId, emailVerified: true, libraryItemId: item.id });
    await expect(issueDownload({ userId, emailVerified: true, libraryItemId: item.id })).rejects.toMatchObject({ code: "DOWNLOAD_LIMIT_REACHED" });
    expect(await db.downloadEvent.count({ where: { userId, status: "denied" } })).toBeGreaterThanOrEqual(3);

    await db.libraryItem.update({ where: { id: item.id }, data: { revokedAt: new Date() } });
    await expect(issueDownload({ userId, emailVerified: true, libraryItemId: item.id })).rejects.toMatchObject({ code: "DOWNLOAD_UNAUTHORIZED" });
  });

  it("rejects an expired token and a token whose library item was revoked", async () => {
    const { item } = await ownedBook(userId);
    const issued = await issueDownload({ userId, emailVerified: true, libraryItemId: item.id });
    const [eventId] = issued.url.split("/").pop()!.split(".");
    const { signDownloadToken } = await import("@/modules/delivery");
    expect(await redeemDownloadToken(signDownloadToken(eventId!, Date.now() - 1000), userId)).toEqual({ ok: false, reason: "expired" });
    await db.libraryItem.update({ where: { id: item.id }, data: { revokedAt: new Date() } });
    expect(await redeemDownloadToken(issued.url.split("/").pop()!, userId)).toEqual({ ok: false, reason: "unauthorized" });
  });

  it("clears 'update available' once the latest version is downloaded", async () => {
    const { product, item } = await ownedBook(userId);
    const key = `test/${Math.random().toString(36).slice(2)}.pdf`;
    await storage().put("private", key, PDF, "application/pdf");
    KEYS.push(key);
    const v2 = await db.productVersion.create({ data: { productId: product.id, version: "2.0", status: "published", files: { create: { kind: "pdf", storageKey: key, fileName: "v2.pdf", mime: "application/pdf" } } } });
    await db.product.update({ where: { id: product.id }, data: { currentVersionId: v2.id } });
    expect((await libraryEntries(userId, { section: "updates" })).map((e) => e.id)).toEqual([item.id]);
    await issueDownload({ userId, emailVerified: true, libraryItemId: item.id });
    expect(await libraryEntries(userId, { section: "updates" })).toHaveLength(0);
  });
});

describe("reader", () => {
  it("serves owners only, supports ranges and resumes from saved progress", async () => {
    const userId = await user("reader@example.com");
    const { item } = await ownedBook(userId);
    const manifest = await readerManifest(userId, true, item.id);
    expect(manifest).toMatchObject({ readable: true, lastPage: 1, totalPages: 40, fileUrl: `/api/v1/reader/${item.id}/file` });
    const ranged = await readerFile(userId, true, item.id, "bytes=0-7");
    expect(ranged.status).toBe(206);
    expect(ranged.object.range).toMatchObject({ start: 0, end: 7, total: PDF.length });
    ranged.object.body.destroy();

    await saveProgress(userId, item.id, { page: 12, total: 40, chapter: "Opening" });
    expect((await readerManifest(userId, true, item.id)).lastPage).toBe(12);
    const [entry] = await libraryEntries(userId, { section: "reading" });
    expect(entry).toMatchObject({ progress: 30, lastChapter: "Opening" });

    const stranger = await user("stranger@example.com");
    await expect(readerFile(stranger, true, item.id, null)).rejects.toMatchObject({ code: "DOWNLOAD_UNAUTHORIZED" });
    await expect(saveProgress(stranger, item.id, { page: 1, total: 40 })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("library sections and reviews", () => {
  it("files favourites and archived items into their sections", async () => {
    const userId = await user("shelf@example.com");
    const a = await ownedBook(userId, { title: "Alpha" });
    const b = await ownedBook(userId, { title: "Beta" });
    await setLibraryFlag(userId, a.item.id, "favorite", true);
    await setLibraryFlag(userId, b.item.id, "archive", true);
    expect((await libraryEntries(userId)).map((e) => e.title)).toEqual(["Alpha"]);
    expect((await libraryEntries(userId, { section: "favorites" })).map((e) => e.title)).toEqual(["Alpha"]);
    expect((await libraryEntries(userId, { section: "archived" })).map((e) => e.title)).toEqual(["Beta"]);
    await expect(setLibraryFlag(await user("nosy@example.com"), a.item.id, "favorite", false)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("lets only owners review, moderates by default and counts approved reviews only", async () => {
    const userId = await user("critic@example.com");
    const { product } = await ownedBook(userId);
    const outsider = await user("outsider@example.com");
    await expect(saveReview(outsider, product.id, { rating: 5, body: "Never read it but love it." })).rejects.toMatchObject({ code: "FORBIDDEN" });

    const review = await saveReview(userId, product.id, { rating: 4, title: "Useful", body: "Clear, practical and well organised." });
    expect(review).toMatchObject({ status: "pending", isVerifiedPurchase: true });
    expect((await db.product.findUniqueOrThrow({ where: { id: product.id } })).ratingCount).toBe(0);

    await setSetting("reviews.requireModeration", false);
    await saveReview(userId, product.id, { rating: 5, body: "Even better on a second read." });
    const after = await db.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(after.ratingCount).toBe(1);
    expect(Number(after.ratingAvg)).toBe(5);
    expect(await db.review.count({ where: { productId: product.id } })).toBe(1);
  });
});

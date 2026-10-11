import "server-only";
import { z } from "zod";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { getSetting } from "@/modules/settings";
import { storage, type StoredObject } from "@/modules/storage";
import { parseRange } from "./range";

export const progressInput = z.object({ page: z.int().min(1).max(100_000), total: z.int().min(1).max(100_000), chapter: z.string().max(200).nullish() });
export const bookmarkInput = z.object({ page: z.int().min(1).max(100_000), label: z.string().trim().max(120).nullish() });

/** Reader access = an active library item for this user, plus a verified email when downloads require it. */
async function readableItem(userId: string, emailVerified: boolean, libraryItemId: string) {
  const item = await db.libraryItem.findFirst({
    where: { id: libraryItemId, userId, revokedAt: null },
    include: {
      progress: true,
      product: {
        select: {
          id: true,
          title: true,
          type: true,
          currentVersion: { select: { id: true, version: true, pageCount: true, files: { orderBy: { createdAt: "asc" }, take: 1 } } },
          tocEntries: { orderBy: { position: "asc" }, select: { id: true, title: true, pageNumber: true, parentId: true } },
        },
      },
    },
  });
  if (!item) throw new AppError("DOWNLOAD_UNAUTHORIZED", "This title isn't in your library.");
  if (!emailVerified && (await getSetting("downloads.requireVerifiedEmail"))) throw new AppError("EMAIL_NOT_VERIFIED", "Please verify your email to read your library.");
  return item;
}

export async function readerManifest(userId: string, emailVerified: boolean, libraryItemId: string) {
  const item = await readableItem(userId, emailVerified, libraryItemId);
  const file = item.product.currentVersion?.files[0];
  const readable = Boolean(file?.storageKey && file.mime === "application/pdf");
  const bookmarks = await db.bookmark.findMany({ where: { libraryItemId: item.id }, orderBy: { page: "asc" }, select: { id: true, page: true, label: true } });
  await db.libraryItem.update({ where: { id: item.id }, data: { lastOpenedAt: new Date() } });
  return {
    libraryItemId: item.id,
    productId: item.product.id,
    title: item.product.title,
    version: item.product.currentVersion?.version ?? null,
    readable,
    fileUrl: readable ? `/api/v1/reader/${item.id}/file` : null,
    totalPages: item.product.currentVersion?.pageCount ?? file?.pageCount ?? null,
    lastPage: item.progress?.lastPage ?? 1,
    toc: item.product.tocEntries.filter((t) => t.pageNumber != null).map((t) => ({ id: t.id, title: t.title, page: t.pageNumber!, nested: Boolean(t.parentId) })),
    bookmarks,
  };
}

export type ReaderManifest = Awaited<ReturnType<typeof readerManifest>>;

/** Protected range-request stream for pdf.js (SECURITY §8): never cached, never public. */
export async function readerFile(userId: string, emailVerified: boolean, libraryItemId: string, rangeHeader: string | null): Promise<{ object: StoredObject; status: 200 | 206 }> {
  const item = await readableItem(userId, emailVerified, libraryItemId);
  const file = item.product.currentVersion?.files[0];
  if (!file?.storageKey || file.mime !== "application/pdf") throw new AppError("FILE_UNAVAILABLE", "This title can't be opened in the reader.");
  const range = parseRange(rangeHeader);
  const object = await storage().get("private", file.storageKey, range ?? undefined).catch(() => null);
  if (!object) throw new AppError("FILE_UNAVAILABLE", "This file is temporarily unavailable.");
  return { object, status: range ? 206 : 200 };
}

export async function saveProgress(userId: string, libraryItemId: string, input: z.infer<typeof progressInput>): Promise<void> {
  const item = await db.libraryItem.findFirst({ where: { id: libraryItemId, userId, revokedAt: null }, select: { id: true } });
  if (!item) throw new AppError("NOT_FOUND", "This title isn't in your library.");
  const page = Math.min(input.page, input.total);
  await db.$transaction([
    db.readingProgress.upsert({
      where: { libraryItemId: item.id },
      create: { libraryItemId: item.id, lastPage: page, totalPages: input.total, lastChapterRef: input.chapter ?? null },
      update: { lastPage: page, totalPages: input.total, lastChapterRef: input.chapter ?? null },
    }),
    db.libraryItem.update({ where: { id: item.id }, data: { lastOpenedAt: new Date() } }),
  ]);
}

export async function addBookmark(userId: string, libraryItemId: string, input: z.infer<typeof bookmarkInput>) {
  const item = await db.libraryItem.findFirst({ where: { id: libraryItemId, userId, revokedAt: null }, select: { id: true } });
  if (!item) throw new AppError("NOT_FOUND", "This title isn't in your library.");
  return db.bookmark.upsert({
    where: { libraryItemId_page: { libraryItemId: item.id, page: input.page } },
    create: { libraryItemId: item.id, page: input.page, label: input.label ?? null },
    update: { label: input.label ?? null },
    select: { id: true, page: true, label: true },
  });
}

export async function removeBookmark(userId: string, libraryItemId: string, page: number): Promise<void> {
  await db.bookmark.deleteMany({ where: { page, libraryItem: { id: libraryItemId, userId } } });
}

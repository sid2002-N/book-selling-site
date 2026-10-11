import "server-only";
import { decrypt } from "@/lib/crypto";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/rate-limit";
import { requestContext } from "@/lib/request";
import { productHref, TYPE_LABEL, type ProductTypeKey } from "@/modules/catalog/types";
import { getSetting } from "@/modules/settings";
import { storage, type StoredObject } from "@/modules/storage";
import { downloadDecision, downloadState, type DownloadState } from "./policy";
import { readDownloadToken, signDownloadToken } from "./tokens";

const DENIAL_MESSAGE = {
  DOWNLOAD_UNAUTHORIZED: "This download isn't available on your account.",
  EMAIL_NOT_VERIFIED: "Please verify your email to download your files.",
  FILE_UNAVAILABLE: "This file is temporarily unavailable. Please try again later or contact support.",
  DOWNLOAD_LIMIT_REACHED: "You've reached the download limit for this product. Contact support if you need more downloads.",
} as const;

const COUNTED = ["issued", "completed"] as const;

async function usedDownloads(userId: string, libraryItemId: string): Promise<number> {
  return db.downloadEvent.count({ where: { userId, libraryItemId, status: { in: [...COUNTED] } } });
}

export type IssuedDownload = { url: string; fileName: string; sizeBytes: number; expiresAt: string; used: number; limit: number; external: boolean };

/**
 * Issues one download (API §3.6): entitlement re-checked server-side every time, counted
 * against the per-product limit, logged, and delivered via a short-lived signed URL.
 */
export async function issueDownload(input: { userId: string; emailVerified: boolean; libraryItemId: string }): Promise<IssuedDownload> {
  await enforceRateLimit("downloadIssue", input.userId);
  const ctx = await requestContext();
  const item = await db.libraryItem.findFirst({
    where: { id: input.libraryItemId, userId: input.userId },
    include: { product: { select: { slug: true, currentVersionId: true, currentVersion: { select: { id: true, version: true, files: { orderBy: { createdAt: "asc" }, take: 1 } } } } } },
  });
  const file = item?.product.currentVersion?.files[0] ?? null;
  const [limit, ttl, requireVerifiedEmail] = await Promise.all([getSetting("downloads.limitPerProduct"), getSetting("downloads.signedUrlTtlSeconds"), getSetting("downloads.requireVerifiedEmail")]);
  const used = item ? await usedDownloads(input.userId, item.id) : 0;
  const hasFile = Boolean(file && (file.storageKey ? await storage().exists("private", file.storageKey).catch(() => false) : file.externalUrlEncrypted));
  const verdict = downloadDecision({ owned: Boolean(item), revoked: Boolean(item?.revokedAt), emailVerified: input.emailVerified, requireVerifiedEmail, hasFile, used, limit });

  if (!verdict.ok) {
    if (item) {
      await db.downloadEvent.create({ data: { userId: input.userId, libraryItemId: item.id, productVersionId: item.product.currentVersionId, status: "denied", reason: verdict.code, ip: ctx.ip, userAgent: ctx.userAgent } });
    }
    logger.info("download_denied", { userId: input.userId, libraryItemId: input.libraryItemId, code: verdict.code });
    throw new AppError(verdict.code, DENIAL_MESSAGE[verdict.code], { meta: { used, limit } });
  }

  const version = item!.product.currentVersion!;
  const event = await db.downloadEvent.create({
    data: { userId: input.userId, libraryItemId: item!.id, productVersionId: version.id, status: "issued", ip: ctx.ip, userAgent: ctx.userAgent },
  });
  // Downloading the current version acknowledges the update.
  if (item!.ownedVersionId !== version.id) await db.libraryItem.update({ where: { id: item!.id }, data: { ownedVersionId: version.id } });

  const expiresAt = Date.now() + ttl * 1000;
  const base = { fileName: file!.fileName, sizeBytes: file!.sizeBytes, expiresAt: new Date(expiresAt).toISOString(), used: used + 1, limit };
  if (!file!.storageKey && file!.externalUrlEncrypted) {
    await db.downloadEvent.update({ where: { id: event.id }, data: { status: "completed" } });
    return { ...base, url: decrypt(file!.externalUrlEncrypted), external: true };
  }
  const signed = await storage().signedDownloadUrl(file!.storageKey!, { ttlSeconds: ttl, fileName: file!.fileName });
  return { ...base, url: signed ?? `/api/v1/downloads/file/${signDownloadToken(event.id, expiresAt)}`, external: false };
}

export type TokenFailure = "expired" | "used" | "unauthorized" | "unavailable";

/**
 * Redeems a download token for the protected streaming route: signature, expiry, single use,
 * the same signed-in user, and a still-active library item — all checked again here.
 */
export async function redeemDownloadToken(token: string, userId: string | null): Promise<{ ok: true; object: StoredObject; fileName: string } | { ok: false; reason: TokenFailure }> {
  const parsed = readDownloadToken(token);
  if (!parsed) return { ok: false, reason: "unauthorized" };
  const event = await db.downloadEvent.findUnique({
    where: { id: parsed.eventId },
    include: { libraryItem: { select: { revokedAt: true } }, version: { select: { files: { orderBy: { createdAt: "asc" }, take: 1 } } } },
  });
  if (!event || !userId || event.userId !== userId || event.libraryItem?.revokedAt) return { ok: false, reason: "unauthorized" };
  if (event.status !== "issued") return { ok: false, reason: "used" };
  if (Date.now() > parsed.expiresAt) return { ok: false, reason: "expired" };
  const file = event.version?.files[0];
  const object = file?.storageKey ? await storage().get("private", file.storageKey).catch(() => null) : null;
  if (!file || !object) {
    await db.downloadEvent.update({ where: { id: event.id }, data: { status: "failed", reason: "FILE_UNAVAILABLE" } });
    return { ok: false, reason: "unavailable" };
  }
  // Claim the token atomically so two parallel requests can't both stream it.
  const claimed = await db.downloadEvent.updateMany({ where: { id: event.id, status: "issued" }, data: { status: "completed" } });
  if (claimed.count === 0) {
    object.body.destroy();
    return { ok: false, reason: "used" };
  }
  return { ok: true, object, fileName: file.fileName };
}

export type DownloadRow = {
  libraryItemId: string;
  productId: string;
  title: string;
  typeLabel: string;
  href: string;
  coverUrl: string | null;
  spineColor: string;
  format: string | null;
  sizeBytes: number | null;
  version: string | null;
  changelog: string | null;
  grantedAt: string;
  used: number;
  limit: number;
  state: DownloadState;
};

/** Download Center (sheet "Download Center"): per-product state, limits and recent history. */
export async function downloadCenter(userId: string) {
  const limit = await getSetting("downloads.limitPerProduct");
  const items = await db.libraryItem.findMany({
    where: { userId, revokedAt: null },
    orderBy: { grantedAt: "desc" },
    include: {
      product: {
        select: {
          id: true,
          title: true,
          slug: true,
          type: true,
          spineColor: true,
          currentVersionId: true,
          cover: { select: { storageKey: true } },
          currentVersion: { select: { version: true, changelog: true, files: { orderBy: { createdAt: "asc" }, take: 1, select: { kind: true, sizeBytes: true, storageKey: true, externalUrlEncrypted: true } } } },
        },
      },
    },
  });
  const counts = await db.downloadEvent.groupBy({ by: ["libraryItemId"], where: { userId, status: { in: [...COUNTED] } }, _count: { _all: true } });
  const usedBy = new Map(counts.map((c) => [c.libraryItemId, c._count._all]));
  // Bundles without their own file deliver through their contents, which are separate items.
  const deliverable = items.filter((item) => item.product.type !== "bundle" || item.product.currentVersion?.files.length);
  const rows: DownloadRow[] = deliverable.map((item) => {
    const p = item.product;
    const file = p.currentVersion?.files[0];
    const used = usedBy.get(item.id) ?? 0;
    const updateAvailable = Boolean(p.currentVersionId && item.ownedVersionId && item.ownedVersionId !== p.currentVersionId);
    return {
      libraryItemId: item.id,
      productId: p.id,
      title: p.title,
      typeLabel: TYPE_LABEL[p.type as ProductTypeKey],
      href: productHref(p.type as ProductTypeKey, p.slug),
      coverUrl: p.cover ? storage().publicUrl(p.cover.storageKey) : null,
      spineColor: p.spineColor,
      format: file ? (file.kind === "external_link" ? "Link" : file.kind === "zip" ? "ZIP" : "PDF") : null,
      sizeBytes: file?.sizeBytes ?? null,
      version: p.currentVersion?.version ?? null,
      changelog: p.currentVersion?.changelog ?? null,
      grantedAt: item.grantedAt.toISOString(),
      used,
      limit,
      state: downloadState({ hasFile: Boolean(file?.storageKey || file?.externalUrlEncrypted), used, limit, updateAvailable }),
    };
  });
  const history = await db.downloadEvent.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: { id: true, status: true, reason: true, createdAt: true, libraryItem: { select: { product: { select: { title: true } } } }, version: { select: { version: true } } },
  });
  return {
    rows,
    stats: {
      totalDownloads: [...usedBy.values()].reduce((a, b) => a + b, 0),
      activeFiles: rows.filter((r) => r.state !== "unavailable").length,
      updates: rows.filter((r) => r.state === "update_available").length,
      limitReached: rows.filter((r) => r.state === "limit_reached").length,
    },
    history: history.map((h) => ({ id: h.id, status: h.status, reason: h.reason, createdAt: h.createdAt.toISOString(), title: h.libraryItem?.product.title ?? "—", version: h.version?.version ?? null })),
  };
}

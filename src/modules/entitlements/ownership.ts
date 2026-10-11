import "server-only";
import { db } from "@/lib/db";

/** Products the user currently owns (active, non-revoked library items). */
export async function ownedProductIds(userId: string, productIds?: string[]): Promise<Set<string>> {
  const rows = await db.libraryItem.findMany({
    where: { userId, revokedAt: null, ...(productIds ? { productId: { in: productIds } } : {}) },
    select: { productId: true },
  });
  return new Set(rows.map((r) => r.productId));
}

export async function ownership(userId: string, productId: string) {
  const item = await db.libraryItem.findUnique({
    where: { userId_productId: { userId, productId } },
    select: { id: true, revokedAt: true, ownedVersionId: true, product: { select: { currentVersionId: true } } },
  });
  if (!item || item.revokedAt) return { owned: false as const };
  return {
    owned: true as const,
    libraryItemId: item.id,
    updateAvailable: Boolean(item.product.currentVersionId && item.ownedVersionId !== item.product.currentVersionId),
  };
}

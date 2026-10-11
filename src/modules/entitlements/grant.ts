import "server-only";
import { db, type Tx } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { publicProductWhere } from "@/modules/catalog/service";

/**
 * The only way library access is created (F11 AC): verified purchase, gift claim, free claim,
 * or admin grant. Idempotent per (user, product); re-grants a previously revoked item.
 */
export async function grantLibraryItem(
  tx: Tx | typeof db,
  input: { userId: string; productId: string; source: "purchase" | "gift" | "free" | "admin_grant"; orderItemId?: string | null },
): Promise<{ libraryItemId: string; created: boolean }> {
  const product = await tx.product.findUniqueOrThrow({ where: { id: input.productId }, select: { currentVersionId: true } });
  const existing = await tx.libraryItem.findUnique({ where: { userId_productId: { userId: input.userId, productId: input.productId } } });
  if (existing && !existing.revokedAt) return { libraryItemId: existing.id, created: false };
  const item = await tx.libraryItem.upsert({
    where: { userId_productId: { userId: input.userId, productId: input.productId } },
    create: {
      userId: input.userId,
      productId: input.productId,
      source: input.source,
      orderItemId: input.orderItemId ?? null,
      ownedVersionId: product.currentVersionId,
    },
    update: { revokedAt: null, source: input.source, orderItemId: input.orderItemId ?? null, ownedVersionId: product.currentVersionId, grantedAt: new Date() },
  });
  return { libraryItemId: item.id, created: true };
}

export async function claimFreeProduct(userId: string, productId: string) {
  const product = await db.product.findFirst({
    where: { id: productId, ...publicProductWhere(), type: "free_resource", prices: { every: { amountMinor: 0 } } },
    select: { id: true },
  });
  if (!product) throw new AppError("PRODUCT_UNAVAILABLE", "This resource isn't available as a free download.");
  return grantLibraryItem(db, { userId, productId, source: "free" });
}

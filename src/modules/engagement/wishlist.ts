import "server-only";
import { z } from "zod";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { publicProductWhere } from "@/modules/catalog/service";

export const wishlistInput = z.object({ productId: z.uuid() });

export async function addToWishlist(userId: string, productId: string): Promise<void> {
  const product = await db.product.findFirst({ where: { id: productId, ...publicProductWhere() }, select: { id: true } });
  if (!product) throw new AppError("PRODUCT_NOT_FOUND", "This product isn't available.");
  await db.wishlistItem.upsert({ where: { userId_productId: { userId, productId } }, create: { userId, productId }, update: {} });
}

export async function removeFromWishlist(userId: string, productId: string): Promise<void> {
  await db.wishlistItem.deleteMany({ where: { userId, productId } });
}

export async function wishlistProductIds(userId: string, productIds?: string[]): Promise<Set<string>> {
  const rows = await db.wishlistItem.findMany({
    where: { userId, ...(productIds ? { productId: { in: productIds } } : {}) },
    select: { productId: true },
  });
  return new Set(rows.map((r) => r.productId));
}

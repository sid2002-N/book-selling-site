import "server-only";
import { db } from "@/lib/db";
import type { Currency } from "@/lib/money";
import { cardInclude, publicProductWhere, toCard } from "@/modules/catalog/service";
import type { ProductCard } from "@/modules/catalog/types";

const RECENT_KEEP = 30;

/** Signed-in product views (F18). Best-effort: never blocks a page render. */
export async function recordView(userId: string, productId: string): Promise<void> {
  try {
    await db.recentlyViewed.upsert({ where: { userId_productId: { userId, productId } }, create: { userId, productId }, update: { viewedAt: new Date() } });
    const stale = await db.recentlyViewed.findMany({ where: { userId }, orderBy: { viewedAt: "desc" }, skip: RECENT_KEEP, select: { productId: true } });
    if (stale.length) await db.recentlyViewed.deleteMany({ where: { userId, productId: { in: stale.map((s) => s.productId) } } });
  } catch {
    // Non-critical.
  }
}

export async function recentlyViewed(userId: string, currency: Currency, take = 8): Promise<ProductCard[]> {
  const rows = await db.recentlyViewed.findMany({
    where: { userId, product: publicProductWhere() },
    orderBy: { viewedAt: "desc" },
    take,
    include: { product: { include: cardInclude(currency) } },
  });
  return rows.map((r) => toCard(r.product));
}

export async function wishlistCards(userId: string, currency: Currency): Promise<ProductCard[]> {
  const rows = await db.wishlistItem.findMany({
    where: { userId, product: publicProductWhere() },
    orderBy: { createdAt: "desc" },
    include: { product: { include: cardInclude(currency) } },
  });
  return rows.map((r) => toCard(r.product));
}

/**
 * Simple, explainable recommendations (PRD F18): unowned titles from the categories the
 * reader already owns, featured and newest first; falls back to featured titles.
 */
export async function recommendations(userId: string, currency: Currency, take = 6): Promise<ProductCard[]> {
  const owned = await db.libraryItem.findMany({ where: { userId, revokedAt: null }, select: { productId: true, product: { select: { primaryCategoryId: true } } } });
  const ownedIds = owned.map((o) => o.productId);
  const categoryIds = [...new Set(owned.map((o) => o.product.primaryCategoryId).filter((c): c is string => Boolean(c)))];
  const base = { ...publicProductWhere(), id: { notIn: ownedIds }, type: { not: "free_resource" as const } };
  const byCategory = categoryIds.length
    ? await db.product.findMany({ where: { ...base, primaryCategoryId: { in: categoryIds } }, orderBy: [{ isFeatured: "desc" }, { publishedAt: "desc" }], take, include: cardInclude(currency) })
    : [];
  const fill =
    byCategory.length < take
      ? await db.product.findMany({ where: { ...base, id: { notIn: [...ownedIds, ...byCategory.map((p) => p.id)] } }, orderBy: [{ isFeatured: "desc" }, { publishedAt: "desc" }], take: take - byCategory.length, include: cardInclude(currency) })
      : [];
  return [...byCategory, ...fill].map(toCard);
}

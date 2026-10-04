import "server-only";
import { db } from "@/lib/db";
import { publicProductWhere } from "./service";
import { productHref, type ProductTypeKey } from "./types";

/** Everything public and indexable, for sitemap.xml (master §50). */
export async function sitemapEntries() {
  const [products, categories, collections] = await Promise.all([
    db.product.findMany({ where: publicProductWhere(), select: { slug: true, type: true, updatedAt: true } }),
    db.category.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true } }),
    db.collection.findMany({ where: { status: "published", deletedAt: null }, select: { slug: true, updatedAt: true } }),
  ]);
  return [
    ...products.map((p) => ({ path: productHref(p.type as ProductTypeKey, p.slug), lastModified: p.updatedAt, priority: 0.8 })),
    ...categories.map((c) => ({ path: `/categories/${c.slug}`, lastModified: c.updatedAt, priority: 0.6 })),
    ...collections.map((c) => ({ path: `/collections/${c.slug}`, lastModified: c.updatedAt, priority: 0.6 })),
  ];
}

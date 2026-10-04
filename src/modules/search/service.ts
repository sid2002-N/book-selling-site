import "server-only";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { productHref, TYPE_LABEL, type ProductTypeKey } from "@/modules/catalog/types";

export type Suggestion =
  | { kind: "product"; title: string; href: string; typeLabel: string; spineColor: string }
  | { kind: "category"; title: string; href: string; count: number };

/** Instant suggestions (F3): prefix/trigram title matches plus matching categories. SearchPort v1 = Postgres. */
export async function suggest(rawQuery: string, limit = 6): Promise<Suggestion[]> {
  const q = rawQuery.trim().slice(0, 60);
  if (q.length < 2) return [];
  const [products, categories] = await Promise.all([
    db.$queryRaw<{ slug: string; title: string; type: ProductTypeKey; spine_color: string }[]>`
      SELECT slug, title, type::text AS type, spine_color FROM product
      WHERE status = 'published' AND deleted_at IS NULL AND published_at <= now()
        AND (title ILIKE ${q + "%"} OR title ILIKE ${"% " + q + "%"} OR similarity(title, ${q}) > 0.25
             OR search_vector @@ websearch_to_tsquery('english', ${q}))
      ORDER BY (title ILIKE ${q + "%"}) DESC, similarity(title, ${q}) DESC, published_at DESC
      LIMIT ${limit}`,
    db.category.findMany({
      where: { isActive: true, name: { contains: q, mode: "insensitive" } },
      take: 3,
      select: { slug: true, name: true, _count: { select: { products: true } } },
    }),
  ]);
  return [
    ...categories.map((c) => ({ kind: "category" as const, title: c.name, href: `/categories/${c.slug}`, count: c._count.products })),
    ...products.map((p) => ({
      kind: "product" as const,
      title: p.title,
      href: productHref(p.type, p.slug),
      typeLabel: TYPE_LABEL[p.type],
      spineColor: p.spine_color,
    })),
  ];
}

/** Most searched terms (last 30 days) that returned results. Empty until real searches exist. */
export async function popularSearches(limit = 6): Promise<string[]> {
  const rows = await db.$queryRaw<{ normalized: string }[]>`
    SELECT normalized FROM search_query
    WHERE created_at > now() - interval '30 days' AND results_count > 0
    GROUP BY normalized ORDER BY count(*) DESC LIMIT ${limit}`;
  return rows.map((r) => r.normalized);
}

/** Records a search for Search Analytics; never blocks the page on failure. */
export async function recordSearch(term: string, resultsCount: number, userId: string | null): Promise<void> {
  const normalized = term.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 100);
  if (!normalized) return;
  try {
    await db.searchQuery.create({ data: { term: term.slice(0, 100), normalized, resultsCount, userId } });
  } catch (error) {
    logger.warn("search_record_failed", { error });
  }
}

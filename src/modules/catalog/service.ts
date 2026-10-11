import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { discountPercent, formatMoney, type Currency } from "@/lib/money";
import { storage } from "@/modules/storage";
import {
  TYPE_LABEL,
  productHref,
  type CatalogPage,
  type CatalogQuery,
  type PriceView,
  type ProductCard,
  type ProductTypeKey,
} from "./types";

const NEW_WINDOW_DAYS = 21;
const MAX_PAGE_SIZE = 48;

/** Only published, non-deleted, already-released products are ever public (F1 AC). */
export const publicProductWhere = (): Prisma.ProductWhereInput => ({
  status: "published",
  deletedAt: null,
  publishedAt: { lte: new Date() },
});

const activePriceWhere = (currency: Currency): Prisma.ProductPriceWhereInput => {
  const now = new Date();
  return {
    currency,
    OR: [{ startsAt: null }, { startsAt: { lte: now } }],
    AND: [{ OR: [{ endsAt: null }, { endsAt: { gt: now } }] }],
  };
};

export const cardInclude = (currency: Currency) =>
  ({
    cover: { select: { storageKey: true } },
    primaryCategory: { select: { slug: true, name: true } },
    prices: { where: activePriceWhere(currency), orderBy: { startsAt: { sort: "desc", nulls: "last" } }, take: 1 },
  }) satisfies Prisma.ProductInclude;

type CardRow = Prisma.ProductGetPayload<{ include: ReturnType<typeof cardInclude> }>;

export function toPriceView(
  row: { currency: Currency; amountMinor: number; compareAtMinor: number | null } | undefined | null,
): PriceView | null {
  if (!row) return null;
  const compare = row.compareAtMinor && row.compareAtMinor > row.amountMinor ? row.compareAtMinor : null;
  return {
    currency: row.currency,
    amountMinor: row.amountMinor,
    compareAtMinor: compare,
    label: row.amountMinor === 0 ? "Free" : formatMoney({ amountMinor: row.amountMinor, currency: row.currency }),
    compareLabel: compare ? formatMoney({ amountMinor: compare, currency: row.currency }) : null,
    discountPercent: discountPercent(row.amountMinor, compare),
    isFree: row.amountMinor === 0,
  };
}

export function toCard(row: CardRow): ProductCard {
  const type = row.type as ProductTypeKey;
  const ageDays = row.publishedAt ? (Date.now() - row.publishedAt.getTime()) / 86_400_000 : Infinity;
  return {
    id: row.id,
    slug: row.slug,
    href: productHref(type, row.slug),
    type,
    typeLabel: TYPE_LABEL[type],
    title: row.title,
    subtitle: row.subtitle,
    category: row.primaryCategory,
    spineColor: row.spineColor,
    coverUrl: row.cover ? storage().publicUrl(row.cover.storageKey) : null,
    price: toPriceView(row.prices[0]),
    // Ratings are shown only when real reviews exist (C6).
    rating: row.ratingCount > 0 && row.ratingAvg ? { average: Number(row.ratingAvg), count: row.ratingCount } : null,
    isNew: ageDays <= NEW_WINDOW_DAYS,
    isFeatured: row.isFeatured,
    publishedAt: row.publishedAt?.toISOString() ?? null,
  };
}

async function cardsByIds(ids: string[], currency: Currency): Promise<ProductCard[]> {
  if (ids.length === 0) return [];
  const rows = await db.product.findMany({ where: { id: { in: ids } }, include: cardInclude(currency) });
  const byId = new Map(rows.map((r) => [r.id, toCard(r)]));
  return ids.map((id) => byId.get(id)).filter((c): c is ProductCard => Boolean(c));
}

/**
 * Catalogue listing with filters, sorting and pagination done in SQL (never loads the whole
 * catalogue). Returns ordered ids + total, then hydrates cards.
 */
export async function listProducts(query: CatalogQuery): Promise<CatalogPage> {
  const pageSize = Math.min(Math.max(query.pageSize ?? 24, 1), MAX_PAGE_SIZE);
  const page = Math.max(query.page ?? 1, 1);
  const q = query.q?.trim().slice(0, 100) || null;
  const sort = query.sort ?? (q ? "relevance" : "featured");
  const currency = query.currency;

  const conditions: Prisma.Sql[] = [
    Prisma.sql`p.status = 'published'`,
    Prisma.sql`p.deleted_at IS NULL`,
    Prisma.sql`p.published_at <= now()`,
  ];
  if (query.types?.length) conditions.push(Prisma.sql`p.type::text = ANY(${query.types})`);
  if (query.category) {
    conditions.push(Prisma.sql`EXISTS (SELECT 1 FROM product_category pc JOIN category c ON c.id = pc.category_id
      WHERE pc.product_id = p.id AND c.slug = ${query.category} AND c.is_active)`);
  }
  if (query.tag) {
    conditions.push(Prisma.sql`EXISTS (SELECT 1 FROM product_tag pt JOIN tag t ON t.id = pt.tag_id WHERE pt.product_id = p.id AND t.slug = ${query.tag})`);
  }
  if (query.format) {
    conditions.push(Prisma.sql`EXISTS (SELECT 1 FROM product_file f WHERE f.product_version_id = p.current_version_id AND f.kind::text = ${query.format})`);
  }
  if (query.free) conditions.push(Prisma.sql`price.amount_minor = 0`);
  if (query.priceMax != null) conditions.push(Prisma.sql`price.amount_minor <= ${query.priceMax}`);
  if (q) {
    conditions.push(Prisma.sql`(p.search_vector @@ websearch_to_tsquery('english', ${q}) OR p.title ILIKE ${"%" + q + "%"} OR similarity(p.title, ${q}) > 0.3)`);
  }

  const orderBy: Prisma.Sql = {
    featured: Prisma.sql`p.is_featured DESC, p.published_at DESC`,
    newest: Prisma.sql`p.published_at DESC`,
    popular: Prisma.sql`sales DESC, p.is_featured DESC, p.published_at DESC`,
    price_asc: Prisma.sql`price.amount_minor ASC NULLS LAST, p.published_at DESC`,
    price_desc: Prisma.sql`price.amount_minor DESC NULLS LAST, p.published_at DESC`,
    relevance: q
      ? Prisma.sql`ts_rank(p.search_vector, websearch_to_tsquery('english', ${q})) + similarity(p.title, ${q}) DESC, p.published_at DESC`
      : Prisma.sql`p.is_featured DESC, p.published_at DESC`,
  }[sort];

  const where = Prisma.join(conditions, " AND ");
  const fromClause = Prisma.sql`
    FROM product p
    LEFT JOIN LATERAL (
      SELECT pp.amount_minor FROM product_price pp
      WHERE pp.product_id = p.id AND pp.currency::text = ${currency}
        AND (pp.starts_at IS NULL OR pp.starts_at <= now()) AND (pp.ends_at IS NULL OR pp.ends_at > now())
      ORDER BY pp.starts_at DESC NULLS LAST LIMIT 1
    ) price ON true
    LEFT JOIN LATERAL (
      SELECT count(*)::int AS sales FROM order_item oi JOIN "order" o ON o.id = oi.order_id
      WHERE oi.product_id = p.id AND o.status IN ('paid', 'partially_refunded')
    ) s ON true
    WHERE ${where}`;

  const [rows, countRows] = await Promise.all([
    db.$queryRaw<{ id: string }[]>`SELECT p.id ${fromClause} ORDER BY ${orderBy} LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`,
    db.$queryRaw<{ total: number }[]>`SELECT count(*)::int AS total ${fromClause}`,
  ]);
  const total = countRows[0]?.total ?? 0;
  return {
    items: await cardsByIds(rows.map((r) => r.id), currency),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/** Product counts per active category for the given types (filter sidebar). */
export async function categoryFacets(types?: ProductTypeKey[]) {
  const rows = await db.category.findMany({
    where: { isActive: true },
    orderBy: { position: "asc" },
    select: {
      slug: true,
      name: true,
      _count: { select: { products: { where: { product: { ...publicProductWhere(), ...(types?.length ? { type: { in: types } } : {}) } } } } },
    },
  });
  return rows.map((r) => ({ slug: r.slug, name: r.name, count: r._count.products }));
}

export async function formatFacets(types?: ProductTypeKey[]) {
  const rows = await db.$queryRaw<{ kind: string; count: number }[]>`
    SELECT f.kind::text AS kind, count(DISTINCT p.id)::int AS count
    FROM product p JOIN product_file f ON f.product_version_id = p.current_version_id
    WHERE p.status = 'published' AND p.deleted_at IS NULL AND p.published_at <= now()
      ${types?.length ? Prisma.sql`AND p.type::text = ANY(${types})` : Prisma.empty}
    GROUP BY f.kind ORDER BY count DESC`;
  const labels: Record<string, string> = { pdf: "PDF", fillable_pdf: "Fillable PDF", external_link: "Notion Template", zip: "ZIP" };
  return rows.map((r) => ({ value: r.kind, label: labels[r.kind] ?? r.kind, count: r.count }));
}

export async function listCategories() {
  const rows = await db.category.findMany({
    where: { isActive: true, parentId: null },
    orderBy: { position: "asc" },
    select: {
      slug: true,
      name: true,
      description: true,
      icon: true,
      _count: { select: { products: { where: { product: publicProductWhere() } } } },
    },
  });
  return rows.map((r) => ({ slug: r.slug, name: r.name, description: r.description, icon: r.icon, count: r._count.products }));
}

export async function getCategory(slug: string) {
  const category = await db.category.findFirst({
    where: { slug, isActive: true },
    select: { id: true, slug: true, name: true, description: true, seoTitle: true, seoDescription: true },
  });
  if (!category) return null;
  const [productCount, collectionCount] = await Promise.all([
    db.productCategory.count({ where: { categoryId: category.id, product: publicProductWhere() } }),
    db.collection.count({ where: { categoryId: category.id, status: "published", deletedAt: null } }),
  ]);
  return { ...category, productCount, collectionCount };
}

/** Data for the signature shelf: published products as spines (DESIGN_SYSTEM §18). */
export async function listShelfProducts(currency: Currency, limit = 28): Promise<ProductCard[]> {
  const rows = await db.product.findMany({
    where: { ...publicProductWhere(), type: { not: "bundle" } },
    orderBy: [{ isFeatured: "desc" }, { publishedAt: "desc" }],
    take: limit,
    include: cardInclude(currency),
  });
  return rows.map(toCard);
}

export async function listRail(source: "featured" | "new" | "popular" | "free", currency: Currency, limit = 6): Promise<ProductCard[]> {
  if (source === "popular") return (await listProducts({ currency, sort: "popular", pageSize: limit, types: ["book", "guide", "workbook"] })).items;
  const rows = await db.product.findMany({
    where: {
      ...publicProductWhere(),
      ...(source === "featured" ? { isFeatured: true, type: { notIn: ["bundle", "free_resource"] } } : {}),
      ...(source === "new" ? { type: { notIn: ["bundle"] } } : {}),
      ...(source === "free" ? { type: "free_resource" } : {}),
    },
    orderBy: source === "featured" ? [{ publishedAt: "desc" }] : [{ publishedAt: "desc" }],
    take: limit,
    include: cardInclude(currency),
  });
  return rows.map(toCard);
}

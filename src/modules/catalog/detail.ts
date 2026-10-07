import "server-only";
import { db } from "@/lib/db";
import { formatMoney, type Currency } from "@/lib/money";
import { storage } from "@/modules/storage";
import { cardInclude, publicProductWhere, toCard, toPriceView } from "./service";
import { TYPE_LABEL, productHref, type PriceView, type ProductCard, type ProductTypeKey } from "./types";

const FILE_KIND_LABEL: Record<string, string> = {
  pdf: "PDF (Digital Download)",
  fillable_pdf: "Fillable PDF",
  external_link: "Notion Template (link)",
  zip: "ZIP archive",
};

export type ProductDetail = ProductCard & {
  description: string | null;
  shortDescription: string | null;
  level: string | null;
  language: string;
  publisher: string | null;
  authors: { slug: string; name: string }[];
  categories: { slug: string; name: string }[];
  tags: { slug: string; name: string }[];
  seoTitle: string | null;
  seoDescription: string | null;
  version: { version: string; releasedAt: string | null; pageCount: number | null; formatLabel: string | null; sizeBytes: number | null } | null;
  license: { name: string; summary: string | null } | null;
  previews: { id: string; kind: string; label: string; url: string; alt: string }[];
  toc: { title: string; pageNumber: number | null }[];
  inside: { title: string; description: string | null; icon: string | null }[];
  faqs: { question: string; answer: string }[];
  bundle: { items: ProductCard[]; itemsTotal: PriceView | null; savings: PriceView | null } | null;
  inBundles: ProductCard[];
};

/** Full public product view. `type` must match the URL segment so each product has one canonical URL. */
export async function getProductDetail(slug: string, type: ProductTypeKey, currency: Currency): Promise<ProductDetail | null> {
  const row = await db.product.findFirst({
    where: { ...publicProductWhere(), slug, type },
    include: {
      ...cardInclude(currency),
      license: { select: { name: true, summary: true } },
      authors: { orderBy: { position: "asc" }, select: { author: { select: { slug: true, name: true } } } },
      categories: { select: { category: { select: { slug: true, name: true } } } },
      tags: { select: { tag: { select: { slug: true, name: true } } } },
      currentVersion: {
        select: { version: true, releasedAt: true, pageCount: true, files: { select: { kind: true, sizeBytes: true }, take: 1 } },
      },
      previews: { orderBy: { position: "asc" }, include: { asset: { select: { storageKey: true, alt: true, bucket: true } } } },
      tocEntries: { where: { parentId: null }, orderBy: { position: "asc" }, select: { title: true, pageNumber: true } },
      insideItems: { orderBy: { position: "asc" }, select: { title: true, description: true, icon: true } },
      faqs: { orderBy: { position: "asc" }, select: { question: true, answer: true } },
      bundleItems: {
        orderBy: { position: "asc" },
        where: { product: publicProductWhere() },
        include: { product: { include: cardInclude(currency) } },
      },
      inBundles: { where: { bundle: publicProductWhere() }, include: { bundle: { include: cardInclude(currency) } } },
    },
  });
  if (!row) return null;
  const card = toCard(row);
  const file = row.currentVersion?.files[0];

  let bundle: ProductDetail["bundle"] = null;
  if (row.type === "bundle") {
    const items = row.bundleItems.map((b) => toCard(b.product));
    const sum = items.reduce((acc, i) => acc + (i.price?.amountMinor ?? 0), 0);
    const own = card.price?.amountMinor ?? 0;
    // Savings are derived from item prices, never stored (DATABASE §3.4).
    bundle = {
      items,
      itemsTotal: items.length ? toPriceView({ currency, amountMinor: sum, compareAtMinor: null }) : null,
      savings: sum > own ? toPriceView({ currency, amountMinor: sum - own, compareAtMinor: null }) : null,
    };
    if (sum > own && card.price) {
      card.price = { ...card.price, compareAtMinor: sum, compareLabel: formatMoney({ amountMinor: sum, currency }), discountPercent: Math.round(((sum - own) / sum) * 100) };
    }
  }

  return {
    ...card,
    description: row.description,
    shortDescription: row.shortDescription,
    level: row.level,
    language: row.language,
    publisher: row.publisher,
    authors: row.authors.map((a) => a.author),
    categories: row.categories.map((c) => c.category),
    tags: row.tags.map((t) => t.tag),
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    version: row.currentVersion
      ? {
          version: row.currentVersion.version,
          releasedAt: row.currentVersion.releasedAt?.toISOString() ?? null,
          pageCount: row.currentVersion.pageCount,
          formatLabel: file ? (FILE_KIND_LABEL[file.kind] ?? file.kind) : null,
          sizeBytes: file?.sizeBytes ?? null,
        }
      : null,
    license: row.license,
    previews: row.previews
      .filter((p) => p.asset.bucket === "public" && p.watermarkApplied)
      .map((p) => ({
        id: p.id,
        kind: p.kind,
        label: p.label ?? p.kind,
        url: storage().publicUrl(p.asset.storageKey),
        alt: p.asset.alt ?? `${p.label ?? "Preview"} from ${row.title}`,
      })),
    toc: row.tocEntries,
    inside: row.insideItems,
    faqs: row.faqs,
    bundle,
    inBundles: row.inBundles.map((b) => toCard(b.bundle)),
  };
}

/** Same-category products, excluding the current one. */
export async function relatedProducts(productId: string, categorySlug: string | null, currency: Currency, limit = 4): Promise<ProductCard[]> {
  const rows = await db.product.findMany({
    where: {
      ...publicProductWhere(),
      id: { not: productId },
      type: { notIn: ["bundle", "free_resource"] },
      ...(categorySlug ? { categories: { some: { category: { slug: categorySlug } } } } : {}),
    },
    orderBy: [{ isFeatured: "desc" }, { publishedAt: "desc" }],
    take: limit,
    include: cardInclude(currency),
  });
  return rows.map(toCard);
}

/**
 * "Frequently bought together": co-purchases from paid orders when they exist; otherwise
 * siblings from the same bundle or category. Labelled honestly in the UI either way.
 */
export async function frequentlyBoughtTogether(productId: string, currency: Currency, limit = 2): Promise<{ items: ProductCard[]; basis: "orders" | "related" }> {
  const co = await db.$queryRaw<{ id: string }[]>`
    SELECT oi2.product_id AS id FROM order_item oi1
    JOIN "order" o ON o.id = oi1.order_id AND o.status IN ('paid', 'partially_refunded')
    JOIN order_item oi2 ON oi2.order_id = oi1.order_id AND oi2.product_id <> oi1.product_id
    JOIN product p ON p.id = oi2.product_id AND p.status = 'published' AND p.deleted_at IS NULL
    WHERE oi1.product_id = ${productId}::uuid
    GROUP BY oi2.product_id ORDER BY count(*) DESC LIMIT ${limit}`;
  if (co.length >= limit) {
    const rows = await db.product.findMany({ where: { id: { in: co.map((c) => c.id) } }, include: cardInclude(currency) });
    return { items: rows.map(toCard), basis: "orders" };
  }
  const sibling = await db.bundleItem.findFirst({ where: { productId, bundle: publicProductWhere() }, select: { bundleProductId: true } });
  const rows = await db.product.findMany({
    where: {
      ...publicProductWhere(),
      id: { not: productId },
      type: { notIn: ["bundle", "free_resource"] },
      ...(sibling ? { inBundles: { some: { bundleProductId: sibling.bundleProductId } } } : {}),
    },
    orderBy: { publishedAt: "desc" },
    take: limit,
    include: cardInclude(currency),
  });
  return { items: rows.map(toCard), basis: "related" };
}

export async function approvedReviews(productId: string, limit = 6) {
  const rows = await db.review.findMany({
    where: { productId, status: "approved", deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true, rating: true, title: true, body: true, createdAt: true, isVerifiedPurchase: true, user: { select: { name: true, avatarUrl: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    rating: r.rating,
    title: r.title,
    body: r.body,
    createdAt: r.createdAt.toISOString(),
    verified: r.isVerifiedPurchase,
    author: { name: r.user.name.split(" ")[0] + (r.user.name.includes(" ") ? ` ${r.user.name.split(" ").at(-1)?.[0]}.` : ""), avatarUrl: r.user.avatarUrl },
  }));
}

export async function listCollections(currency: Currency, options: { featured?: boolean; category?: string } = {}) {
  const rows = await db.collection.findMany({
    where: {
      status: "published",
      deletedAt: null,
      ...(options.featured ? { isFeatured: true } : {}),
      ...(options.category ? { category: { slug: options.category } } : {}),
    },
    orderBy: { position: "asc" },
    include: {
      category: { select: { slug: true, name: true } },
      linkedBundle: { include: cardInclude(currency) },
      items: { orderBy: { position: "asc" }, where: { product: publicProductWhere() }, include: { product: { include: cardInclude(currency) } } },
    },
  });
  return rows.map((c) => ({
    id: c.id,
    slug: c.slug,
    href: `/collections/${c.slug}`,
    title: c.title,
    description: c.description,
    badge: c.badge,
    category: c.category,
    items: c.items.map((i) => toCard(i.product)),
    bundle: c.linkedBundle && c.linkedBundle.status === "published" ? toCard(c.linkedBundle) : null,
  }));
}

export type CollectionView = Awaited<ReturnType<typeof listCollections>>[number];

export async function getCollection(slug: string, currency: Currency): Promise<CollectionView | null> {
  const all = await listCollections(currency);
  return all.find((c) => c.slug === slug) ?? null;
}

export async function listBundles(currency: Currency) {
  const rows = await db.product.findMany({
    where: { ...publicProductWhere(), type: "bundle" },
    orderBy: [{ isFeatured: "desc" }, { publishedAt: "desc" }],
    include: { ...cardInclude(currency), bundleItems: { orderBy: { position: "asc" }, include: { product: { include: cardInclude(currency) } } } },
  });
  return rows.map((b) => {
    const card = toCard(b);
    const items = b.bundleItems.map((i) => toCard(i.product));
    const sum = items.reduce((acc, i) => acc + (i.price?.amountMinor ?? 0), 0);
    const own = card.price?.amountMinor ?? 0;
    return {
      ...card,
      items,
      itemsTotal: sum > own ? formatMoney({ amountMinor: sum, currency }) : null,
      savingsPercent: sum > own ? Math.round(((sum - own) / sum) * 100) : null,
    };
  });
}

export function typeLabel(type: ProductTypeKey) {
  return TYPE_LABEL[type];
}

export { productHref };

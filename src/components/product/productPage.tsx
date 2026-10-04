import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  approvedReviews,
  frequentlyBoughtTogether,
  getProductDetail,
  relatedProducts,
  TYPE_PATH,
  type ProductTypeKey,
} from "@/modules/catalog";
import { getCurrentUser } from "@/modules/auth";
import { myReviewFor, recordView } from "@/modules/engagement";
import { ownership } from "@/modules/entitlements";
import { getDisplayCurrency } from "@/modules/pricing";
import { getSetting } from "@/modules/settings";
import { viewerState } from "@/modules/storefront";
import { ProductDetailTemplate } from "./ProductDetailTemplate";
import type { PurchaseState } from "./PurchasePanel";

const SECTION: Record<ProductTypeKey, { label: string; href: string }> = {
  book: { label: "Books", href: "/books" },
  guide: { label: "Guides", href: "/guides" },
  workbook: { label: "Workbooks", href: "/workbooks" },
  bundle: { label: "Bundles", href: "/bundles" },
  free_resource: { label: "Free Resources", href: "/free-resources" },
};

const baseUrl = () => process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/** Unique metadata per product (master §50): title, description, canonical, Open Graph. */
export async function productMetadata(type: ProductTypeKey, slug: string): Promise<Metadata> {
  const product = await getProductDetail(slug, type, await getDisplayCurrency());
  if (!product) return { title: "Not found", robots: { index: false } };
  const title = product.seoTitle ?? product.title;
  const description = product.seoDescription ?? product.subtitle ?? undefined;
  const path = `/${TYPE_PATH[type]}/${slug}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { type: "website", title, description, url: path, images: product.coverUrl ? [{ url: product.coverUrl }] : undefined },
    twitter: { card: "summary_large_image", title, description },
  };
}

export async function ProductPage({ type, slug }: { type: ProductTypeKey; slug: string }) {
  const currency = await getDisplayCurrency();
  const product = await getProductDetail(slug, type, currency);
  if (!product) notFound();

  const user = await getCurrentUser();
  const [related, fbt, reviews, refundWindowDays, own] = await Promise.all([
    relatedProducts(product.id, product.category?.slug ?? null, currency),
    type === "bundle" || type === "free_resource" ? Promise.resolve({ items: [], basis: "related" as const }) : frequentlyBoughtTogether(product.id, currency),
    approvedReviews(product.id),
    getSetting("refunds.windowDays"),
    user ? ownership(user.id, product.id) : Promise.resolve({ owned: false as const }),
  ]);
  const viewer = await viewerState([product.id, ...related.map((r) => r.id), ...fbt.items.map((f) => f.id), ...(product.bundle?.items.map((i) => i.id) ?? [])]);

  const [ownReview] = await Promise.all([own.owned && user ? myReviewFor(user.id, product.id) : Promise.resolve(null), user ? recordView(user.id, product.id) : Promise.resolve()]);
  const owner = own.owned ? { readHref: `/read/${own.libraryItemId}`, review: ownReview } : null;

  const state: PurchaseState = own.owned ? (own.updateAvailable ? "updated" : "owned") : product.price ? "available" : "unavailable";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.subtitle ?? undefined,
    sku: product.id,
    category: product.category?.name,
    brand: { "@type": "Brand", name: "KRM.lib" },
    ...(product.coverUrl ? { image: new URL(product.coverUrl, baseUrl()).toString() } : {}),
    ...(product.price
      ? {
          offers: {
            "@type": "Offer",
            price: (product.price.amountMinor / 100).toFixed(2),
            priceCurrency: product.price.currency,
            availability: "https://schema.org/InStock",
            url: new URL(product.href, baseUrl()).toString(),
          },
        }
      : {}),
    ...(product.rating ? { aggregateRating: { "@type": "AggregateRating", ratingValue: product.rating.average, reviewCount: product.rating.count } } : {}),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <ProductDetailTemplate
        product={product}
        state={state}
        viewer={viewer}
        related={related}
        fbt={fbt}
        reviews={reviews}
        refundWindowDays={refundWindowDays}
        baseUrl={baseUrl()}
        sectionCrumb={SECTION[type]}
        owner={owner}
      />
    </>
  );
}

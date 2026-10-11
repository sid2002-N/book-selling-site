import type { Currency } from "@/lib/money";

export type ProductTypeKey = "book" | "guide" | "workbook" | "bundle" | "free_resource";

export const TYPE_LABEL: Record<ProductTypeKey, string> = {
  book: "Book",
  guide: "Guide",
  workbook: "Workbook",
  bundle: "Bundle",
  free_resource: "Free",
};

export const TYPE_PATH: Record<ProductTypeKey, string> = {
  book: "books",
  guide: "guides",
  workbook: "workbooks",
  bundle: "bundles",
  free_resource: "free-resources",
};

export function productHref(type: ProductTypeKey, slug: string): string {
  return `/${TYPE_PATH[type]}/${slug}`;
}

export type PriceView = {
  currency: Currency;
  amountMinor: number;
  compareAtMinor: number | null;
  label: string;
  compareLabel: string | null;
  discountPercent: number | null;
  isFree: boolean;
};

/** Public, client-safe product summary. Never contains storage keys or internal fields. */
export type ProductCard = {
  id: string;
  slug: string;
  href: string;
  type: ProductTypeKey;
  typeLabel: string;
  title: string;
  subtitle: string | null;
  category: { slug: string; name: string } | null;
  spineColor: string;
  coverUrl: string | null;
  price: PriceView | null;
  rating: { average: number; count: number } | null;
  isNew: boolean;
  isFeatured: boolean;
  publishedAt: string | null;
};

export type CatalogSort = "featured" | "newest" | "popular" | "price_asc" | "price_desc" | "relevance";

export const SORT_OPTIONS: { value: CatalogSort; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "popular", label: "Popular" },
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
];

export type CatalogQuery = {
  types?: ProductTypeKey[];
  category?: string;
  tag?: string;
  format?: "pdf" | "fillable_pdf" | "external_link";
  q?: string;
  priceMax?: number;
  free?: boolean;
  sort?: CatalogSort;
  page?: number;
  pageSize?: number;
  currency: Currency;
};

export type CatalogPage = {
  items: ProductCard[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

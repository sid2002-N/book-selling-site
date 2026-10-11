import type { ReactNode } from "react";
import type { Crumb } from "@/components/layout/Breadcrumbs";
import { formatMoney, type Currency } from "@/lib/money";
import { categoryFacets, formatFacets, listProducts, SORT_OPTIONS, type CatalogSort, type ProductTypeKey } from "@/modules/catalog";
import { getDisplayCurrency } from "@/modules/pricing";
import { recordSearch } from "@/modules/search";
import { viewerState } from "@/modules/storefront";
import { CatalogListTemplate } from "./CatalogListTemplate";

export type CatalogRouteConfig = {
  path: string;
  title: string;
  eyebrow?: string;
  description?: string;
  breadcrumbs: Crumb[];
  types?: ProductTypeKey[];
  category?: string;
  defaultSort?: CatalogSort;
  showCategoryFilter?: boolean;
  showPriceFilter?: boolean;
  search?: boolean;
  heroAside?: ReactNode;
  above?: ReactNode;
  empty?: ReactNode;
};

const SORTS = new Set<string>(SORT_OPTIONS.map((s) => s.value).concat("relevance"));
const FORMATS = new Set(["pdf", "fillable_pdf", "external_link"]);

const PRICE_STEPS: Record<Currency, number[]> = { INR: [30000, 50000, 80000], USD: [500, 1000, 1500] };

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Server component: parses URL filters, queries the catalogue and renders the shared template. */
export async function CatalogRoute({ config, searchParams }: { config: CatalogRouteConfig; searchParams: Record<string, string | string[] | undefined> }) {
  const currency = await getDisplayCurrency();
  const q = config.search ? one(searchParams.q)?.trim().slice(0, 100) || undefined : undefined;
  const sortParam = one(searchParams.sort);
  const defaultSort: CatalogSort = q ? "relevance" : (config.defaultSort ?? "featured");
  const sort = (sortParam && SORTS.has(sortParam) ? sortParam : defaultSort) as CatalogSort;
  const formatParam = one(searchParams.format);
  const priceParam = Number(one(searchParams.price));
  const page = Math.max(1, Math.min(500, Number(one(searchParams.page)) || 1));
  const category = config.category ?? one(searchParams.category);

  const [result, categories, formats] = await Promise.all([
    listProducts({
      currency,
      types: config.types,
      category,
      format: formatParam && FORMATS.has(formatParam) ? (formatParam as "pdf") : undefined,
      priceMax: Number.isFinite(priceParam) && priceParam > 0 ? priceParam : undefined,
      q,
      sort,
      page,
    }),
    config.showCategoryFilter === false || config.category ? Promise.resolve([]) : categoryFacets(config.types),
    formatFacets(config.types),
  ]);
  if (q && page === 1) await recordSearch(q, result.total, null);
  const viewer = await viewerState(result.items.map((p) => p.id));

  const sortOptions = q ? [{ value: "relevance", label: "Relevance" }, ...SORT_OPTIONS] : SORT_OPTIONS;
  const hrefForPage = (p: number) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) {
      const val = one(v);
      if (val && k !== "page") next.set(k, val);
    }
    if (p > 1) next.set("page", String(p));
    return `${config.path}${next.size ? `?${next}` : ""}`;
  };

  return (
    <CatalogListTemplate
      eyebrow={config.eyebrow}
      title={config.title}
      description={config.description}
      breadcrumbs={config.breadcrumbs}
      baseUrl={process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}
      page={result}
      viewer={viewer}
      filters={{
        categories: categories.filter((c) => c.count > 0).map((c) => ({ value: c.slug, label: c.name, count: c.count })),
        formats: formats.length > 1 ? formats : undefined,
        priceSteps:
          config.showPriceFilter === false
            ? undefined
            : PRICE_STEPS[currency].map((v) => ({ value: String(v), label: `Under ${formatMoney({ amountMinor: v, currency })}` })),
      }}
      sortOptions={sortOptions}
      defaultSort={defaultSort}
      hrefForPage={hrefForPage}
      heroAside={config.heroAside}
      above={config.above}
      empty={config.empty}
    />
  );
}

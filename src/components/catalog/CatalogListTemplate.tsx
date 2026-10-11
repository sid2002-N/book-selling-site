import type { ReactNode } from "react";
import { Breadcrumbs, type Crumb } from "@/components/layout/Breadcrumbs";
import { ProductGrid, type ViewerState } from "@/components/commerce/ProductGrid";
import { SystemState } from "@/components/system/SystemState";
import { Pagination } from "@/components/ui/Pagination";
import type { CatalogPage } from "@/modules/catalog";
import { CatalogSidebar, CatalogToolbar, type FilterConfig } from "./CatalogFilters";

type CatalogListTemplateProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  breadcrumbs: Crumb[];
  baseUrl: string;
  page: CatalogPage;
  viewer: ViewerState;
  filters: FilterConfig;
  sortOptions: { value: string; label: string }[];
  defaultSort: string;
  hrefForPage: (page: number) => string;
  heroAside?: ReactNode;
  above?: ReactNode;
  empty?: ReactNode;
};

/**
 * One template for every listing (Explore, Books, Guides, Workbooks, New, Popular, Free,
 * Category, Search) — master §52: templates with states, not duplicate pages.
 */
export function CatalogListTemplate({
  eyebrow,
  title,
  description,
  breadcrumbs,
  baseUrl,
  page,
  viewer,
  filters,
  sortOptions,
  defaultSort,
  hrefForPage,
  heroAside,
  above,
  empty,
}: CatalogListTemplateProps) {
  const hasSidebar = Boolean(filters.categories?.length || filters.formats?.length || filters.priceSteps?.length);
  return (
    <div className="flex flex-col">
      <header className="bg-linear-to-b from-canvas-subtle to-canvas">
        <div className="container-page grid gap-6 pt-6 pb-10 md:pt-8 md:pb-14 lg:grid-cols-3">
          <div className="flex flex-col gap-4 lg:col-span-2">
            <Breadcrumbs items={breadcrumbs} baseUrl={baseUrl} />
            {eyebrow ? <p className="text-micro font-semibold tracking-widest text-accent-strong uppercase">{eyebrow}</p> : null}
            <h1 className="text-display text-fg">{title}</h1>
            {description ? <p className="max-w-2xl text-body-lg text-fg-secondary">{description}</p> : null}
          </div>
          {heroAside ? <div className="hidden lg:block">{heroAside}</div> : null}
        </div>
      </header>
      <div className="container-page flex flex-col gap-6 pb-16">
        {above}
        <div className={hasSidebar ? "grid gap-8 lg:grid-cols-4" : ""}>
          {hasSidebar ? <CatalogSidebar config={filters} /> : null}
          <div className="flex flex-col gap-6 lg:col-span-3">
            <CatalogToolbar config={filters} total={page.total} sortOptions={sortOptions} defaultSort={defaultSort} />
            {page.items.length ? (
              <ProductGrid products={page.items} viewer={viewer} columns={hasSidebar ? "default" : "wide"} />
            ) : (
              (empty ?? <SystemState variant="empty-search" layout="inline" headingLevel="h2" title="Nothing here yet" message="No products match these filters. Try removing a filter or explore the full library." primary={{ label: "Explore the library", href: "/explore" }} />)
            )}
            <Pagination page={page.page} totalPages={page.totalPages} hrefFor={hrefForPage} className="self-center pt-4" />
          </div>
        </div>
      </div>
    </div>
  );
}

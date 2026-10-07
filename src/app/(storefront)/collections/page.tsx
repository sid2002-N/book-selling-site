import { BookOpen, Library, PiggyBank, Route } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { CollectionCard } from "@/components/catalog/CollectionCard";
import { SectionHeader } from "@/components/catalog/SectionHeader";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { pillClasses } from "@/components/ui/Tabs";
import { SystemState } from "@/components/system/SystemState";
import { listCategories, listCollections, listProducts } from "@/modules/catalog";
import { getDisplayCurrency } from "@/modules/pricing";

export const metadata: Metadata = {
  title: "Collections",
  description: "Curated bundles to help you learn faster, go deeper, and build a better version of yourself.",
  alternates: { canonical: "/collections" },
};

export default async function CollectionsPage({ searchParams }: PageProps<"/collections">) {
  const params = await searchParams;
  const category = typeof params.category === "string" ? params.category : undefined;
  const currency = await getDisplayCurrency();
  const [all, categories, products] = await Promise.all([
    listCollections(currency),
    listCategories(),
    listProducts({ currency, pageSize: 1, types: ["book", "guide", "workbook"] }),
  ]);
  const filtered = category ? all.filter((c) => c.category?.slug === category) : all;
  const featured = all.filter((c) => c.badge).slice(0, 3);
  const withCollections = categories.filter((cat) => all.some((c) => c.category?.slug === cat.slug));

  return (
    <div className="flex flex-col gap-14 pb-16">
      <header className="bg-linear-to-b from-canvas-subtle to-canvas">
        <div className="container-page flex flex-col gap-5 pt-6 pb-10 md:pt-8 md:pb-14">
          <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Collections" }]} baseUrl={process.env.NEXT_PUBLIC_APP_URL} />
          <h1 className="text-display">Collections</h1>
          <p className="max-w-2xl text-body-lg text-fg-secondary">Curated bundles to help you learn faster, go deeper, and build a better version of yourself.</p>
          <ul className="flex flex-wrap gap-x-8 gap-y-3 pt-2">
            {[
              { icon: Library, value: String(all.length), label: "Curated collections" },
              { icon: BookOpen, value: String(products.total), label: "Books & resources" },
              { icon: PiggyBank, value: "Save more", label: "Bundle discounts" },
              { icon: Route, value: "Real progress", label: "Structured learning" },
            ].map(({ icon: Icon, value, label }) => (
              <li key={label} className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-full bg-accent-soft text-accent-strong">
                  <Icon className="size-4" aria-hidden />
                </span>
                <span className="flex flex-col">
                  <span className="text-body-sm font-semibold text-fg">{value}</span>
                  <span className="text-caption text-fg-muted">{label}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </header>

      <nav aria-label="Collection categories" className="container-page -mt-6">
        <ul className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <li className="shrink-0">
            <Link href="/collections" aria-current={!category ? "page" : undefined} className={pillClasses}>
              All Collections
            </Link>
          </li>
          {withCollections.map((c) => (
            <li key={c.slug} className="shrink-0">
              <Link href={`/collections?category=${c.slug}`} aria-current={category === c.slug ? "page" : undefined} className={pillClasses}>
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {!category && featured.length ? (
        <section aria-labelledby="featured-collections" className="container-page flex flex-col gap-6">
          <SectionHeader id="featured-collections" title="Featured Collections" />
          <ul className="grid gap-5 md:grid-cols-3">
            {featured.map((c) => (
              <li key={c.id}>
                <CollectionCard collection={c} size="feature" />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="all-collections" className="container-page flex flex-col gap-6">
        <SectionHeader id="all-collections" title={category ? (withCollections.find((c) => c.slug === category)?.name ?? "Collections") : "All Collections"} />
        {filtered.length ? (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {filtered.map((c) => (
              <li key={c.id}>
                <CollectionCard collection={c} />
              </li>
            ))}
          </ul>
        ) : (
          <SystemState variant="empty-search" layout="inline" headingLevel="h2" title="No collections here yet" message="There are no collections in this category yet." primary={{ label: "View all collections", href: "/collections" }} secondary={null} />
        )}
      </section>
    </div>
  );
}

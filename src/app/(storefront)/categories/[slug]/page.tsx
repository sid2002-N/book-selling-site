import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatalogRoute } from "@/components/catalog/CatalogRoute";
import { getCategory } from "@/modules/catalog";

export async function generateMetadata({ params }: PageProps<"/categories/[slug]">): Promise<Metadata> {
  const category = await getCategory((await params).slug);
  if (!category) return { title: "Not found", robots: { index: false } };
  return {
    title: category.seoTitle ?? `${category.name} — books, guides & workbooks`,
    description: category.seoDescription ?? category.description ?? undefined,
    alternates: { canonical: `/categories/${category.slug}` },
  };
}

export default async function CategoryPage({ params, searchParams }: PageProps<"/categories/[slug]">) {
  const category = await getCategory((await params).slug);
  if (!category) notFound();
  return (
    <CatalogRoute
      searchParams={await searchParams}
      config={{
        path: `/categories/${category.slug}`,
        title: category.name,
        eyebrow: "Category",
        description: category.description ?? undefined,
        breadcrumbs: [{ label: "Home", href: "/" }, { label: "Categories", href: "/categories" }, { label: category.name }],
        category: category.slug,
        types: ["book", "guide", "workbook", "bundle", "free_resource"],
        heroAside: (
          <dl className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-line bg-surface p-4">
              <dt className="text-caption text-fg-muted">Books &amp; resources</dt>
              <dd className="font-serif text-h2">{category.productCount}</dd>
            </div>
            <div className="rounded-lg border border-line bg-surface p-4">
              <dt className="text-caption text-fg-muted">Collections</dt>
              <dd className="font-serif text-h2">{category.collectionCount}</dd>
            </div>
          </dl>
        ),
      }}
    />
  );
}

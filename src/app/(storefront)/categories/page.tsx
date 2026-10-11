import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { CategoryIcon } from "@/components/catalog/CategoryIcon";
import { listCategories } from "@/modules/catalog";

export const metadata: Metadata = {
  title: "Categories",
  description: "Explore knowledge collections across different areas of your life and work.",
  alternates: { canonical: "/categories" },
};

export default async function CategoriesPage() {
  const categories = await listCategories();
  return (
    <div className="flex flex-col">
      <header className="bg-linear-to-b from-canvas-subtle to-canvas">
        <div className="container-page flex flex-col gap-4 pt-6 pb-10 md:pt-8 md:pb-14">
          <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Categories" }]} baseUrl={process.env.NEXT_PUBLIC_APP_URL} />
          <h1 className="text-display">Categories</h1>
          <p className="max-w-2xl text-body-lg text-fg-secondary">Explore knowledge collections across different areas of your life and work.</p>
        </div>
      </header>
      <div className="container-page pb-16">
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/categories/${c.slug}`}
                className="group flex h-full gap-4 rounded-lg border border-line bg-surface p-5 shadow-1 transition-[transform,box-shadow] duration-normal hover:-translate-y-0.5 hover:shadow-2 motion-reduce:transform-none"
              >
                <span className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent-strong">
                  <CategoryIcon name={c.icon} className="size-6" />
                </span>
                <span className="flex flex-1 flex-col gap-1">
                  <span className="flex items-center justify-between font-sans text-body font-semibold text-fg">
                    {c.name} <ArrowRight className="size-4 text-fg-muted transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </span>
                  <span className="text-caption text-fg-muted">{c.description}</span>
                  <span className="mt-auto pt-2 text-caption font-medium text-fg-secondary">
                    {c.count} {c.count === 1 ? "product" : "products"}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

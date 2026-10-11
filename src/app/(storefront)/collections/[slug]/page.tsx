import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { toShelfBooks } from "@/components/catalog/toShelfBooks";
import { ProductGrid } from "@/components/commerce/ProductGrid";
import { Price } from "@/components/commerce/Price";
import { Shelf } from "@/components/library/Shelf";
import { Button } from "@/components/ui/Button";
import { getCollection } from "@/modules/catalog";
import { getDisplayCurrency } from "@/modules/pricing";
import { viewerState } from "@/modules/storefront";

export async function generateMetadata({ params }: PageProps<"/collections/[slug]">): Promise<Metadata> {
  const collection = await getCollection((await params).slug, await getDisplayCurrency());
  if (!collection) return { title: "Not found", robots: { index: false } };
  return { title: collection.title, description: collection.description ?? undefined, alternates: { canonical: collection.href } };
}

export default async function CollectionPage({ params }: PageProps<"/collections/[slug]">) {
  const collection = await getCollection((await params).slug, await getDisplayCurrency());
  if (!collection) notFound();
  const viewer = await viewerState(collection.items.map((i) => i.id));
  return (
    <div className="flex flex-col gap-12 pb-16">
      <header className="bg-linear-to-b from-canvas-subtle to-canvas">
        <div className="container-page grid gap-8 pt-6 pb-10 md:pt-8 lg:grid-cols-2">
          <div className="flex flex-col gap-4">
            <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Collections", href: "/collections" }, { label: collection.title }]} baseUrl={process.env.NEXT_PUBLIC_APP_URL} />
            <p className="text-micro font-semibold tracking-widest text-accent-strong uppercase">
              {collection.items.length} products · {collection.category?.name ?? "Collection"}
            </p>
            <h1 className="text-display">{collection.title}</h1>
            {collection.description ? <p className="text-body-lg text-fg-secondary">{collection.description}</p> : null}
            {collection.bundle?.price ? (
              <div className="flex flex-wrap items-center gap-4 rounded-lg border border-line bg-surface p-4">
                <div className="flex flex-col">
                  <span className="text-caption text-fg-muted">Get the {collection.bundle.title}</span>
                  <Price price={collection.bundle.price} />
                </div>
                <Button asChild className="ml-auto">
                  <Link href={collection.bundle.href}>View bundle</Link>
                </Button>
              </div>
            ) : null}
          </div>
          <div className="self-end">
            <Shelf books={toShelfBooks(collection.items)} label={`${collection.title} shelf`} allowListView={false} />
          </div>
        </div>
      </header>
      <section aria-labelledby="collection-items" className="container-page flex flex-col gap-6">
        <h2 id="collection-items" className="text-h2">
          In this collection
        </h2>
        <ProductGrid products={collection.items} viewer={viewer} columns="wide" />
      </section>
    </div>
  );
}

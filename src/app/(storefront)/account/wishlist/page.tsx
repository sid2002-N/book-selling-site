import type { Metadata } from "next";
import { SectionHeader } from "@/components/catalog/SectionHeader";
import { ProductGrid, ProductRail } from "@/components/commerce/ProductGrid";
import { SystemState } from "@/components/system/SystemState";
import { requireUserPage } from "@/modules/auth";
import { recommendations, wishlistCards } from "@/modules/engagement";
import { getDisplayCurrency } from "@/modules/pricing";
import { viewerState } from "@/modules/storefront";

export const metadata: Metadata = { title: "Wishlist", robots: { index: false } };

/** Wishlist (sheets 23–24). Items you already own show as owned rather than purchasable. */
export default async function WishlistPage() {
  const { user } = await requireUserPage("/account/wishlist");
  const currency = await getDisplayCurrency();
  const [items, recs] = await Promise.all([wishlistCards(user.id, currency), recommendations(user.id, currency, 8)]);
  const viewer = await viewerState([...items, ...recs].map((p) => p.id));
  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-h1">My Wishlist</h1>
        <p className="text-body-sm text-fg-secondary">{items.length ? `${items.length} saved ${items.length === 1 ? "title" : "titles"}` : "Save titles to come back to later."}</p>
      </header>
      {items.length ? <ProductGrid products={items} viewer={viewer} columns="wide" /> : <SystemState variant="empty-wishlist" layout="inline" headingLevel="h2" />}
      {recs.length ? (
        <section aria-labelledby="love-title" className="flex flex-col gap-4">
          <SectionHeader id="love-title" title="Find Something to Love" href="/explore" />
          <ProductRail products={recs} viewer={viewer} />
        </section>
      ) : null}
    </div>
  );
}

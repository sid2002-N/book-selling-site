import { ArrowLeft, ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { SectionHeader } from "@/components/catalog/SectionHeader";
import { CartItemRow } from "@/components/commerce/CartItemRow";
import { CouponForm } from "@/components/commerce/CouponForm";
import { OrderSummary } from "@/components/commerce/OrderSummary";
import { ProductRail } from "@/components/commerce/ProductGrid";
import { FormAlert } from "@/components/auth/FormAlert";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { SystemState } from "@/components/system/SystemState";
import { Button } from "@/components/ui/Button";
import { formatMoney } from "@/lib/money";
import { cartView } from "@/modules/cart";
import { listRail } from "@/modules/catalog";
import { getSetting } from "@/modules/settings";
import { viewerState } from "@/modules/storefront";

export const metadata: Metadata = { title: "Your Cart", robots: { index: false } };

export default async function CartPage() {
  const cart = await cartView();
  const [suggestions, refundWindowDays] = await Promise.all([listRail("featured", cart.currency, 8), getSetting("refunds.windowDays")]);
  const inCart = new Set([...cart.items, ...cart.savedForLater].map((i) => i.id));
  const rail = suggestions.filter((s) => !inCart.has(s.id)).slice(0, 6);
  const viewer = await viewerState(rail.map((r) => r.id));

  return (
    <div className="container-page flex flex-col gap-8 py-6 md:py-10">
      <div className="flex flex-col gap-3">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Cart" }]} />
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-h1">Your Cart</h1>
            {cart.items.length ? (
              <p className="text-body-sm text-fg-muted">
                {cart.items.length} {cart.items.length === 1 ? "item" : "items"} · {formatMoney({ amountMinor: cart.quote.totalMinor, currency: cart.currency })}
              </p>
            ) : null}
          </div>
          <Link href="/explore" className="flex items-center gap-1.5 text-label font-medium text-fg-secondary hover:text-fg">
            <ArrowLeft className="size-4" aria-hidden /> Continue shopping
          </Link>
        </div>
      </div>

      {cart.notices.map((n) => (
        <FormAlert key={n}>{n}</FormAlert>
      ))}

      {cart.items.length === 0 ? (
        <SystemState variant="empty-cart" layout="inline" headingLevel="h2" />
      ) : (
        <div className="grid gap-8 lg:grid-cols-3">
          <section aria-label="Items in your cart" className="lg:col-span-2">
            <ul className="divide-y divide-line rounded-xl border border-line bg-surface px-5">
              {cart.items.map((item) => (
                <CartItemRow key={item.id} item={item} />
              ))}
            </ul>
          </section>
          <div className="lg:sticky lg:top-24 lg:self-start">
            <OrderSummary quote={cart.quote} refundWindowDays={refundWindowDays}>
              <CouponForm applied={cart.couponCode} />
              <Button asChild size="lg" block>
                <Link href="/checkout">
                  Proceed to Checkout <ArrowRight />
                </Link>
              </Button>
            </OrderSummary>
          </div>
        </div>
      )}

      {cart.savedForLater.length ? (
        <section aria-labelledby="saved-title" className="flex flex-col gap-3">
          <h2 id="saved-title" className="text-h3">
            Saved for later
          </h2>
          <ul className="divide-y divide-line rounded-xl border border-line bg-surface px-5">
            {cart.savedForLater.map((item) => (
              <CartItemRow key={item.id} item={item} saved />
            ))}
          </ul>
        </section>
      ) : null}

      {rail.length ? (
        <section aria-labelledby="also-like" className="flex flex-col gap-5">
          <SectionHeader id="also-like" title={cart.items.length ? "You May Also Like" : "Popular Right Now"} href="/explore" />
          <ProductRail products={rail} viewer={viewer} />
        </section>
      ) : null}
    </div>
  );
}

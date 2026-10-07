import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { CheckoutFlow } from "@/components/checkout/CheckoutFlow";
import { CouponForm } from "@/components/commerce/CouponForm";
import { OrderSummary } from "@/components/commerce/OrderSummary";
import { FormAlert } from "@/components/auth/FormAlert";
import { BookCover } from "@/components/library/BookCover";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { SystemState } from "@/components/system/SystemState";
import { countryOptions } from "@/config/countries";
import { formatMoney } from "@/lib/money";
import { getCurrentUser } from "@/modules/auth";
import { cartView } from "@/modules/cart";
import { providersFor } from "@/modules/payments";
import { getSetting } from "@/modules/settings";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function CheckoutPage() {
  const [cart, user, guestEnabled, refundWindowDays] = await Promise.all([cartView(), getCurrentUser(), getSetting("checkout.guestEnabled"), getSetting("refunds.windowDays")]);

  if (cart.items.length === 0) {
    return (
      <div className="container-page py-10">
        <SystemState variant="empty-cart" layout="inline" headingLevel="h1" />
      </div>
    );
  }
  if (!user && !guestEnabled) {
    return (
      <div className="container-page py-10">
        <SystemState variant="unauthorized" layout="inline" headingLevel="h1" title="Sign in to check out" message="Please sign in or create an account to complete your purchase." primary={{ label: "Sign in", href: "/login?next=/checkout" }} />
      </div>
    );
  }

  const h = await headers();
  const headerCountry = (h.get("x-vercel-ip-country") ?? h.get("cf-ipcountry") ?? "").toUpperCase();
  const defaultCountry = /^[A-Z]{2}$/.test(headerCountry) ? headerCountry : cart.currency === "INR" ? "IN" : "US";
  const providers = await providersFor(cart.currency);
  const lineTotal = new Map(cart.quote.lines.map((l) => [l.productId, l.unitMinor]));
  // Re-mount (fresh idempotency key) whenever the priced cart changes.
  const signature = `${cart.currency}:${cart.quote.totalMinor}:${cart.items.map((i) => i.id).join(",")}`;

  return (
    <div className="container-page flex flex-col gap-6 py-6 md:py-10">
      <div className="flex flex-col gap-3">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Cart", href: "/cart" }, { label: "Checkout" }]} />
        <h1 className="text-h1">Checkout</h1>
      </div>
      {cart.notices.map((n) => (
        <FormAlert key={n}>{n}</FormAlert>
      ))}
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CheckoutFlow
            key={signature}
            user={user ? { name: user.name, email: user.email } : null}
            currency={cart.currency}
            totalMinor={cart.quote.totalMinor}
            providers={providers}
            defaultCountry={defaultCountry}
            countries={countryOptions()}
          />
        </div>
        <div className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
          <OrderSummary quote={cart.quote} refundWindowDays={refundWindowDays}>
            <ul className="flex flex-col gap-3 border-t border-line pt-4" aria-label="Items">
              {cart.items.map((item) => (
                <li key={item.id} className="flex items-center gap-3">
                  <div className="w-10 shrink-0">
                    <BookCover id={item.id} title={item.title} coverUrl={item.coverUrl} spineColor={item.spineColor} sizes="40px" compact />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body-sm font-medium text-fg">{item.title}</p>
                    <p className="text-caption text-fg-muted">{item.typeLabel}</p>
                  </div>
                  <span className="text-body-sm tabular-nums">{formatMoney({ amountMinor: lineTotal.get(item.id) ?? 0, currency: cart.currency })}</span>
                </li>
              ))}
            </ul>
            <CouponForm applied={cart.couponCode} />
            <Link href="/cart" className="text-center text-caption font-medium text-fg-secondary underline underline-offset-2 hover:text-fg">
              Edit cart
            </Link>
          </OrderSummary>
        </div>
      </div>
    </div>
  );
}

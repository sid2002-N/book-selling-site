import { Download, Lock, Undo2 } from "lucide-react";
import type { ReactNode } from "react";
import { formatMoney } from "@/lib/money";
import type { Quote } from "@/modules/pricing";

/** Totals block shared by cart, checkout and review — always server-computed. */
export function OrderSummary({ quote, children, refundWindowDays, title = "Order Summary" }: { quote: Quote; children?: ReactNode; refundWindowDays?: number; title?: string }) {
  const m = (amountMinor: number) => formatMoney({ amountMinor, currency: quote.currency });
  return (
    <section aria-label={title} className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-6 shadow-1">
      <h2 className="font-sans text-h4 font-semibold">{title}</h2>
      <dl className="flex flex-col gap-2 text-body-sm">
        <div className="flex justify-between">
          <dt className="text-fg-secondary">Subtotal</dt>
          <dd className="tabular-nums">{m(quote.subtotalMinor)}</dd>
        </div>
        {quote.discountMinor > 0 ? (
          <div className="flex justify-between text-success">
            <dt>Discount{quote.coupon ? ` (${quote.coupon.code})` : ""}</dt>
            <dd className="tabular-nums">−{m(quote.discountMinor)}</dd>
          </div>
        ) : null}
        <div className="flex justify-between border-t border-line pt-3 text-body font-semibold">
          <dt>Total</dt>
          <dd className="font-serif text-h3 tabular-nums">{m(quote.totalMinor)}</dd>
        </div>
        {quote.taxMinor > 0 ? <p className="text-caption text-fg-muted">Includes {m(quote.taxMinor)} in taxes.</p> : null}
        {quote.savingsMinor + quote.discountMinor > 0 ? (
          <p className="text-caption font-medium text-success">You&apos;re saving {m(quote.savingsMinor + quote.discountMinor)}</p>
        ) : null}
      </dl>
      {children}
      <ul className="flex flex-col gap-2 border-t border-line pt-4 text-caption text-fg-secondary">
        <li className="flex items-center gap-2">
          <Lock className="size-3.5 text-accent-strong" aria-hidden /> Secure checkout with Razorpay or Stripe
        </li>
        <li className="flex items-center gap-2">
          <Download className="size-3.5 text-accent-strong" aria-hidden /> Instant digital access after payment
        </li>
        {refundWindowDays ? (
          <li className="flex items-center gap-2">
            <Undo2 className="size-3.5 text-accent-strong" aria-hidden /> {refundWindowDays}-day refund window
          </li>
        ) : null}
      </ul>
    </section>
  );
}

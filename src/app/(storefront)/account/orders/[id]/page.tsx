import { ArrowLeft, BookOpen, Download, ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RefundRequestDialog } from "@/components/account/RefundRequestDialog";
import { OrderStatusBadge } from "@/components/commerce/OrderStatusBadge";
import { BookCover } from "@/components/library/BookCover";
import { Button } from "@/components/ui/Button";
import { isAppError } from "@/lib/errors";
import { formatMoney } from "@/lib/money";
import { requireUserPage } from "@/modules/auth";
import { orderDetail, type OrderDetail } from "@/modules/orders";

export const metadata: Metadata = { title: "Order details", robots: { index: false } };

const PROVIDER: Record<string, string> = { razorpay: "Razorpay", stripe: "Stripe" };
const PAYMENT_LABEL: Record<string, string> = {
  created: "Not completed",
  processing: "Processing",
  requires_action: "Awaiting authentication",
  pending_verification: "Under verification",
  succeeded: "Paid",
  failed: "Failed",
  cancelled: "Cancelled",
  refunded: "Refunded",
  partially_refunded: "Partially refunded",
  disputed: "Disputed",
};
const REFUND_LABEL: Record<string, string> = { requested: "Requested", approved: "Approved", processing: "Processing", completed: "Completed", rejected: "Declined", failed: "Failed" };

export default async function OrderDetailPage({ params }: PageProps<"/account/orders/[id]">) {
  const { id } = await params;
  const { user } = await requireUserPage(`/account/orders/${id}`);
  let order: OrderDetail;
  try {
    order = await orderDetail(user.id, id);
  } catch (error) {
    if (isAppError(error)) notFound();
    throw error;
  }
  const m = (amountMinor: number) => formatMoney({ amountMinor, currency: order.currency });
  const date = (iso: string) => new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  const paid = ["paid", "partially_refunded"].includes(order.status);
  const awaiting = ["pending_payment", "payment_pending", "failed"].includes(order.status);

  return (
    <div className="flex flex-col gap-6">
      <Link href="/account/orders" className="flex items-center gap-1.5 self-start text-label font-medium text-fg-secondary hover:text-fg">
        <ArrowLeft className="size-4" aria-hidden /> All orders
      </Link>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-h1">Order #{order.orderNumber}</h1>
            <OrderStatusBadge status={order.status} label={order.statusLabel} />
          </div>
          <p className="text-body-sm text-fg-muted">Placed on {date(order.placedAt)}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {order.invoice ? (
            <Button asChild variant="secondary">
              <a href={`/api/v1/account/orders/${order.id}/invoice`}>
                <Download /> Invoice {order.invoice.number}
              </a>
            </Button>
          ) : null}
          {order.refundable ? <RefundRequestDialog orderId={order.id} orderNumber={order.orderNumber} amount={m(order.totalMinor)} /> : null}
          {awaiting ? (
            <Button asChild>
              <Link href={`/checkout/status?order=${order.id}`}>View payment status</Link>
            </Button>
          ) : null}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <section aria-labelledby="items-title" className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-6 lg:col-span-2">
          <h2 id="items-title" className="font-sans text-h4 font-semibold">
            Items
          </h2>
          <ul className="divide-y divide-line">
            {order.items.map((item) => (
              <li key={item.id} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                <div className="w-14 shrink-0">
                  <BookCover id={item.productId} title={item.title} coverUrl={item.coverUrl} spineColor={item.spineColor} sizes="56px" compact />
                </div>
                <div className="min-w-0 flex-1">
                  {item.href ? (
                    <Link href={item.href} className="line-clamp-2 text-body font-semibold hover:underline">
                      {item.title}
                    </Link>
                  ) : (
                    <p className="line-clamp-2 text-body font-semibold">{item.title}</p>
                  )}
                  <p className="text-caption text-fg-muted">{item.typeLabel} · Digital product</p>
                </div>
                <div className="text-right text-body-sm tabular-nums">
                  <p className="font-semibold">{m(item.totalMinor)}</p>
                  {item.discountMinor ? <p className="text-caption text-fg-muted line-through">{m(item.unitPriceMinor)}</p> : null}
                </div>
              </li>
            ))}
          </ul>
          {paid ? (
            <div className="flex flex-wrap gap-3 border-t border-line pt-4">
              <Button asChild>
                <Link href="/account/library">
                  <BookOpen /> Open in library
                </Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/account/downloads">
                  <Download /> Downloads
                </Link>
              </Button>
            </div>
          ) : null}
        </section>

        <div className="flex flex-col gap-6">
          <section aria-labelledby="summary-title" className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-6">
            <h2 id="summary-title" className="font-sans text-h4 font-semibold">
              Summary
            </h2>
            <dl className="flex flex-col gap-2 text-body-sm">
              <div className="flex justify-between">
                <dt className="text-fg-secondary">Subtotal</dt>
                <dd className="tabular-nums">{m(order.subtotalMinor)}</dd>
              </div>
              {order.discountMinor ? (
                <div className="flex justify-between text-success">
                  <dt>Discount{order.coupon ? ` (${order.coupon})` : ""}</dt>
                  <dd className="tabular-nums">−{m(order.discountMinor)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between border-t border-line pt-2 font-semibold">
                <dt>Total</dt>
                <dd className="tabular-nums">{m(order.totalMinor)}</dd>
              </div>
              {order.taxMinor ? <p className="text-caption text-fg-muted">Includes {m(order.taxMinor)} in taxes.</p> : null}
            </dl>
          </section>

          <section aria-labelledby="payment-title" className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-6">
            <h2 id="payment-title" className="font-sans text-h4 font-semibold">
              Payment
            </h2>
            {order.payments.length === 0 ? (
              <p className="text-body-sm text-fg-muted">{order.totalMinor === 0 ? "Free order — no payment needed." : "No payment attempts yet."}</p>
            ) : (
              <ul className="flex flex-col gap-3 text-body-sm">
                {order.payments.map((p) => (
                  <li key={p.id} className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">
                        {PROVIDER[p.provider] ?? p.provider}
                        {p.method ? <span className="text-fg-muted"> · {p.method}</span> : null}
                      </p>
                      <p className="text-caption text-fg-muted">{date(p.createdAt)}</p>
                    </div>
                    <OrderStatusBadge status={p.status === "succeeded" ? "paid" : p.status === "created" ? "cancelled" : p.status} label={PAYMENT_LABEL[p.status] ?? p.status} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          {order.refunds.length || order.refundBlockedReason ? (
            <section aria-labelledby="refund-title" className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-6">
              <h2 id="refund-title" className="font-sans text-h4 font-semibold">
                Refunds
              </h2>
              {order.refunds.map((r) => (
                <div key={r.id} className="flex items-start justify-between gap-3 text-body-sm">
                  <div>
                    <p className="font-medium">
                      {r.refundNumber} · {m(r.amountMinor)}
                    </p>
                    <p className="text-caption text-fg-muted">Requested {date(r.createdAt)}</p>
                  </div>
                  <OrderStatusBadge status={r.status} label={REFUND_LABEL[r.status] ?? r.status} />
                </div>
              ))}
              {!order.refundable && order.refundBlockedReason && paid ? <p className="text-caption text-fg-muted">{order.refundBlockedReason}</p> : null}
              <Link href="/refund-policy" className="flex items-center gap-1 text-caption font-medium text-fg-secondary underline underline-offset-2">
                Refund policy ({order.refundWindowDays} days) <ExternalLink className="size-3" aria-hidden />
              </Link>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}

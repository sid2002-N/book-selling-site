import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { OrderStatusBadge } from "@/components/commerce/OrderStatusBadge";
import { SystemState } from "@/components/system/SystemState";
import { Pagination } from "@/components/ui/Pagination";
import { formatMoney } from "@/lib/money";
import { requireUserPage } from "@/modules/auth";
import { listOrders } from "@/modules/orders";

export const metadata: Metadata = { title: "Orders", robots: { index: false } };

export default async function OrdersPage({ searchParams }: PageProps<"/account/orders">) {
  const { user } = await requireUserPage("/account/orders");
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const orders = await listOrders(user.id, page);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-h1">Orders</h1>
        <p className="text-body-sm text-fg-secondary">Your purchases, receipts and refund requests.</p>
      </header>
      {orders.items.length === 0 ? (
        <SystemState variant="empty-orders" layout="inline" headingLevel="h2" />
      ) : (
        <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
          {orders.items.map((o) => (
            <li key={o.id}>
              <Link href={`/account/orders/${o.id}`} className="flex items-center gap-4 px-5 py-4 transition-colors duration-fast hover:bg-canvas-subtle">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-body font-semibold text-fg">#{o.orderNumber}</span>
                    <OrderStatusBadge status={o.status} label={o.statusLabel} />
                  </div>
                  <p className="truncate text-body-sm text-fg-secondary">{o.titles.join(", ")}</p>
                  <p className="text-caption text-fg-muted">
                    <time dateTime={o.placedAt}>{new Date(o.placedAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}</time> · {o.itemCount} {o.itemCount === 1 ? "item" : "items"}
                  </p>
                </div>
                <span className="font-semibold tabular-nums">{formatMoney({ amountMinor: o.totalMinor, currency: o.currency })}</span>
                <ChevronRight className="size-4 text-fg-muted" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Pagination page={orders.page} totalPages={orders.totalPages} hrefFor={(p) => `/account/orders?page=${p}`} className="self-center" />
    </div>
  );
}

import { AlertTriangle, MessageSquareText, RotateCcw } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { fmtDateTime, fmtMoney } from "@/components/admin/format";
import { RevenueChart } from "@/components/admin/RevenueChart";
import { EmptyRow, MetricCard, PageHeader, Panel, StatusChip, Table, Td, Th } from "@/components/admin/ui";
import { Button } from "@/components/ui/Button";
import { redirect } from "next/navigation";
import { adminNav } from "@/config/navigation";
import { requireAdminArea, type PermissionKey } from "@/modules/admin";
import { dashboard, percentChange } from "@/modules/backoffice";

export const metadata: Metadata = { title: "Dashboard" };

export default async function AdminDashboardPage() {
  const ctx = await requireAdminArea("/admin");
  if (!ctx.permissions.has("analytics.read")) {
    // Roles without analytics land on the first area they can use instead of a 403.
    const first = adminNav.flatMap((g) => g.items).find((i) => ctx.permissions.has(i.permission as PermissionKey));
    redirect(first?.href ?? "/403");
  }
  const d = await dashboard(30);
  const attention = [
    { show: d.attention.pendingRefunds > 0 && ctx.permissions.has("orders.read"), icon: RotateCcw, text: `${d.attention.pendingRefunds} refund request${d.attention.pendingRefunds === 1 ? "" : "s"} waiting for a decision`, href: "/admin/refunds?status=requested" },
    { show: d.attention.pendingReviews > 0 && ctx.permissions.has("reviews.moderate"), icon: MessageSquareText, text: `${d.attention.pendingReviews} review${d.attention.pendingReviews === 1 ? "" : "s"} to moderate`, href: "/admin/reviews" },
    { show: d.attention.failedWebhooks > 0 && ctx.permissions.has("payments.read"), icon: AlertTriangle, text: `${d.attention.failedWebhooks} payment webhook${d.attention.failedWebhooks === 1 ? "" : "s"} failed to process`, href: "/admin/payments?view=webhooks&status=failed" },
  ].filter((a) => a.show);

  return (
    <>
      <PageHeader
        title={`Good to see you, ${ctx.user.name.split(" ")[0]}`}
        description="The last 30 days, compared with the 30 days before. Revenue is paid orders minus completed refunds, per currency."
        actions={
          ctx.permissions.has("products.create") ? (
            <Button asChild size="sm">
              <Link href="/admin/products/new">New product</Link>
            </Button>
          ) : null
        }
      />

      {attention.length ? (
        <ul className="mb-6 flex flex-col gap-2">
          {attention.map((a) => (
            <li key={a.href}>
              <Link href={a.href} className="flex items-center gap-3 rounded-md border border-warning/30 bg-warning-soft px-4 py-2.5 text-body-sm font-medium text-fg hover:shadow-1">
                <a.icon className="size-4 text-warning" aria-hidden />
                {a.text}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <MetricCard label="Revenue (INR)" value={fmtMoney(d.revenue.INR.current, "INR")} change={percentChange(d.revenue.INR)} hint="vs previous 30 days" />
        <MetricCard label="Revenue (USD)" value={fmtMoney(d.revenue.USD.current, "USD")} change={percentChange(d.revenue.USD)} hint="vs previous 30 days" />
        <MetricCard label="Paid orders" value={d.orders.current} change={percentChange(d.orders)} href={ctx.permissions.has("orders.read") ? "/admin/orders?tab=completed" : undefined} />
        <MetricCard label="New customers" value={d.customers.current} change={percentChange(d.customers)} href={ctx.permissions.has("customers.read") ? "/admin/customers" : undefined} />
        <MetricCard label="Downloads" value={d.downloads.current} change={percentChange(d.downloads)} hint="completed" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Panel title="Daily revenue" description="Paid order value by day (UTC)" className="xl:col-span-2">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <p className="mb-2 text-caption font-semibold text-fg-secondary">INR</p>
              <RevenueChart series={d.series.INR} currency="INR" />
            </div>
            <div>
              <p className="mb-2 text-caption font-semibold text-fg-secondary">USD</p>
              <RevenueChart series={d.series.USD} currency="USD" />
            </div>
          </div>
        </Panel>
        <Panel title="Top products" description="By paid sales, last 30 days" flush>
          {d.topProducts.length ? (
            <ol className="divide-y divide-line">
              {d.topProducts.map((p, i) => (
                <li key={p.productId} className="flex items-center gap-3 px-4 py-2.5 text-body-sm">
                  <span className="w-4 text-caption text-fg-muted tabular-nums">{i + 1}</span>
                  <Link href={`/admin/products/${p.productId}`} className="min-w-0 flex-1 truncate font-medium text-fg hover:underline">
                    {p.title}
                  </Link>
                  <span className="text-fg-secondary tabular-nums">{p.sales} sold</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="px-4 py-8 text-center text-body-sm text-fg-muted">No sales in this period yet.</p>
          )}
          <p className="border-t border-line px-4 py-2.5 text-caption text-fg-muted">
            Catalogue: {d.catalog.live} live · {d.catalog.drafts} draft{d.catalog.drafts === 1 ? "" : "s"}
          </p>
        </Panel>
      </div>

      {ctx.permissions.has("orders.read") ? (
        <Panel title="Recent orders" className="mt-6" flush actions={<Link href="/admin/orders" className="text-label font-medium text-accent-strong hover:underline">All orders</Link>}>
          <Table>
            <thead>
              <tr>
                <Th>Order</Th>
                <Th>Customer</Th>
                <Th>Total</Th>
                <Th>Status</Th>
                <Th>Placed</Th>
              </tr>
            </thead>
            <tbody>
              {d.recentOrders.length ? (
                d.recentOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-canvas-subtle/60">
                    <Td>
                      <Link href={`/admin/orders/${o.id}`} className="font-semibold text-fg hover:underline">
                        {o.orderNumber}
                      </Link>
                    </Td>
                    <Td className="text-fg-secondary">{o.user?.name ?? o.guestEmail ?? "Guest"}</Td>
                    <Td className="tabular-nums">{fmtMoney(o.totalMinor, o.currency)}</Td>
                    <Td>
                      <StatusChip value={o.status} />
                    </Td>
                    <Td className="text-fg-muted">{fmtDateTime(o.placedAt)}</Td>
                  </tr>
                ))
              ) : (
                <EmptyRow colSpan={5}>No orders yet.</EmptyRow>
              )}
            </tbody>
          </Table>
        </Panel>
      ) : null}
    </>
  );
}

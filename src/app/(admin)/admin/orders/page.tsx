import type { Metadata } from "next";
import Link from "next/link";
import { fmtDateTime, fmtMoney, humanize } from "@/components/admin/format";
import { EmptyRow, FilterTabs, PageHeader, Panel, SearchBar, StatusChip, Table, Td, Th } from "@/components/admin/ui";
import { Pagination } from "@/components/ui/Pagination";
import { requireAdminPage } from "@/modules/admin";
import { listOrders } from "@/modules/backoffice";

export const metadata: Metadata = { title: "Orders" };

const TABS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "completed", label: "Completed" },
  { key: "failed", label: "Failed" },
  { key: "refunded", label: "Refunded" },
  { key: "disputed", label: "Disputed" },
] as const;

export default async function AdminOrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  await requireAdminPage("orders.read", "/admin/orders");
  const sp = await searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const data = await listOrders({ tab: str("tab"), q: str("q"), provider: str("provider"), page: Number(sp.page) || 1 });
  const href = (params: Record<string, string | number | undefined>) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries({ tab: data.tab, q: str("q"), provider: str("provider"), ...params })) if (v !== undefined && v !== "" && v !== "all") u.set(k, String(v));
    const s = u.toString();
    return `/admin/orders${s ? `?${s}` : ""}`;
  };
  return (
    <>
      <PageHeader title="Orders" description="Every order and its payment state. Payment status comes only from verified provider events." />
      <Panel flush>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
          <FilterTabs active={data.tab} tabs={TABS.map((t) => ({ key: t.key, label: t.label, href: href({ tab: t.key, page: undefined }), count: data.tabCounts[t.key] }))} />
          <div className="flex flex-wrap items-center gap-2">
            <FilterTabs
              active={str("provider") ?? "any"}
              tabs={[
                { key: "any", label: "Any provider", href: href({ provider: undefined, page: undefined }) },
                { key: "razorpay", label: "Razorpay", href: href({ provider: "razorpay", page: undefined }) },
                { key: "stripe", label: "Stripe", href: href({ provider: "stripe", page: undefined }) },
              ]}
            />
            <SearchBar action="/admin/orders" placeholder="Order number, name or email" defaultValue={str("q")} keep={{ tab: data.tab === "all" ? undefined : data.tab, provider: str("provider") }} />
          </div>
        </div>
        <Table>
          <thead>
            <tr>
              <Th>Order</Th>
              <Th>Customer</Th>
              <Th>Items</Th>
              <Th>Total</Th>
              <Th>Payment</Th>
              <Th>Status</Th>
              <Th>Placed</Th>
            </tr>
          </thead>
          <tbody>
            {data.rows.length ? (
              data.rows.map((o) => (
                <tr key={o.id} className="hover:bg-canvas-subtle/60">
                  <Td>
                    <Link href={`/admin/orders/${o.id}`} className="font-semibold text-fg hover:underline">
                      {o.orderNumber}
                    </Link>
                  </Td>
                  <Td>
                    <span className="block text-fg">{o.user?.name ?? o.billingName ?? "Guest"}</span>
                    <span className="block text-caption text-fg-muted">{o.user?.email ?? o.guestEmail}</span>
                  </Td>
                  <Td className="tabular-nums text-fg-secondary">{o._count.items}</Td>
                  <Td className="tabular-nums">{fmtMoney(o.totalMinor, o.currency)}</Td>
                  <Td className="text-fg-secondary">{o.payments[0] ? humanize(o.payments[0].provider) : "—"}</Td>
                  <Td>
                    <StatusChip value={o.status} />
                  </Td>
                  <Td className="text-fg-muted">{fmtDateTime(o.placedAt)}</Td>
                </tr>
              ))
            ) : (
              <EmptyRow colSpan={7}>No orders match these filters.</EmptyRow>
            )}
          </tbody>
        </Table>
        <div className="flex items-center justify-between px-4 py-3 text-caption text-fg-muted">
          <span>
            {data.total} order{data.total === 1 ? "" : "s"}
          </span>
          <Pagination page={data.page} totalPages={data.totalPages} hrefFor={(p) => href({ page: p })} />
        </div>
      </Panel>
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { fmtDateTime, fmtMoney } from "@/components/admin/format";
import { EmptyRow, FilterTabs, PageHeader, Panel, StatusChip, Table, Td, Th } from "@/components/admin/ui";
import { Pagination } from "@/components/ui/Pagination";
import { requireAdminPage } from "@/modules/admin";
import { listRefunds } from "@/modules/backoffice";

export const metadata: Metadata = { title: "Refunds" };

const TABS = ["all", "requested", "processing", "completed", "rejected", "failed"] as const;

export default async function AdminRefundsPage({ searchParams }: PageProps<"/admin/refunds">) {
  await requireAdminPage("orders.read", "/admin/refunds");
  const sp = await searchParams;
  const status = typeof sp.status === "string" && (TABS as readonly string[]).includes(sp.status) ? sp.status : "all";
  const data = await listRefunds({ status: status === "all" ? undefined : status, page: Number(sp.page) || 1 });
  const href = (s: string, page?: number) => `/admin/refunds?${new URLSearchParams({ ...(s !== "all" ? { status: s } : {}), ...(page && page > 1 ? { page: String(page) } : {}) })}`;
  return (
    <>
      <PageHeader title="Refunds" description="Customer requests and admin-issued refunds. Approve or reject from the order page." />
      <Panel flush>
        <div className="border-b border-line px-4 py-3">
          <FilterTabs active={status} tabs={TABS.map((t) => ({ key: t, label: t === "all" ? "All" : t.charAt(0).toUpperCase() + t.slice(1), href: href(t), count: t === "requested" ? data.requested : undefined }))} />
        </div>
        <Table>
          <thead>
            <tr>
              <Th>Refund</Th>
              <Th>Order</Th>
              <Th>Customer</Th>
              <Th>Amount</Th>
              <Th>Reason</Th>
              <Th>Status</Th>
              <Th>Requested</Th>
            </tr>
          </thead>
          <tbody>
            {data.rows.length ? (
              data.rows.map((r) => (
                <tr key={r.id} className="hover:bg-canvas-subtle/60">
                  <Td className="font-semibold">{r.refundNumber}</Td>
                  <Td>
                    <Link href={`/admin/orders/${r.order.id}`} className="font-medium text-fg hover:underline">
                      {r.order.orderNumber}
                    </Link>
                  </Td>
                  <Td className="text-fg-secondary">{r.order.user?.name ?? r.order.guestEmail ?? "Guest"}</Td>
                  <Td className="tabular-nums">
                    {fmtMoney(r.amountMinor, r.currency)}
                    {r.amountMinor < r.order.totalMinor ? <span className="text-caption text-fg-muted"> partial</span> : null}
                  </Td>
                  <Td className="max-w-xs truncate text-fg-secondary">{r.reason}</Td>
                  <Td>
                    <StatusChip value={r.status} />
                  </Td>
                  <Td className="text-fg-muted">{fmtDateTime(r.createdAt)}</Td>
                </tr>
              ))
            ) : (
              <EmptyRow colSpan={7}>No refunds here.</EmptyRow>
            )}
          </tbody>
        </Table>
        <div className="flex justify-end px-4 py-3">
          <Pagination page={data.page} totalPages={data.totalPages} hrefFor={(p) => href(status, p)} />
        </div>
      </Panel>
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { archiveCouponAction } from "../actions";
import { ActionButton } from "@/components/admin/ActionButton";
import { fmtDate, fmtMoney } from "@/components/admin/format";
import { EmptyRow, FilterTabs, PageHeader, Panel, StatusChip, Table, Td, Th } from "@/components/admin/ui";
import { Button } from "@/components/ui/Button";
import { requireAdminPage } from "@/modules/admin";
import { listCoupons } from "@/modules/backoffice";

export const metadata: Metadata = { title: "Coupons" };

export default async function AdminCouponsPage({ searchParams }: PageProps<"/admin/coupons">) {
  await requireAdminPage("marketing.manage", "/admin/coupons");
  const sp = await searchParams;
  const view = sp.view === "archived" ? "archived" : "current";
  const rows = await listCoupons({ view });
  return (
    <>
      <PageHeader
        title="Coupons"
        description="Discount codes customers enter at checkout. Usage counts come from real redemptions on paid orders."
        actions={
          <Button asChild size="sm">
            <Link href="/admin/coupons/new">New coupon</Link>
          </Button>
        }
      />
      <Panel flush>
        <div className="border-b border-line px-4 py-3">
          <FilterTabs active={view} tabs={[{ key: "current", label: "Current", href: "/admin/coupons" }, { key: "archived", label: "Archived", href: "/admin/coupons?view=archived" }]} />
        </div>
        <Table>
          <thead>
            <tr>
              <Th>Code</Th>
              <Th>Discount</Th>
              <Th>Used</Th>
              <Th>Discount given</Th>
              <Th>Valid</Th>
              <Th>Status</Th>
              <Th>
                <span className="sr-only">Actions</span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((c) => {
                const state = c.state;
                return (
                  <tr key={c.id} className="hover:bg-canvas-subtle/60">
                    <Td>
                      <Link href={`/admin/coupons/${c.id}`} className="font-mono font-semibold text-fg hover:underline">
                        {c.code}
                      </Link>
                      {c.description ? <span className="block text-caption text-fg-muted">{c.description}</span> : null}
                    </Td>
                    <Td>{c.type === "percent" ? `${c.value}% off` : `${fmtMoney(c.value, c.currency ?? "INR")} off`}</Td>
                    <Td className="tabular-nums">
                      {c._count.redemptions}
                      {c.usageLimit ? <span className="text-fg-muted"> / {c.usageLimit}</span> : null}
                    </Td>
                    <Td className="tabular-nums text-fg-secondary">{c.discountGivenMinor ? (c.currency ? fmtMoney(c.discountGivenMinor, c.currency) : `${(c.discountGivenMinor / 100).toFixed(2)} (mixed)`) : "—"}</Td>
                    <Td className="text-fg-muted">
                      {c.startsAt ? fmtDate(c.startsAt) : "Now"} – {c.endsAt ? fmtDate(c.endsAt) : "no end"}
                    </Td>
                    <Td>
                      <StatusChip value={state} />
                    </Td>
                    <Td className="text-right">
                      {c.archivedAt ? (
                        <ActionButton action={archiveCouponAction.bind(null, c.id, false)} variant="ghost">
                          Restore
                        </ActionButton>
                      ) : (
                        <ActionButton action={archiveCouponAction.bind(null, c.id, true)} variant="ghost" confirm={{ title: `Archive ${c.code}?`, description: "The code stops working at checkout. Past orders keep their discount.", confirmLabel: "Archive", destructive: true }}>
                          Archive
                        </ActionButton>
                      )}
                    </Td>
                  </tr>
                );
              })
            ) : (
              <EmptyRow colSpan={7}>{view === "archived" ? "No archived coupons." : "No coupons yet."}</EmptyRow>
            )}
          </tbody>
        </Table>
      </Panel>
    </>
  );
}

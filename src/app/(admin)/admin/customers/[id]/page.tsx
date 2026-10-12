import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { blockCustomerAction, revokeSessionsAction, unblockCustomerAction } from "../../actions";
import { ActionButton } from "@/components/admin/ActionButton";
import { fmtDate, fmtDateTime, fmtMoney, humanize } from "@/components/admin/format";
import { DefinitionList, MetricCard, PageHeader, Panel, StatusChip, Table, Td, Th } from "@/components/admin/ui";
import { isAppError } from "@/lib/errors";
import { requireAdminPage } from "@/modules/admin";
import { customerDetail } from "@/modules/backoffice";

export const metadata: Metadata = { title: "Customer" };

export default async function AdminCustomerPage({ params }: PageProps<"/admin/customers/[id]">) {
  const { id } = await params;
  await requireAdminPage("customers.read", `/admin/customers/${id}`);
  const data = await customerDetail(id).catch((error) => {
    if (isAppError(error) && error.code === "NOT_FOUND") notFound();
    throw error;
  });
  const { user: u } = data;
  return (
    <>
      <PageHeader
        back={{ href: "/admin/customers", label: "Customers" }}
        title={u.name}
        badge={<StatusChip value={u.status} />}
        description={u.email}
        actions={
          data.canManage ? (
            <>
              {data.activeSessions > 0 ? (
                <ActionButton action={revokeSessionsAction.bind(null, u.id)} confirm={{ title: "Sign this customer out everywhere?", description: `Ends ${data.activeSessions} active session${data.activeSessions === 1 ? "" : "s"}. They can sign in again.`, confirmLabel: "Sign out everywhere" }}>
                  Sign out everywhere
                </ActionButton>
              ) : null}
              {u.status === "blocked" || u.status === "locked" ? (
                <ActionButton action={unblockCustomerAction.bind(null, u.id)} variant="primary" confirm={{ title: "Unblock this customer?", description: "They can sign in and buy again.", confirmLabel: "Unblock" }}>
                  Unblock
                </ActionButton>
              ) : (
                <ActionButton action={blockCustomerAction.bind(null, u.id)} variant="destructive-outline" reason={{ title: "Block this customer?", description: "They're signed out everywhere and can't sign in. Purchases stay in their library for when you unblock them.", label: "Reason (kept in the audit log)", required: true, confirmLabel: "Block customer", destructive: true }}>
                  Block
                </ActionButton>
              )}
            </>
          ) : null
        }
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Lifetime spend" value={data.spend.length ? data.spend.map((s) => fmtMoney(s.amountMinor, s.currency)).join(" + ") : "—"} />
        <MetricCard label="Orders" value={data.orders.length} />
        <MetricCard label="Downloads" value={data.downloads} />
        <MetricCard label="Reviews" value={data.reviews} />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-6 xl:col-span-2">
          <Panel title="Orders" flush>
            <Table>
              <thead>
                <tr>
                  <Th>Order</Th>
                  <Th>Total</Th>
                  <Th>Status</Th>
                  <Th>Placed</Th>
                </tr>
              </thead>
              <tbody>
                {data.orders.length ? (
                  data.orders.map((o) => (
                    <tr key={o.id}>
                      <Td>
                        <Link href={`/admin/orders/${o.id}`} className="font-semibold text-fg hover:underline">
                          {o.orderNumber}
                        </Link>
                      </Td>
                      <Td className="tabular-nums">{fmtMoney(o.totalMinor, o.currency)}</Td>
                      <Td>
                        <StatusChip value={o.status} />
                      </Td>
                      <Td className="text-fg-muted">{fmtDateTime(o.placedAt)}</Td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <Td colSpan={4} className="py-6 text-center text-fg-muted">
                      No orders yet.
                    </Td>
                  </tr>
                )}
              </tbody>
            </Table>
          </Panel>
          <Panel title="Library" flush>
            <Table>
              <thead>
                <tr>
                  <Th>Product</Th>
                  <Th>Source</Th>
                  <Th>Granted</Th>
                  <Th>Access</Th>
                </tr>
              </thead>
              <tbody>
                {data.library.length ? (
                  data.library.map((l) => (
                    <tr key={l.id}>
                      <Td>
                        <Link href={`/admin/products/${l.product.id}`} className="text-fg hover:underline">
                          {l.product.title}
                        </Link>
                      </Td>
                      <Td className="text-fg-secondary">{humanize(l.source)}</Td>
                      <Td className="text-fg-muted">{fmtDate(l.grantedAt)}</Td>
                      <Td>{l.revokedAt ? <StatusChip value="cancelled" label="Revoked" /> : <StatusChip value="active" />}</Td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <Td colSpan={4} className="py-6 text-center text-fg-muted">
                      Nothing in their library yet.
                    </Td>
                  </tr>
                )}
              </tbody>
            </Table>
          </Panel>
        </div>
        <Panel title="Account">
          <DefinitionList
            items={[
              ["Joined", fmtDate(u.createdAt)],
              ["Last sign-in", fmtDateTime(u.lastLoginAt)],
              ["Email", u.emailVerifiedAt ? `Verified ${fmtDate(u.emailVerifiedAt)}` : "Not verified"],
              ["Sign-in methods", u.accounts.map((a) => humanize(a.provider)).join(", ") || "—"],
              ["Two-factor", u.twoFactor?.enabledAt ? "On" : "Off"],
              ["Active sessions", String(data.activeSessions)],
              ["Country", u.country ?? "—"],
              ["Locked until", u.lockedUntil ? fmtDateTime(u.lockedUntil) : "—"],
            ]}
          />
        </Panel>
      </div>
    </>
  );
}

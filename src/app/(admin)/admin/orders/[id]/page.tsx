import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { approveRefundAction, reconcilePaymentAction, rejectRefundAction, retryRefundAction } from "../../actions";
import { IssueRefund } from "./IssueRefund";
import { ActionButton } from "@/components/admin/ActionButton";
import { fmtDateTime, fmtMoney, humanize } from "@/components/admin/format";
import { DefinitionList, PageHeader, Panel, StatusChip, Table, Td, Th } from "@/components/admin/ui";
import { isAppError } from "@/lib/errors";
import { requireAdminPage } from "@/modules/admin";
import { adminOrderDetail } from "@/modules/backoffice";

export const metadata: Metadata = { title: "Order" };

export default async function AdminOrderPage({ params }: PageProps<"/admin/orders/[id]">) {
  const { id } = await params;
  await requireAdminPage("orders.read", `/admin/orders/${id}`);
  const data = await adminOrderDetail(id).catch((error) => {
    if (isAppError(error) && error.code === "ORDER_NOT_FOUND") notFound();
    throw error;
  });
  const { order: o } = data;
  const money = (n: number) => fmtMoney(n, o.currency);
  const openRefund = o.refunds.some((r) => ["requested", "approved", "processing"].includes(r.status));
  const canIssue = data.canRefund && ["paid", "partially_refunded"].includes(o.status) && data.refundableMinor > 0 && !openRefund;

  return (
    <>
      <PageHeader
        back={{ href: "/admin/orders", label: "Orders" }}
        title={`Order ${o.orderNumber}`}
        badge={<StatusChip value={o.status} />}
        description={`Placed ${fmtDateTime(o.placedAt)}${o.paidAt ? ` · paid ${fmtDateTime(o.paidAt)}` : ""}`}
        actions={canIssue ? <IssueRefund orderId={o.id} refundableLabel={money(data.refundableMinor)} currencySymbol={o.currency} /> : null}
      />
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-6 xl:col-span-2">
          <Panel title="Items" flush>
            <Table>
              <thead>
                <tr>
                  <Th>Product</Th>
                  <Th>Version</Th>
                  <Th className="text-right">Price</Th>
                  <Th className="text-right">Discount</Th>
                </tr>
              </thead>
              <tbody>
                {o.items.map((it) => (
                  <tr key={it.id}>
                    <Td>
                      <Link href={`/admin/products/${it.product.id}`} className="font-medium text-fg hover:underline">
                        {it.titleSnapshot}
                      </Link>
                      <span className="block text-caption text-fg-muted">{humanize(it.typeSnapshot)}</span>
                    </Td>
                    <Td className="text-fg-secondary">{it.version ? `v${it.version.version}` : "—"}</Td>
                    <Td className="text-right tabular-nums">{money(it.unitPriceMinor)}</Td>
                    <Td className="text-right tabular-nums text-fg-secondary">{it.discountMinor ? `−${money(it.discountMinor)}` : "—"}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <dl className="ml-auto flex w-full max-w-xs flex-col gap-1 px-4 py-3 text-body-sm">
              <div className="flex justify-between"><dt className="text-fg-muted">Subtotal</dt><dd className="tabular-nums">{money(o.subtotalMinor)}</dd></div>
              <div className="flex justify-between"><dt className="text-fg-muted">Discount{o.coupon ? ` (${o.coupon.code})` : ""}</dt><dd className="tabular-nums">−{money(o.discountMinor)}</dd></div>
              <div className="flex justify-between"><dt className="text-fg-muted">Tax (inclusive)</dt><dd className="tabular-nums">{money(o.taxMinor)}</dd></div>
              <div className="flex justify-between border-t border-line pt-1 font-semibold"><dt>Total</dt><dd className="tabular-nums">{money(o.totalMinor)}</dd></div>
            </dl>
          </Panel>

          <Panel title="Payments" description="Attempts and provider transactions, oldest first." flush>
            {o.payments.length ? (
              <ul className="divide-y divide-line">
                {o.payments.map((p) => (
                  <li key={p.id} className="flex flex-col gap-2 px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-fg">{humanize(p.provider)}</span>
                        <StatusChip value={p.status} />
                        <span className="text-body-sm tabular-nums text-fg-secondary">{fmtMoney(p.amountMinor, p.currency)}</span>
                      </div>
                      {data.canManagePayments && p.providerOrderRef && !["succeeded", "refunded"].includes(p.status) ? (
                        <ActionButton action={reconcilePaymentAction.bind(null, p.id, o.id)}>Check with provider</ActionButton>
                      ) : null}
                    </div>
                    <p className="text-caption break-all text-fg-muted">
                      {p.providerPaymentRef ?? p.providerOrderRef ?? "Not sent to the provider"}
                      {p.method ? ` · ${p.method}` : ""}
                      {p.failureCode ? ` · failure: ${p.failureCode}${p.failureMessage ? ` — ${p.failureMessage}` : ""}` : ""}
                      {` · created ${fmtDateTime(p.createdAt)}`}
                    </p>
                    {p.transactions.length ? (
                      <ul className="flex flex-col gap-1 border-l-2 border-line pl-3 text-caption text-fg-secondary">
                        {p.transactions.map((t) => (
                          <li key={t.id}>
                            {humanize(t.type)} · {t.status} · {fmtMoney(t.amountMinor, t.currency)} · {fmtDateTime(t.occurredAt)}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-4 py-6 text-body-sm text-fg-muted">No payment attempts.</p>
            )}
          </Panel>

          <Panel title="Refunds" flush>
            {o.refunds.length ? (
              <ul className="divide-y divide-line">
                {o.refunds.map((r) => (
                  <li key={r.id} className="flex flex-col gap-2 px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-fg">{r.refundNumber}</span>
                        <StatusChip value={r.status} />
                        <span className="text-body-sm tabular-nums">{fmtMoney(r.amountMinor, r.currency)}</span>
                      </div>
                      {data.canRefund ? (
                        <div className="flex gap-2">
                          {r.status === "requested" ? (
                            <>
                              <ActionButton action={approveRefundAction.bind(null, r.id, o.id)} variant="primary" confirm={{ title: `Approve ${fmtMoney(r.amountMinor, r.currency)} refund?`, description: "The refund is sent to the payment provider now. Library access for refunded items is revoked when it completes.", confirmLabel: "Approve refund" }}>
                                Approve
                              </ActionButton>
                              <ActionButton action={rejectRefundAction.bind(null, r.id, o.id)} reason={{ title: "Reject this refund?", description: "The customer is emailed your reason.", label: "Reason", required: true, confirmLabel: "Reject refund", destructive: true }}>
                                Reject
                              </ActionButton>
                            </>
                          ) : null}
                          {r.status === "failed" ? <ActionButton action={retryRefundAction.bind(null, r.id, o.id)}>Retry</ActionButton> : null}
                        </div>
                      ) : null}
                    </div>
                    <p className="text-body-sm text-fg-secondary">“{r.reason}”</p>
                    <p className="text-caption text-fg-muted">
                      Requested {fmtDateTime(r.createdAt)}
                      {r.decidedByAdminId ? ` · decided by ${data.deciderNames[r.decidedByAdminId] ?? "an admin"}` : ""}
                      {r.decisionNote ? ` · note: ${r.decisionNote}` : ""}
                      {r.completedAt ? ` · completed ${fmtDateTime(r.completedAt)}` : ""}
                      {r.providerRefundRef ? ` · ${r.providerRefundRef}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-4 py-6 text-body-sm text-fg-muted">No refunds on this order.</p>
            )}
          </Panel>
        </div>

        <div className="flex flex-col gap-6">
          <Panel title="Customer">
            <DefinitionList
              items={[
                ["Name", o.user?.name ?? o.billingName ?? "Guest"],
                ["Email", o.user?.email ?? o.guestEmail ?? "—"],
                ["Account", o.user ? <Link key="u" href={`/admin/customers/${o.user.id}`} className="text-accent-strong hover:underline">View customer</Link> : "Guest checkout"],
                ["Country", o.billingCountry],
              ]}
            />
          </Panel>
          <Panel title="Details">
            <DefinitionList
              items={[
                ["Currency", o.currency],
                ["Invoice", o.invoice?.invoiceNumber ?? "Issued after payment"],
                ["Coupon", o.couponCodeSnapshot ?? "—"],
                ["Cancelled", o.cancelledAt ? fmtDateTime(o.cancelledAt) : "—"],
              ]}
            />
          </Panel>
        </div>
      </div>
    </>
  );
}

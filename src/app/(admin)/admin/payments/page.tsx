import type { Metadata } from "next";
import Link from "next/link";
import { fmtDateTime, fmtMoney, humanize } from "@/components/admin/format";
import { EmptyRow, FilterTabs, PageHeader, Panel, StatusChip, Table, Td, Th } from "@/components/admin/ui";
import { Pagination } from "@/components/ui/Pagination";
import { requireAdminPage } from "@/modules/admin";
import { listPayments, listWebhookEvents } from "@/modules/backoffice";

export const metadata: Metadata = { title: "Payments" };

export default async function AdminPaymentsPage({ searchParams }: PageProps<"/admin/payments">) {
  await requireAdminPage("payments.read", "/admin/payments");
  const sp = await searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const view = str("view") === "webhooks" ? "webhooks" : "payments";
  const page = Number(sp.page) || 1;
  const href = (params: Record<string, string | number | undefined>) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries({ view: view === "payments" ? undefined : view, provider: str("provider"), status: str("status"), ...params })) if (v !== undefined && v !== "") u.set(k, String(v));
    const s = u.toString();
    return `/admin/payments${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <PageHeader title="Payments" description="Provider payments and the webhook events that settle them. Use “Check with provider” on an order to reconcile one payment." />
      <div className="mb-4">
        <FilterTabs
          active={view}
          tabs={[
            { key: "payments", label: "Payments", href: "/admin/payments" },
            { key: "webhooks", label: "Webhook events", href: "/admin/payments?view=webhooks" },
          ]}
        />
      </div>
      {view === "payments" ? <PaymentsTable provider={str("provider")} status={str("status")} page={page} href={href} /> : <WebhooksTable status={str("status")} page={page} href={href} />}
    </>
  );
}

async function PaymentsTable({ provider, status, page, href }: { provider?: string; status?: string; page: number; href: (p: Record<string, string | number | undefined>) => string }) {
  const data = await listPayments({ provider, status, page });
  return (
    <Panel flush>
      <div className="flex flex-wrap gap-3 border-b border-line px-4 py-3">
        <FilterTabs
          active={provider ?? "any"}
          tabs={[
            { key: "any", label: "All providers", href: href({ provider: undefined, page: undefined }) },
            { key: "razorpay", label: "Razorpay (INR)", href: href({ provider: "razorpay", page: undefined }) },
            { key: "stripe", label: "Stripe (USD)", href: href({ provider: "stripe", page: undefined }) },
          ]}
        />
        <FilterTabs
          active={status ?? "any"}
          tabs={[
            { key: "any", label: "Any status", href: href({ status: undefined, page: undefined }) },
            { key: "succeeded", label: "Succeeded", href: href({ status: "succeeded", page: undefined }) },
            { key: "failed", label: "Failed", href: href({ status: "failed", page: undefined }) },
            { key: "pending_verification", label: "Needs verification", href: href({ status: "pending_verification", page: undefined }) },
          ]}
        />
      </div>
      <Table>
        <thead>
          <tr>
            <Th>Order</Th>
            <Th>Provider</Th>
            <Th>Reference</Th>
            <Th>Amount</Th>
            <Th>Method</Th>
            <Th>Status</Th>
            <Th>Created</Th>
          </tr>
        </thead>
        <tbody>
          {data.rows.length ? (
            data.rows.map((p) => (
              <tr key={p.id} className="hover:bg-canvas-subtle/60">
                <Td>
                  <Link href={`/admin/orders/${p.order.id}`} className="font-semibold text-fg hover:underline">
                    {p.order.orderNumber}
                  </Link>
                </Td>
                <Td>{humanize(p.provider)}</Td>
                <Td className="max-w-48 truncate font-mono text-caption text-fg-secondary">{p.providerPaymentRef ?? "—"}</Td>
                <Td className="tabular-nums">{fmtMoney(p.amountMinor, p.currency)}</Td>
                <Td className="text-fg-secondary">{p.method ?? "—"}</Td>
                <Td>
                  <StatusChip value={p.status} />
                  {p.failureCode ? <span className="block text-caption text-fg-muted">{p.failureCode}</span> : null}
                </Td>
                <Td className="text-fg-muted">{fmtDateTime(p.createdAt)}</Td>
              </tr>
            ))
          ) : (
            <EmptyRow colSpan={7}>No payments match these filters.</EmptyRow>
          )}
        </tbody>
      </Table>
      <div className="flex justify-end px-4 py-3">
        <Pagination page={data.page} totalPages={data.totalPages} hrefFor={(p) => href({ page: p })} />
      </div>
    </Panel>
  );
}

async function WebhooksTable({ status, page, href }: { status?: string; page: number; href: (p: Record<string, string | number | undefined>) => string }) {
  const data = await listWebhookEvents({ status, page });
  return (
    <Panel flush>
      <div className="border-b border-line px-4 py-3">
        <FilterTabs
          active={status ?? "any"}
          tabs={["any", "processed", "failed", "ignored", "received"].map((s) => ({ key: s, label: s === "any" ? "All" : humanize(s), href: href({ status: s === "any" ? undefined : s, page: undefined }) }))}
        />
      </div>
      <Table>
        <thead>
          <tr>
            <Th>Provider</Th>
            <Th>Event</Th>
            <Th>Signature</Th>
            <Th>Status</Th>
            <Th>Attempts</Th>
            <Th>Received</Th>
          </tr>
        </thead>
        <tbody>
          {data.rows.length ? (
            data.rows.map((w) => (
              <tr key={w.id}>
                <Td>{humanize(w.provider)}</Td>
                <Td>
                  <span className="block font-medium text-fg">{w.type}</span>
                  <span className="block max-w-xs truncate font-mono text-caption text-fg-muted">{w.eventId}</span>
                </Td>
                <Td>{w.signatureValid ? <StatusChip value="succeeded" label="Valid" /> : <StatusChip value="failed" label="Invalid" />}</Td>
                <Td>
                  <StatusChip value={w.status} />
                  {w.error ? <span className="block max-w-xs truncate text-caption text-error">{w.error}</span> : null}
                </Td>
                <Td className="tabular-nums">{w.attempts}</Td>
                <Td className="text-fg-muted">{fmtDateTime(w.receivedAt)}</Td>
              </tr>
            ))
          ) : (
            <EmptyRow colSpan={6}>No webhook events yet. They appear once Razorpay or Stripe is configured and sends events.</EmptyRow>
          )}
        </tbody>
      </Table>
      <div className="flex justify-end px-4 py-3">
        <Pagination page={data.page} totalPages={data.totalPages} hrefFor={(p) => href({ page: p })} />
      </div>
    </Panel>
  );
}

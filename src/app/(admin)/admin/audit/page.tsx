import type { Metadata } from "next";
import { fmtDateTime } from "@/components/admin/format";
import { EmptyRow, PageHeader, Panel, Table, Td, Th } from "@/components/admin/ui";
import { Pagination } from "@/components/ui/Pagination";
import { requireAdminPage } from "@/modules/admin";
import { listAuditLog } from "@/modules/backoffice";

export const metadata: Metadata = { title: "Audit log" };

function summary(before: unknown, after: unknown): string {
  const s = (v: unknown) => (v === null || v === undefined ? "" : JSON.stringify(v));
  const b = s(before);
  const a = s(after);
  const text = b && a ? `${b} → ${a}` : a || b;
  return text.length > 160 ? `${text.slice(0, 157)}…` : text;
}

export default async function AdminAuditPage({ searchParams }: PageProps<"/admin/audit">) {
  await requireAdminPage("security.read", "/admin/audit");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const entity = typeof sp.entity === "string" ? sp.entity : "";
  const data = await listAuditLog({ q, entity, page: Number(sp.page) || 1 });
  const href = (page: number) => `/admin/audit?${new URLSearchParams({ ...(q ? { q } : {}), ...(entity ? { entity } : {}), page: String(page) })}`;
  return (
    <>
      <PageHeader title="Audit log" description="Append-only record of every admin change: who, what, when, from where." />
      <Panel flush>
        <form method="get" className="flex flex-wrap items-end gap-3 border-b border-line px-4 py-3">
          <label className="flex flex-col gap-1 text-caption font-medium text-fg-muted">
            Action starts with
            <input name="q" defaultValue={q} placeholder="product.publish" className="h-9 rounded-sm border border-line bg-surface px-3 text-body-sm text-fg" />
          </label>
          <label className="flex flex-col gap-1 text-caption font-medium text-fg-muted">
            Entity
            <select name="entity" defaultValue={entity} className="h-9 rounded-sm border border-line bg-surface px-3 text-body-sm text-fg">
              <option value="">All</option>
              {data.entities.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="h-9 rounded-sm bg-ink px-4 text-label font-medium text-fg-on-ink hover:bg-ink-hover">
            Filter
          </button>
        </form>
        <Table>
          <thead>
            <tr>
              <Th>When</Th>
              <Th>Actor</Th>
              <Th>Action</Th>
              <Th>Entity</Th>
              <Th>Change</Th>
              <Th>IP</Th>
            </tr>
          </thead>
          <tbody>
            {data.rows.length ? (
              data.rows.map((r) => (
                <tr key={r.id} className="align-top">
                  <Td className="text-fg-muted">{fmtDateTime(r.createdAt)}</Td>
                  <Td>{r.actor ? r.actor.name : r.actorType}</Td>
                  <Td className="font-mono text-caption">{r.action}</Td>
                  <Td className="text-caption text-fg-secondary">
                    {r.entityType ?? "—"}
                    {r.entityId ? <span className="block font-mono text-fg-muted">{r.entityId.slice(0, 8)}…</span> : null}
                  </Td>
                  <Td className="max-w-md font-mono text-caption break-all whitespace-normal text-fg-secondary">{summary(r.before, r.after)}</Td>
                  <Td className="text-caption text-fg-muted">{r.ip ?? "—"}</Td>
                </tr>
              ))
            ) : (
              <EmptyRow colSpan={6}>No audit entries match.</EmptyRow>
            )}
          </tbody>
        </Table>
        <div className="flex justify-end px-4 py-3">
          <Pagination page={data.page} totalPages={data.totalPages} hrefFor={href} />
        </div>
      </Panel>
    </>
  );
}

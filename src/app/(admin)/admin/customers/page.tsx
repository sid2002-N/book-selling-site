import type { Metadata } from "next";
import Link from "next/link";
import { fmtDate } from "@/components/admin/format";
import { EmptyRow, FilterTabs, PageHeader, Panel, SearchBar, StatusChip, Table, Td, Th } from "@/components/admin/ui";
import { Pagination } from "@/components/ui/Pagination";
import { requireAdminPage } from "@/modules/admin";
import { listCustomers } from "@/modules/backoffice";

export const metadata: Metadata = { title: "Customers" };

export default async function AdminCustomersPage({ searchParams }: PageProps<"/admin/customers">) {
  await requireAdminPage("customers.read", "/admin/customers");
  const sp = await searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const status = str("status") ?? "all";
  const data = await listCustomers({ q: str("q"), status, page: Number(sp.page) || 1 });
  const href = (params: Record<string, string | number | undefined>) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries({ status: status === "all" ? undefined : status, q: str("q"), ...params })) if (v !== undefined && v !== "" && v !== "all") u.set(k, String(v));
    const s = u.toString();
    return `/admin/customers${s ? `?${s}` : ""}`;
  };
  return (
    <>
      <PageHeader title="Customers" description="Reader accounts. Admin accounts are not listed here." />
      <Panel flush>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
          <FilterTabs active={status} tabs={["all", "active", "blocked", "locked"].map((s) => ({ key: s, label: s.charAt(0).toUpperCase() + s.slice(1), href: href({ status: s, page: undefined }) }))} />
          <SearchBar action="/admin/customers" placeholder="Name or email" defaultValue={str("q")} keep={{ status: status === "all" ? undefined : status }} />
        </div>
        <Table>
          <thead>
            <tr>
              <Th>Customer</Th>
              <Th>Country</Th>
              <Th>Paid orders</Th>
              <Th>Library</Th>
              <Th>Status</Th>
              <Th>Joined</Th>
              <Th>Last sign-in</Th>
            </tr>
          </thead>
          <tbody>
            {data.rows.length ? (
              data.rows.map((u) => (
                <tr key={u.id} className="hover:bg-canvas-subtle/60">
                  <Td>
                    <Link href={`/admin/customers/${u.id}`} className="font-semibold text-fg hover:underline">
                      {u.name}
                    </Link>
                    <span className="block text-caption text-fg-muted">
                      {u.email}
                      {u.emailVerifiedAt ? "" : " · unverified"}
                    </span>
                  </Td>
                  <Td className="text-fg-secondary">{u.country ?? "—"}</Td>
                  <Td className="tabular-nums">{u._count.orders}</Td>
                  <Td className="tabular-nums">{u._count.libraryItems}</Td>
                  <Td>
                    <StatusChip value={u.status} />
                  </Td>
                  <Td className="text-fg-muted">{fmtDate(u.createdAt)}</Td>
                  <Td className="text-fg-muted">{fmtDate(u.lastLoginAt)}</Td>
                </tr>
              ))
            ) : (
              <EmptyRow colSpan={7}>No customers match.</EmptyRow>
            )}
          </tbody>
        </Table>
        <div className="flex items-center justify-between px-4 py-3 text-caption text-fg-muted">
          <span>{data.total} customers</span>
          <Pagination page={data.page} totalPages={data.totalPages} hrefFor={(p) => href({ page: p })} />
        </div>
      </Panel>
    </>
  );
}

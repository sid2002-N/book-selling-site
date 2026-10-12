import type { Metadata } from "next";
import Link from "next/link";
import { fmtDateTime, fmtMoney, humanize } from "@/components/admin/format";
import { EmptyRow, FilterTabs, PageHeader, Panel, SearchBar, StatusChip, Table, Td, Th } from "@/components/admin/ui";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { requireAdminPage } from "@/modules/admin";
import { listProducts } from "@/modules/backoffice";

export const metadata: Metadata = { title: "Products" };

const TABS = [
  { key: "all", label: "All" },
  { key: "published", label: "Published" },
  { key: "draft", label: "Drafts" },
  { key: "unpublished", label: "Unpublished" },
  { key: "archived", label: "Archived" },
] as const;

export default async function AdminProductsPage({ searchParams }: PageProps<"/admin/products">) {
  const ctx = await requireAdminPage("products.read", "/admin/products");
  const sp = await searchParams;
  const status = typeof sp.status === "string" ? sp.status : "all";
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const page = Number(sp.page) || 1;
  const data = await listProducts({ status: status === "all" ? undefined : status, q, page });
  const href = (params: Record<string, string | number | undefined>) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries({ status: status === "all" ? undefined : status, q, ...params })) if (v !== undefined && v !== "" && v !== "all") u.set(k, String(v));
    const s = u.toString();
    return `/admin/products${s ? `?${s}` : ""}`;
  };
  const allCount = Object.entries(data.byStatus).reduce((n, [k, c]) => n + (k === "archived" ? 0 : (c ?? 0)), 0);

  return (
    <>
      <PageHeader
        title="Products"
        description="Books, guides, workbooks, bundles and free resources. Publishing puts a product on the shelf, in the catalogue and in search."
        actions={
          ctx.permissions.has("products.create") ? (
            <Button asChild size="sm">
              <Link href="/admin/products/new">New product</Link>
            </Button>
          ) : null
        }
      />
      <Panel flush>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
          <FilterTabs
            active={status}
            tabs={TABS.map((t) => ({ key: t.key, label: t.label, href: href({ status: t.key, page: undefined }), count: t.key === "all" ? allCount : (data.byStatus[t.key] ?? 0) }))}
          />
          <SearchBar action="/admin/products" placeholder="Search title or slug" defaultValue={q} keep={{ status: status === "all" ? undefined : status }} />
        </div>
        <Table>
          <thead>
            <tr>
              <Th>Product</Th>
              <Th>Type</Th>
              <Th>Category</Th>
              <Th>Price</Th>
              <Th>Sales</Th>
              <Th>Status</Th>
              <Th>Updated</Th>
            </tr>
          </thead>
          <tbody>
            {data.rows.length ? (
              data.rows.map((p) => {
                const inr = p.prices.find((x) => x.currency === "INR");
                const usd = p.prices.find((x) => x.currency === "USD");
                return (
                  <tr key={p.id} className="hover:bg-canvas-subtle/60">
                    <Td>
                      <Link href={`/admin/products/${p.id}`} className="flex items-center gap-3 font-semibold text-fg hover:underline">
                        {p.coverUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.coverUrl} alt="" className="h-10 w-7 rounded-cover object-cover shadow-1" />
                        ) : (
                          <span aria-hidden className="h-10 w-7 rounded-cover shadow-1" style={{ backgroundColor: p.spineColor }} />
                        )}
                        <span className="max-w-xs truncate">{p.title}</span>
                      </Link>
                    </Td>
                    <Td className="text-fg-secondary">{humanize(p.type)}</Td>
                    <Td className="text-fg-secondary">{p.primaryCategory?.name ?? "—"}</Td>
                    <Td className="tabular-nums text-fg-secondary">
                      {inr ? fmtMoney(inr.amountMinor, "INR") : "—"}
                      {usd ? <span className="text-fg-muted"> · {fmtMoney(usd.amountMinor, "USD")}</span> : null}
                    </Td>
                    <Td className="tabular-nums">{p.sales}</Td>
                    <Td>
                      <StatusChip value={p.status} />
                    </Td>
                    <Td className="text-fg-muted">{fmtDateTime(p.updatedAt)}</Td>
                  </tr>
                );
              })
            ) : (
              <EmptyRow colSpan={7}>{q ? `No products match “${q}”.` : "No products here yet."}</EmptyRow>
            )}
          </tbody>
        </Table>
        <div className="flex items-center justify-between px-4 py-3 text-caption text-fg-muted">
          <span>
            {data.total} product{data.total === 1 ? "" : "s"}
          </span>
          <Pagination page={data.page} totalPages={data.totalPages} hrefFor={(p) => href({ page: p })} />
        </div>
      </Panel>
    </>
  );
}

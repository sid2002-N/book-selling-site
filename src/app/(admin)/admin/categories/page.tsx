import type { Metadata } from "next";
import { CategoryForm } from "./CategoryForm";
import { EditCategory } from "./EditCategory";
import { EmptyRow, PageHeader, Panel, StatusChip, Table, Td, Th } from "@/components/admin/ui";
import { requireAdminPage } from "@/modules/admin";
import { listCategoriesAdmin } from "@/modules/backoffice";

export const metadata: Metadata = { title: "Categories" };

export default async function AdminCategoriesPage() {
  const ctx = await requireAdminPage("products.read", "/admin/categories");
  const rows = await listCategoriesAdmin();
  const canEdit = ctx.permissions.has("products.update");
  return (
    <>
      <PageHeader title="Categories" description="Shelf rows, catalogue filters and breadcrumbs come from these. Hidden categories keep their products but aren't listed." />
      <div className="grid gap-6 xl:grid-cols-3">
        <Panel flush className="xl:col-span-2">
          <Table>
            <thead>
              <tr>
                <Th>Order</Th>
                <Th>Name</Th>
                <Th>Slug</Th>
                <Th>Live products</Th>
                <Th>Status</Th>
                <Th>
                  <span className="sr-only">Actions</span>
                </Th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? (
                rows.map((c) => (
                  <tr key={c.id}>
                    <Td className="tabular-nums text-fg-muted">{c.position}</Td>
                    <Td className="font-medium">{c.name}</Td>
                    <Td className="font-mono text-caption text-fg-secondary">{c.slug}</Td>
                    <Td className="tabular-nums">{c._count.products}</Td>
                    <Td>{c.isActive ? <StatusChip value="active" label="Visible" /> : <StatusChip value="inactive" label="Hidden" />}</Td>
                    <Td className="text-right">
                      {canEdit ? <EditCategory id={c.id} initial={{ name: c.name, slug: c.slug, description: c.description ?? "", position: c.position, isActive: c.isActive }} /> : null}
                    </Td>
                  </tr>
                ))
              ) : (
                <EmptyRow colSpan={6}>No categories yet.</EmptyRow>
              )}
            </tbody>
          </Table>
        </Panel>
        {canEdit ? (
          <Panel title="Add a category">
            <CategoryForm id={null} />
          </Panel>
        ) : null}
      </div>
    </>
  );
}

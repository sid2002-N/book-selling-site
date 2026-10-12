import type { Metadata } from "next";
import { PageHeader, Panel } from "@/components/admin/ui";
import { requireAdminPage } from "@/modules/admin";
import { NewProductForm } from "./NewProductForm";

export const metadata: Metadata = { title: "New product" };

export default async function NewProductPage() {
  await requireAdminPage("products.create", "/admin/products/new");
  return (
    <>
      <PageHeader title="New product" description="Start with the type and a title. You'll add files, previews, prices and categories next — it stays a draft until you publish." back={{ href: "/admin/products", label: "Products" }} />
      <Panel className="max-w-xl">
        <NewProductForm />
      </Panel>
    </>
  );
}

import type { Metadata } from "next";
import { CatalogRoute } from "@/components/catalog/CatalogRoute";

export const metadata: Metadata = {
  title: "New Releases",
  description: "The latest additions to the library.",
  alternates: { canonical: "/new" },
};

export default async function Page({ searchParams }: PageProps<"/new">) {
  return (
    <CatalogRoute
      searchParams={await searchParams}
      config={{
        path: "/new",
        title: "New Releases",
        eyebrow: "Fresh additions",
        description: "The latest additions to the library.",
        breadcrumbs: [{ label: "Home", href: "/" }, { label: "New Releases" }],
        types: ["book", "guide", "workbook", "bundle"], defaultSort: "newest",
      }}
    />
  );
}

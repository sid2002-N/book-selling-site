import type { Metadata } from "next";
import { CatalogRoute } from "@/components/catalog/CatalogRoute";

export const metadata: Metadata = {
  title: "Explore",
  description: "Discover digital books, guides, workbooks and resources for a better you.",
  alternates: { canonical: "/explore" },
};

export default async function Page({ searchParams }: PageProps<"/explore">) {
  return (
    <CatalogRoute
      searchParams={await searchParams}
      config={{
        path: "/explore",
        title: "Explore",
        eyebrow: "The library",
        description: "Discover digital books, guides, workbooks and resources for a better you.",
        breadcrumbs: [{ label: "Home", href: "/" }, { label: "Explore" }],
        types: ["book", "guide", "workbook", "bundle"],
      }}
    />
  );
}

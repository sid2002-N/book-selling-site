import type { Metadata } from "next";
import { CatalogRoute } from "@/components/catalog/CatalogRoute";

export const metadata: Metadata = {
  title: "Free Resources",
  description: "Useful templates, guides and tools — free to add to your library.",
  alternates: { canonical: "/free-resources" },
};

export default async function Page({ searchParams }: PageProps<"/free-resources">) {
  return (
    <CatalogRoute
      searchParams={await searchParams}
      config={{
        path: "/free-resources",
        title: "Free Resources",
        eyebrow: "For everyone",
        description: "Useful templates, guides and tools — free to add to your library.",
        breadcrumbs: [{ label: "Home", href: "/" }, { label: "Free Resources" }],
        types: ["free_resource"], showPriceFilter: false,
      }}
    />
  );
}

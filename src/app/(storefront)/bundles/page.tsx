import type { Metadata } from "next";
import { CatalogRoute } from "@/components/catalog/CatalogRoute";

export const metadata: Metadata = {
  title: "Bundles",
  description: "Save more with curated bundles for focused learning.",
  alternates: { canonical: "/bundles" },
};

export default async function Page({ searchParams }: PageProps<"/bundles">) {
  return (
    <CatalogRoute
      searchParams={await searchParams}
      config={{
        path: "/bundles",
        title: "Save More with Bundles",
        eyebrow: "Bundles",
        description: "Curated sets for focused learning, bigger value and faster growth.",
        breadcrumbs: [{ label: "Home", href: "/" }, { label: "Bundles" }],
        types: ["bundle"],
        showPriceFilter: false,
      }}
    />
  );
}

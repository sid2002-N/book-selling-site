import type { Metadata } from "next";
import { CatalogRoute } from "@/components/catalog/CatalogRoute";

export const metadata: Metadata = {
  title: "Popular & Trending",
  description: "What readers are buying most right now.",
  alternates: { canonical: "/popular" },
};

export default async function Page({ searchParams }: PageProps<"/popular">) {
  return (
    <CatalogRoute
      searchParams={await searchParams}
      config={{
        path: "/popular",
        title: "Popular & Trending",
        eyebrow: "Most loved",
        description: "What readers are buying most right now.",
        breadcrumbs: [{ label: "Home", href: "/" }, { label: "Popular & Trending" }],
        types: ["book", "guide", "workbook", "bundle"], defaultSort: "popular",
      }}
    />
  );
}

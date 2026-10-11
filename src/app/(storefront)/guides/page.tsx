import type { Metadata } from "next";
import { CatalogRoute } from "@/components/catalog/CatalogRoute";

export const metadata: Metadata = {
  title: "Guides",
  description: "Step-by-step guides to help you learn new skills and apply them in real life.",
  alternates: { canonical: "/guides" },
};

export default async function Page({ searchParams }: PageProps<"/guides">) {
  return (
    <CatalogRoute
      searchParams={await searchParams}
      config={{
        path: "/guides",
        title: "Guides",
        eyebrow: "Practical tutorials",
        description: "Step-by-step guides to help you learn new skills and apply them in real life.",
        breadcrumbs: [{ label: "Home", href: "/" }, { label: "Guides" }],
        types: ["guide"],
      }}
    />
  );
}

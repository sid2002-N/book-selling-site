import type { Metadata } from "next";
import { CatalogRoute } from "@/components/catalog/CatalogRoute";

export const metadata: Metadata = {
  title: "Books",
  description: "In-depth digital books covering technology, productivity, business and more.",
  alternates: { canonical: "/books" },
};

export default async function Page({ searchParams }: PageProps<"/books">) {
  return (
    <CatalogRoute
      searchParams={await searchParams}
      config={{
        path: "/books",
        title: "Books",
        eyebrow: "Digital books",
        description: "In-depth digital books covering technology, productivity, business and more.",
        breadcrumbs: [{ label: "Home", href: "/" }, { label: "Books" }],
        types: ["book"],
      }}
    />
  );
}

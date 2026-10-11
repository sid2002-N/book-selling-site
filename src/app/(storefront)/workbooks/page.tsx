import type { Metadata } from "next";
import { CatalogRoute } from "@/components/catalog/CatalogRoute";

export const metadata: Metadata = {
  title: "Workbooks",
  description: "Interactive and fillable workbooks to help you plan, build habits, organise your life and make real progress.",
  alternates: { canonical: "/workbooks" },
};

export default async function Page({ searchParams }: PageProps<"/workbooks">) {
  return (
    <CatalogRoute
      searchParams={await searchParams}
      config={{
        path: "/workbooks",
        title: "Workbooks",
        eyebrow: "Interactive templates",
        description: "Interactive and fillable workbooks to help you plan, build habits, organise your life and make real progress.",
        breadcrumbs: [{ label: "Home", href: "/" }, { label: "Workbooks" }],
        types: ["workbook"],
      }}
    />
  );
}

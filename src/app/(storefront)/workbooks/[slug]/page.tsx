import { ProductPage, productMetadata } from "@/components/product/productPage";

export async function generateMetadata({ params }: PageProps<"/workbooks/[slug]">) {
  return productMetadata("workbook", (await params).slug);
}

export default async function Page({ params }: PageProps<"/workbooks/[slug]">) {
  return <ProductPage type="workbook" slug={(await params).slug} />;
}

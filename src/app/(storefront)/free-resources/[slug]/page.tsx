import { ProductPage, productMetadata } from "@/components/product/productPage";

export async function generateMetadata({ params }: PageProps<"/free-resources/[slug]">) {
  return productMetadata("free_resource", (await params).slug);
}

export default async function Page({ params }: PageProps<"/free-resources/[slug]">) {
  return <ProductPage type="free_resource" slug={(await params).slug} />;
}

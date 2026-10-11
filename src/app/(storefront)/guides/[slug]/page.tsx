import { ProductPage, productMetadata } from "@/components/product/productPage";

export async function generateMetadata({ params }: PageProps<"/guides/[slug]">) {
  return productMetadata("guide", (await params).slug);
}

export default async function Page({ params }: PageProps<"/guides/[slug]">) {
  return <ProductPage type="guide" slug={(await params).slug} />;
}

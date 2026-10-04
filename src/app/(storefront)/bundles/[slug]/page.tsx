import { ProductPage, productMetadata } from "@/components/product/productPage";

export async function generateMetadata({ params }: PageProps<"/bundles/[slug]">) {
  return productMetadata("bundle", (await params).slug);
}

export default async function Page({ params }: PageProps<"/bundles/[slug]">) {
  return <ProductPage type="bundle" slug={(await params).slug} />;
}

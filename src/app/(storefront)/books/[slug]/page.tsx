import { ProductPage, productMetadata } from "@/components/product/productPage";

export async function generateMetadata({ params }: PageProps<"/books/[slug]">) {
  return productMetadata("book", (await params).slug);
}

export default async function Page({ params }: PageProps<"/books/[slug]">) {
  return <ProductPage type="book" slug={(await params).slug} />;
}

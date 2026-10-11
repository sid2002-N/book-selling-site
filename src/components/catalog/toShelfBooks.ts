import type { ShelfBook } from "@/components/library/types";
import type { ProductCard } from "@/modules/catalog";

/** Maps public product cards to shelf spines (data-driven library, master §9). */
export function toShelfBooks(products: ProductCard[]): ShelfBook[] {
  return products.map((p) => ({
    id: p.id,
    title: p.title,
    href: p.href,
    typeLabel: p.typeLabel,
    category: p.category?.name ?? null,
    spineColor: p.spineColor,
    coverUrl: p.coverUrl,
    summary: p.subtitle,
    priceLabel: p.price?.label ?? null,
  }));
}

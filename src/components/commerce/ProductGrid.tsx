import type { ProductCard as ProductCardData } from "@/modules/catalog";
import { cn } from "@/lib/cn";
import { ProductCard } from "./ProductCard";

export type ViewerState = { signedIn: boolean; wishlist: ReadonlySet<string>; owned: ReadonlySet<string> };

export function ProductGrid({ products, viewer, columns = "default", className }: { products: ProductCardData[]; viewer: ViewerState; columns?: "default" | "wide"; className?: string }) {
  return (
    <ul
      className={cn(
        "grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 md:gap-x-6",
        columns === "wide" ? "lg:grid-cols-5 xl:grid-cols-6" : "lg:grid-cols-4",
        className,
      )}
    >
      {products.map((p, i) => (
        <li key={p.id}>
          <ProductCard product={p} signedIn={viewer.signedIn} wishlisted={viewer.wishlist.has(p.id)} owned={viewer.owned.has(p.id)} priority={i < 4} />
        </li>
      ))}
    </ul>
  );
}

/** Horizontal rail on phones, grid from tablet up (DESIGN_SYSTEM §14). */
export function ProductRail({ products, viewer }: { products: ProductCardData[]; viewer: ViewerState }) {
  return (
    <ul className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 scrollbar-none md:mx-0 md:grid md:grid-cols-3 md:gap-6 md:overflow-visible md:px-0 lg:grid-cols-6">
      {products.map((p) => (
        <li key={p.id} className="w-40 shrink-0 snap-start sm:w-44 md:w-auto">
          <ProductCard product={p} signedIn={viewer.signedIn} wishlisted={viewer.wishlist.has(p.id)} owned={viewer.owned.has(p.id)} variant="compact" />
        </li>
      ))}
    </ul>
  );
}

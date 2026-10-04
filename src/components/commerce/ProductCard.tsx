import Link from "next/link";
import type { ProductCard as ProductCardData } from "@/modules/catalog";
import { cn } from "@/lib/cn";
import { BookCover } from "@/components/library/BookCover";
import { Badge } from "@/components/ui/Badge";
import { AddToCartButton } from "./AddToCartButton";
import { Price } from "./Price";
import { Rating } from "./Rating";
import { WishlistButton } from "./WishlistButton";

type ProductCardProps = {
  product: ProductCardData;
  signedIn: boolean;
  wishlisted?: boolean;
  owned?: boolean;
  variant?: "default" | "compact";
  priority?: boolean;
  className?: string;
};

/** Cover-first product card (DESIGN_SYSTEM §20). Badges only for real states. */
export function ProductCard({ product, signedIn, wishlisted, owned, variant = "default", priority, className }: ProductCardProps) {
  const badge = owned
    ? { tone: "ink" as const, label: "In library" }
    : product.price?.isFree
      ? { tone: "success" as const, label: "Free" }
      : product.price?.discountPercent
        ? { tone: "deal" as const, label: `${product.price.discountPercent}% off` }
        : product.isNew
          ? { tone: "accent" as const, label: "New" }
          : null;
  return (
    <article className={cn("group relative flex flex-col gap-3", className)}>
      <div className="relative">
        <Link href={product.href} className="block transition-transform duration-normal ease-out-soft group-hover:-translate-y-1 motion-reduce:transform-none" tabIndex={-1} aria-hidden>
          <BookCover
            id={product.id}
            title={product.title}
            coverUrl={product.coverUrl}
            spineColor={product.spineColor}
            priority={priority}
            className="transition-shadow duration-normal group-hover:shadow-3"
          />
        </Link>
        {badge ? (
          <Badge tone={badge.tone} size="sm" className="absolute top-2 left-2">
            {badge.label}
          </Badge>
        ) : null}
        <div className="absolute top-2 right-2">
          <WishlistButton productId={product.id} title={product.title} initial={wishlisted} signedIn={signedIn} />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1">
        <h3 className={cn("line-clamp-2 font-sans font-semibold text-fg", variant === "compact" ? "text-body-sm" : "text-body-sm md:text-body")}>
          <Link href={product.href} className="after:absolute after:inset-0">
            {product.title}
          </Link>
        </h3>
        <p className="text-caption text-fg-muted">{[product.typeLabel, product.category?.name].filter(Boolean).join(" · ")}</p>
        {product.rating ? <Rating average={product.rating.average} count={product.rating.count} /> : null}
        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <Price price={product.price} size="sm" showBadge={false} />
          {!owned && product.price && !product.price.isFree ? (
            <div className="relative z-10">
              <AddToCartButton productId={product.id} title={product.title} iconOnly />
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

import type { PriceView } from "@/modules/catalog";
import { AddToCartButton } from "@/components/commerce/AddToCartButton";

/** Sticky purchase bar on phones (DESIGN_SYSTEM §14: purchase card → sticky bottom bar). */
export function MobilePurchaseBar({ productId, title, price }: { productId: string; title: string; price: PriceView }) {
  return (
    <div className="glass fixed inset-x-0 bottom-16 z-30 flex items-center gap-3 rounded-none border-x-0 px-4 py-3 md:hidden">
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="font-serif text-h4 font-semibold text-fg">{price.label}</span>
        {price.compareLabel ? <span className="text-caption text-fg-muted line-through">{price.compareLabel}</span> : null}
      </div>
      <AddToCartButton productId={productId} title={title} iconOnly variant="secondary" />
      <AddToCartButton productId={productId} title={title} mode="buy" />
    </div>
  );
}

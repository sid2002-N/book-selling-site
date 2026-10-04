import type { PriceView } from "@/modules/catalog";
import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/Badge";

/** Current price, struck compare-at price and discount — all formatted server-side. */
export function Price({ price, size = "md", showBadge = true, className }: { price: PriceView | null; size?: "sm" | "md" | "lg"; showBadge?: boolean; className?: string }) {
  if (!price) return <span className="text-body-sm text-fg-muted">Not available in this currency</span>;
  return (
    <span className={cn("inline-flex flex-wrap items-baseline gap-x-2 gap-y-1", className)}>
      <span
        className={cn(
          "font-serif text-fg tabular-nums",
          size === "lg" ? "text-price" : size === "md" ? "text-h4 font-semibold" : "text-body-sm font-semibold font-sans",
        )}
      >
        {price.label}
      </span>
      {price.compareLabel ? (
        <span className={cn("text-fg-muted tabular-nums line-through", size === "lg" ? "text-body" : "text-caption")}>
          <span className="sr-only">Original price </span>
          {price.compareLabel}
        </span>
      ) : null}
      {showBadge && price.discountPercent ? (
        <Badge tone="success" size="sm">
          {price.discountPercent}% off
        </Badge>
      ) : null}
    </span>
  );
}

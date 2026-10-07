import { Star } from "lucide-react";
import { cn } from "@/lib/cn";

/** Star rating; render only when real reviews exist (C6). */
export function Rating({ average, count, size = "sm", className }: { average: number; count: number; size?: "sm" | "md"; className?: string }) {
  const rounded = Math.round(average * 2) / 2;
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span className="flex" aria-hidden>
        {Array.from({ length: 5 }, (_, i) => (
          <Star
            key={i}
            className={cn(size === "md" ? "size-4" : "size-3.5", i < Math.floor(rounded) ? "fill-accent text-accent" : i < rounded ? "fill-accent/50 text-accent" : "text-line-strong")}
          />
        ))}
      </span>
      <span className={cn("text-fg-muted", size === "md" ? "text-body-sm" : "text-caption")}>
        <span className="sr-only">Rated </span>
        {average.toFixed(1)}
        <span className="sr-only"> out of 5,</span> ({count}
        <span className="sr-only"> reviews</span>)
      </span>
    </span>
  );
}

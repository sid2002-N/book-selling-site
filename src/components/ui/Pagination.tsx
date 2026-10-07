import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";

/** Page numbers to show around the current page, with `null` marking a gap. */
export function pageWindow(current: number, total: number, radius = 1): Array<number | null> {
  const pages = new Set<number>([1, total]);
  for (let p = current - radius; p <= current + radius; p++) if (p >= 1 && p <= total) pages.add(p);
  const sorted = [...pages].sort((a, b) => a - b);
  const out: Array<number | null> = [];
  sorted.forEach((p, i) => {
    const prev = sorted[i - 1];
    if (prev !== undefined && p - prev > 1) out.push(null);
    out.push(p);
  });
  return out;
}

type PaginationProps = {
  page: number;
  totalPages: number;
  hrefFor: (page: number) => string;
  className?: string;
};

/** Link-based pagination so pages stay server-rendered and URL-addressable. */
export function Pagination({ page, totalPages, hrefFor, className }: PaginationProps) {
  if (totalPages <= 1) return null;
  const item =
    "flex size-9 items-center justify-center rounded-md text-label font-medium text-fg-secondary hover:bg-canvas-subtle";
  return (
    <nav aria-label="Pagination" className={cn("flex items-center gap-1", className)}>
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className={item} aria-label="Previous page" rel="prev">
          <ChevronLeft className="size-4" />
        </Link>
      ) : null}
      {pageWindow(page, totalPages).map((p, i) =>
        p === null ? (
          <span key={`gap-${i}`} className="px-1 text-fg-muted" aria-hidden>
            …
          </span>
        ) : (
          <Link
            key={p}
            href={hrefFor(p)}
            aria-current={p === page ? "page" : undefined}
            className={cn(item, p === page && "bg-ink text-fg-on-ink hover:bg-ink")}
          >
            {p}
          </Link>
        ),
      )}
      {page < totalPages ? (
        <Link href={hrefFor(page + 1)} className={item} aria-label="Next page" rel="next">
          <ChevronRight className="size-4" />
        </Link>
      ) : null}
    </nav>
  );
}

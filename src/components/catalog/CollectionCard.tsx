import { ArrowRight, BookOpen } from "lucide-react";
import Link from "next/link";
import type { CollectionView } from "@/modules/catalog";
import { cn } from "@/lib/cn";
import { BookCover } from "@/components/library/BookCover";
import { Badge } from "@/components/ui/Badge";
import { Price } from "@/components/commerce/Price";

/** Collection card: a small fanned stack of the collection's own covers (no stock imagery). */
export function CollectionCard({ collection, size = "default" }: { collection: CollectionView; size?: "default" | "feature" }) {
  const covers = collection.items.slice(0, 3);
  return (
    <Link
      href={collection.href}
      className="group flex h-full flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-1 transition-[transform,box-shadow] duration-normal hover:-translate-y-1 hover:shadow-2 motion-reduce:transform-none"
    >
      <div className={cn("relative flex items-end justify-center overflow-hidden bg-canvas-subtle px-6 pt-6", size === "feature" ? "h-56" : "h-44")}>
        {collection.badge ? (
          <Badge tone={collection.badge === "Most Popular" ? "deal" : "ink"} size="sm" className="absolute top-3 left-3 z-10">
            {collection.badge}
          </Badge>
        ) : null}
        <div aria-hidden className="flex items-end">
          {covers.map((c, i) => (
            <div
              key={c.id}
              className={cn("-mx-3 transition-transform duration-normal group-hover:-translate-y-1", size === "feature" ? "w-28" : "w-24")}
              style={{ transform: `rotate(${(i - (covers.length - 1) / 2) * 6}deg) translateY(${i === 1 ? -8 : 6}px)`, zIndex: i === 1 ? 2 : 1 }}
            >
              <BookCover id={c.id} title={c.title} coverUrl={c.coverUrl} spineColor={c.spineColor} sizes="112px" className="shadow-2" />
            </div>
          ))}
        </div>
        <div aria-hidden className="bg-shelf absolute inset-x-0 bottom-0 h-2" />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <h3 className={cn("font-serif text-fg", size === "feature" ? "text-h3" : "text-h4")}>{collection.title}</h3>
        {collection.description ? <p className="line-clamp-2 text-body-sm text-fg-muted">{collection.description}</p> : null}
        <div className="mt-auto flex items-center justify-between gap-3 pt-3">
          <span className="flex items-center gap-1.5 text-caption text-fg-secondary">
            <BookOpen className="size-3.5" aria-hidden /> {collection.items.length} products
          </span>
          {collection.bundle?.price ? <Price price={collection.bundle.price} size="sm" showBadge={false} /> : null}
          <span className="flex size-9 items-center justify-center rounded-full bg-ink text-fg-on-ink transition-transform group-hover:translate-x-0.5">
            <ArrowRight className="size-4" aria-hidden />
          </span>
        </div>
      </div>
    </Link>
  );
}

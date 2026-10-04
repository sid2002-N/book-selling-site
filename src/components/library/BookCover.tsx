import Image from "next/image";
import { cn } from "@/lib/cn";
import { fallbackSpineColor, isValidHex, spineTextColor } from "@/lib/spine";

type BookCoverProps = {
  id: string;
  title: string;
  coverUrl?: string | null;
  spineColor?: string | null;
  typeLabel?: string;
  sizes?: string;
  priority?: boolean;
  /** Thumbnail mode for tiny renders: colour, spine and initial only — no unreadable text. */
  compact?: boolean;
  className?: string;
};

/**
 * 3:4 product cover. When no cover asset exists yet, renders a typographic cover generated from
 * the product's title and spine colour (OQ-12) — never a screenshot from the mockups.
 */
export function BookCover({
  id,
  title,
  coverUrl,
  spineColor,
  typeLabel,
  sizes = "(min-width: 1024px) 220px, 45vw",
  priority,
  compact,
  className,
}: BookCoverProps) {
  const base = cn("@container relative aspect-3/4 w-full overflow-hidden rounded-cover shadow-2", className);

  if (coverUrl) {
    return (
      <div className={base}>
        <Image src={coverUrl} alt={`Cover of ${title}`} fill sizes={sizes} priority={priority} className="object-cover" />
      </div>
    );
  }

  const background = spineColor && isValidHex(spineColor) ? spineColor : fallbackSpineColor(id);
  const color = spineTextColor(background);
  if (compact) {
    return (
      <div className={base} style={{ backgroundColor: background, color }} role="img" aria-label={`Cover of ${title}`}>
        <div aria-hidden className="absolute inset-y-0 left-0 w-1.5 bg-linear-to-r from-ink/35 to-transparent" />
        <span aria-hidden className="absolute inset-0 flex items-center justify-center font-serif text-body-sm opacity-90">
          {title.trim().charAt(0)}
        </span>
      </div>
    );
  }

  return (
    <div className={base} style={{ backgroundColor: background, color }} role="img" aria-label={`Cover of ${title}`}>
      <div aria-hidden className="absolute inset-y-0 left-0 w-3 bg-linear-to-r from-ink/35 to-transparent" />
      <div aria-hidden className="absolute inset-3 rounded-sm border border-current opacity-25" />
      <div aria-hidden className="cover-pad relative flex h-full flex-col justify-between">
        {typeLabel ? <span className="text-micro tracking-widest uppercase opacity-75">{typeLabel}</span> : <span />}
        <span className="cover-title line-clamp-5 font-serif leading-tight text-balance">{title}</span>
        <span className="font-serif text-label opacity-80">KRM.lib</span>
      </div>
    </div>
  );
}

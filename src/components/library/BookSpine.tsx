"use client";

import type { CSSProperties } from "react";
import { cn } from "@/lib/cn";
import { fallbackSpineColor, isValidHex, spineSize, spineTextColor } from "@/lib/spine";
import type { ShelfBook } from "./types";

type BookSpineProps = {
  book: ShelfBook;
  selected?: boolean;
  onSelect: (book: ShelfBook) => void;
};

/**
 * A single vertical spine (DESIGN_SYSTEM §18). It is a real <button>: hover and focus-visible
 * pull it forward with a slight rotation; Enter/Space/click opens the pull-out preview.
 */
export function BookSpine({ book, selected, onSelect }: BookSpineProps) {
  const { width, height } = spineSize(book.id);
  const background = book.spineColor && isValidHex(book.spineColor) ? book.spineColor : fallbackSpineColor(book.id);
  const color = spineTextColor(background);
  const status = book.progress != null ? `${Math.round(book.progress)}% read` : book.priceLabel;
  const accessibleName = [book.title, book.typeLabel, status].filter(Boolean).join(", ");

  const style: CSSProperties = { width, height, backgroundColor: background, color };

  return (
    <button
      type="button"
      onClick={() => onSelect(book)}
      aria-label={accessibleName}
      aria-haspopup="dialog"
      aria-pressed={selected}
      style={style}
      className={cn(
        "group/spine relative flex shrink-0 origin-bottom flex-col items-center justify-between rounded-t-sm py-3",
        "transition-[transform,box-shadow] duration-normal ease-out-soft will-change-transform",
        "hover:z-10 hover:-translate-y-2 hover:-rotate-y-10 hover:shadow-3",
        "focus-visible:z-10 focus-visible:-translate-y-2 focus-visible:shadow-3 focus-visible:outline-offset-4",
        "motion-reduce:hover:rotate-y-0 motion-reduce:hover:translate-y-0",
        selected && "z-10 -translate-y-4 shadow-3 ring-2 ring-accent ring-offset-2 ring-offset-canvas",
      )}
    >
      {/* Cloth-bound shading: highlight on the left edge, shadow on the right. */}
      <span aria-hidden className="pointer-events-none absolute inset-0 rounded-t-sm bg-linear-to-r from-white/12 via-transparent to-ink/30" />
      {/* Top and bottom bands, like cloth-bound spines. */}
      <span aria-hidden className="absolute inset-x-0 top-2 h-px bg-current opacity-30" />
      <span aria-hidden className="absolute inset-x-0 top-3 h-px bg-current opacity-15" />
      <span
        aria-hidden
        className="writing-vertical line-clamp-1 max-h-full rotate-180 overflow-hidden px-1 font-serif text-label leading-tight font-medium"
      >
        {book.title}
      </span>
      <span aria-hidden className="font-serif text-micro opacity-70">
        K.
      </span>
      <span aria-hidden className="absolute inset-x-0 bottom-3 h-px bg-current opacity-30" />

      {/* Metadata reveal on hover/focus (never the only way to reach it: the pull-out repeats it). */}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute bottom-full left-1/2 mb-2 hidden w-max max-w-52 -translate-x-1/2 rounded-md bg-ink px-3 py-2 text-left text-fg-on-ink shadow-2",
          "group-hover/spine:block group-focus-visible/spine:block",
        )}
      >
        <span className="block text-label font-medium">{book.title}</span>
        <span className="block text-caption text-fg-on-ink/70">
          {[book.typeLabel, status].filter(Boolean).join(" · ")}
        </span>
      </span>
    </button>
  );
}

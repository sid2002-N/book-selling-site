"use client";

import { BookOpen, LayoutList, Library } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { spineSize } from "@/lib/spine";
import { useElementWidth } from "@/hooks/use-element-width";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogContent } from "@/components/ui/Dialog";
import { ProgressBar } from "@/components/ui/Feedback";
import { BookCover } from "./BookCover";
import { BookSpine } from "./BookSpine";
import type { ShelfBook } from "./types";

const SPINE_GAP = 4;
const SHELF_PADDING = 32;

/** Greedy row packing from deterministic spine widths; pure so it can be unit-tested. */
export function packRows(books: ShelfBook[], containerWidth: number): ShelfBook[][] {
  const usable = Math.max(containerWidth - SHELF_PADDING, 120);
  const rows: ShelfBook[][] = [];
  let row: ShelfBook[] = [];
  let used = 0;
  for (const book of books) {
    const w = spineSize(book.id).width + SPINE_GAP;
    if (row.length > 0 && used + w > usable) {
      rows.push(row);
      row = [];
      used = 0;
    }
    row.push(book);
    used += w;
  }
  if (row.length) rows.push(row);
  return rows;
}

type ShelfProps = {
  books: ShelfBook[];
  label: string;
  /** Rendered when there are no books (e.g. the empty-library state). */
  empty?: ReactNode;
  allowListView?: boolean;
  className?: string;
};

/**
 * The signature KRM.lib bookshelf (master §8–9, DESIGN_SYSTEM §18). Data-driven: every product
 * passed in becomes a spine. Rows use `content-visibility` so long shelves stay cheap.
 */
export function Shelf({ books, label, empty, allowListView = true, className }: ShelfProps) {
  const [ref, width] = useElementWidth<HTMLDivElement>(1120);
  const [selected, setSelected] = useState<ShelfBook | null>(null);
  const [view, setView] = useState<"shelf" | "list">("shelf");
  const rows = useMemo(() => packRows(books, width), [books, width]);

  if (books.length === 0) return <>{empty}</>;

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {allowListView ? (
        <div className="flex justify-end gap-1" role="group" aria-label="Library view">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-pressed={view === "shelf"}
            aria-label="Shelf view"
            onClick={() => setView("shelf")}
            className="aria-pressed:bg-surface aria-pressed:text-fg"
          >
            <Library />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-pressed={view === "list"}
            aria-label="List view"
            onClick={() => setView("list")}
            className="aria-pressed:bg-surface aria-pressed:text-fg"
          >
            <LayoutList />
          </Button>
        </div>
      ) : null}

      <div ref={ref}>
        {view === "shelf" ? (
          <ul aria-label={label} className="flex flex-col gap-10">
            {rows.map((row, i) => (
              <li key={i} className="cv-auto">
                <div className="perspective-shelf rounded-t-lg bg-linear-to-b from-transparent to-(--shelf-back) px-4 pt-16">
                  <ul className="flex items-end gap-1" aria-label={`Shelf ${i + 1}`}>
                    {row.map((book) => (
                      <li key={book.id} className="flex">
                        <BookSpine book={book} selected={selected?.id === book.id} onSelect={setSelected} />
                      </li>
                    ))}
                  </ul>
                </div>
                <div aria-hidden className="bg-shelf h-3 rounded-b-sm shadow-2" />
              </li>
            ))}
          </ul>
        ) : (
          <ul aria-label={label} className="divide-y divide-line rounded-lg border border-line bg-surface">
            {books.map((book) => (
              <li key={book.id}>
                <Link href={book.href} className="flex items-center gap-4 px-4 py-3 hover:bg-surface-raised">
                  <div className="w-10 shrink-0">
                    <BookCover id={book.id} title={book.title} coverUrl={book.coverUrl} spineColor={book.spineColor} sizes="40px" compact />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body-sm font-medium text-fg">{book.title}</p>
                    <p className="text-caption text-fg-muted">
                      {[book.typeLabel, book.category].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  {book.progress != null ? (
                    <span className="text-caption text-fg-muted">{Math.round(book.progress)}%</span>
                  ) : book.priceLabel ? (
                    <span className="text-body-sm font-medium text-fg">{book.priceLabel}</span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <BookPullout book={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

/** The pulled-out book: cover, summary and the primary action. Sheet on phones, modal elsewhere. */
function BookPullout({ book, onClose }: { book: ShelfBook | null; onClose: () => void }) {
  const isDesktop = useMediaQuery("(min-width: 40rem)", true);
  return (
    <Dialog open={book !== null} onOpenChange={(open) => !open && onClose()}>
      {book ? (
        <DialogContent variant={isDesktop ? "modal" : "sheet"} title={book.title} hideTitle className="max-w-2xl">
          <div className="grid gap-6 sm:grid-cols-5">
            <div className="mx-auto w-40 sm:col-span-2 sm:w-full">
              <BookCover
                id={book.id}
                title={book.title}
                coverUrl={book.coverUrl}
                spineColor={book.spineColor}
                typeLabel={book.typeLabel}
                className="motion-safe:animate-rise-in"
              />
            </div>
            <div className="flex flex-col gap-3 sm:col-span-3">
              <p className="text-micro font-semibold tracking-wider text-accent-strong uppercase">
                {[book.typeLabel, book.category].filter(Boolean).join(" · ")}
              </p>
              <h2 className="text-h2 text-fg">{book.title}</h2>
              {book.summary ? <p className="line-clamp-4 text-body-sm text-fg-secondary">{book.summary}</p> : null}
              {book.progress != null ? (
                <div className="flex flex-col gap-1.5">
                  <ProgressBar value={book.progress} label={`${book.title} reading progress`} />
                  <span className="text-caption text-fg-muted">{Math.round(book.progress)}% read</span>
                </div>
              ) : book.priceLabel ? (
                <p className="font-serif text-price text-fg">{book.priceLabel}</p>
              ) : null}
              <div className="mt-auto flex flex-wrap gap-3 pt-2">
                {book.readHref ? (
                  <Button asChild>
                    <Link href={book.readHref}>
                      <BookOpen /> Continue Reading
                    </Link>
                  </Button>
                ) : null}
                <Button asChild variant={book.readHref ? "secondary" : "primary"}>
                  <Link href={book.href}>View Product</Link>
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}

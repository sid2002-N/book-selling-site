"use client";

import { Eye } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { BookCover } from "@/components/library/BookCover";
import { Dialog, DialogContent } from "@/components/ui/Dialog";
import { PreviewReader, type PreviewPage } from "./PreviewReader";

type Props = {
  product: { id: string; title: string; coverUrl: string | null; spineColor: string; typeLabel: string };
  previews: PreviewPage[];
};

/** Thumbnail rail + large cover with "View Inside" (Product Page sheet, above the fold). */
export function ProductGallery({ product, previews }: Props) {
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState(0);
  const openAt = (i: number) => {
    setStart(i);
    setOpen(true);
  };
  return (
    <div className="flex flex-col-reverse gap-3 md:flex-row">
      {previews.length ? (
        <ul className="flex gap-2 md:flex-col" aria-label="Preview pages">
          <li>
            <span className="block w-14 rounded-sm ring-2 ring-accent ring-offset-2 ring-offset-canvas">
              <BookCover id={product.id} title={product.title} coverUrl={product.coverUrl} spineColor={product.spineColor} sizes="56px" compact className="shadow-1" />
            </span>
          </li>
          {previews.map((p, i) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => openAt(i)}
                className="relative block aspect-3/4 w-14 overflow-hidden rounded-sm border border-line bg-white shadow-1 hover:border-line-strong"
                aria-label={`Open preview: ${p.label}`}
              >
                <Image src={p.url} alt="" fill sizes="56px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="relative mx-auto w-3/5 flex-1 md:w-auto">
        <BookCover id={product.id} title={product.title} coverUrl={product.coverUrl} spineColor={product.spineColor} typeLabel={product.typeLabel} priority sizes="(min-width: 1024px) 360px, 80vw" className="shadow-3" />
        {previews.length ? (
          <button
            type="button"
            onClick={() => openAt(0)}
            className={cn("glass absolute bottom-3 left-3 flex items-center gap-2 rounded-full px-4 py-2 text-label font-semibold text-fg")}
          >
            <Eye className="size-4" aria-hidden /> View Inside
          </button>
        ) : null}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title={`Preview: ${product.title}`} description="Watermarked sample pages" className="max-w-4xl">
          <PreviewReader key={start} pages={rotate(previews, start)} title={product.title} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function rotate<T>(arr: T[], start: number): T[] {
  return [...arr.slice(start), ...arr.slice(0, start)];
}

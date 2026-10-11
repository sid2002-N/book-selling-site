"use client";

import { ChevronLeft, ChevronRight, Maximize2, Minimize2, ZoomIn, ZoomOut } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";

export type PreviewPage = { id: string; label: string; url: string; alt: string };

/**
 * Product preview (master §13): only pre-rendered, watermarked page images — the paid PDF is
 * never requested here. Supports thumbnails, prev/next, keyboard, swipe, zoom and fullscreen.
 */
export function PreviewReader({ pages, title, className }: { pages: PreviewPage[]; title: string; className?: string }) {
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const frame = useRef<HTMLDivElement | null>(null);
  const touchX = useRef<number | null>(null);

  const go = useCallback((delta: number) => setIndex((i) => Math.min(pages.length - 1, Math.max(0, i + delta))), [pages.length]);

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === frame.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  if (!pages.length) return null;
  const page = pages[index]!;

  const toggleFullscreen = async () => {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await frame.current?.requestFullscreen?.();
  };

  return (
    <div className={cn("grid gap-4 md:grid-cols-5", className)}>
      <ol className="flex gap-3 overflow-x-auto pb-1 scrollbar-none md:col-span-1 md:flex-col md:overflow-visible" aria-label="Preview pages">
        {pages.map((p, i) => (
          <li key={p.id} className="shrink-0">
            <button
              type="button"
              onClick={() => setIndex(i)}
              aria-current={i === index ? "true" : undefined}
              className={cn(
                "flex w-20 flex-col items-center gap-1.5 rounded-md border p-1.5 text-caption transition-colors md:w-full",
                i === index ? "border-accent bg-accent-soft/50 text-fg" : "border-line bg-surface text-fg-muted hover:border-line-strong",
              )}
            >
              <span className="relative block aspect-3/4 w-full overflow-hidden rounded-sm bg-surface-raised">
                <Image src={p.url} alt="" fill sizes="96px" className="object-cover" />
              </span>
              <span className="line-clamp-1">{p.label}</span>
            </button>
          </li>
        ))}
      </ol>
      <div
        ref={frame}
        className={cn("flex flex-col gap-3 rounded-xl bg-canvas-subtle p-3 md:col-span-4 md:p-5", fullscreen && "justify-center bg-scrim-reader p-6")}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") go(1);
          if (e.key === "ArrowLeft") go(-1);
        }}
        onTouchStart={(e) => (touchX.current = e.touches[0]?.clientX ?? null)}
        onTouchEnd={(e) => {
          const start = touchX.current;
          const end = e.changedTouches[0]?.clientX;
          if (start != null && end != null && Math.abs(end - start) > 40) go(end < start ? 1 : -1);
          touchX.current = null;
        }}
        tabIndex={0}
        role="region"
        aria-label={`Preview of ${title}`}
        aria-roledescription="carousel"
      >
        <div className="relative flex items-center justify-center overflow-auto">
          <Button variant="secondary" size="icon" className="absolute left-1 z-10 rounded-full" onClick={() => go(-1)} disabled={index === 0} aria-label="Previous page">
            <ChevronLeft />
          </Button>
          <div className="relative aspect-3/4 w-full max-w-md overflow-hidden rounded-md bg-white shadow-3 transition-transform duration-normal" style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}>
            <Image src={page.url} alt={page.alt} fill sizes="(min-width: 768px) 448px, 90vw" className="object-contain" />
          </div>
          <Button variant="secondary" size="icon" className="absolute right-1 z-10 rounded-full" onClick={() => go(1)} disabled={index === pages.length - 1} aria-label="Next page">
            <ChevronRight />
          </Button>
        </div>
        <div className="flex items-center justify-between gap-3 text-caption text-fg-muted">
          <span aria-live="polite">
            {page.label} · {index + 1} / {pages.length}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon-sm" onClick={() => setZoom((z) => Math.max(1, z - 0.25))} disabled={zoom <= 1} aria-label="Zoom out">
              <ZoomOut />
            </Button>
            <span className="w-10 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
            <Button variant="ghost" size="icon-sm" onClick={() => setZoom((z) => Math.min(2, z + 0.25))} disabled={zoom >= 2} aria-label="Zoom in">
              <ZoomIn />
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={toggleFullscreen} aria-label={fullscreen ? "Exit full screen" : "Full screen"}>
              {fullscreen ? <Minimize2 /> : <Maximize2 />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

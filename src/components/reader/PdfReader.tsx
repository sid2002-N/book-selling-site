"use client";

import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  ChevronLeft,
  ChevronRight,
  List,
  Maximize,
  Minimize,
  Minus,
  Plus,
  RotateCcw,
  X,
} from "lucide-react";
import Link from "next/link";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReaderManifest } from "@/modules/reader";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogContent } from "@/components/ui/Dialog";
import { Spinner } from "@/components/ui/Spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { toast } from "@/components/ui/Toast";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/cn";

const ZOOMS = [0.75, 1, 1.25, 1.5, 2, 2.5];
const SAVE_DELAY_MS = 1500;

type Mark = { id: string; page: number; label: string | null };

/**
 * KRM reader (sheet 69, DEC-009): pdf.js loaded on demand, the file streamed through the
 * owner-only range endpoint, never a public URL. Progress is saved (debounced) so the next
 * visit resumes on the same page.
 */
export function PdfReader({ manifest, initialPage }: { manifest: ReaderManifest; initialPage: number }) {
  const desktop = useMediaQuery("(min-width: 1024px)");
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [page, setPage] = useState(initialPage);
  const [zoomIndex, setZoomIndex] = useState(1);
  const [panelOpen, setPanelOpen] = useState(false);
  const [controls, setControls] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [marks, setMarks] = useState<Mark[]>(manifest.bookmarks);
  // Draft while the reader types a page number; null shows the current page.
  const [pageDraft, setPageDraft] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const renderRef = useRef<RenderTask | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const total = doc?.numPages ?? manifest.totalPages ?? 1;

  // Load pdf.js and the document (lazy: the library is only fetched on this route).
  useEffect(() => {
    let cancelled = false;
    let loading: { destroy: () => Promise<void> } | null = null;
    (async () => {
      try {
        // Legacy build: the modern one relies on JS features many readers' browsers don't have yet.
        const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/legacy/build/pdf.worker.min.mjs", import.meta.url).toString();
        const task = pdfjs.getDocument({ url: manifest.fileUrl!, withCredentials: true, rangeChunkSize: 65_536, disableAutoFetch: true });
        loading = task;
        const loaded = await task.promise;
        if (cancelled) return;
        setDoc(loaded);
        setPage((p) => Math.min(Math.max(1, p), loaded.numPages));
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
      void loading?.destroy();
    };
  }, [manifest.fileUrl, attempt]);

  // Render the current page, fitted to the stage width, sharp on high-DPI screens.
  useEffect(() => {
    if (!doc || !canvasRef.current || !stageRef.current) return;
    let cancelled = false;
    (async () => {
      const pdfPage = await doc.getPage(page);
      if (cancelled) return;
      const base = pdfPage.getViewport({ scale: 1 });
      const available = Math.max(280, stageRef.current!.clientWidth - 32);
      const fit = Math.min(available / base.width, 1.6);
      const viewport = pdfPage.getViewport({ scale: fit * ZOOMS[zoomIndex]! });
      const ratio = window.devicePixelRatio || 1;
      const canvas = canvasRef.current!;
      canvas.width = Math.floor(viewport.width * ratio);
      canvas.height = Math.floor(viewport.height * ratio);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;
      renderRef.current?.cancel();
      const task = pdfPage.render({ canvas, viewport, transform: ratio !== 1 ? [ratio, 0, 0, ratio, 0, 0] : undefined });
      renderRef.current = task;
      await task.promise.catch(() => undefined);
    })();
    return () => {
      cancelled = true;
    };
  }, [doc, page, zoomIndex, desktop, fullscreen]);

  const chapter = useMemo(() => [...manifest.toc].reverse().find((t) => t.page <= page)?.title ?? null, [manifest.toc, page]);

  // Debounced progress save; flushed with keepalive when the tab is hidden or closed.
  const pending = useRef<{ page: number; total: number; chapter: string | null } | null>(null);
  const flush = useCallback(
    (keepalive = false) => {
      if (!pending.current) return;
      const body = JSON.stringify(pending.current);
      pending.current = null;
      void fetch(`/api/v1/reader/${manifest.libraryItemId}/progress`, { method: "PUT", headers: { "Content-Type": "application/json" }, body, keepalive }).catch(() => undefined);
    },
    [manifest.libraryItemId],
  );
  useEffect(() => {
    if (status !== "ready") return;
    pending.current = { page, total, chapter };
    const timer = setTimeout(() => flush(), SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [page, total, chapter, status, flush]);
  useEffect(() => {
    const onHide = () => document.visibilityState === "hidden" && flush(true);
    const onPageHide = () => flush(true);
    window.addEventListener("pagehide", onPageHide);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [flush]);

  const go = useCallback((next: number) => setPage((p) => Math.min(Math.max(1, next === Infinity ? p : next), total)), [total]);

  // Keyboard navigation (DESIGN_SYSTEM §20).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, textarea, [role=dialog]")) return;
      if (e.key === "ArrowRight" || e.key === "PageDown") go(page + 1);
      else if (e.key === "ArrowLeft" || e.key === "PageUp") go(page - 1);
      else if (e.key === "Home") go(1);
      else if (e.key === "End") go(total);
      else if (e.key === "+" || e.key === "=") setZoomIndex((z) => Math.min(z + 1, ZOOMS.length - 1));
      else if (e.key === "-") setZoomIndex((z) => Math.max(z - 1, 0));
      else if (e.key.toLowerCase() === "t") setPanelOpen((o) => !o);
      else if (e.key.toLowerCase() === "f") void toggleFullscreen();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);
  async function toggleFullscreen() {
    if (document.fullscreenElement) await document.exitFullscreen().catch(() => undefined);
    else await rootRef.current?.requestFullscreen().catch(() => undefined);
  }

  // Phones: controls fade after a few seconds and return on tap (sheet "Mobile Marketplace").
  useEffect(() => {
    if (desktop || !controls || panelOpen) return;
    const timer = setTimeout(() => setControls(false), 3500);
    return () => clearTimeout(timer);
  }, [desktop, controls, panelOpen, page]);

  const marked = marks.find((m) => m.page === page);
  async function toggleBookmark() {
    const url = `/api/v1/reader/${manifest.libraryItemId}/bookmarks`;
    if (marked) {
      const res = await fetch(`${url}?page=${page}`, { method: "DELETE" });
      if (res.ok) setMarks((m) => m.filter((x) => x.page !== page));
      return;
    }
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ page, label: chapter ? `${chapter} · p. ${page}` : null }) });
    const body = (await res.json().catch(() => null)) as { data?: Mark } | null;
    if (body?.data) {
      setMarks((m) => [...m, body.data!].sort((a, b) => a.page - b.page));
      toast({ title: "Bookmarked", description: `Page ${page}` });
    }
  }

  const panel = (
    <Tabs defaultValue="contents" className="flex min-h-0 flex-1 flex-col gap-3">
      <TabsList>
        <TabsTrigger value="contents">Contents</TabsTrigger>
        <TabsTrigger value="bookmarks">Bookmarks ({marks.length})</TabsTrigger>
      </TabsList>
      <TabsContent value="contents" className="min-h-0 flex-1 overflow-y-auto">
        {manifest.toc.length ? (
          <ol className="flex flex-col gap-0.5 text-body-sm">
            {manifest.toc.map((t, i) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => {
                    go(t.page);
                    if (!desktop) setPanelOpen(false);
                  }}
                  aria-current={chapter === t.title ? "true" : undefined}
                  className={cn("flex w-full justify-between gap-3 rounded-sm px-2 py-2 text-left hover:bg-canvas-subtle", t.nested && "pl-6", chapter === t.title && "bg-accent-soft font-semibold")}
                >
                  <span>
                    {i + 1}. {t.title}
                  </span>
                  <span className="text-fg-muted tabular-nums">{t.page}</span>
                </button>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-body-sm text-fg-muted">This title has no table of contents.</p>
        )}
      </TabsContent>
      <TabsContent value="bookmarks" className="min-h-0 flex-1 overflow-y-auto">
        {marks.length ? (
          <ul className="flex flex-col gap-0.5 text-body-sm">
            {marks.map((m) => (
              <li key={m.id}>
                <button type="button" onClick={() => go(m.page)} className="flex w-full justify-between gap-3 rounded-sm px-2 py-2 text-left hover:bg-canvas-subtle">
                  <span>{m.label ?? `Page ${m.page}`}</span>
                  <span className="text-fg-muted tabular-nums">p. {m.page}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-body-sm text-fg-muted">No bookmarks yet. Use the bookmark button to save your place.</p>
        )}
      </TabsContent>
    </Tabs>
  );

  const showBars = desktop || controls;

  return (
    <div ref={rootRef} className="relative flex min-h-dvh flex-col bg-canvas-subtle">
      <header className={cn("sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-line bg-surface/95 px-3 backdrop-blur transition-opacity duration-normal", showBars ? "opacity-100" : "pointer-events-none opacity-0")}>
        <Button asChild variant="ghost" size="icon-sm" aria-label="Back to library">
          <Link href={`/account/library/${manifest.libraryItemId}`}>
            <ArrowLeft />
          </Link>
        </Button>
        <Button variant="ghost" size="icon-sm" aria-label="Table of contents" aria-pressed={panelOpen} onClick={() => setPanelOpen((o) => !o)}>
          <List />
        </Button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-label font-semibold">{manifest.title}</p>
          {chapter ? <p className="truncate text-caption text-fg-muted">{chapter}</p> : null}
        </div>
        <div className="hidden items-center gap-1 md:flex">
          <Button variant="ghost" size="icon-sm" aria-label="Zoom out" disabled={zoomIndex === 0} onClick={() => setZoomIndex((z) => z - 1)}>
            <Minus />
          </Button>
          <span className="w-12 text-center text-caption tabular-nums">{Math.round(ZOOMS[zoomIndex]! * 100)}%</span>
          <Button variant="ghost" size="icon-sm" aria-label="Zoom in" disabled={zoomIndex === ZOOMS.length - 1} onClick={() => setZoomIndex((z) => z + 1)}>
            <Plus />
          </Button>
        </div>
        <Button variant="ghost" size="icon-sm" aria-label={marked ? "Remove bookmark" : "Bookmark this page"} aria-pressed={Boolean(marked)} onClick={toggleBookmark} disabled={status !== "ready"}>
          {marked ? <BookmarkCheck className="text-accent-strong" /> : <Bookmark />}
        </Button>
        <Button variant="ghost" size="icon-sm" aria-label={fullscreen ? "Exit full screen" : "Full screen"} onClick={toggleFullscreen} className="hidden sm:inline-flex">
          {fullscreen ? <Minimize /> : <Maximize />}
        </Button>
      </header>

      <div className="flex min-h-0 flex-1">
        {desktop && panelOpen ? (
          <aside aria-label="Contents and bookmarks" className="sticky top-14 flex h-[calc(100dvh-7rem)] w-80 shrink-0 flex-col gap-3 border-r border-line bg-surface p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-label font-semibold">Navigate</h2>
              <Button variant="ghost" size="icon-sm" aria-label="Close panel" onClick={() => setPanelOpen(false)}>
                <X />
              </Button>
            </div>
            {panel}
          </aside>
        ) : null}

        <main
          ref={stageRef}
          className="flex min-w-0 flex-1 justify-center overflow-auto px-4 py-6"
          onClick={() => !desktop && setControls((c) => !c)}
          aria-label={`Page ${page} of ${total}`}
        >
          {status === "loading" ? (
            <div className="flex flex-col items-center justify-center gap-3 py-24 text-body-sm text-fg-muted" role="status">
              <Spinner className="size-6" /> Opening your book…
            </div>
          ) : status === "error" ? (
            <div className="flex flex-col items-center justify-center gap-4 py-24 text-center" role="alert">
              <p className="text-h3">We couldn&apos;t open this file</p>
              <p className="max-w-sm text-body-sm text-fg-secondary">Check your connection and try again. If it keeps happening, download the file from your library instead.</p>
              <Button onClick={() => (setStatus("loading"), setAttempt((a) => a + 1))}>
                <RotateCcw /> Try again
              </Button>
            </div>
          ) : null}
          <canvas ref={canvasRef} className={cn("h-fit rounded-sm bg-white shadow-3", status !== "ready" && "hidden")} />
        </main>
      </div>

      <footer className={cn("sticky bottom-0 z-20 flex h-14 items-center justify-center gap-3 border-t border-line bg-surface/95 px-3 pb-safe backdrop-blur transition-opacity duration-normal", showBars ? "opacity-100" : "pointer-events-none opacity-0")}>
        <Button variant="secondary" size="icon-sm" aria-label="Previous page" disabled={page <= 1} onClick={() => go(page - 1)}>
          <ChevronLeft />
        </Button>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const n = Number(pageDraft);
            if (pageDraft && Number.isInteger(n)) go(n);
            setPageDraft(null);
          }}
          className="flex items-center gap-1.5 text-caption text-fg-secondary"
        >
          <label htmlFor="reader-page" className="sr-only">
            Page number
          </label>
          <input id="reader-page" inputMode="numeric" value={pageDraft ?? String(page)} onChange={(e) => setPageDraft(e.target.value.replace(/\D/g, ""))} onBlur={() => setPageDraft(null)} className="h-8 w-12 rounded-sm border border-line bg-surface text-center text-label tabular-nums" />
          <span className="tabular-nums">/ {total}</span>
        </form>
        <Button variant="secondary" size="icon-sm" aria-label="Next page" disabled={page >= total} onClick={() => go(page + 1)}>
          <ChevronRight />
        </Button>
        <div className="absolute right-3 hidden text-caption text-fg-muted lg:block">{Math.round((page / total) * 100)}% read</div>
      </footer>

      {!desktop ? (
        <Dialog open={panelOpen} onOpenChange={setPanelOpen}>
          <DialogContent variant="sheet" title="Navigate" className="flex max-h-[80dvh] flex-col">
            <div className="flex max-h-[60dvh] min-h-0 flex-col">{panel}</div>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}

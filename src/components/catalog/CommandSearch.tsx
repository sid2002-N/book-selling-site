"use client";

import { ArrowUpRight, Clock, CornerDownLeft, FolderOpen, Search, TrendingUp, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { cn } from "@/lib/cn";

type Suggestion =
  | { kind: "product"; title: string; href: string; typeLabel: string; spineColor: string }
  | { kind: "category"; title: string; href: string; count: number };

type Item = { id: string; label: string; href: string; hint?: string; icon: "recent" | "popular" | "category" | "product" | "search"; spineColor?: string };

const RECENT_KEY = "krm:recent-searches";

function readRecent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]").slice(0, 5);
  } catch {
    return [];
  }
}

function saveRecent(term: string) {
  try {
    const next = [term, ...readRecent().filter((t) => t !== term)].slice(0, 5);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable: recent searches are a convenience only */
  }
}

/** Command-style search (F3): glass palette on desktop, full-screen on phones. */
export function CommandSearch({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Suggestion[]>([]);
  const [popular, setPopular] = useState<string[]>([]);
  // Read once per opening; recent searches are a per-device convenience (localStorage).
  const recent = useMemo(() => (open ? readRecent() : []), [open]);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const listId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/v1/search/suggest?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        if (res.ok) {
          const body = (await res.json()) as { data: { suggestions: Suggestion[]; popular: string[] } };
          setResults(body.data.suggestions);
          if (!q) setPopular(body.data.popular);
        }
      } catch {
        /* aborted or offline: keep the previous suggestions */
      } finally {
        setLoading(false);
      }
    }, q ? 160 : 0);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [q, open]);

  const items: Item[] = useMemo(() => {
    if (!q.trim()) {
      return [
        ...recent.map((t) => ({ id: `r-${t}`, label: t, href: `/search?q=${encodeURIComponent(t)}`, icon: "recent" as const })),
        ...popular.filter((t) => !recent.includes(t)).map((t) => ({ id: `p-${t}`, label: t, href: `/search?q=${encodeURIComponent(t)}`, icon: "popular" as const })),
      ];
    }
    return [
      { id: "search", label: `Search for “${q.trim()}”`, href: `/search?q=${encodeURIComponent(q.trim())}`, icon: "search" as const },
      ...results.map((r) =>
        r.kind === "product"
          ? { id: r.href, label: r.title, href: r.href, hint: r.typeLabel, icon: "product" as const, spineColor: r.spineColor }
          : { id: r.href, label: r.title, href: r.href, hint: `${r.count} products`, icon: "category" as const },
      ),
    ];
  }, [q, results, recent, popular]);

  const go = (item: Item) => {
    const term = item.icon === "search" ? q.trim() : item.icon === "recent" || item.icon === "popular" ? item.label : null;
    if (term) saveRecent(term);
    onOpenChange(false);
    setQ("");
    router.push(item.href);
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-scrim data-[state=open]:animate-fade-in" />
        <DialogPrimitive.Content
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            inputRef.current?.focus();
          }}
          className="fixed inset-0 z-50 flex flex-col overflow-hidden border border-line bg-surface-raised shadow-3 data-[state=open]:animate-rise-in md:inset-auto md:top-[12vh] md:left-1/2 md:max-h-[70vh] md:w-full md:max-w-xl md:-translate-x-1/2 md:rounded-xl"
        >
          <DialogPrimitive.Title className="sr-only">Search KRM.lib</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">Type to search books, guides, workbooks and categories.</DialogPrimitive.Description>
          <div className="flex items-center gap-3 border-b border-line px-4 pt-safe">
            <Search className="size-5 shrink-0 text-fg-muted" aria-hidden />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setActive(0);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setActive((a) => Math.min(items.length - 1, a + 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActive((a) => Math.max(0, a - 1));
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  const item = items[active];
                  if (item) go(item);
                }
              }}
              placeholder="Search books, guides, collections…"
              aria-label="Search"
              role="combobox"
              aria-expanded={items.length > 0}
              aria-controls={listId}
              aria-activedescendant={items[active] ? `${listId}-${active}` : undefined}
              aria-autocomplete="list"
              className="h-14 flex-1 bg-transparent text-body text-fg outline-none placeholder:text-fg-muted"
            />
            {loading ? <span className="text-caption text-fg-muted">Searching…</span> : null}
            <DialogPrimitive.Close className="flex size-9 items-center justify-center rounded-full text-fg-muted hover:bg-canvas-subtle" aria-label="Close search">
              <X className="size-4" />
            </DialogPrimitive.Close>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {!q.trim() && items.length === 0 ? (
              <p className="px-3 py-6 text-center text-body-sm text-fg-muted">Search the library by title, topic or skill.</p>
            ) : null}
            {!q.trim() && recent.length ? <p className="px-3 pt-2 pb-1 text-caption font-semibold text-fg-muted">Recent searches</p> : null}
            <ul id={listId} role="listbox" aria-label="Suggestions">
              {items.map((item, i) => {
                const Icon = { recent: Clock, popular: TrendingUp, category: FolderOpen, product: ArrowUpRight, search: Search }[item.icon];
                const showPopularHeading = !q.trim() && item.icon === "popular" && items[i - 1]?.icon !== "popular";
                return (
                  <li key={item.id} role="presentation">
                    {showPopularHeading ? <p className="px-3 pt-3 pb-1 text-caption font-semibold text-fg-muted">Popular right now</p> : null}
                    <button
                      type="button"
                      id={`${listId}-${i}`}
                      role="option"
                      aria-selected={i === active}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => go(item)}
                      className={cn("flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-body-sm", i === active ? "bg-surface text-fg shadow-1" : "text-fg-secondary")}
                    >
                      {item.spineColor ? (
                        <span aria-hidden className="h-7 w-2 rounded-sm" style={{ backgroundColor: item.spineColor }} />
                      ) : (
                        <Icon className="size-4 shrink-0 text-fg-muted" aria-hidden />
                      )}
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.hint ? <span className="text-caption text-fg-muted">{item.hint}</span> : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="hidden items-center gap-4 border-t border-line px-4 py-2.5 text-caption text-fg-muted md:flex">
            <span>↑↓ to navigate</span>
            <span className="flex items-center gap-1">
              <CornerDownLeft className="size-3" aria-hidden /> to select
            </span>
            <span>esc to close</span>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

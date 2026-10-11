"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/Dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";

export type Facet = { value: string; label: string; count?: number };
export type FilterConfig = {
  categories?: Facet[];
  formats?: Facet[];
  priceSteps?: Facet[];
};

const FILTER_KEYS = ["category", "format", "price"] as const;

/** URL-addressable filter state (F1 AC): every change rewrites the query string. */
function useCatalogParams() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const push = (next: URLSearchParams) =>
    startTransition(() => router.push(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false }));

  const set = (key: string, value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (!value) next.delete(key);
    else next.set(key, value);
    next.delete("page");
    push(next);
  };

  const clear = () => {
    const next = new URLSearchParams(params.toString());
    for (const k of [...FILTER_KEYS, "page"]) next.delete(k);
    push(next);
  };

  const activeCount = FILTER_KEYS.filter((k) => params.get(k)).length;
  return { params, set, clear, pending, activeCount };
}

function FilterGroups({ config, onChange }: { config: FilterConfig; onChange?: () => void }) {
  const { params, set, clear, pending, activeCount } = useCatalogParams();
  const update = (key: string, value: string | null) => {
    set(key, value);
    onChange?.();
  };
  return (
    <div className="flex flex-col gap-6" aria-busy={pending}>
      {config.categories?.length ? (
        <FilterGroup title="Category">
          <RadioList name="category" value={params.get("category")} options={config.categories} onChange={(v) => update("category", v)} />
        </FilterGroup>
      ) : null}
      {config.formats?.length ? (
        <FilterGroup title="Format">
          <RadioList name="format" value={params.get("format")} options={config.formats} onChange={(v) => update("format", v)} />
        </FilterGroup>
      ) : null}
      {config.priceSteps?.length ? (
        <FilterGroup title="Price">
          <RadioList name="price" value={params.get("price")} options={config.priceSteps} onChange={(v) => update("price", v)} />
        </FilterGroup>
      ) : null}
      {activeCount ? (
        <Button variant="tertiary" size="sm" onClick={clear} className="self-start px-0">
          <X /> Clear filters
        </Button>
      ) : null}
    </div>
  );
}

/** Desktop filter sidebar. */
export function CatalogSidebar({ config }: { config: FilterConfig }) {
  return (
    <aside aria-label="Filters" className="hidden lg:block">
      <div className="sticky top-24 rounded-lg border border-line bg-surface p-5">
        <FilterGroups config={config} />
      </div>
    </aside>
  );
}

/** Result count, sort, and (below laptop width) a filter bottom sheet. */
export function CatalogToolbar({
  config,
  total,
  sortOptions,
  defaultSort,
}: {
  config: FilterConfig;
  total: number;
  sortOptions: { value: string; label: string }[];
  defaultSort: string;
}) {
  const { params, set, activeCount } = useCatalogParams();
  const [open, setOpen] = useState(false);
  const hasFilters = Boolean(config.categories?.length || config.formats?.length || config.priceSteps?.length);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-body-sm font-medium text-fg" aria-live="polite">
        {total} {total === 1 ? "product" : "products"}
      </p>
      <div className="flex items-center gap-2">
        {hasFilters ? (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="secondary" size="sm" className="lg:hidden">
                <SlidersHorizontal /> Filters{activeCount ? ` (${activeCount})` : ""}
              </Button>
            </DialogTrigger>
            <DialogContent variant="sheet" title="Filters">
              <FilterGroups config={config} onChange={() => setOpen(false)} />
            </DialogContent>
          </Dialog>
        ) : null}
        <label htmlFor="catalog-sort" className="sr-only md:not-sr-only md:text-label md:whitespace-nowrap md:text-fg-muted">
          Sort by
        </label>
        <Select value={params.get("sort") ?? defaultSort} onValueChange={(v) => set("sort", v === defaultSort ? null : v)}>
          <SelectTrigger id="catalog-sort" className="h-9 w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-1">
      <legend className="mb-2 text-label font-semibold text-fg">{title}</legend>
      {children}
    </fieldset>
  );
}

function RadioList({ name, value, options, onChange }: { name: string; value: string | null; options: Facet[]; onChange: (v: string | null) => void }) {
  const row = "flex cursor-pointer items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-body-sm text-fg-secondary hover:bg-canvas-subtle has-checked:font-medium has-checked:text-fg";
  return (
    <ul className="flex flex-col">
      <li>
        <label className={row}>
          <span className="flex items-center gap-2.5">
            <input type="radio" name={name} checked={!value} onChange={() => onChange(null)} className="size-4 accent-ink" />
            All
          </span>
        </label>
      </li>
      {options.map((o) => (
        <li key={o.value}>
          <label className={cn(row, o.count === 0 && "opacity-50")}>
            <span className="flex items-center gap-2.5">
              <input type="radio" name={name} checked={value === o.value} onChange={() => onChange(o.value)} className="size-4 accent-ink" />
              {o.label}
            </span>
            {o.count != null ? <span className="text-caption text-fg-muted">{o.count}</span> : null}
          </label>
        </li>
      ))}
    </ul>
  );
}

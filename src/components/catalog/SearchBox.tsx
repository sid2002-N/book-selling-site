import { Search } from "lucide-react";

/** Plain GET form so search works without JavaScript; the command palette enhances it. */
export function SearchBox({ defaultValue }: { defaultValue?: string }) {
  return (
    <form action="/search" role="search" className="relative max-w-xl">
      <label htmlFor="search-q" className="sr-only">
        Search books, guides, topics
      </label>
      <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-fg-muted" aria-hidden />
      <input
        id="search-q"
        name="q"
        type="search"
        defaultValue={defaultValue}
        placeholder="Search books, guides, topics…"
        className="h-12 w-full rounded-full border border-line-strong bg-surface pr-4 pl-11 text-body text-fg placeholder:text-fg-muted focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-focus/40"
      />
    </form>
  );
}

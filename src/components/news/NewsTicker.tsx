import type { NewsItem } from "@/modules/news";
import { cn } from "@/lib/cn";
import type { Tone } from "./tones";

/**
 * Headline ticker. The track holds the list twice so the loop is seamless; the copy is
 * hidden from assistive tech and keyboard focus. Pauses on hover/focus, static when reduced.
 */
export function NewsTicker({ items, toneOf }: { items: NewsItem[]; toneOf: (id: string) => Tone }) {
  if (items.length < 3) return null;
  const row = (copy: boolean) =>
    items.map((item) => (
      <li key={`${copy ? "b" : "a"}-${item.id}`} aria-hidden={copy || undefined} className="flex shrink-0 items-center gap-3 pr-10">
        <span aria-hidden className={cn("size-1.5 rounded-full", toneOf(item.source.id).bar)} />
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          tabIndex={copy ? -1 : undefined}
          className="text-body-sm font-medium whitespace-nowrap text-fg hover:underline"
        >
          {item.title}
        </a>
        <span className="text-caption whitespace-nowrap text-fg-muted">{item.source.name}</span>
      </li>
    ));
  return (
    <section aria-label="Latest headlines" className="ticker relative overflow-hidden border-y border-line bg-surface">
      <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-linear-to-r from-surface to-transparent" />
      <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-linear-to-l from-surface to-transparent" />
      <div className="flex py-3">
        <ul className="ticker-track flex w-max motion-safe:animate-marquee">
          {row(false)}
          {row(true)}
        </ul>
      </div>
    </section>
  );
}

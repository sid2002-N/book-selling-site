import { ArrowUpRight, MessageSquare, TrendingUp } from "lucide-react";
import type { CSSProperties } from "react";
import type { NewsItem } from "@/modules/news";
import { cn } from "@/lib/cn";
import type { Tone } from "./tones";

type Props = { item: NewsItem; tone: Tone; ago: string | null; style?: CSSProperties; variant?: "card" | "compact" };

/** One headline. Opens the publisher's article in a new tab — we never host the story. */
export function NewsCard({ item, tone, ago, style, variant = "card" }: Props) {
  const meta = (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-fg-muted">
      <span className={cn("font-semibold", tone.text)}>{item.source.name}</span>
      {ago ? <span aria-hidden>·</span> : null}
      {ago ? <time dateTime={item.publishedAt ?? undefined}>{ago}</time> : null}
      {item.points != null ? (
        <span className="inline-flex items-center gap-1">
          <TrendingUp className="size-3" aria-hidden /> {item.points}
          <span className="sr-only">points</span>
        </span>
      ) : null}
      {item.comments != null ? (
        <span className="inline-flex items-center gap-1">
          <MessageSquare className="size-3" aria-hidden /> {item.comments}
          <span className="sr-only">comments</span>
        </span>
      ) : null}
    </p>
  );

  if (variant === "compact") {
    return (
      <li style={style}>
        <a href={item.url} target="_blank" rel="noopener noreferrer" className="group flex gap-3 rounded-md p-2 transition-colors duration-fast hover:bg-surface">
          <span aria-hidden className={cn("mt-1.5 size-2 shrink-0 rounded-full", tone.bar)} />
          <span className="flex min-w-0 flex-col gap-1">
            <span className="headline-sweep line-clamp-2 self-start text-body-sm font-semibold text-fg">{item.title}</span>
            {meta}
          </span>
        </a>
      </li>
    );
  }

  return (
    <li style={style} className="h-full">
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group relative flex h-full flex-col gap-3 overflow-hidden rounded-xl border border-line bg-surface p-5 shadow-1 transition-[transform,box-shadow] duration-normal hover:-translate-y-1 hover:shadow-2 focus-visible:-translate-y-1"
      >
        <span aria-hidden className={cn("absolute inset-x-0 top-0 h-1 origin-left scale-x-25 transition-transform duration-slow group-hover:scale-x-100", tone.bar)} />
        {meta}
        <h3 className="font-serif text-h4 leading-snug text-fg">
          <span className="headline-sweep">{item.title}</span>
        </h3>
        {item.summary ? <p className="line-clamp-3 text-body-sm text-fg-secondary">{item.summary}</p> : null}
        <span className="mt-auto flex items-center gap-1 pt-2 text-label font-medium text-fg-secondary group-hover:text-fg">
          Read on {item.source.name}
          <ArrowUpRight className="size-4 transition-transform duration-fast group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
          <span className="sr-only">(opens in a new tab)</span>
        </span>
      </a>
    </li>
  );
}

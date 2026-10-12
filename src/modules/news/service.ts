import "server-only";
import { logger } from "@/lib/logger";
import { mergeItems, parseFeed, parseHackerNews, type NewsItem } from "./parse";
import { newsSources, type NewsSource, type NewsTopic } from "./sources";

/** Feeds are refreshed at most every 15 minutes (Next data cache), so publishers see few requests. */
const REVALIDATE_SECONDS = 900;
const TIMEOUT_MS = 6000;
const MAX_BYTES = 3_000_000;

async function fetchSource(source: NewsSource): Promise<NewsItem[]> {
  const res = await fetch(source.url, {
    headers: {
      "User-Agent": `KRM.lib news reader (+${process.env.NEXT_PUBLIC_APP_URL ?? "https://krmlib.local"})`,
      Accept: source.kind === "hn" ? "application/json" : "application/rss+xml, application/atom+xml, application/xml;q=0.9, */*;q=0.5",
    },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    next: { revalidate: REVALIDATE_SECONDS, tags: ["news"] },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = await res.text();
  if (body.length > MAX_BYTES) throw new Error("Feed too large");
  return source.kind === "hn" ? parseHackerNews(JSON.parse(body), source) : parseFeed(body, source);
}

export type NewsPage = {
  items: NewsItem[];
  sources: { id: string; name: string; topic: NewsTopic; home: string; ok: boolean; count: number }[];
  fetchedAt: string;
};

/**
 * Latest headlines from every configured source. Sources fail independently: a slow or
 * broken feed is reported as unavailable and never takes the page down.
 */
export async function latestNews(filter: { topic?: NewsTopic | null; source?: string | null } = {}): Promise<NewsPage> {
  const sources = newsSources();
  const results = await Promise.allSettled(sources.map(fetchSource));
  const status = sources.map((s, i) => {
    const r = results[i]!;
    if (r.status === "rejected") logger.warn("news_source_failed", { source: s.id, error: String(r.reason).slice(0, 200) });
    return { id: s.id, name: s.name, topic: s.topic, home: s.home, ok: r.status === "fulfilled", count: r.status === "fulfilled" ? r.value.length : 0 };
  });
  const all = mergeItems(results.map((r) => (r.status === "fulfilled" ? r.value : [])));
  const items = all.filter((i) => (!filter.topic || i.source.topic === filter.topic) && (!filter.source || i.source.id === filter.source));
  return { items, sources: status, fetchedAt: new Date().toISOString() };
}

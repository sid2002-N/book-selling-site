import { z } from "zod";

export type NewsTopic = "tech" | "culture";

export type NewsSource = {
  id: string;
  name: string;
  /** "rss" covers RSS 2.0 and Atom; "hn" is the Hacker News Algolia API. */
  kind: "rss" | "hn";
  url: string;
  topic: NewsTopic;
  /** Publisher home page, for attribution. */
  home: string;
};

/**
 * Public, publisher-provided feeds. Headlines link back to the original article; KRM.lib
 * never hosts or rewrites the stories. Override with NEWS_FEEDS (JSON array, same shape).
 */
export const DEFAULT_SOURCES: NewsSource[] = [
  { id: "hn", name: "Hacker News", kind: "hn", url: "https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=30", topic: "tech", home: "https://news.ycombinator.com" },
  { id: "verge", name: "The Verge", kind: "rss", url: "https://www.theverge.com/rss/index.xml", topic: "tech", home: "https://www.theverge.com" },
  { id: "ars", name: "Ars Technica", kind: "rss", url: "https://feeds.arstechnica.com/arstechnica/index", topic: "tech", home: "https://arstechnica.com" },
  { id: "wired-culture", name: "WIRED Culture", kind: "rss", url: "https://www.wired.com/feed/category/culture/latest/rss", topic: "culture", home: "https://www.wired.com/category/culture/" },
  { id: "guardian-culture", name: "The Guardian Culture", kind: "rss", url: "https://www.theguardian.com/culture/rss", topic: "culture", home: "https://www.theguardian.com/culture" },
];

const sourceSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{1,40}$/),
  name: z.string().min(1).max(60),
  kind: z.enum(["rss", "hn"]),
  url: z.url({ protocol: /^https?$/ }),
  topic: z.enum(["tech", "culture"]),
  home: z.url({ protocol: /^https?$/ }),
});

/** Configured sources: NEWS_FEEDS when valid, otherwise the defaults. */
export function newsSources(): NewsSource[] {
  const raw = process.env.NEWS_FEEDS;
  if (!raw) return DEFAULT_SOURCES;
  try {
    return z.array(sourceSchema).min(1).max(12).parse(JSON.parse(raw));
  } catch {
    return DEFAULT_SOURCES;
  }
}

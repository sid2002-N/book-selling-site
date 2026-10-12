/**
 * Feed normalisation — pure, so every format quirk is unit-tested. Output is plain text only:
 * markup is stripped and nothing is ever rendered as HTML.
 */
import { createHash } from "node:crypto";
import { XMLParser } from "fast-xml-parser";
import type { NewsSource, NewsTopic } from "./sources";

export type NewsItem = {
  id: string;
  title: string;
  url: string;
  summary: string | null;
  publishedAt: string | null;
  author: string | null;
  source: { id: string; name: string; topic: NewsTopic; home: string };
  /** Hacker News only. */
  points: number | null;
  comments: number | null;
  discussionUrl: string | null;
};

const SUMMARY_MAX = 220;
const TITLE_MAX = 200;

const NAMED: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", hellip: "…", mdash: "—", ndash: "–", lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”" };

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, code: string) => {
    if (code[0] === "#") {
      const n = code[1]?.toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : m;
    }
    return NAMED[code.toLowerCase()] ?? m;
  });
}

/** Markup → readable plain text (tags dropped, entities decoded, whitespace collapsed). */
export function toPlainText(value: unknown): string {
  const strip = (s: string) =>
    s
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<br\s*\/?>|<\/p>/gi, " ")
      .replace(/<[^>]+>/g, " ");
  // Feeds may escape their HTML (&lt;p&gt;) and double-encode text (&amp;#8217;), so
  // decode → strip → decode → strip until only text remains.
  const once = strip(decodeEntities(strip(textOf(value))));
  return strip(decodeEntities(once)).replace(/\s+/g, " ").trim();
}

export function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  const cut = s.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,.;:–—-]+$/, "")}…`;
}

function textOf(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return textOf(value[0]);
  if (typeof value === "object") {
    const o = value as Record<string, unknown>;
    return textOf(o["#text"] ?? o.__cdata ?? "");
  }
  return "";
}

export function safeUrl(value: unknown): string | null {
  const raw = textOf(value).trim();
  if (!raw) return null;
  try {
    const u = new URL(raw);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

function isoDate(value: unknown): string | null {
  const raw = textOf(value).trim();
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

const itemId = (url: string) => createHash("sha1").update(url).digest("hex").slice(0, 16);

function sourceRef(source: NewsSource): NewsItem["source"] {
  return { id: source.id, name: source.name, topic: source.topic, home: source.home };
}

function build(source: NewsSource, fields: { title: unknown; url: string | null; summary?: unknown; date?: unknown; author?: unknown }): NewsItem | null {
  const title = truncate(toPlainText(fields.title), TITLE_MAX);
  if (!title || !fields.url) return null;
  const summary = truncate(toPlainText(fields.summary), SUMMARY_MAX);
  const author = toPlainText(fields.author).slice(0, 80);
  return {
    id: itemId(fields.url),
    title,
    url: fields.url,
    summary: summary && summary !== title ? summary : null,
    publishedAt: isoDate(fields.date),
    author: author || null,
    source: sourceRef(source),
    points: null,
    comments: null,
    discussionUrl: null,
  };
}

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_", processEntities: false, htmlEntities: false, trimValues: true });
const list = <T>(v: T | T[] | undefined | null): T[] => (v == null ? [] : Array.isArray(v) ? v : [v]);

/** RSS 2.0 and Atom feeds. */
export function parseFeed(xml: string, source: NewsSource, limit = 20): NewsItem[] {
  const doc = parser.parse(xml) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  const out: NewsItem[] = [];
  if (doc.rss?.channel) {
    for (const it of list(doc.rss.channel.item)) {
      const item = build(source, {
        title: it.title,
        url: safeUrl(it.link) ?? safeUrl(it.guid),
        summary: it.description ?? it["content:encoded"],
        date: it.pubDate ?? it["dc:date"],
        author: it["dc:creator"] ?? it.author,
      });
      if (item) out.push(item);
    }
  } else if (doc.feed) {
    for (const e of list(doc.feed.entry)) {
      const links = list(e.link) as Array<Record<string, string> | string>;
      const alt = links.find((l) => typeof l === "object" && (!l["@_rel"] || l["@_rel"] === "alternate"));
      const href = typeof alt === "object" ? alt["@_href"] : typeof links[0] === "string" ? links[0] : undefined;
      const item = build(source, {
        title: e.title,
        url: safeUrl(href),
        summary: e.summary ?? e.content,
        date: e.published ?? e.updated,
        author: list(e.author)[0]?.name,
      });
      if (item) out.push(item);
    }
  }
  return out.slice(0, limit);
}

type HnHit = { objectID: string; title?: string | null; url?: string | null; author?: string; points?: number; num_comments?: number; created_at?: string };

/** Hacker News front page (Algolia API). Text posts link to their discussion. */
export function parseHackerNews(json: unknown, source: NewsSource, limit = 20): NewsItem[] {
  const hits = (json as { hits?: HnHit[] })?.hits ?? [];
  const out: NewsItem[] = [];
  for (const h of hits) {
    if (!/^\d+$/.test(String(h.objectID))) continue;
    const discussionUrl = `https://news.ycombinator.com/item?id=${h.objectID}`;
    const item = build(source, { title: h.title, url: safeUrl(h.url) ?? discussionUrl, date: h.created_at, author: h.author });
    if (!item) continue;
    out.push({ ...item, points: typeof h.points === "number" ? h.points : null, comments: typeof h.num_comments === "number" ? h.num_comments : null, discussionUrl });
  }
  return out.slice(0, limit);
}

/** "3h ago" style label from a fixed `now`, so server output is deterministic. */
export function timeAgo(iso: string | null, now: Date): string | null {
  if (!iso) return null;
  const diff = (new Date(iso).getTime() - now.getTime()) / 1000;
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto", style: "short" });
  const abs = Math.abs(diff);
  if (abs < 60) return "just now";
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86_400) return rtf.format(Math.round(diff / 3600), "hour");
  if (abs < 7 * 86_400) return rtf.format(Math.round(diff / 86_400), "day");
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

/** Newest first, de-duplicated by URL across sources. */
export function mergeItems(groups: NewsItem[][]): NewsItem[] {
  const seen = new Set<string>();
  return groups
    .flat()
    .filter((i) => (seen.has(i.url) ? false : (seen.add(i.url), true)))
    .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
}

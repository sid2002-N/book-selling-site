// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { decodeEntities, mergeItems, parseFeed, parseHackerNews, timeAgo, toPlainText, truncate } from "@/modules/news/parse";
import type { NewsSource } from "@/modules/news/sources";

const fixture = (name: string) => readFileSync(`tests/fixtures/news/${name}`, "utf8");
const src = (over: Partial<NewsSource> = {}): NewsSource => ({ id: "s", name: "Sample", kind: "rss", url: "https://example.com/feed", topic: "tech", home: "https://example.com", ...over });

describe("RSS 2.0", () => {
  const items = parseFeed(fixture("rss.xml"), src());
  it("keeps valid items and drops unsafe links and untitled entries", () => {
    expect(items.map((i) => i.url)).toEqual(["https://example.com/articles/cooler-data-centres", "https://example.com/articles/note-taking"]);
  });
  it("turns HTML summaries into plain text with no markup or scripts", () => {
    expect(items[0]!.summary).toBe("Operators are redesigning racks to cut power use & heat.");
    expect(items[0]).toMatchObject({ author: "Sample Writer", publishedAt: "2026-10-10T09:30:00.000Z" });
  });
  it("decodes double-encoded entities", () => {
    expect(items[1]!.title).toContain("’s");
  });
});

describe("Atom", () => {
  it("uses the alternate link, published date and author", () => {
    const [item] = parseFeed(fixture("atom.xml"), src({ topic: "culture" }));
    expect(item).toMatchObject({
      url: "https://example.org/culture/museums-sound",
      summary: "Curators are layering audio over galleries.",
      author: "Sample Critic",
      publishedAt: "2026-10-10T08:00:00.000Z",
      source: { topic: "culture" },
    });
  });
});

describe("Hacker News", () => {
  const items = parseHackerNews(JSON.parse(fixture("hn.json")), src({ kind: "hn" }));
  it("keeps points/comments and links text posts to their discussion", () => {
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ points: 512, comments: 143, discussionUrl: "https://news.ycombinator.com/item?id=41000001" });
    expect(items[1]!.url).toBe("https://news.ycombinator.com/item?id=41000002");
  });
});

describe("helpers", () => {
  it("decodes numeric and named entities", () => {
    expect(decodeEntities("Tom&#8217;s &amp; &#x2014; &hellip;")).toBe("Tom’s & — …");
    expect(toPlainText("<b>Bold</b>&nbsp; text")).toBe("Bold text");
  });
  it("truncates on a word boundary", () => {
    expect(truncate("one two three four five", 14)).toBe("one two three…");
    expect(truncate("short", 10)).toBe("short");
  });
  it("merges newest first without duplicate URLs", () => {
    const a = parseFeed(fixture("rss.xml"), src());
    const merged = mergeItems([a, a, parseHackerNews(JSON.parse(fixture("hn.json")), src({ kind: "hn" }))]);
    expect(merged.map((i) => i.publishedAt)).toEqual([...merged.map((i) => i.publishedAt)].sort().reverse());
    expect(new Set(merged.map((i) => i.url)).size).toBe(merged.length);
  });
  it("formats relative times deterministically", () => {
    const now = new Date("2026-10-10T12:00:00Z");
    expect(timeAgo("2026-10-10T11:59:30Z", now)).toBe("just now");
    expect(timeAgo("2026-10-10T09:00:00Z", now)).toBe("3 hr. ago");
    expect(timeAgo(null, now)).toBeNull();
  });
});

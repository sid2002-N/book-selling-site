// @vitest-environment node
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { latestNews } from "@/modules/news/service";

const fixture = (name: string) => readFileSync(`tests/fixtures/news/${name}`, "utf8");
const feeds = [
  { id: "hn", name: "Hacker News", kind: "hn", url: "https://feeds.test/hn", topic: "tech", home: "https://news.ycombinator.com" },
  { id: "culture", name: "Culture Desk", kind: "rss", url: "https://feeds.test/atom", topic: "culture", home: "https://feeds.test" },
  { id: "down", name: "Down Feed", kind: "rss", url: "https://feeds.test/down", topic: "tech", home: "https://feeds.test" },
];

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.NEWS_FEEDS;
});

function mockFeeds() {
  process.env.NEWS_FEEDS = JSON.stringify(feeds);
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = String(input);
    if (url.endsWith("/hn")) return new Response(fixture("hn.json"));
    if (url.endsWith("/atom")) return new Response(fixture("atom.xml"));
    return new Response("nope", { status: 503 });
  });
}

describe("latestNews", () => {
  it("merges healthy sources and reports a failing one without breaking the page", async () => {
    mockFeeds();
    const page = await latestNews();
    expect(page.items.map((i) => i.source.id).sort()).toEqual(["culture", "hn", "hn"]);
    expect(page.sources).toEqual([
      expect.objectContaining({ id: "hn", ok: true, count: 2 }),
      expect.objectContaining({ id: "culture", ok: true, count: 1 }),
      expect.objectContaining({ id: "down", ok: false, count: 0 }),
    ]);
  });

  it("filters by topic and source", async () => {
    mockFeeds();
    expect((await latestNews({ topic: "culture" })).items.every((i) => i.source.topic === "culture")).toBe(true);
    expect((await latestNews({ source: "hn" })).items).toHaveLength(2);
  });

  it("falls back to the default sources when NEWS_FEEDS is invalid", async () => {
    process.env.NEWS_FEEDS = '[{"id":"BAD ID","url":"javascript:alert(1)"}]';
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("down", { status: 500 }));
    const page = await latestNews();
    expect(page.sources.map((s) => s.id)).toContain("hn");
    expect(page.items).toEqual([]);
  });
});

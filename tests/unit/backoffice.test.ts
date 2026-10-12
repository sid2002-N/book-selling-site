// @vitest-environment node
import { describe, expect, it } from "vitest";
import { dailySeries, percentChange } from "@/modules/backoffice/dashboard";
import { checkUpload, minorToMajorString, nextVersionLabel, parseInsideLines, parseMajorToMinor, parseTocLines, sniffFileType } from "@/modules/backoffice/files";
import { missingRequired, readinessChecks, slugify, type ReadinessInput } from "@/modules/backoffice/readiness";

const complete: ReadinessInput = {
  type: "book",
  title: "Internet Knowledge Bible",
  slug: "internet-knowledge-bible",
  shortDescription: "A complete guide to the internet.",
  description: "A complete guide to the internet, the tools behind it and the habits that make it useful.",
  primaryCategoryId: "c1",
  prices: [
    { currency: "INR", amountMinor: 79_900 },
    { currency: "USD", amountMinor: 999 },
  ],
  deliverableFileCount: 1,
  previewCount: 1,
  bundleItemCount: 0,
  hasCover: false,
  tocCount: 0,
  faqCount: 0,
  seoTitle: null,
  seoDescription: null,
};

describe("publish readiness", () => {
  it("passes a complete product even without optional cover, ToC, FAQ and SEO", () => {
    expect(missingRequired(readinessChecks(complete))).toEqual([]);
  });

  it.each([
    [{ title: "x" }, "title"],
    [{ slug: "Bad Slug" }, "title"],
    [{ shortDescription: " " }, "short"],
    [{ description: "Too short." }, "description"],
    [{ primaryCategoryId: null }, "category"],
    [{ prices: [{ currency: "INR" as const, amountMinor: 79_900 }] }, "price_usd"],
    [{ prices: [{ currency: "INR" as const, amountMinor: 0 }, { currency: "USD" as const, amountMinor: 999 }] }, "price_inr"],
    [{ deliverableFileCount: 0 }, "file"],
    [{ previewCount: 0 }, "previews"],
  ])("blocks publishing when %o", (patch, key) => {
    expect(missingRequired(readinessChecks({ ...complete, ...patch })).map((c) => c.key)).toContain(key);
  });

  it("requires free resources to be priced at exactly 0", () => {
    const free = { ...complete, type: "free_resource" as const };
    expect(missingRequired(readinessChecks(free)).map((c) => c.key)).toEqual(["price_inr", "price_usd"]);
    const zero = { ...free, prices: [{ currency: "INR" as const, amountMinor: 0 }, { currency: "USD" as const, amountMinor: 0 }] };
    expect(missingRequired(readinessChecks(zero))).toEqual([]);
  });

  it("needs two items for a bundle but no file or previews", () => {
    const bundle = { ...complete, type: "bundle" as const, deliverableFileCount: 0, previewCount: 0, bundleItemCount: 1 };
    expect(missingRequired(readinessChecks(bundle)).map((c) => c.key)).toEqual(["bundle"]);
    expect(missingRequired(readinessChecks({ ...bundle, bundleItemCount: 2 }))).toEqual([]);
  });

  it("slugifies titles to ASCII words", () => {
    expect(slugify("Café & Créativité: 2026 Edition!")).toBe("cafe-and-creativite-2026-edition");
    expect(slugify("  ")).toBe("");
  });
});

describe("upload validation by magic bytes", () => {
  const bytes = (...xs: (number | string)[]) => new Uint8Array(xs.flatMap((x) => (typeof x === "string" ? [...x].map((c) => c.charCodeAt(0)) : [x])));
  const pdf = bytes("%PDF-1.7\n");
  const png = bytes(0x89, "PNG", 0x0d, 0x0a, 0x1a, 0x0a, 0, 0);
  const jpeg = bytes(0xff, 0xd8, 0xff, 0xe0);
  const webp = bytes("RIFF", 0, 0, 0, 0, "WEBP");
  const zip = bytes(0x50, 0x4b, 0x03, 0x04);

  it("detects types from content, not names", () => {
    expect([pdf, png, jpeg, webp, zip].map(sniffFileType)).toEqual(["pdf", "png", "jpeg", "webp", "zip"]);
    expect(sniffFileType(bytes("<html>"))).toBeNull();
  });

  it("only accepts the right kinds per slot", () => {
    expect(checkUpload("cover", png)).toEqual({ ok: true, type: "png" });
    expect(checkUpload("cover", pdf)).toMatchObject({ ok: false });
    expect(checkUpload("deliverable", pdf)).toEqual({ ok: true, type: "pdf" });
    expect(checkUpload("deliverable", jpeg)).toMatchObject({ ok: false });
    expect(checkUpload("preview", new Uint8Array())).toMatchObject({ ok: false, reason: "The file is empty." });
  });

  it("enforces the size cap", () => {
    const big = new Uint8Array(9 * 1024 * 1024);
    big.set(png);
    expect(checkUpload("cover", big)).toMatchObject({ ok: false });
  });
});

describe("editor parsing helpers", () => {
  it("parses ToC lines with optional page numbers", () => {
    expect(parseTocLines("Getting started | 3\n\n  Habits  \nAppendix|120")).toEqual([
      { title: "Getting started", pageNumber: 3 },
      { title: "Habits", pageNumber: null },
      { title: "Appendix", pageNumber: 120 },
    ]);
  });

  it("parses What's Inside lines", () => {
    expect(parseInsideLines("Templates — 12 ready pages\nChecklists")).toEqual([
      { title: "Templates", description: "12 ready pages" },
      { title: "Checklists", description: null },
    ]);
  });

  it("converts decimal prices to integer minor units and back", () => {
    expect(parseMajorToMinor("499")).toBe(49_900);
    expect(parseMajorToMinor("9.9")).toBe(990);
    expect(parseMajorToMinor("1,299.50")).toBe(129_950);
    expect(parseMajorToMinor("")).toBeNull();
    expect(parseMajorToMinor("-5")).toBe("invalid");
    expect(parseMajorToMinor("4.999")).toBe("invalid");
    expect(minorToMajorString(129_950)).toBe("1299.50");
    expect(minorToMajorString(49_900)).toBe("499");
    expect(minorToMajorString(null)).toBe("");
  });

  it("suggests the next version", () => {
    expect(nextVersionLabel([])).toBe("1.0");
    expect(nextVersionLabel(["1.0", "1.2", "1.1"])).toBe("1.3");
    expect(nextVersionLabel(["1.4", "2.0"])).toBe("2.1");
  });
});

describe("dashboard helpers", () => {
  it("zero-fills daily revenue so no day is invented or skipped", () => {
    const from = new Date("2026-10-01T00:00:00Z");
    expect(dailySeries([{ day: "2026-10-02", amountMinor: 500 }], from, 3)).toEqual([
      { day: "2026-10-01", amountMinor: 0 },
      { day: "2026-10-02", amountMinor: 500 },
      { day: "2026-10-03", amountMinor: 0 },
    ]);
  });

  it("reports no change percentage without a baseline", () => {
    expect(percentChange({ current: 5, previous: 0 })).toBeNull();
    expect(percentChange({ current: 150, previous: 100 })).toBe(50);
    expect(percentChange({ current: 50, previous: 100 })).toBe(-50);
  });
});

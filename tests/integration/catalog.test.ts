import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { getProductDetail, listProducts, listShelfProducts } from "@/modules/catalog";
import { suggest } from "@/modules/search";

async function product(slug: string, data: Partial<{ type: "book" | "guide" | "workbook" | "bundle" | "free_resource"; status: "draft" | "published"; inr: number; usd: number; featured: boolean; daysAgo: number; title: string }> = {}) {
  const daysAgo = data.daysAgo ?? 1;
  return db.product.create({
    data: {
      slug,
      title: data.title ?? slug.replace(/-/g, " "),
      type: data.type ?? "book",
      status: data.status ?? "published",
      isFeatured: data.featured ?? false,
      publishedAt: new Date(Date.now() - daysAgo * 86_400_000),
      prices: { create: [{ currency: "INR", amountMinor: data.inr ?? 49900 }, { currency: "USD", amountMinor: data.usd ?? 799 }] },
    },
  });
}

describe("catalog listing", () => {
  beforeEach(async () => {
    await product("habit-tracker-guide", { type: "guide", inr: 39900, title: "Habit Tracker Guide" });
    await product("deep-focus-book", { inr: 79900, featured: true, title: "Deep Focus Book" });
    await product("cheap-workbook", { type: "workbook", inr: 19900, title: "Budget Workbook" });
    await product("secret-draft", { status: "draft", title: "Secret Draft" });
    await product("future-release", { daysAgo: -5, title: "Future Release" });
  });

  it("never lists drafts or unreleased products", async () => {
    const page = await listProducts({ currency: "INR" });
    const slugs = page.items.map((p) => p.slug);
    expect(slugs).not.toContain("secret-draft");
    expect(slugs).not.toContain("future-release");
    expect(page.total).toBe(3);
  });

  it("filters by type and sorts by price in the visitor's currency", async () => {
    const asc = await listProducts({ currency: "INR", sort: "price_asc" });
    expect(asc.items.map((p) => p.slug)).toEqual(["cheap-workbook", "habit-tracker-guide", "deep-focus-book"]);
    const guides = await listProducts({ currency: "INR", types: ["guide"] });
    expect(guides.items.map((p) => p.slug)).toEqual(["habit-tracker-guide"]);
    expect(asc.items[0]?.price).toMatchObject({ currency: "INR", amountMinor: 19900, label: "₹199" });
  });

  it("puts featured products first by default and paginates", async () => {
    const first = await listProducts({ currency: "USD", pageSize: 2, page: 1 });
    expect(first.items[0]?.slug).toBe("deep-focus-book");
    expect(first.totalPages).toBe(2);
    const second = await listProducts({ currency: "USD", pageSize: 2, page: 2 });
    expect(second.items).toHaveLength(1);
  });

  it("searches titles with full-text and fuzzy matching", async () => {
    const result = await listProducts({ currency: "INR", q: "habit" });
    expect(result.items.map((p) => p.slug)).toEqual(["habit-tracker-guide"]);
    const typo = await listProducts({ currency: "INR", q: "Habbit Tracker" });
    expect(typo.items[0]?.slug).toBe("habit-tracker-guide");
    const suggestions = await suggest("hab");
    expect(suggestions.some((s) => s.kind === "product" && s.title === "Habit Tracker Guide")).toBe(true);
  });

  it("serves a product only under its own type's URL", async () => {
    expect(await getProductDetail("habit-tracker-guide", "guide", "INR")).not.toBeNull();
    expect(await getProductDetail("habit-tracker-guide", "book", "INR")).toBeNull();
    expect(await getProductDetail("secret-draft", "book", "INR")).toBeNull();
  });

  it("adds newly published products to the shelf without code changes", async () => {
    const before = await listShelfProducts("INR");
    await product("brand-new-book", { title: "Brand New Book" });
    const after = await listShelfProducts("INR");
    expect(after.length).toBe(before.length + 1);
    expect(after.map((p) => p.slug)).toContain("brand-new-book");
  });
});

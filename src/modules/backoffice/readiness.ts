/**
 * Publish readiness (PRD F19, UX Flow 16): a product cannot be published until every required
 * check passes. Pure, so the editor checklist and the server-side publish gate share one rule.
 */
export type ReadinessInput = {
  type: "book" | "guide" | "workbook" | "bundle" | "free_resource";
  title: string;
  slug: string;
  shortDescription: string | null;
  description: string | null;
  primaryCategoryId: string | null;
  prices: { currency: "INR" | "USD"; amountMinor: number }[];
  /** Files on the version customers would receive (current, or the newest draft before first publish). */
  deliverableFileCount: number;
  previewCount: number;
  bundleItemCount: number;
  hasCover: boolean;
  tocCount: number;
  faqCount: number;
  seoTitle: string | null;
  seoDescription: string | null;
};

export type ReadinessStep = "details" | "cover" | "file" | "previews" | "pricing" | "categories" | "content" | "seo";

export type ReadinessCheck = { key: string; step: ReadinessStep; label: string; ok: boolean; required: boolean };

export const MIN_DESCRIPTION = 40;

export function readinessChecks(p: ReadinessInput): ReadinessCheck[] {
  const price = (c: "INR" | "USD") => p.prices.find((x) => x.currency === c);
  const isFree = p.type === "free_resource";
  const priceOk = (c: "INR" | "USD") => {
    const row = price(c);
    if (!row) return false;
    return isFree ? row.amountMinor === 0 : row.amountMinor > 0;
  };
  const checks: ReadinessCheck[] = [
    { key: "title", step: "details", label: "Title and URL slug", ok: p.title.trim().length >= 2 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.slug), required: true },
    { key: "short", step: "details", label: "Short description", ok: Boolean(p.shortDescription?.trim()), required: true },
    { key: "description", step: "details", label: `Full description (${MIN_DESCRIPTION}+ characters)`, ok: (p.description?.trim().length ?? 0) >= MIN_DESCRIPTION, required: true },
    { key: "category", step: "categories", label: "Primary category", ok: Boolean(p.primaryCategoryId), required: true },
    { key: "price_inr", step: "pricing", label: isFree ? "INR price set to free" : "INR price", ok: priceOk("INR"), required: true },
    { key: "price_usd", step: "pricing", label: isFree ? "USD price set to free" : "USD price", ok: priceOk("USD"), required: true },
  ];
  if (p.type === "bundle") {
    checks.push({ key: "bundle", step: "content", label: "At least two products in the bundle", ok: p.bundleItemCount >= 2, required: true });
  } else {
    checks.push(
      { key: "file", step: "file", label: "Deliverable file uploaded", ok: p.deliverableFileCount > 0, required: true },
      { key: "previews", step: "previews", label: "At least one watermarked preview page", ok: p.previewCount > 0, required: true },
      { key: "toc", step: "content", label: "Table of contents", ok: p.tocCount > 0, required: false },
    );
  }
  checks.push(
    { key: "cover", step: "cover", label: "Cover image (otherwise a cover is generated from the title)", ok: p.hasCover, required: false },
    { key: "faq", step: "content", label: "FAQ", ok: p.faqCount > 0, required: false },
    { key: "seo", step: "seo", label: "SEO title and description", ok: Boolean(p.seoTitle?.trim() && p.seoDescription?.trim()), required: false },
  );
  return checks;
}

export function missingRequired(checks: ReadinessCheck[]): ReadinessCheck[] {
  return checks.filter((c) => c.required && !c.ok);
}

/** URL slug from a title: lowercase ASCII words joined by hyphens. */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

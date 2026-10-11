import type { MetadataRoute } from "next";
import { sitemapEntries } from "@/modules/catalog";

// Rendered per request (cached by the CDN) so builds never need database access.
export const dynamic = "force-dynamic";

const STATIC_PATHS = ["/", "/explore", "/books", "/guides", "/workbooks", "/collections", "/bundles", "/new", "/popular", "/free-resources", "/categories"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const entries = await sitemapEntries();
  return [
    ...STATIC_PATHS.map((path) => ({ url: `${base}${path}`, changeFrequency: "daily" as const, priority: path === "/" ? 1 : 0.7 })),
    ...entries.map((e) => ({ url: `${base}${e.path}`, lastModified: e.lastModified, priority: e.priority })),
  ];
}

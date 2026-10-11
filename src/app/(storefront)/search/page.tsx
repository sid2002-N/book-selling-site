import type { Metadata } from "next";
import Link from "next/link";
import { CatalogRoute } from "@/components/catalog/CatalogRoute";
import { SearchBox } from "@/components/catalog/SearchBox";
import { SystemState } from "@/components/system/SystemState";
import { popularSearches } from "@/modules/search";

export const metadata: Metadata = { title: "Search", robots: { index: false, follow: true } };

const FALLBACK_SUGGESTIONS = ["productivity", "habits", "study", "planner", "career"];

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const popular = await popularSearches();
  const suggestions = popular.length ? popular : FALLBACK_SUGGESTIONS;
  return (
    <CatalogRoute
      searchParams={params}
      config={{
        path: "/search",
        title: q ? "Search Results" : "Search",
        description: q ? `Results for “${q}”` : "Find books, guides, workbooks and collections.",
        breadcrumbs: [{ label: "Home", href: "/" }, { label: "Search" }],
        types: ["book", "guide", "workbook", "bundle", "free_resource"],
        search: true,
        above: <SearchBox defaultValue={q} />,
        empty: (
          <SystemState
            variant="empty-search"
            layout="inline"
            headingLevel="h2"
            message={q ? `We couldn't find any products matching “${q}”. Try different keywords or explore popular topics.` : "Type a topic, title or skill to search the library."}
          >
            <div className="flex flex-col gap-2">
              <p className="text-label font-semibold text-fg">Try searching for:</p>
              <ul className="flex flex-wrap gap-2">
                {suggestions.map((s) => (
                  <li key={s}>
                    <Link href={`/search?q=${encodeURIComponent(s)}`} className="inline-flex rounded-full border border-line bg-surface px-3 py-1 text-caption hover:border-line-strong">
                      {s}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </SystemState>
        ),
      }}
    />
  );
}

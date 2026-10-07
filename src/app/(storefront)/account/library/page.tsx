import { Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ShelfBook } from "@/components/library/types";
import { Shelf } from "@/components/library/Shelf";
import { SystemState } from "@/components/system/SystemState";
import { Input } from "@/components/ui/Field";
import { pillClasses } from "@/components/ui/Tabs";
import { cn } from "@/lib/cn";
import { requireUserPage } from "@/modules/auth";
import { TYPE_LABEL, type ProductTypeKey } from "@/modules/catalog";
import { LIBRARY_SECTIONS, libraryEntries, type LibrarySection, type LibrarySort } from "@/modules/library";

export const metadata: Metadata = { title: "My Library", robots: { index: false } };

const TYPES: ProductTypeKey[] = ["book", "guide", "workbook", "bundle", "free_resource"];
const SORTS: { value: LibrarySort; label: string }[] = [
  { value: "recent", label: "Recently added" },
  { value: "last_read", label: "Last read" },
  { value: "title", label: "Title A–Z" },
];
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

const EMPTY: Partial<Record<LibrarySection, { title: string; message: string }>> = {
  reading: { title: "Nothing in progress", message: "Open any title in the reader and it will appear here, ready to pick up where you left off." },
  favorites: { title: "No favourites yet", message: "Tap the heart on a title in your library to keep it close at hand." },
  updates: { title: "Everything is up to date", message: "When a title you own gets a new version, it shows up here — updates are always free." },
  archived: { title: "Archive is empty", message: "Archived titles are hidden from your shelf but stay yours. Restore them any time." },
  recent: { title: "Nothing new this month", message: "Titles you add in the last 30 days appear here." },
};

/** My Library (sheet 66, bookshelf view + list view). The shelf is rendered from library data. */
export default async function LibraryPage({ searchParams }: PageProps<"/account/library">) {
  const { user } = await requireUserPage("/account/library");
  const sp = await searchParams;
  const section = (LIBRARY_SECTIONS.find((s) => s.value === one(sp.section))?.value ?? "all") as LibrarySection;
  const type = TYPES.find((t) => t === one(sp.type)) ?? null;
  const sort = (SORTS.find((s) => s.value === one(sp.sort))?.value ?? "recent") as LibrarySort;
  const q = one(sp.q)?.trim().slice(0, 80) || null;
  const entries = await libraryEntries(user.id, { section, type, sort, q });
  const total = section === "all" && !type && !q ? entries.length : null;

  const href = (patch: Record<string, string | null>) => {
    const params = new URLSearchParams();
    const merged = { section: section === "all" ? null : section, type, sort: sort === "recent" ? null : sort, q, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v);
    const s = params.toString();
    return `/account/library${s ? `?${s}` : ""}`;
  };

  const books: ShelfBook[] = entries.map((e) => ({
    id: e.id,
    title: e.title,
    href: e.href,
    typeLabel: e.typeLabel,
    category: e.category,
    spineColor: e.spineColor,
    coverUrl: e.coverUrl,
    summary: e.subtitle,
    progress: e.progress || null,
    readHref: e.readHref,
  }));

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-h1">My Library</h1>
          <p className="text-body-sm text-fg-secondary">{total !== null ? `${total} ${total === 1 ? "title" : "titles"} on your shelf` : "Everything you own, in one place."}</p>
        </div>
        <form action="/account/library" className="relative w-full sm:w-72" role="search">
          {section !== "all" ? <input type="hidden" name="section" value={section} /> : null}
          {type ? <input type="hidden" name="type" value={type} /> : null}
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-muted" aria-hidden />
          <Input name="q" defaultValue={q ?? ""} placeholder="Search your library" aria-label="Search your library" className="pl-9" />
        </form>
      </header>

      <nav aria-label="Library sections" className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {LIBRARY_SECTIONS.map((s) => (
          <Link key={s.value} href={href({ section: s.value === "all" ? null : s.value })} aria-current={section === s.value ? "page" : undefined} className={pillClasses}>
            {s.label}
          </Link>
        ))}
      </nav>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5" aria-label="Filter by format">
          <Link href={href({ type: null })} aria-current={!type ? "page" : undefined} className={cn("rounded-full px-3 py-1 text-caption font-medium", !type ? "bg-accent-soft text-accent-strong" : "text-fg-secondary hover:text-fg")}>
            All formats
          </Link>
          {TYPES.map((t) => (
            <Link key={t} href={href({ type: t })} aria-current={type === t ? "page" : undefined} className={cn("rounded-full px-3 py-1 text-caption font-medium", type === t ? "bg-accent-soft text-accent-strong" : "text-fg-secondary hover:text-fg")}>
              {TYPE_LABEL[t]}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-1.5 text-caption text-fg-muted">
          Sort:
          {SORTS.map((s) => (
            <Link key={s.value} href={href({ sort: s.value === "recent" ? null : s.value })} aria-current={sort === s.value ? "page" : undefined} className={cn("rounded-full px-2.5 py-1 font-medium", sort === s.value ? "bg-ink text-fg-on-ink" : "text-fg-secondary hover:text-fg")}>
              {s.label}
            </Link>
          ))}
        </div>
      </div>

      <Shelf
        books={books}
        label="My library"
        empty={
          section === "all" && !type && !q ? (
            <SystemState variant="empty-library" layout="inline" headingLevel="h2" />
          ) : (
            <SystemState
              variant="empty-search"
              layout="inline"
              headingLevel="h2"
              title={q || type ? "No matches on your shelf" : (EMPTY[section]?.title ?? "Nothing here")}
              message={q || type ? "Try a different search or format." : (EMPTY[section]?.message ?? "")}
              primary={{ label: "Show everything", href: "/account/library" }}
            />
          )
        }
      />
    </div>
  );
}

import { ExternalLink, MessageSquare } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { SectionHeader } from "@/components/catalog/SectionHeader";
import { ProductRail } from "@/components/commerce/ProductGrid";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { NewsCard } from "@/components/news/NewsCard";
import { NewsHero } from "@/components/news/NewsHero";
import { NewsTicker } from "@/components/news/NewsTicker";
import { Reveal } from "@/components/news/Reveal";
import { stagger } from "@/components/news/stagger";
import { toneFor } from "@/components/news/tones";
import { SystemState } from "@/components/system/SystemState";
import { pillClasses } from "@/components/ui/Tabs";
import { cn } from "@/lib/cn";
import { listProducts } from "@/modules/catalog";
import { latestNews, timeAgo, type NewsTopic } from "@/modules/news";
import { getDisplayCurrency } from "@/modules/pricing";
import { viewerState } from "@/modules/storefront";

export const metadata: Metadata = {
  title: "Tech & Culture",
  description: "The latest in technology and culture from trusted publishers, with links to the original stories.",
  alternates: { canonical: "/tech-culture" },
};

const TOPICS: { value: NewsTopic | null; label: string }[] = [
  { value: null, label: "All stories" },
  { value: "tech", label: "Tech" },
  { value: "culture", label: "Culture" },
];
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? null;

/** Tech & Culture: a live digest of headlines. Every story links to its publisher. */
export default async function TechCulturePage({ searchParams }: PageProps<"/tech-culture">) {
  const sp = await searchParams;
  const topic = TOPICS.find((t) => t.value && t.value === one(sp.topic))?.value ?? null;
  const sourceParam = one(sp.source);
  const [news, currency] = await Promise.all([latestNews(), getDisplayCurrency()]);
  const sourceId = news.sources.some((s) => s.id === sourceParam) ? sourceParam : null;
  const items = news.items.filter((i) => (!topic || i.source.topic === topic) && (!sourceId || i.source.id === sourceId));

  const now = new Date(news.fetchedAt);
  const ids = news.sources.map((s) => s.id);
  const tone = (id: string) => toneFor(ids, id);
  const live = news.sources.filter((s) => s.ok);
  const down = news.sources.filter((s) => !s.ok);
  const lead = items.find((i) => i.summary) ?? items[0];
  const rest = items.filter((i) => i !== lead);
  const alsoNow = rest.slice(0, 4);
  const grid = rest.slice(4, 22);
  const discussed = news.items
    .filter((i) => i.comments != null)
    .sort((a, b) => (b.comments ?? 0) - (a.comments ?? 0))
    .slice(0, 6);
  const maxComments = Math.max(1, ...discussed.map((d) => d.comments ?? 0));

  const library = await listProducts({ currency, category: "technology", pageSize: 8 }).catch(() => null);
  const viewer = await viewerState(library?.items.map((p) => p.id) ?? []);

  const href = (patch: { topic?: string | null; source?: string | null }) => {
    const p = new URLSearchParams();
    const t = patch.topic !== undefined ? patch.topic : topic;
    const s = patch.source !== undefined ? patch.source : sourceId;
    if (t) p.set("topic", t);
    if (s) p.set("source", s);
    const q = p.toString();
    return `/tech-culture${q ? `?${q}` : ""}`;
  };

  return (
    <div className="flex flex-col">
      <div className="container-page pt-4">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Tech & Culture" }]} />
      </div>
      <NewsHero updatedLabel={`Updated ${timeAgo(news.fetchedAt, now) ?? "just now"} · refreshes every 15 minutes`} sourceCount={live.length || news.sources.length} />
      <NewsTicker items={news.items.slice(0, 14)} toneOf={tone} />

      <div className="container-page flex flex-col gap-10 py-10">
        <nav aria-label="Filter stories" className="flex flex-col gap-3">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {TOPICS.map((t) => (
              <Link key={t.label} href={href({ topic: t.value, source: null })} aria-current={topic === t.value && !sourceId ? "page" : undefined} className={pillClasses}>
                {t.label}
              </Link>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {news.sources.map((s) => (
              <Link
                key={s.id}
                href={href({ source: sourceId === s.id ? null : s.id, topic: null })}
                aria-current={sourceId === s.id ? "page" : undefined}
                aria-disabled={!s.ok || undefined}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1 text-caption font-medium transition-colors duration-fast",
                  sourceId === s.id ? "bg-ink text-fg-on-ink" : "text-fg-secondary hover:bg-surface hover:text-fg",
                  !s.ok && "pointer-events-none opacity-50",
                )}
              >
                <span aria-hidden className={cn("size-1.5 rounded-full", tone(s.id).bar)} />
                {s.name}
                <span className="text-fg-muted">{s.ok ? s.count : "unavailable"}</span>
              </Link>
            ))}
          </div>
          {down.length && live.length ? (
            <p className="text-caption text-fg-muted">
              {down.map((d) => d.name).join(", ")} {down.length === 1 ? "is" : "are"} unavailable right now — showing the rest.
            </p>
          ) : null}
        </nav>

        {!lead ? (
          <SystemState
            variant="network"
            layout="inline"
            headingLevel="h2"
            title={live.length ? "No stories here yet" : "The newsroom is quiet right now"}
            message={live.length ? "Try another topic or source." : "We couldn't reach our news sources. Please check back in a few minutes."}
            primary={{ label: live.length ? "Show all stories" : "Try again", href: "/tech-culture" }}
          />
        ) : (
          <>
            <section aria-labelledby="lead-title" className="grid gap-6 lg:grid-cols-3">
              <a
                href={lead.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative flex min-h-80 flex-col justify-end gap-4 overflow-hidden rounded-xl bg-ink p-6 text-fg-on-ink shadow-3 md:p-10 lg:col-span-2"
              >
                <span aria-hidden className="absolute -top-16 -right-16 size-72 rounded-full bg-accent opacity-20 blur-3xl transition-transform duration-slow group-hover:scale-125 motion-safe:animate-float" />
                <span aria-hidden className="absolute -bottom-24 left-1/3 size-64 rounded-full bg-plum opacity-40 blur-3xl" />
                <p className="relative flex flex-wrap items-center gap-2 text-caption text-fg-on-ink/70">
                  <span className="rounded-full bg-fg-on-ink/10 px-2.5 py-1 font-semibold text-fg-on-ink">Top story</span>
                  <span className="font-semibold">{lead.source.name}</span>
                  {lead.publishedAt ? <span>· {timeAgo(lead.publishedAt, now)}</span> : null}
                </p>
                <h2 id="lead-title" className="relative max-w-3xl font-serif text-h1 leading-tight">
                  <span className="headline-sweep">{lead.title}</span>
                </h2>
                {lead.summary ? <p className="relative max-w-2xl text-body-lg text-fg-on-ink/80">{lead.summary}</p> : null}
                <span className="relative flex items-center gap-1.5 text-label font-semibold">
                  Read the full story <ExternalLink className="size-4 transition-transform duration-fast group-hover:translate-x-0.5" aria-hidden />
                </span>
              </a>
              <div className="flex flex-col gap-3">
                <h2 className="text-h4 font-sans font-semibold">Also right now</h2>
                <Reveal as="ul" className="flex flex-col gap-1">
                  {alsoNow.map((item, i) => (
                    <NewsCard key={item.id} item={item} tone={tone(item.source.id)} ago={timeAgo(item.publishedAt, now)} variant="compact" style={stagger(i)} />
                  ))}
                </Reveal>
              </div>
            </section>

            <div className="grid gap-10 lg:grid-cols-3">
              <section aria-labelledby="latest-title" className="flex flex-col gap-5 lg:col-span-2">
                <SectionHeader id="latest-title" eyebrow="Latest" title="Fresh from the feeds" />
                {grid.length ? (
                  <Reveal as="ul" className="grid gap-4 md:grid-cols-2">
                    {grid.map((item, i) => (
                      <NewsCard key={item.id} item={item} tone={tone(item.source.id)} ago={timeAgo(item.publishedAt, now)} style={stagger(i % 6)} />
                    ))}
                  </Reveal>
                ) : (
                  <p className="text-body-sm text-fg-muted">That&apos;s everything for this filter right now.</p>
                )}
              </section>

              {discussed.length ? (
                <aside aria-labelledby="discussed-title" className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
                  <div>
                    <p className="text-micro font-semibold tracking-widest text-accent-strong uppercase">Conversation</p>
                    <h2 id="discussed-title" className="text-h3">
                      Most discussed
                    </h2>
                  </div>
                  <Reveal as="ol" className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-5">
                    {discussed.map((d, i) => (
                      <li key={d.id} style={stagger(i)} className="flex flex-col gap-2">
                        <a href={d.discussionUrl ?? d.url} target="_blank" rel="noopener noreferrer" className="group flex gap-3">
                          <span className="font-serif text-h3 text-fg-muted tabular-nums">{i + 1}</span>
                          <span className="headline-sweep line-clamp-2 self-start text-body-sm font-semibold">{d.title}</span>
                        </a>
                        <div className="flex items-center gap-2 pl-8">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-canvas-subtle">
                            <div className={cn("grow-bar h-full rounded-full", tone(d.source.id).bar)} style={{ width: `${Math.round(((d.comments ?? 0) / maxComments) * 100)}%` }} />
                          </div>
                          <span className="flex items-center gap-1 text-caption text-fg-muted tabular-nums">
                            <MessageSquare className="size-3" aria-hidden /> {d.comments}
                          </span>
                        </div>
                      </li>
                    ))}
                  </Reveal>
                </aside>
              ) : null}
            </div>
          </>
        )}

        {library?.items.length ? (
          <section aria-labelledby="deeper-title" className="flex flex-col gap-5">
            <SectionHeader id="deeper-title" eyebrow="From the library" title="Go deeper" href="/categories/technology" />
            <ProductRail products={library.items} viewer={viewer} />
          </section>
        ) : null}

        <p className="border-t border-line pt-6 text-caption text-fg-muted">
          Headlines and short summaries come from each publisher&apos;s public feed and link to the original article. KRM.lib doesn&apos;t host, edit or endorse these
          stories. Sources:{" "}
          {news.sources.map((s, i) => (
            <span key={s.id}>
              <a href={s.home} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-fg">
                {s.name}
              </a>
              {i < news.sources.length - 1 ? ", " : "."}
            </span>
          ))}
        </p>
      </div>
    </div>
  );
}

import {
  ArrowRight,
  BookOpen,
  BookOpenCheck,
  Download,
  Gift,
  Infinity as InfinityIcon,
  Library,
  NotebookPen,
  Palette,
  ScrollText,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { NewsletterForm } from "@/components/catalog/NewsletterForm";
import { SectionHeader } from "@/components/catalog/SectionHeader";
import { toShelfBooks } from "@/components/catalog/toShelfBooks";
import { ProductRail, type ViewerState } from "@/components/commerce/ProductGrid";
import { BookCover } from "@/components/library/BookCover";
import { Shelf } from "@/components/library/Shelf";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { listBundles, listProducts, listRail, listShelfProducts, type ProductCard } from "@/modules/catalog";
import { getHomepageSections, type HomepageSection } from "@/modules/content";
import { getDisplayCurrency } from "@/modules/pricing";
import { viewerState } from "@/modules/storefront";

export const metadata: Metadata = {
  title: { absolute: "KRM.lib — Practical knowledge for a better you" },
  alternates: { canonical: "/" },
};

type Data = {
  shelf: ProductCard[];
  rails: Record<string, ProductCard[]>;
  bundles: Awaited<ReturnType<typeof listBundles>>;
  counts: Record<"book" | "guide" | "workbook" | "free_resource", number>;
};

export default async function HomePage() {
  const currency = await getDisplayCurrency();
  const sections = await getHomepageSections();

  const shelfSection = sections.find((s) => s.type === "shelf");
  const railSections = sections.filter((s) => s.type === "product_rail");
  const [shelf, bundles, ...rails] = await Promise.all([
    shelfSection ? listShelfProducts(currency, shelfSection.config.limit) : Promise.resolve([]),
    sections.some((s) => s.type === "bundles") ? listBundles(currency) : Promise.resolve([]),
    ...railSections.map((s) => listRail(s.config.source, currency, s.config.limit)),
  ]);
  const countFor = async (type: "book" | "guide" | "workbook" | "free_resource") => (await listProducts({ currency, types: [type], pageSize: 1 })).total;
  const [book, guide, workbook, free_resource] = await Promise.all([countFor("book"), countFor("guide"), countFor("workbook"), countFor("free_resource")]);

  const data: Data = {
    shelf,
    bundles,
    rails: Object.fromEntries(railSections.map((s, i) => [s.key, rails[i] ?? []])),
    counts: { book, guide, workbook, free_resource },
  };
  const allIds = [...shelf, ...rails.flat()].map((p) => p.id);
  const viewer = await viewerState(allIds);

  return (
    <div className="flex flex-col gap-16 pb-16 md:gap-24 md:pb-24">
      {sections.map((section) => (
        <Section key={section.key} section={section} data={data} viewer={viewer} />
      ))}
    </div>
  );
}

function Section({ section, data, viewer }: { section: HomepageSection; data: Data; viewer: ViewerState }) {
  switch (section.type) {
    case "hero":
      return <Hero config={section.config} covers={data.shelf.slice(0, 3)} />;
    case "formats":
      return <Formats counts={data.counts} collections={data.bundles.length} />;
    case "shelf":
      return data.shelf.length ? (
        <section aria-labelledby="home-shelf" className="container-page flex flex-col gap-6">
          <SectionHeader id="home-shelf" eyebrow={section.config.eyebrow} title={section.config.title} href="/explore" linkLabel="Explore all" />
          <Shelf books={toShelfBooks(data.shelf)} label="Library shelf" />
        </section>
      ) : null;
    case "product_rail": {
      const items = data.rails[section.key] ?? [];
      if (!items.length) return null;
      return (
        <section aria-labelledby={`home-${section.key}`} className="container-page flex flex-col gap-6">
          <SectionHeader id={`home-${section.key}`} eyebrow={section.config.eyebrow} title={section.config.title} href={section.config.href} />
          <ProductRail products={items} viewer={viewer} />
        </section>
      );
    }
    case "bundles":
      return data.bundles.length ? (
        <section aria-labelledby="home-bundles" className="container-page flex flex-col gap-6">
          <SectionHeader id="home-bundles" eyebrow={section.config.eyebrow} title={section.config.title} href={section.config.href} />
          <ul className="grid gap-4 md:grid-cols-3">
            {data.bundles.slice(0, section.config.limit).map((b) => (
              <li key={b.id}>
                <Link
                  href={b.href}
                  className="group flex h-full items-center gap-5 overflow-hidden rounded-xl p-6 text-fg-on-ink shadow-2 transition-transform duration-normal hover:-translate-y-1 motion-reduce:transform-none"
                  style={{ backgroundColor: b.spineColor }}
                >
                  <div className="flex flex-1 flex-col gap-2">
                    <h3 className="font-serif text-h3">{b.title}</h3>
                    <p className="text-body-sm opacity-80">
                      {b.items.length} products{b.savingsPercent ? ` · Save ${b.savingsPercent}%` : ""}
                    </p>
                    <span className="mt-2 flex size-9 items-center justify-center rounded-full bg-white/15 transition-colors group-hover:bg-white/25">
                      <ArrowRight className="size-4" aria-hidden />
                    </span>
                  </div>
                  <div aria-hidden className="flex items-end gap-1">
                    {b.items.slice(0, 4).map((i, idx) => (
                      <span
                        key={i.id}
                        className="w-5 rounded-t-sm border border-white/20"
                        style={{ backgroundColor: i.spineColor, height: `${64 + ((idx * 19) % 30)}px` }}
                      />
                    ))}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null;
    case "why":
      return <Why config={section.config} />;
    case "newsletter":
      return (
        <section aria-labelledby="home-newsletter" className="bg-canvas-subtle">
          <div className="container-page flex flex-col items-center gap-4 py-14 text-center md:py-20">
            {section.config.eyebrow ? <p className="text-micro font-semibold tracking-widest text-accent-strong uppercase">{section.config.eyebrow}</p> : null}
            <h2 id="home-newsletter" className="text-h1">
              {section.config.title}
            </h2>
            <p className="max-w-lg text-body text-fg-secondary">{section.config.body}</p>
            <NewsletterForm source="home" />
            <p className="text-caption text-fg-muted">No spam. Unsubscribe anytime.</p>
          </div>
        </section>
      );
    default:
      return null;
  }
}

function Hero({ config, covers }: { config: Extract<HomepageSection, { type: "hero" }>["config"]; covers: ProductCard[] }) {
  return (
    <section className="container-page grid items-center gap-12 pt-8 md:pt-14 lg:grid-cols-2">
      <div className="flex flex-col items-start gap-6">
        <p className="text-micro font-semibold tracking-widest text-accent-strong uppercase">{config.eyebrow}</p>
        <h1 className="text-display text-fg">
          {config.title} {config.highlight ? <span className="text-terracotta">{config.highlight}</span> : null}
        </h1>
        <p className="max-w-lg text-body-lg text-fg-secondary">{config.body}</p>
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href={config.primary.href}>
              {config.primary.label} <ArrowRight />
            </Link>
          </Button>
          {config.secondary ? (
            <Button asChild size="lg" variant="secondary">
              <Link href={config.secondary.href}>{config.secondary.label}</Link>
            </Button>
          ) : null}
        </div>
        <ul className="mt-2 flex flex-wrap gap-x-6 gap-y-2 text-body-sm text-fg-secondary">
          {[
            { icon: Download, label: "Instant digital access" },
            { icon: InfinityIcon, label: "Lifetime library" },
            { icon: Sparkles, label: "Free version updates" },
          ].map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-center gap-2">
              <Icon className="size-4 text-accent-strong" aria-hidden /> {label}
            </li>
          ))}
        </ul>
      </div>
      {covers.length >= 3 ? (
        <div aria-hidden className="relative mx-auto hidden h-96 w-full max-w-md md:block">
          <div className="absolute inset-x-6 bottom-2 h-6 rounded-full bg-line blur-md" />
          {covers.map((c, i) => (
            <div
              key={c.id}
              className="absolute bottom-8 w-44 transition-transform duration-slow ease-out-soft"
              style={{ left: `${8 + i * 26}%`, transform: `rotate(${(i - 1) * 7}deg) translateY(${i === 1 ? -24 : 0}px)`, zIndex: i === 1 ? 2 : 1 }}
            >
              <BookCover id={c.id} title={c.title} coverUrl={c.coverUrl} spineColor={c.spineColor} typeLabel={c.typeLabel} priority className="shadow-3" />
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function Formats({ counts, collections }: { counts: Data["counts"]; collections: number }) {
  const tiles: { label: string; sub: string; href: string; icon: LucideIcon; count: number }[] = [
    { label: "Books", sub: "In-depth knowledge", href: "/books", icon: BookOpen, count: counts.book },
    { label: "Guides", sub: "Practical tutorials", href: "/guides", icon: ScrollText, count: counts.guide },
    { label: "Workbooks", sub: "Interactive templates", href: "/workbooks", icon: NotebookPen, count: counts.workbook },
    { label: "Collections", sub: "Curated bundles", href: "/collections", icon: Library, count: collections },
    { label: "Free Resources", sub: "For everyone", href: "/free-resources", icon: Gift, count: counts.free_resource },
  ];
  return (
    <section aria-label="Browse by format" className="container-page">
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {tiles.map(({ label, sub, href, icon: Icon, count }) => (
          <li key={href} className="last:col-span-2 sm:last:col-span-1">
            <Link
              href={href}
              className="flex h-full flex-col items-center gap-2 rounded-lg border border-line bg-surface px-4 py-5 text-center shadow-1 transition-[transform,box-shadow] duration-normal hover:-translate-y-0.5 hover:shadow-2 motion-reduce:transform-none"
            >
              <span className="flex size-12 items-center justify-center rounded-full bg-accent-soft text-accent-strong">
                <Icon className="size-5" aria-hidden />
              </span>
              <span className="text-body-sm font-semibold text-fg">{label}</span>
              <span className="text-caption text-fg-muted">{sub}</span>
              {count > 0 ? <Badge size="sm">{count}</Badge> : null}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Why({ config }: { config: Extract<HomepageSection, { type: "why" }>["config"] }) {
  const icons: LucideIcon[] = [BookOpenCheck, Palette, Download, InfinityIcon];
  return (
    <section aria-labelledby="home-why" className="container-page grid gap-10 lg:grid-cols-5">
      <div className="flex flex-col items-start gap-4 lg:col-span-2">
        {config.eyebrow ? <p className="text-micro font-semibold tracking-widest text-accent-strong uppercase">{config.eyebrow}</p> : null}
        <h2 id="home-why" className="text-h1">
          {config.title}
        </h2>
        <p className="text-body text-fg-secondary">{config.body}</p>
        {config.cta ? (
          <Button asChild>
            <Link href={config.cta.href}>
              {config.cta.label} <ArrowRight />
            </Link>
          </Button>
        ) : null}
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 lg:col-span-3">
        {config.points.map((p, i) => {
          const Icon = icons[i % icons.length]!;
          return (
            <li key={p.title} className="flex gap-4 rounded-lg border border-line bg-surface p-5 shadow-1">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-strong">
                <Icon className="size-5" aria-hidden />
              </span>
              <div>
                <h3 className="font-sans text-body-sm font-semibold text-fg">{p.title}</h3>
                <p className="text-body-sm text-fg-muted">{p.body}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

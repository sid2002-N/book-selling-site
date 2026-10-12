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
import Image from "next/image";
import Link from "next/link";
import { NewsletterForm } from "@/components/catalog/NewsletterForm";
import { HeroScene } from "@/components/home/HeroScene";
import { Glow, Steam } from "@/components/illustration/Atmosphere";
import { ILLUSTRATIONS } from "@/config/illustrations";
import { cn } from "@/lib/cn";
import { SectionHeader } from "@/components/catalog/SectionHeader";
import { toShelfBooks } from "@/components/catalog/toShelfBooks";
import { ProductRail, type ViewerState } from "@/components/commerce/ProductGrid";
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
      return <Hero config={section.config} />;
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
    case "newsletter": {
      const image = section.config.image ?? ILLUSTRATIONS.newsletter;
      return (
        <section aria-labelledby="home-newsletter" className={cn("relative overflow-hidden bg-canvas-subtle", image && "flex items-center lg:aspect-3/1")}>
          {image ? (
            <div aria-hidden className="absolute inset-0">
              <Image src={image} alt="" fill sizes="100vw" className="object-cover" />
              {/* At lg+ the section is exactly 3:1 like the art, so overlays line up. */}
              <div className="absolute inset-0 hidden lg:block">
                <Glow at={{ left: "80%", top: "2%", width: "17%", height: "55%" }} />
                <Steam at={{ left: "83%", top: "48%", width: "5%", height: "21%" }} />
              </div>
              <div className="absolute top-1/2 left-1/2 h-3/4 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-full bg-canvas opacity-70 blur-3xl" />
            </div>
          ) : null}
          <div className="container-page relative flex flex-col items-center gap-4 py-14 text-center md:py-20">
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
    }
    default:
      return null;
  }
}

/**
 * Home hero. Desktop: the illustration fills the right side and its cream left edge carries
 * the headline. Phones and tablets: headline first, full artwork below. Copy rises in gently.
 */
function Hero({ config }: { config: Extract<HomepageSection, { type: "hero" }>["config"] }) {
  const image = config.image ?? ILLUSTRATIONS.hero;
  const rise = (ms: number) => ({ className: "motion-safe:animate-word-rise", style: { animationDelay: `${ms}ms` } });
  return (
    <section className="relative overflow-hidden">
      <HeroScene src={image} className="fade-edges-lt absolute inset-y-0 right-0 hidden aspect-3/2 lg:block" />
      <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 hidden w-2/3 bg-linear-to-r from-canvas via-canvas/85 to-transparent lg:block" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 hidden h-24 bg-linear-to-t from-canvas to-transparent lg:block" />

      <div className="container-page relative flex items-center pt-8 pb-6 md:pt-14 lg:min-h-160 lg:py-16">
        <div className="flex max-w-xl flex-col items-start gap-6">
          <p {...rise(0)} className={`${rise(0).className} text-micro font-semibold tracking-widest text-accent-strong uppercase`}>
            {config.eyebrow}
          </p>
          <h1 {...rise(90)} className={`${rise(90).className} text-display text-fg`}>
            {config.title} {config.highlight ? <span className="text-terracotta">{config.highlight}</span> : null}
          </h1>
          <p {...rise(200)} className={`${rise(200).className} max-w-lg text-body-lg text-fg-secondary`}>
            {config.body}
          </p>
          <div {...rise(300)} className={`${rise(300).className} flex flex-wrap gap-3`}>
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
          <ul {...rise(400)} className={`${rise(400).className} mt-2 flex flex-wrap gap-x-6 gap-y-2 text-body-sm text-fg-secondary`}>
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
      </div>

      <div className="relative lg:hidden">
        <HeroScene src={image} className="w-full" />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-linear-to-b from-canvas to-transparent" />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-linear-to-t from-canvas to-transparent" />
      </div>
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

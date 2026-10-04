import {
  BookOpen,
  BookOpenCheck,
  Calendar,
  CalendarDays,
  Check,
  ClipboardList,
  FileText,
  Globe,
  HardDrive,
  Layers,
  Pencil,
  RefreshCw,
  Tag,
  User,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import type { ProductCard, ProductDetail } from "@/modules/catalog";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { SectionHeader } from "@/components/catalog/SectionHeader";
import { ProductRail, type ViewerState } from "@/components/commerce/ProductGrid";
import { Rating } from "@/components/commerce/Rating";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/Accordion";
import { Avatar } from "@/components/ui/Feedback";
import { Badge } from "@/components/ui/Badge";
import { AnchorNav } from "./AnchorNav";
import { FrequentlyBought } from "./FrequentlyBought";
import { ReviewDialog } from "@/components/account/ReviewDialog";
import { MobilePurchaseBar } from "./MobilePurchaseBar";
import { PreviewReader } from "./PreviewReader";
import { ProductGallery } from "./ProductGallery";
import { PurchasePanel, type PurchaseState } from "./PurchasePanel";

type Review = { id: string; rating: number; title: string | null; body: string; createdAt: string; verified: boolean; author: { name: string; avatarUrl: string | null } };

type Props = {
  product: ProductDetail;
  state: PurchaseState;
  viewer: ViewerState;
  related: ProductCard[];
  fbt: { items: ProductCard[]; basis: "orders" | "related" };
  reviews: Review[];
  refundWindowDays: number;
  baseUrl: string;
  sectionCrumb: { label: string; href: string };
  /** Owner context: reader link and the viewer's own review (null when not owned). */
  owner?: { readHref: string; review: { rating: number; title: string | null; body: string; status: string } | null } | null;
};

const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });
/** Icon names admins can pick for "What's Inside" blocks. */
const INSIDE_ICONS: Record<string, LucideIcon> = {
  "book-open": BookOpen,
  wrench: Wrench,
  pencil: Pencil,
  "clipboard-list": ClipboardList,
  calendar: Calendar,
  "refresh-cw": RefreshCw,
};

function InsideIcon({ name }: { name: string | null }) {
  const Icon = (name ? INSIDE_ICONS[name] : undefined) ?? BookOpenCheck;
  return <Icon className="size-5" aria-hidden />;
}

function formatBytes(n: number) {
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * ProductDetailTemplate(state): Normal · Discounted · Purchased · Unavailable · Updated
 * (master §52) — composition from the Cozy Digital Bookstore Product Page sheet.
 */
export function ProductDetailTemplate({ product, state, viewer, related, fbt, reviews, refundWindowDays, baseUrl, sectionCrumb, owner = null }: Props) {
  const isBundle = product.type === "bundle";
  const details: { icon: LucideIcon; label: string; value: string | null }[] = [
    { icon: FileText, label: "Pages", value: product.version?.pageCount ? String(product.version.pageCount) : null },
    { icon: Layers, label: "Format", value: product.version?.formatLabel ?? null },
    { icon: HardDrive, label: "File size", value: product.version?.sizeBytes ? formatBytes(product.version.sizeBytes) : null },
    { icon: Globe, label: "Language", value: product.language === "en" ? "English" : product.language },
    { icon: Tag, label: "Version", value: product.version?.version ?? null },
    { icon: CalendarDays, label: "Last updated", value: product.version?.releasedAt ? dateFmt.format(new Date(product.version.releasedAt)) : null },
    { icon: User, label: "Author", value: product.authors.map((a) => a.name).join(", ") || null },
    { icon: User, label: "Publisher", value: product.publisher },
    { icon: Layers, label: "Category", value: product.categories.map((c) => c.name).join(", ") || null },
  ];
  const anchors = [
    { id: "overview", label: "Overview" },
    ...(product.previews.length ? [{ id: "preview", label: "Preview" }] : []),
    ...(product.toc.length ? [{ id: "contents", label: "Table of Contents" }] : []),
    ...(product.inside.length ? [{ id: "inside", label: "What's Inside" }] : []),
    ...(isBundle && product.bundle?.items.length ? [{ id: "included", label: "What's Included" }] : []),
    { id: "reviews", label: `Reviews${product.rating ? ` (${product.rating.count})` : ""}` },
    ...(product.faqs.length ? [{ id: "faqs", label: "FAQs" }] : []),
  ];
  const showMobileBar = state === "available" && product.price && !product.price.isFree;

  return (
    <div className="container-page flex flex-col gap-10 pt-6 pb-16 md:gap-14">
      <Breadcrumbs
        baseUrl={baseUrl}
        items={[
          { label: "Home", href: "/" },
          sectionCrumb,
          ...(product.category ? [{ label: product.category.name, href: `/categories/${product.category.slug}` }] : []),
          { label: product.title },
        ]}
      />

      <section className="grid gap-8 lg:grid-cols-12 lg:gap-10">
        <div className="mx-auto w-full max-w-sm lg:col-span-4 lg:max-w-none">
          <ProductGallery
            product={{ id: product.id, title: product.title, coverUrl: product.coverUrl, spineColor: product.spineColor, typeLabel: product.typeLabel }}
            previews={product.previews}
          />
        </div>
        <div className="flex flex-col gap-5 lg:col-span-5">
          <div className="flex flex-wrap gap-2">
            <Badge tone="accent" size="sm">
              {product.typeLabel}
            </Badge>
            {product.isNew ? <Badge tone="ink" size="sm">New</Badge> : null}
            {state === "updated" ? <Badge tone="plum" size="sm">Updated</Badge> : null}
          </div>
          <h1 className="text-h1 text-fg">{product.title}</h1>
          {product.subtitle ? <p className="text-body-lg text-fg-secondary">{product.subtitle}</p> : null}
          {product.rating ? <Rating average={product.rating.average} count={product.rating.count} size="md" /> : null}
          {product.tags.length ? (
            <ul className="flex flex-wrap gap-2" aria-label="Topics">
              {product.tags.map((t) => (
                <li key={t.slug}>
                  <Link href={`/search?q=${encodeURIComponent(t.name)}`} className="inline-flex rounded-full border border-line bg-surface px-3 py-1 text-caption text-fg-secondary hover:border-line-strong">
                    {t.name}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
          <dl className="grid grid-cols-3 gap-3 border-t border-line pt-5">
            {[
              { label: "Pages", value: product.version?.pageCount ? `${product.version.pageCount} pages` : isBundle ? `${product.bundle?.items.length ?? 0} products` : "—" },
              { label: "Format", value: product.version?.formatLabel?.split(" ")[0] ?? (isBundle ? "Bundle" : "—") },
              { label: "Level", value: product.level ?? "All levels" },
            ].map((d) => (
              <div key={d.label} className="flex flex-col gap-0.5">
                <dt className="text-caption text-fg-muted">{d.label}</dt>
                <dd className="text-body-sm font-medium text-fg">{d.value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="lg:col-span-3">
          <div className="lg:sticky lg:top-24">
            <PurchasePanel product={product} state={state} readHref={owner?.readHref ?? null} signedIn={viewer.signedIn} wishlisted={viewer.wishlist.has(product.id)} refundWindowDays={refundWindowDays} />
          </div>
        </div>
      </section>

      <AnchorNav items={anchors} />

      <section id="overview" aria-labelledby="overview-title" className="grid scroll-mt-36 gap-8 lg:grid-cols-12">
        <div className="flex flex-col gap-5 lg:col-span-8">
          <h2 id="overview-title" className="text-h2">
            About this {product.typeLabel.toLowerCase()}
          </h2>
          {product.description?.split(/\n{2,}/).map((para, i) => (
            <p key={i} className="max-w-prose text-body text-fg-secondary">
              {para}
            </p>
          ))}
          {product.inside.length ? (
            <ul className="flex flex-col gap-2">
              {product.inside.map((it) => (
                <li key={it.title} className="flex items-start gap-2.5 text-body-sm text-fg-secondary">
                  <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden /> <span><strong className="font-medium text-fg">{it.title}.</strong> {it.description}</span>
                </li>
              ))}
            </ul>
          ) : null}
          {product.license ? (
            <p className="text-caption text-fg-muted">
              License: {product.license.name}. {product.license.summary}{" "}
              <Link href="/license" className="underline">
                Read the license
              </Link>
            </p>
          ) : null}
        </div>
        <aside aria-labelledby="details-title" className="rounded-xl border border-line bg-surface p-5 lg:col-span-4">
          <h2 id="details-title" className="mb-4 font-sans text-h4 font-semibold">
            {isBundle ? "Bundle Details" : "Book Details"}
          </h2>
          <dl className="flex flex-col gap-3">
            {details
              .filter((d) => d.value)
              .map(({ icon: Icon, label, value }) => (
                <div key={label} className="grid grid-cols-5 gap-2 text-body-sm">
                  <dt className="col-span-2 flex items-center gap-2 text-fg-muted">
                    <Icon className="size-4" aria-hidden /> {label}
                  </dt>
                  <dd className="col-span-3 text-fg">{value}</dd>
                </div>
              ))}
          </dl>
        </aside>
      </section>

      {product.previews.length ? (
        <section id="preview" aria-labelledby="preview-title" className="flex scroll-mt-36 flex-col gap-5">
          <div>
            <h2 id="preview-title" className="text-h2">
              Preview
            </h2>
            <p className="text-body-sm text-fg-muted">Take a look inside — watermarked sample pages from this {product.typeLabel.toLowerCase()}.</p>
          </div>
          <div className="grid gap-8 lg:grid-cols-12">
            <PreviewReader pages={product.previews} title={product.title} className="lg:col-span-8" />
            {fbt.items.length ? (
              <div className="lg:col-span-4">
                <FrequentlyBought items={[...(product.price && state === "available" ? [product] : []), ...fbt.items]} basis={fbt.basis} />
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {isBundle && product.bundle?.items.length ? (
        <section id="included" aria-labelledby="included-title" className="flex scroll-mt-36 flex-col gap-5">
          <SectionHeader id="included-title" title={`What's Included (${product.bundle.items.length})`} />
          {product.bundle.savings && product.bundle.itemsTotal ? (
            <p className="text-body-sm text-fg-secondary">
              Bought separately: <span className="line-through">{product.bundle.itemsTotal.label}</span> — you save{" "}
              <strong className="text-success">{product.bundle.savings.label}</strong> with this bundle.
            </p>
          ) : null}
          <ProductRail products={product.bundle.items} viewer={viewer} />
        </section>
      ) : null}

      {product.toc.length ? (
        <section id="contents" aria-labelledby="toc-title" className="flex scroll-mt-36 flex-col gap-4">
          <h2 id="toc-title" className="text-h2">
            Table of Contents
          </h2>
          <ol className="grid gap-x-8 rounded-xl border border-line bg-surface p-5 sm:grid-cols-2">
            {product.toc.map((entry, i) => (
              <li key={entry.title} className="flex items-baseline gap-3 border-b border-line py-2.5 text-body-sm last:border-b-0">
                <span className="w-6 text-fg-muted tabular-nums">{i + 1}.</span>
                <span className="flex-1 text-fg">{entry.title}</span>
                {entry.pageNumber ? <span className="text-caption text-fg-muted tabular-nums">p. {entry.pageNumber}</span> : null}
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {product.inside.length ? (
        <section id="inside" aria-labelledby="inside-title" className="flex scroll-mt-36 flex-col gap-5">
          <h2 id="inside-title" className="text-h2">
            What&apos;s Inside
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {product.inside.map((it) => (
              <li key={it.title} className="flex gap-4 rounded-lg border border-line bg-surface p-5">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-strong">
                  <InsideIcon name={it.icon} />
                </span>
                <div>
                  <h3 className="font-sans text-body-sm font-semibold">{it.title}</h3>
                  <p className="text-body-sm text-fg-muted">{it.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section id="reviews" aria-labelledby="reviews-title" className="flex scroll-mt-36 flex-col gap-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 id="reviews-title" className="text-h2">
              Customer Reviews
            </h2>
            {product.rating ? <Rating average={product.rating.average} count={product.rating.count} size="md" /> : null}
          </div>
          {owner ? (
            <div className="flex items-center gap-3">
              {owner.review?.status === "pending" ? <span className="text-caption text-fg-muted">Your review is awaiting moderation</span> : null}
              <ReviewDialog productId={product.id} productTitle={product.title} existing={owner.review} />
            </div>
          ) : null}
        </div>
        {reviews.length ? (
          <ul className="grid gap-4 md:grid-cols-3">
            {reviews.map((r) => (
              <li key={r.id} className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-5">
                <div className="flex items-center gap-3">
                  <Avatar name={r.author.name} src={r.author.avatarUrl} />
                  <div className="flex flex-col">
                    <span className="text-body-sm font-medium">{r.author.name}</span>
                    {r.verified ? <span className="text-caption text-success">Verified purchase</span> : null}
                  </div>
                </div>
                <Rating average={r.rating} count={1} className="[&>span:last-child]:hidden" />
                {r.title ? <p className="text-body-sm font-semibold">{r.title}</p> : null}
                <p className="text-body-sm text-fg-secondary">{r.body}</p>
                <time dateTime={r.createdAt} className="mt-auto text-caption text-fg-muted">
                  {dateFmt.format(new Date(r.createdAt))}
                </time>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-lg border border-dashed border-line-strong bg-surface p-6 text-body-sm text-fg-secondary">
            No reviews yet. Readers who own this {product.typeLabel.toLowerCase()} can share their thoughts from their library.
          </div>
        )}
      </section>

      {product.faqs.length ? (
        <section id="faqs" aria-labelledby="faq-title" className="flex scroll-mt-36 flex-col gap-4 lg:max-w-3xl">
          <h2 id="faq-title" className="text-h2">
            Frequently Asked Questions
          </h2>
          <Accordion type="single" collapsible className="flex flex-col gap-2">
            {product.faqs.map((f, i) => (
              <AccordionItem key={f.question} value={`faq-${i}`}>
                <AccordionTrigger>{f.question}</AccordionTrigger>
                <AccordionContent>{f.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      ) : null}

      {related.length ? (
        <section aria-labelledby="related-title" className="flex flex-col gap-5">
          <SectionHeader id="related-title" title="You May Also Like" href={product.category ? `/categories/${product.category.slug}` : "/explore"} />
          <ProductRail products={related} viewer={viewer} />
        </section>
      ) : null}

      {showMobileBar && product.price ? <MobilePurchaseBar productId={product.id} title={product.title} price={product.price} /> : null}
    </div>
  );
}

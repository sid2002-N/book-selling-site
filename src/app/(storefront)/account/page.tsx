import { BookOpen, Download, NotebookPen, ScrollText, type LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ContinueReadingCard } from "@/components/account/ContinueReadingCard";
import { FormAlert } from "@/components/auth/FormAlert";
import { SectionHeader } from "@/components/catalog/SectionHeader";
import { ProductRail } from "@/components/commerce/ProductGrid";
import { BookCover } from "@/components/library/BookCover";
import { SystemState } from "@/components/system/SystemState";
import { requireUserPage } from "@/modules/auth";
import { recommendations, recentlyViewed } from "@/modules/engagement";
import { libraryEntries, libraryStats } from "@/modules/library";
import { getDisplayCurrency } from "@/modules/pricing";
import { getSetting } from "@/modules/settings";
import { viewerState } from "@/modules/storefront";

export const metadata: Metadata = { title: "Dashboard", robots: { index: false } };

function greeting(date = new Date()) {
  const h = Number(new Intl.DateTimeFormat("en-IN", { hour: "numeric", hour12: false, timeZone: "Asia/Kolkata" }).format(date));
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

/** Account dashboard (sheet 65 "Account Dashboard"). Every number is counted from real rows. */
export default async function AccountDashboardPage() {
  const { user } = await requireUserPage("/account");
  const currency = await getDisplayCurrency();
  const [stats, reading, recent, recs, viewed, quote] = await Promise.all([
    libraryStats(user.id),
    libraryEntries(user.id, { section: "reading", take: 4 }),
    libraryEntries(user.id, { take: 10 }),
    recommendations(user.id, currency, 8),
    recentlyViewed(user.id, currency, 8),
    getSetting("store.quote"),
  ]);
  const viewer = await viewerState([...recs, ...viewed].map((p) => p.id));
  const cards: { icon: LucideIcon; value: number; label: string }[] = [
    { icon: BookOpen, value: stats.books, label: stats.books === 1 ? "Book owned" : "Books owned" },
    { icon: NotebookPen, value: stats.workbooks, label: stats.workbooks === 1 ? "Workbook" : "Workbooks" },
    { icon: ScrollText, value: stats.guides, label: stats.guides === 1 ? "Guide" : "Guides" },
    { icon: Download, value: stats.downloads, label: stats.downloads === 1 ? "Download" : "Downloads" },
  ];

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div className="flex flex-col gap-1">
          <p className="text-body-sm text-fg-muted">{greeting()},</p>
          <h1 className="text-h1 text-fg">{user.name}</h1>
          <p className="text-body-sm text-fg-secondary">Keep learning, keep growing.</p>
        </div>
        <blockquote className="max-w-xs font-serif text-body-lg text-fg-secondary italic">“{quote}”</blockquote>
      </header>

      {!user.emailVerified ? (
        <FormAlert>
          Please verify your email to download and read your library.{" "}
          <Link href="/verify-email" className="font-medium underline">
            Verify now
          </Link>
        </FormAlert>
      ) : null}

      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Library summary">
        {cards.map(({ icon: Icon, value, label }) => (
          <li key={label} className="flex items-center gap-3 rounded-xl border border-line bg-surface p-4 shadow-1">
            <span className="flex size-11 items-center justify-center rounded-md bg-accent-soft text-accent-strong">
              <Icon className="size-5" aria-hidden />
            </span>
            <div>
              <p className="font-serif text-h3 tabular-nums">{value}</p>
              <p className="text-caption text-fg-muted">{label}</p>
            </div>
          </li>
        ))}
      </ul>

      {stats.total === 0 ? (
        <SystemState variant="empty-library" layout="inline" headingLevel="h2" />
      ) : (
        <>
          {reading.length ? (
            <section aria-labelledby="continue-title" className="flex flex-col gap-4">
              <SectionHeader id="continue-title" title="Continue Reading" href="/account/library?section=reading" />
              <div className="grid gap-4 md:grid-cols-2">
                {reading.map((entry) => (
                  <ContinueReadingCard key={entry.id} entry={entry} />
                ))}
              </div>
            </section>
          ) : null}

          <section aria-labelledby="recent-title" className="flex flex-col gap-4">
            <SectionHeader id="recent-title" title="Recent Additions" href="/account/library" />
            <ul className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
              {recent.map((entry) => (
                <li key={entry.id} className="w-28 shrink-0 sm:w-32">
                  <Link href={entry.href} className="group flex flex-col gap-2">
                    <BookCover id={entry.productId} title={entry.title} coverUrl={entry.coverUrl} spineColor={entry.spineColor} sizes="128px" className="transition-transform duration-normal group-hover:-translate-y-1" />
                    <span className="line-clamp-2 text-caption font-medium text-fg">{entry.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      {recs.length ? (
        <section aria-labelledby="recs-title" className="flex flex-col gap-4">
          <SectionHeader id="recs-title" title={stats.total ? "Picked for Your Shelf" : "Start Your Library"} eyebrow={stats.total ? "Based on what you own" : undefined} href="/explore" />
          <ProductRail products={recs} viewer={viewer} />
        </section>
      ) : null}

      {viewed.length ? (
        <section aria-labelledby="viewed-title" className="flex flex-col gap-4">
          <SectionHeader id="viewed-title" title="Recently Viewed" />
          <ProductRail products={viewed} viewer={viewer} />
        </section>
      ) : null}
    </div>
  );
}

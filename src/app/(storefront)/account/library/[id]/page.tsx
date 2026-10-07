import { ArrowLeft, BookOpen, Bookmark, Calendar, FileText, Globe, HardDrive, Layers } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DownloadButton } from "@/components/account/DownloadButton";
import { LibraryActions } from "@/components/account/LibraryActions";
import { ReviewDialog } from "@/components/account/ReviewDialog";
import { BookCover } from "@/components/library/BookCover";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/Feedback";
import { isAppError } from "@/lib/errors";
import { requireUserPage } from "@/modules/auth";
import { myReviewFor } from "@/modules/engagement";
import { libraryEntry, type LibraryEntryDetail } from "@/modules/library";
import { getSetting } from "@/modules/settings";

export const metadata: Metadata = { title: "Library", robots: { index: false } };

const formatSize = (bytes: number) => (bytes >= 1_048_576 ? `${(bytes / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);
const FORMAT: Record<string, string> = { pdf: "PDF", fillable_pdf: "Fillable PDF", zip: "ZIP", external_link: "Online link" };

/** Book detail in library (sheet 68): progress, contents, bookmarks, files and the reader. */
export default async function LibraryItemPage({ params }: PageProps<"/account/library/[id]">) {
  const { id } = await params;
  const { user } = await requireUserPage(`/account/library/${id}`);
  let item: LibraryEntryDetail;
  try {
    item = await libraryEntry(user.id, id);
  } catch (error) {
    if (isAppError(error)) notFound();
    throw error;
  }
  const [review, supportEmail] = await Promise.all([myReviewFor(user.id, item.productId), getSetting("store.supportEmail")]);
  const canRead = item.file?.mime === "application/pdf";
  const meta = [
    item.pages ? { icon: FileText, label: "Pages", value: String(item.pages) } : null,
    item.file ? { icon: Layers, label: "Format", value: FORMAT[item.file.kind] ?? item.file.kind } : null,
    item.file?.sizeBytes ? { icon: HardDrive, label: "Size", value: formatSize(item.file.sizeBytes) } : null,
    { icon: Globe, label: "Language", value: new Intl.DisplayNames(["en"], { type: "language" }).of(item.language) ?? item.language },
    item.currentVersion ? { icon: Bookmark, label: "Version", value: item.currentVersion } : null,
    item.releasedAt ? { icon: Calendar, label: "Last updated", value: new Date(item.releasedAt).toLocaleDateString("en-IN", { dateStyle: "medium" }) } : null,
  ].filter((m): m is NonNullable<typeof m> => Boolean(m));

  return (
    <div className="flex flex-col gap-8">
      <Link href="/account/library" className="flex items-center gap-1.5 self-start text-label font-medium text-fg-secondary hover:text-fg">
        <ArrowLeft className="size-4" aria-hidden /> Back to library
      </Link>

      <div className="grid gap-8 md:grid-cols-3">
        <div className="mx-auto w-3/5 md:w-full">
          <BookCover id={item.productId} title={item.title} coverUrl={item.coverUrl} spineColor={item.spineColor} sizes="(min-width: 768px) 280px, 60vw" priority />
        </div>
        <div className="flex flex-col gap-5 md:col-span-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="success">Owned</Badge>
            <Badge>{item.typeLabel}</Badge>
            {item.updateAvailable ? <Badge tone="accent">Update available</Badge> : null}
            {item.archived ? <Badge tone="neutral">Archived</Badge> : null}
          </div>
          <div className="flex flex-col gap-2">
            <h1 className="text-display">{item.title}</h1>
            {item.subtitle ? <p className="text-body-lg text-fg-secondary">{item.subtitle}</p> : null}
          </div>

          <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-5 shadow-1">
            <div className="flex items-center justify-between text-label">
              <span className="font-semibold">Your progress</span>
              <span className="tabular-nums text-fg-secondary">{item.progress}%</span>
            </div>
            <ProgressBar value={item.progress} label="Reading progress" />
            <p className="text-caption text-fg-muted">
              {item.lastPage && item.totalPages ? `Page ${item.lastPage} of ${item.totalPages}${item.lastChapter ? ` · ${item.lastChapter}` : ""}` : "Not started yet"}
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              {canRead ? (
                <Button asChild size="lg">
                  <Link href={item.readHref}>
                    <BookOpen /> {item.progress ? "Continue reading" : "Start reading"}
                  </Link>
                </Button>
              ) : null}
              {item.type === "bundle" && !item.file ? null : <DownloadButton libraryItemId={item.id} title={item.title} label={item.updateAvailable ? `Download v${item.currentVersion}` : "Download"} variant={canRead ? "secondary" : "primary"} size="lg" supportEmail={supportEmail} />}
              <LibraryActions libraryItemId={item.id} favorite={item.isFavorite} archived={item.archived} />
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {meta.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-start gap-2">
                <Icon className="mt-0.5 size-4 text-fg-muted" aria-hidden />
                <div>
                  <dt className="text-caption text-fg-muted">{label}</dt>
                  <dd className="text-body-sm font-medium">{value}</dd>
                </div>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {item.updateAvailable && item.changelog ? (
        <section className="rounded-xl border border-accent bg-accent-soft p-5">
          <h2 className="font-sans text-h4 font-semibold">What&apos;s new in version {item.currentVersion}</h2>
          <p className="mt-1 text-body-sm text-fg-secondary">{item.changelog}</p>
        </section>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="flex flex-col gap-8 lg:col-span-2">
          {item.description || item.shortDescription ? (
            <section aria-labelledby="about-title" className="flex flex-col gap-2">
              <h2 id="about-title" className="text-h3">
                Description
              </h2>
              <p className="text-body whitespace-pre-line text-fg-secondary">{item.description ?? item.shortDescription}</p>
            </section>
          ) : null}
          {item.bundleContents.length ? (
            <section aria-labelledby="bundle-title" className="flex flex-col gap-2">
              <h2 id="bundle-title" className="text-h3">
                In this bundle
              </h2>
              <p className="text-body-sm text-fg-secondary">Each title is also on your shelf.</p>
              <ul className="flex flex-col divide-y divide-line rounded-lg border border-line bg-surface text-body-sm">
                {item.bundleContents.map((b) => (
                  <li key={b.id}>
                    {b.libraryItemId ? (
                      <Link href={`/account/library/${b.libraryItemId}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-canvas-subtle">
                        {b.title} <span className="text-caption text-fg-muted">Open</span>
                      </Link>
                    ) : (
                      <span className="block px-4 py-3">{b.title}</span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <section aria-labelledby="review-title" className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-5">
            <h2 id="review-title" className="font-sans text-h4 font-semibold">
              Your review
            </h2>
            {review ? (
              <p className="text-body-sm text-fg-secondary">
                You rated this {review.rating}/5.{" "}
                {review.status === "pending" ? "Your review is waiting for moderation." : review.status === "rejected" ? `It wasn't published${review.rejectionReason ? `: ${review.rejectionReason}` : "."}` : "It's live on the product page."}
              </p>
            ) : (
              <p className="text-body-sm text-fg-secondary">Help other readers decide — share what you thought.</p>
            )}
            <div>
              <ReviewDialog productId={item.productId} productTitle={item.title} existing={review} />
            </div>
          </section>
        </div>
        <aside className="flex flex-col gap-6">
          {item.toc.length ? (
            <section aria-labelledby="toc-title" className="flex flex-col gap-3">
              <h2 id="toc-title" className="text-h4 font-sans font-semibold">
                Table of contents
              </h2>
              <ol className="flex flex-col gap-1 text-body-sm">
                {item.toc.map((t, i) => (
                  <li key={t.id}>
                    {canRead && t.pageNumber ? (
                      <Link href={`${item.readHref}?page=${t.pageNumber}`} className="flex justify-between gap-3 rounded-sm px-2 py-1.5 hover:bg-canvas-subtle">
                        <span>
                          {i + 1}. {t.title}
                        </span>
                        <span className="text-fg-muted tabular-nums">{t.pageNumber}</span>
                      </Link>
                    ) : (
                      <span className="block px-2 py-1.5">
                        {i + 1}. {t.title}
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
          {item.bookmarks.length ? (
            <section aria-labelledby="bm-title" className="flex flex-col gap-3">
              <h2 id="bm-title" className="text-h4 font-sans font-semibold">
                Bookmarks
              </h2>
              <ul className="flex flex-col gap-1 text-body-sm">
                {item.bookmarks.map((b) => (
                  <li key={b.id}>
                    <Link href={`${item.readHref}?page=${b.page}`} className="flex justify-between gap-3 rounded-sm px-2 py-1.5 hover:bg-canvas-subtle">
                      <span>{b.label ?? `Page ${b.page}`}</span>
                      <span className="text-fg-muted tabular-nums">p. {b.page}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <Link href={item.productHref} className="text-caption font-medium text-fg-secondary underline underline-offset-2">
            View the product page
          </Link>
        </aside>
      </div>
    </div>
  );
}

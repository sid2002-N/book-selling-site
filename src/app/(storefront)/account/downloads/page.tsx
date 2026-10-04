import { CircleAlert, Download, FileCheck2, RefreshCw, TriangleAlert, type LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { DownloadButton } from "@/components/account/DownloadButton";
import { BookCover } from "@/components/library/BookCover";
import { SystemState } from "@/components/system/SystemState";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { pillClasses } from "@/components/ui/Tabs";
import { requireUserPage } from "@/modules/auth";
import { downloadCenter, type DownloadState } from "@/modules/delivery";
import { getSetting } from "@/modules/settings";

export const metadata: Metadata = { title: "Downloads", robots: { index: false } };

const FILTERS: { value: "all" | DownloadState; label: string }[] = [
  { value: "all", label: "All downloads" },
  { value: "available", label: "Available" },
  { value: "update_available", label: "Updates" },
  { value: "limit_reached", label: "Limit reached" },
];
const STATE_BADGE: Record<DownloadState, { tone: "success" | "accent" | "error" | "neutral"; label: string }> = {
  available: { tone: "success", label: "Available" },
  update_available: { tone: "accent", label: "Update available" },
  limit_reached: { tone: "error", label: "Limit reached" },
  unavailable: { tone: "neutral", label: "File unavailable" },
};
const TOKEN_ERRORS: Record<string, { title: string; message: string }> = {
  expired: { title: "Download link expired", message: "Download links only work for a short time, for your security. Start the download again below." },
  used: { title: "This link was already used", message: "Each download link works once. Start a new download below." },
  unauthorized: { title: "Unauthorized download", message: "This download link isn't valid for your account, or it was modified. Start the download from your list below." },
  unavailable: { title: "File not available", message: "The file is temporarily unavailable. Please try again later or contact support." },
};
const HISTORY: Record<string, { tone: "success" | "warning" | "error" | "neutral"; label: string }> = {
  completed: { tone: "success", label: "Completed" },
  issued: { tone: "success", label: "Started" },
  denied: { tone: "neutral", label: "Blocked" },
  failed: { tone: "error", label: "Failed" },
};
const formatSize = (bytes: number) => (bytes >= 1_048_576 ? `${(bytes / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Download Center (sheet 77) with per-product limits, updates and history. */
export default async function DownloadsPage({ searchParams }: PageProps<"/account/downloads">) {
  const { user } = await requireUserPage("/account/downloads");
  const sp = await searchParams;
  const filter = FILTERS.find((f) => f.value === one(sp.filter))?.value ?? "all";
  const tokenError = TOKEN_ERRORS[one(sp.error) ?? ""];
  const [center, supportEmail] = await Promise.all([downloadCenter(user.id), getSetting("store.supportEmail")]);
  const rows = filter === "all" ? center.rows : center.rows.filter((r) => r.state === filter);
  const stats: { icon: LucideIcon; value: number; label: string }[] = [
    { icon: Download, value: center.stats.totalDownloads, label: "Total downloads" },
    { icon: FileCheck2, value: center.stats.activeFiles, label: "Active files" },
    { icon: RefreshCw, value: center.stats.updates, label: "Updates available" },
    { icon: TriangleAlert, value: center.stats.limitReached, label: "At download limit" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-h1">Download Center</h1>
        <p className="text-body-sm text-fg-secondary">Access and manage all your digital purchases. Updates are always free.</p>
      </header>

      {tokenError ? (
        <div role="alert" className="flex gap-3 rounded-lg bg-warning-soft px-4 py-3 text-body-sm">
          <CircleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
          <div>
            <p className="font-semibold text-fg">{tokenError.title}</p>
            <p className="text-fg-secondary">{tokenError.message}</p>
          </div>
        </div>
      ) : null}
      {!user.emailVerified ? (
        <div role="status" className="rounded-lg bg-info-soft px-4 py-3 text-body-sm text-fg">
          Verify your email to download your files.{" "}
          <Link href="/verify-email" className="font-semibold underline">
            Verify now
          </Link>
        </div>
      ) : null}

      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Download summary">
        {stats.map(({ icon: Icon, value, label }) => (
          <li key={label} className="flex items-center gap-3 rounded-xl border border-line bg-surface p-4 shadow-1">
            <span className="flex size-10 items-center justify-center rounded-md bg-accent-soft text-accent-strong">
              <Icon className="size-5" aria-hidden />
            </span>
            <div>
              <p className="font-serif text-h3 tabular-nums">{value}</p>
              <p className="text-caption text-fg-muted">{label}</p>
            </div>
          </li>
        ))}
      </ul>

      {center.rows.length === 0 ? (
        <SystemState variant="empty-library" layout="inline" headingLevel="h2" title="No downloads yet" message="Files from your purchases and free resources appear here, ready to download." />
      ) : (
        <>
          <nav aria-label="Filter downloads" className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {FILTERS.map((f) => {
              const count = f.value === "all" ? center.rows.length : center.rows.filter((r) => r.state === f.value).length;
              return (
                <Link key={f.value} href={f.value === "all" ? "/account/downloads" : `/account/downloads?filter=${f.value}`} aria-current={filter === f.value ? "page" : undefined} className={pillClasses}>
                  {f.label} ({count})
                </Link>
              );
            })}
          </nav>
          <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
            {rows.map((r) => {
              const badge = STATE_BADGE[r.state];
              return (
                <li key={r.libraryItemId} className="flex flex-wrap items-center gap-4 px-5 py-4">
                  <div className="w-12 shrink-0">
                    <BookCover id={r.productId} title={r.title} coverUrl={r.coverUrl} spineColor={r.spineColor} sizes="48px" compact />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <Link href={`/account/library/${r.libraryItemId}`} className="truncate text-body font-semibold hover:underline">
                      {r.title}
                    </Link>
                    <p className="flex flex-wrap gap-x-3 text-caption text-fg-muted">
                      {r.format ? <span className="font-semibold text-fg-secondary">{r.format}</span> : null}
                      {r.sizeBytes ? <span>{formatSize(r.sizeBytes)}</span> : null}
                      {r.version ? <span>v{r.version}</span> : null}
                      <span>Added {new Date(r.grantedAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}</span>
                      <span>
                        Downloads: {r.used}
                        {r.limit ? ` / ${r.limit}` : ""}
                      </span>
                    </p>
                  </div>
                  <Badge tone={badge.tone}>{badge.label}</Badge>
                  <div className="flex gap-2">
                    {r.state === "limit_reached" ? (
                      <Button asChild variant="secondary" size="sm">
                        <a href={`mailto:${supportEmail}?subject=${encodeURIComponent(`More downloads: ${r.title}`)}`}>Request more</a>
                      </Button>
                    ) : r.state === "unavailable" ? null : (
                      <DownloadButton libraryItemId={r.libraryItemId} title={r.title} label={r.state === "update_available" ? `Download v${r.version}` : "Download"} size="sm" supportEmail={supportEmail} />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          {rows.length === 0 ? <p className="text-center text-body-sm text-fg-muted">Nothing in this view.</p> : null}
        </>
      )}

      {center.history.length ? (
        <section aria-labelledby="history-title" className="flex flex-col gap-3">
          <h2 id="history-title" className="text-h3">
            Download history
          </h2>
          <div className="overflow-x-auto rounded-xl border border-line bg-surface">
            <table className="w-full text-left text-body-sm">
              <thead className="border-b border-line text-caption text-fg-muted">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Product
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Date
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Version
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {center.history.map((h) => {
                  const s = HISTORY[h.status] ?? HISTORY.failed!;
                  return (
                    <tr key={h.id}>
                      <td className="px-4 py-3">{h.title}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-fg-secondary">{new Date(h.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</td>
                      <td className="px-4 py-3 text-fg-secondary">{h.version ? `v${h.version}` : "—"}</td>
                      <td className="px-4 py-3">
                        <Badge tone={s.tone}>{s.label}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}

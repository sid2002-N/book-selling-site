import { Star } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { approveReviewAction, rejectReviewAction } from "../actions";
import { ActionButton } from "@/components/admin/ActionButton";
import { fmtDateTime } from "@/components/admin/format";
import { FilterTabs, PageHeader, Panel, StatusChip } from "@/components/admin/ui";
import { Pagination } from "@/components/ui/Pagination";
import { requireAdminPage } from "@/modules/admin";
import { listReviews } from "@/modules/backoffice";

export const metadata: Metadata = { title: "Reviews" };

export default async function AdminReviewsPage({ searchParams }: PageProps<"/admin/reviews">) {
  await requireAdminPage("reviews.moderate", "/admin/reviews");
  const sp = await searchParams;
  const data = await listReviews({ status: typeof sp.status === "string" ? sp.status : undefined, page: Number(sp.page) || 1 });
  return (
    <>
      <PageHeader title="Reviews" description="Only verified owners can review. Approved reviews count towards the product rating; nothing is published unmoderated." />
      <div className="mb-4">
        <FilterTabs
          active={data.status}
          tabs={(["pending", "reported", "approved", "rejected"] as const).map((s) => ({ key: s, label: s.charAt(0).toUpperCase() + s.slice(1), href: `/admin/reviews?status=${s}`, count: data.counts[s] ?? 0 }))}
        />
      </div>
      {data.rows.length ? (
        <ul className="flex flex-col gap-3">
          {data.rows.map((r) => (
            <li key={r.id}>
              <Panel>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex min-w-0 flex-col gap-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="flex items-center gap-0.5 text-accent" aria-label={`${r.rating} out of 5 stars`}>
                        {Array.from({ length: 5 }, (_, i) => (
                          <Star key={i} className={i < r.rating ? "size-4 fill-current" : "size-4 text-line-strong"} aria-hidden />
                        ))}
                      </span>
                      <StatusChip value={r.status} />
                      {r.isVerifiedPurchase ? <span className="text-caption font-medium text-success">Verified purchase</span> : null}
                      {r._count.reports ? <span className="text-caption font-medium text-error">{r._count.reports} report{r._count.reports === 1 ? "" : "s"}</span> : null}
                    </div>
                    {r.title ? <p className="font-semibold text-fg">{r.title}</p> : null}
                    <p className="max-w-prose text-body-sm whitespace-pre-line text-fg-secondary">{r.body}</p>
                    <p className="text-caption text-fg-muted">
                      {r.user.name} ({r.user.email}) on{" "}
                      <Link href={`/admin/products/${r.product.id}`} className="text-accent-strong hover:underline">
                        {r.product.title}
                      </Link>{" "}
                      · {fmtDateTime(r.createdAt)}
                      {r.rejectionReason ? ` · rejected: ${r.rejectionReason}` : ""}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {r.status !== "approved" ? (
                      <ActionButton action={approveReviewAction.bind(null, r.id)} variant="primary">
                        Approve
                      </ActionButton>
                    ) : null}
                    {r.status !== "rejected" ? (
                      <ActionButton action={rejectReviewAction.bind(null, r.id)} reason={{ title: "Reject this review?", description: "It won't be shown or counted in the rating.", label: "Reason", required: true, confirmLabel: "Reject review", destructive: true }}>
                        Reject
                      </ActionButton>
                    ) : null}
                  </div>
                </div>
              </Panel>
            </li>
          ))}
        </ul>
      ) : (
        <Panel>
          <p className="py-6 text-center text-body-sm text-fg-muted">{data.status === "pending" ? "All caught up — no reviews waiting." : "No reviews here."}</p>
        </Panel>
      )}
      <div className="mt-4 flex justify-end">
        <Pagination page={data.page} totalPages={data.totalPages} hrefFor={(p) => `/admin/reviews?status=${data.status}&page=${p}`} />
      </div>
    </>
  );
}

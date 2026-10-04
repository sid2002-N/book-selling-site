import { Star } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { DeleteReviewButton } from "@/components/account/DeleteReviewButton";
import { ReviewDialog } from "@/components/account/ReviewDialog";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import { requireUserPage } from "@/modules/auth";
import { myReviews, reviewablePending } from "@/modules/engagement";

export const metadata: Metadata = { title: "My Reviews", robots: { index: false } };

const STATUS: Record<string, { tone: "success" | "warning" | "error" | "neutral"; label: string }> = {
  approved: { tone: "success", label: "Published" },
  pending: { tone: "warning", label: "Awaiting moderation" },
  rejected: { tone: "error", label: "Not published" },
  reported: { tone: "warning", label: "Under review" },
};

export default async function ReviewsPage() {
  const { user } = await requireUserPage("/account/reviews");
  const [reviews, pending] = await Promise.all([myReviews(user.id), reviewablePending(user.id)]);
  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-h1">My Reviews</h1>
        <p className="text-body-sm text-fg-secondary">Reviews come from verified owners only and are checked before they appear.</p>
      </header>

      {pending.length ? (
        <section aria-labelledby="pending-title" className="flex flex-col gap-3">
          <h2 id="pending-title" className="text-h3">
            Waiting for your thoughts
          </h2>
          <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
            {pending.map((p) => (
              <li key={p.productId} className="flex items-center justify-between gap-4 px-5 py-3">
                <span className="truncate text-body-sm font-medium">{p.title}</span>
                <ReviewDialog productId={p.productId} productTitle={p.title} existing={null} trigger="link" />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="mine-title" className="flex flex-col gap-3">
        <h2 id="mine-title" className="text-h3">
          Your reviews
        </h2>
        {reviews.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line-strong px-5 py-8 text-center text-body-sm text-fg-muted">You haven&apos;t written any reviews yet.</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {reviews.map((r) => {
              const s = STATUS[r.status] ?? STATUS.pending!;
              return (
                <li key={r.id} className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <Link href={r.product.href} className="text-body font-semibold hover:underline">
                        {r.product.title}
                      </Link>
                      <div className="mt-1 flex items-center gap-0.5" aria-label={`${r.rating} out of 5 stars`}>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star key={n} className={cn("size-4", n <= r.rating ? "fill-accent text-accent" : "text-line-strong")} aria-hidden />
                        ))}
                      </div>
                    </div>
                    <Badge tone={s.tone}>{s.label}</Badge>
                  </div>
                  {r.title ? <p className="font-semibold">{r.title}</p> : null}
                  <p className="text-body-sm text-fg-secondary">{r.body}</p>
                  {r.status === "rejected" && r.rejectionReason ? <p className="text-caption text-error">Reason: {r.rejectionReason}</p> : null}
                  <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
                    <span className="mr-auto text-caption text-fg-muted">Updated {new Date(r.updatedAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}</span>
                    <ReviewDialog productId={r.productId} productTitle={r.product.title} existing={{ rating: r.rating, title: r.title, body: r.body }} trigger="link" />
                    <DeleteReviewButton reviewId={r.id} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

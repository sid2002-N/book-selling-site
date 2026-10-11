import "server-only";
import { z } from "zod";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { enforceRateLimit } from "@/lib/rate-limit";
import { productHref, type ProductTypeKey } from "@/modules/catalog/types";
import { getSetting } from "@/modules/settings";

export const reviewInput = z.object({
  rating: z.int().min(1, { error: "Choose a rating from 1 to 5 stars." }).max(5),
  title: z.string().trim().max(120).nullish(),
  body: z.string().trim().min(10, { error: "Write at least 10 characters." }).max(500, { error: "Keep it under 500 characters." }),
});
export type ReviewInput = z.infer<typeof reviewInput>;

/** Rating aggregates count approved reviews only (C6: no invented ratings). */
export async function recomputeRating(productId: string): Promise<void> {
  const agg = await db.review.aggregate({ where: { productId, status: "approved", deletedAt: null }, _avg: { rating: true }, _count: { _all: true } });
  await db.product.update({ where: { id: productId }, data: { ratingAvg: agg._count._all ? agg._avg.rating : null, ratingCount: agg._count._all } });
}

/**
 * Write or edit a review (F17). Only owners may review; purchases are marked verified. New and
 * edited reviews go back to moderation when the store requires it.
 */
export async function saveReview(userId: string, productId: string, input: ReviewInput) {
  const owned = await db.libraryItem.findUnique({ where: { userId_productId: { userId, productId } }, select: { revokedAt: true, source: true } });
  if (!owned || owned.revokedAt) throw new AppError("FORBIDDEN", "Only readers who own this title can review it.");
  const existing = await db.review.findUnique({ where: { userId_productId: { userId, productId } } });
  if (!existing || existing.deletedAt) await enforceRateLimit("reviewCreate", userId);
  const moderated = await getSetting("reviews.requireModeration");
  const data = {
    rating: input.rating,
    title: input.title || null,
    body: input.body,
    status: moderated ? ("pending" as const) : ("approved" as const),
    isVerifiedPurchase: owned.source === "purchase",
    moderatedById: null,
    moderatedAt: null,
    rejectionReason: null,
    deletedAt: null,
  };
  const review = await db.review.upsert({ where: { userId_productId: { userId, productId } }, create: { userId, productId, ...data }, update: data });
  // An edited, previously approved review leaves the public average until re-approved.
  await recomputeRating(productId);
  return review;
}

export async function deleteReview(userId: string, reviewId: string): Promise<void> {
  const review = await db.review.findFirst({ where: { id: reviewId, userId, deletedAt: null } });
  if (!review) throw new AppError("NOT_FOUND", "Review not found.");
  await db.review.update({ where: { id: review.id }, data: { deletedAt: new Date() } });
  await recomputeRating(review.productId);
}

export async function myReviewFor(userId: string, productId: string) {
  const r = await db.review.findUnique({ where: { userId_productId: { userId, productId } } });
  return r && !r.deletedAt ? { id: r.id, rating: r.rating, title: r.title, body: r.body, status: r.status, rejectionReason: r.rejectionReason } : null;
}

export async function myReviews(userId: string) {
  const rows = await db.review.findMany({
    where: { userId, deletedAt: null },
    orderBy: { updatedAt: "desc" },
    include: { product: { select: { id: true, title: true, slug: true, type: true, spineColor: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    productId: r.productId,
    rating: r.rating,
    title: r.title,
    body: r.body,
    status: r.status,
    rejectionReason: r.rejectionReason,
    updatedAt: r.updatedAt.toISOString(),
    product: { title: r.product.title, href: productHref(r.product.type as ProductTypeKey, r.product.slug), spineColor: r.product.spineColor },
  }));
}

/** Owned titles the customer hasn't reviewed yet (prompts on the reviews page). */
export async function reviewablePending(userId: string, take = 6) {
  const rows = await db.libraryItem.findMany({
    where: { userId, revokedAt: null, product: { reviews: { none: { userId, deletedAt: null } } } },
    orderBy: { grantedAt: "desc" },
    take,
    select: { productId: true, product: { select: { title: true, spineColor: true, type: true } } },
  });
  return rows.map((r) => ({ productId: r.productId, title: r.product.title, spineColor: r.product.spineColor }));
}

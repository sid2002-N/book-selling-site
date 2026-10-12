import "server-only";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import type { PaymentProvider, PaymentStatus, ReviewStatus } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { audit, requirePermission } from "@/modules/admin";
import { recomputeRating } from "@/modules/engagement/reviews";
import { reconcilePayment } from "@/modules/payments/reconcile";
import { slugify } from "./readiness";

const PAGE_SIZE = 25;

// ───────────────────────────── Reviews (UX Flow 17) ─────────────────────────────

export async function listReviews(params: { status?: string; page?: number }) {
  await requirePermission("reviews.moderate");
  const statuses: ReviewStatus[] = ["pending", "approved", "rejected", "reported"];
  const status = statuses.includes(params.status as ReviewStatus) ? (params.status as ReviewStatus) : "pending";
  const where: Prisma.ReviewWhereInput = { status, deletedAt: null };
  const page = Math.max(1, params.page ?? 1);
  const [rows, total, grouped] = await Promise.all([
    db.review.findMany({
      where,
      orderBy: { createdAt: status === "pending" ? "asc" : "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { user: { select: { id: true, name: true, email: true } }, product: { select: { id: true, title: true } }, _count: { select: { reports: true } } },
    }),
    db.review.count({ where }),
    db.review.groupBy({ by: ["status"], where: { deletedAt: null }, _count: { _all: true } }),
  ]);
  const counts = Object.fromEntries(grouped.map((g) => [g.status, g._count._all])) as Partial<Record<ReviewStatus, number>>;
  return { rows, status, counts, page, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function moderateReview(reviewId: string, approve: boolean, reason: string | null) {
  const ctx = await requirePermission("reviews.moderate");
  const review = await db.review.findFirst({ where: { id: reviewId, deletedAt: null } });
  if (!review) throw new AppError("NOT_FOUND", "That review no longer exists.");
  if (!approve && !reason?.trim()) throw new AppError("VALIDATION_ERROR", "Add a reason for rejecting.", { fields: { reason: "Required." } });
  const status: ReviewStatus = approve ? "approved" : "rejected";
  await db.review.update({ where: { id: reviewId }, data: { status, moderatedById: ctx.user.id, moderatedAt: new Date(), rejectionReason: approve ? null : reason!.trim().slice(0, 300) } });
  await recomputeRating(review.productId);
  await audit({ actorUserId: ctx.user.id, action: approve ? "review.approve" : "review.reject", entityType: "review", entityId: reviewId, before: { status: review.status }, after: { status, reason: approve ? null : reason } });
}

// ───────────────────────────── Payments ─────────────────────────────

export async function listPayments(params: { provider?: string; status?: string; page?: number }) {
  await requirePermission("payments.read");
  const where: Prisma.PaymentWhereInput = {};
  if (params.provider === "razorpay" || params.provider === "stripe") where.provider = params.provider as PaymentProvider;
  const statuses: PaymentStatus[] = ["created", "processing", "requires_action", "pending_verification", "succeeded", "failed", "cancelled", "refunded", "partially_refunded", "disputed"];
  if (statuses.includes(params.status as PaymentStatus)) where.status = params.status as PaymentStatus;
  const page = Math.max(1, params.page ?? 1);
  const [rows, total] = await Promise.all([
    db.payment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        provider: true,
        status: true,
        amountMinor: true,
        currency: true,
        method: true,
        providerPaymentRef: true,
        failureCode: true,
        createdAt: true,
        order: { select: { id: true, orderNumber: true } },
      },
    }),
    db.payment.count({ where }),
  ]);
  return { rows, page, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function listWebhookEvents(params: { page?: number; status?: string }) {
  await requirePermission("payments.read");
  const where: Prisma.WebhookEventWhereInput =
    params.status === "failed" || params.status === "processed" || params.status === "ignored" || params.status === "received" ? { status: params.status } : {};
  const page = Math.max(1, params.page ?? 1);
  const [rows, total] = await Promise.all([
    db.webhookEvent.findMany({
      where,
      orderBy: { receivedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: { id: true, provider: true, eventId: true, type: true, signatureValid: true, status: true, attempts: true, error: true, receivedAt: true, processedAt: true },
    }),
    db.webhookEvent.count({ where }),
  ]);
  return { rows, page, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

/** Re-checks one payment with its provider; the provider's answer — never the admin — decides. */
export async function reconcilePaymentAsAdmin(paymentId: string) {
  const ctx = await requirePermission("payments.manage");
  const before = await db.payment.findUnique({ where: { id: paymentId }, select: { status: true, orderId: true } });
  if (!before) throw new AppError("NOT_FOUND", "That payment doesn't exist.");
  const outcome = await reconcilePayment(paymentId);
  if (!outcome) throw new AppError("PROVIDER_NOT_CONFIGURED", "This payment can't be checked: the provider isn't configured or the payment never reached it.");
  const after = await db.payment.findUniqueOrThrow({ where: { id: paymentId }, select: { status: true } });
  await audit({ actorUserId: ctx.user.id, action: "payment.reconcile", entityType: "payment", entityId: paymentId, before: { status: before.status }, after: { status: after.status, changed: outcome.changed } });
  return { changed: outcome.changed, status: after.status };
}

// ───────────────────────────── Categories ─────────────────────────────

export async function listCategoriesAdmin() {
  await requirePermission("products.read");
  return db.category.findMany({
    orderBy: [{ position: "asc" }, { name: "asc" }],
    include: { _count: { select: { products: { where: { product: { status: "published", deletedAt: null } } } } } },
  });
}

export const categoryInput = z.object({
  name: z.string().trim().min(2, { error: "Name the category." }).max(60),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .max(60)
    .optional()
    .transform((s) => s || undefined),
  description: z.string().trim().max(300).optional(),
  position: z.coerce.number().int().min(0).max(999).default(0),
  isActive: z.boolean().default(true),
});

export async function saveCategory(id: string | null, raw: z.input<typeof categoryInput>) {
  const ctx = await requirePermission("products.update");
  const d = categoryInput.parse(raw);
  const slug = slugify(d.slug ?? d.name);
  if (!slug) throw new AppError("VALIDATION_ERROR", "Please check the highlighted fields.", { fields: { slug: "Use letters or numbers." } });
  const clash = await db.category.findUnique({ where: { slug }, select: { id: true } });
  if (clash && clash.id !== id) throw new AppError("VALIDATION_ERROR", "That slug is already used.", { fields: { slug: "Already used by another category." } });
  const data = { name: d.name, slug, description: d.description || null, position: d.position, isActive: d.isActive };
  if (id) {
    const before = await db.category.findUnique({ where: { id } });
    if (!before) throw new AppError("NOT_FOUND", "That category doesn't exist.");
    await db.category.update({ where: { id }, data });
    await audit({ actorUserId: ctx.user.id, action: "category.update", entityType: "category", entityId: id, before: { name: before.name, slug: before.slug, isActive: before.isActive }, after: data });
    return id;
  }
  const created = await db.category.create({ data });
  await audit({ actorUserId: ctx.user.id, action: "category.create", entityType: "category", entityId: created.id, after: data });
  return created.id;
}

// ───────────────────────────── Audit log ─────────────────────────────

export async function listAuditLog(params: { q?: string; entity?: string; page?: number }) {
  await requirePermission("security.read");
  const where: Prisma.AuditLogWhereInput = {};
  if (params.q?.trim()) where.action = { startsWith: params.q.trim().toLowerCase() };
  if (params.entity?.trim()) where.entityType = params.entity.trim();
  const page = Math.max(1, params.page ?? 1);
  const [rows, total, entities] = await Promise.all([
    db.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * 40, take: 40, include: { actor: { select: { name: true, email: true } } } }),
    db.auditLog.count({ where }),
    db.auditLog.findMany({ distinct: ["entityType"], select: { entityType: true }, where: { entityType: { not: null } } }),
  ]);
  return { rows, page, totalPages: Math.max(1, Math.ceil(total / 40)), entities: entities.map((e) => e.entityType!).sort() };
}

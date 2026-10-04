import "server-only";
import type { RefundStatus } from "@/generated/prisma/enums";
import { db, type Tx } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { formatMoney, type Currency } from "@/lib/money";
import { audit } from "@/modules/admin/audit";
import { sendEmail } from "@/modules/notifications";
import { getSetting } from "@/modules/settings";
import { provider } from "./providers";
import { refundEligibility } from "./policy";
import { canTransitionPayment, isOrderPaid } from "./state";
import type { ProviderName } from "./types";

const OPEN_REFUND: RefundStatus[] = ["requested", "approved", "processing"];

/** Refundable balance: order total minus refunds already completed or in flight. */
async function refundableMinor(tx: Tx | typeof db, orderId: string, totalMinor: number): Promise<number> {
  const agg = await tx.refund.aggregate({ where: { orderId, status: { in: ["completed", "processing", "approved"] } }, _sum: { amountMinor: true } });
  return totalMinor - (agg._sum.amountMinor ?? 0);
}

export async function requestRefund(input: { userId: string; orderId: string; reason: string }) {
  const order = await db.order.findFirst({ where: { id: input.orderId, userId: input.userId }, include: { refunds: { select: { status: true } }, user: { select: { name: true, email: true } } } });
  if (!order) throw new AppError("ORDER_NOT_FOUND", "We couldn't find that order.");
  const verdict = refundEligibility({
    status: order.status,
    paidAt: order.paidAt,
    totalMinor: order.totalMinor,
    windowDays: await getSetting("refunds.windowDays"),
    hasOpenRefund: order.refunds.some((r) => OPEN_REFUND.includes(r.status)),
  });
  if (!verdict.ok) throw new AppError("INVALID_REQUEST", verdict.reason);
  const amountMinor = await refundableMinor(db, order.id, order.totalMinor);
  if (amountMinor <= 0) throw new AppError("INVALID_REQUEST", "This order has already been refunded.");
  const payment = await db.payment.findFirst({ where: { orderId: order.id, status: { in: ["succeeded", "partially_refunded"] } }, orderBy: { createdAt: "desc" } });
  const refund = await db.refund.create({
    data: { orderId: order.id, paymentId: payment?.id, requestedByUserId: input.userId, reason: input.reason, amountMinor, currency: order.currency },
  });
  if (order.user) {
    await sendEmail(order.user.email, "refund_update", {
      name: order.user.name,
      orderNumber: order.orderNumber,
      status: "requested",
      amount: formatMoney({ amountMinor, currency: order.currency as Currency }),
    });
  }
  return refund;
}

/** Admin decision (permission `orders.refund` is checked by the caller); audit-logged. */
export async function decideRefund(input: { refundId: string; adminUserId: string; approve: boolean; note?: string | null }) {
  const refund = await db.refund.findUnique({ where: { id: input.refundId }, include: { payment: true, order: true } });
  if (!refund) throw new AppError("NOT_FOUND", "Refund not found.");
  if (refund.status !== "requested") throw new AppError("INVALID_REQUEST", "This refund has already been decided.");
  if (!input.approve) {
    const updated = await db.refund.update({ where: { id: refund.id }, data: { status: "rejected", decidedByAdminId: input.adminUserId, decisionNote: input.note ?? null } });
    await audit({ actorUserId: input.adminUserId, action: "refund.reject", entityType: "refund", entityId: refund.id, before: { status: refund.status }, after: { status: "rejected", note: input.note } });
    await notifyRefund(refund.id);
    return updated;
  }
  await db.refund.update({ where: { id: refund.id }, data: { status: "approved", decidedByAdminId: input.adminUserId, decisionNote: input.note ?? null } });
  await audit({ actorUserId: input.adminUserId, action: "refund.approve", entityType: "refund", entityId: refund.id, before: { status: refund.status }, after: { status: "approved" } });
  return executeRefund(refund.id);
}

/** Calls the provider's refund API. Completion is confirmed by the response or the refund webhook. */
export async function executeRefund(refundId: string) {
  const refund = await db.refund.findUniqueOrThrow({ where: { id: refundId }, include: { payment: true } });
  const payment = refund.payment;
  if (!payment || !payment.providerPaymentRef) throw new AppError("INVALID_REQUEST", "This order has no captured payment to refund.");
  try {
    const result = await provider(payment.provider as ProviderName).refund({
      providerPaymentRef: payment.providerPaymentRef,
      amountMinor: refund.amountMinor,
      currency: refund.currency as Currency,
      refundId: refund.id,
    });
    await db.refund.update({ where: { id: refund.id }, data: { providerRefundRef: result.providerRefundRef, status: result.status === "failed" ? "failed" : "processing" } });
    if (result.status === "completed") await completeRefund(refund.id);
  } catch (error) {
    logger.error("refund_provider_failed", { refundId, error });
    await db.refund.update({ where: { id: refund.id }, data: { status: "failed" } });
    throw error instanceof AppError ? error : new AppError("SERVICE_UNAVAILABLE", "The payment provider couldn't process this refund. Try again shortly.");
  }
  return db.refund.findUniqueOrThrow({ where: { id: refund.id } });
}

/**
 * Completes a refund in one transaction: refund → completed, ledger row, payment and order
 * status, and (per setting) library access revoked on a full refund. Idempotent.
 */
export async function completeRefund(refundId: string): Promise<void> {
  const changed = await db.$transaction(async (tx) => {
    const { orderId } = await tx.refund.findUniqueOrThrow({ where: { id: refundId }, select: { orderId: true } });
    await tx.$queryRaw`SELECT id FROM "order" WHERE id = ${orderId}::uuid FOR UPDATE`;
    const refund = await tx.refund.findUniqueOrThrow({ where: { id: refundId }, include: { payment: true, order: true } });
    if (refund.status === "completed") return false;
    await tx.refund.update({ where: { id: refundId }, data: { status: "completed", completedAt: new Date() } });
    if (refund.payment) {
      await tx.paymentTransaction.createMany({
        data: [{ paymentId: refund.payment.id, provider: refund.payment.provider, type: "refund", providerTxnRef: refund.providerRefundRef ?? refund.id, amountMinor: refund.amountMinor, currency: refund.currency, status: "completed" }],
        skipDuplicates: true,
      });
    }
    const agg = await tx.refund.aggregate({ where: { orderId, status: "completed" }, _sum: { amountMinor: true } });
    const full = (agg._sum.amountMinor ?? 0) >= refund.order.totalMinor;
    if (refund.payment) {
      const next = full ? "refunded" : "partially_refunded";
      if (canTransitionPayment(refund.payment.status, next) || refund.payment.status === next) await tx.payment.update({ where: { id: refund.payment.id }, data: { status: next } });
    }
    if (isOrderPaid(refund.order.status)) await tx.order.update({ where: { id: orderId }, data: { status: full ? "refunded" : "partially_refunded" } });
    if (full && (await getSetting("refunds.revokeAccessOnRefund"))) {
      await tx.libraryItem.updateMany({ where: { orderItem: { orderId }, source: "purchase", revokedAt: null }, data: { revokedAt: new Date() } });
    }
    await audit({ actorUserId: null, actorType: "system", action: "refund.complete", entityType: "refund", entityId: refundId, after: { amountMinor: refund.amountMinor, full } }, tx);
    return true;
  });
  if (changed) await notifyRefund(refundId);
}

/**
 * Webhook entry point for provider refund events. Refunds started in the provider dashboard
 * (no local row yet) are recorded against the matching payment.
 */
export async function applyRefundEvent(input: {
  provider: ProviderName;
  providerRefundRef: string;
  providerPaymentRef: string | null;
  internalRefundId: string | null;
  amountMinor: number;
  status: "processing" | "completed" | "failed";
}): Promise<"handled" | "ignored"> {
  let refund =
    (await db.refund.findUnique({ where: { providerRefundRef: input.providerRefundRef } })) ??
    (input.internalRefundId ? await db.refund.findUnique({ where: { id: input.internalRefundId } }).catch(() => null) : null);
  if (!refund) {
    if (!input.providerPaymentRef) return "ignored";
    const payment = await db.payment.findFirst({ where: { provider: input.provider, OR: [{ providerPaymentRef: input.providerPaymentRef }, { providerOrderRef: input.providerPaymentRef }] } });
    if (!payment) return "ignored";
    refund = await db.refund.create({
      data: { orderId: payment.orderId, paymentId: payment.id, reason: "Issued from the payment provider dashboard", amountMinor: input.amountMinor, currency: payment.currency, providerRefundRef: input.providerRefundRef, status: "processing" },
    });
  } else if (!refund.providerRefundRef) {
    refund = await db.refund.update({ where: { id: refund.id }, data: { providerRefundRef: input.providerRefundRef } });
  }
  if (input.status === "completed") await completeRefund(refund.id);
  else if (input.status === "failed" && refund.status !== "completed") await db.refund.update({ where: { id: refund.id }, data: { status: "failed" } });
  return "handled";
}

async function notifyRefund(refundId: string): Promise<void> {
  const refund = await db.refund.findUnique({ where: { id: refundId }, include: { order: { include: { user: { select: { name: true, email: true } } } } } });
  const email = refund?.order.user?.email ?? refund?.order.guestEmail;
  if (!refund || !email) return;
  await sendEmail(email, "refund_update", {
    name: refund.order.user?.name ?? refund.order.billingName ?? "there",
    orderNumber: refund.order.orderNumber,
    status: refund.status,
    amount: formatMoney({ amountMinor: refund.amountMinor, currency: refund.currency as Currency }),
  });
}

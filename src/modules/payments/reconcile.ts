import "server-only";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { applyProviderState, type ApplyOutcome } from "./fulfilment";
import { provider } from "./providers";
import type { ProviderName } from "./types";

const OPEN = ["created", "processing", "requires_action", "pending_verification"] as const;
/** Unpaid orders are cancelled after this long so they stop showing as "awaiting payment". */
const ABANDON_AFTER_MS = 24 * 3_600_000;

/** Re-checks one payment with its provider (status polling, admin "reconcile" action). */
export async function reconcilePayment(paymentId: string): Promise<ApplyOutcome | null> {
  const payment = await db.payment.findUnique({ where: { id: paymentId } });
  if (!payment?.providerOrderRef) return null;
  const adapter = provider(payment.provider as ProviderName);
  if (!adapter.configured()) return null;
  const state = await adapter.fetchState({ providerOrderRef: payment.providerOrderRef, providerPaymentRef: payment.providerPaymentRef });
  return applyProviderState(payment.id, state, "reconcile");
}

/**
 * Scheduled sweep (Vercel Cron → /api/v1/internal/payments/reconcile, DEC-008): settles payments
 * whose webhook never arrived, then cancels orders left unpaid for a day.
 */
export async function reconcileOpenPayments(options: { olderThanMs?: number; limit?: number } = {}) {
  const cutoff = new Date(Date.now() - (options.olderThanMs ?? 2 * 60_000));
  const floor = new Date(Date.now() - 7 * 86_400_000);
  const open = await db.payment.findMany({
    where: { status: { in: [...OPEN] }, providerOrderRef: { not: null }, updatedAt: { lt: cutoff }, createdAt: { gt: floor } },
    orderBy: { updatedAt: "asc" },
    take: options.limit ?? 50,
    select: { id: true },
  });
  let settled = 0;
  let errors = 0;
  for (const p of open) {
    try {
      const outcome = await reconcilePayment(p.id);
      if (outcome?.changed) settled++;
    } catch (error) {
      errors++;
      logger.warn("reconcile_payment_failed", { paymentId: p.id, error });
    }
  }

  const stale = await db.order.findMany({
    where: { status: { in: ["pending_payment", "failed"] }, placedAt: { lt: new Date(Date.now() - ABANDON_AFTER_MS) }, payments: { none: { status: { in: ["processing", "requires_action", "pending_verification", "succeeded"] } } } },
    select: { id: true },
    take: 200,
  });
  if (stale.length) {
    await db.order.updateMany({ where: { id: { in: stale.map((o) => o.id) } }, data: { status: "cancelled", cancelledAt: new Date() } });
    await db.payment.updateMany({ where: { orderId: { in: stale.map((o) => o.id) }, status: "created" }, data: { status: "cancelled" } });
  }
  return { checked: open.length, settled, errors, abandoned: stale.length };
}

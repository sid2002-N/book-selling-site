import "server-only";
import type { OrderStatus, PaymentStatus } from "@/generated/prisma/enums";
import { hmacSha256Hex, serverSecret } from "@/lib/crypto";
import { db, type Tx } from "@/lib/db";
import { logger } from "@/lib/logger";
import { formatMoney, type Currency } from "@/lib/money";
import { grantLibraryItem } from "@/modules/entitlements";
import { sendEmail } from "@/modules/notifications";
import { getSetting } from "@/modules/settings";
import { amountMatches, canTransitionPayment, isOrderPaid, orderStatusAfter, targetPaymentStatus } from "./state";
import type { ProviderState } from "./types";

export type StateSource = "client_verify" | "webhook" | "reconcile";

export type ApplyOutcome = {
  orderId: string;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  changed: boolean;
  fulfilled: boolean;
};

/** Deterministic guest access token for an order — only its hash is stored (`guest_access_hash`). */
export function guestOrderToken(orderId: string): string {
  return hmacSha256Hex(serverSecret("AUTH_SECRET"), `guest-order:${orderId}`);
}

export function orderUrl(order: { id: string; userId: string | null }): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return order.userId ? `${base}/account/orders/${order.id}` : `${base}/checkout/status?order=${order.id}&token=${guestOrderToken(order.id)}`;
}

/** Row locks: order first, then payment, so concurrent webhook + verify calls serialise. */
async function lockRows(tx: Tx, orderId: string, paymentId?: string) {
  await tx.$queryRaw`SELECT id FROM "order" WHERE id = ${orderId}::uuid FOR UPDATE`;
  if (paymentId) await tx.$queryRaw`SELECT id FROM "payment" WHERE id = ${paymentId}::uuid FOR UPDATE`;
}

/** Grants every purchased product (and a bundle's contents) to the buyer's library. */
export async function grantOrderItems(tx: Tx, orderId: string, userId: string): Promise<void> {
  const items = await tx.orderItem.findMany({
    where: { orderId },
    select: { id: true, productId: true, typeSnapshot: true, product: { select: { bundleItems: { select: { productId: true } } } } },
  });
  for (const item of items) {
    await grantLibraryItem(tx, { userId, productId: item.productId, source: "purchase", orderItemId: item.id });
    if (item.typeSnapshot === "bundle") {
      for (const child of item.product.bundleItems) {
        await grantLibraryItem(tx, { userId, productId: child.productId, source: "purchase", orderItemId: item.id });
      }
    }
  }
}

/**
 * Marks an order paid and delivers it — all inside the caller's transaction (ARCHITECTURE §9):
 * order → paid, coupon redemption, library items (signed-in buyers; guests claim later), invoice.
 */
export async function fulfilOrderInTx(tx: Tx, orderId: string): Promise<void> {
  const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true, user: { select: { name: true, email: true } } } });
  if (isOrderPaid(order.status)) return;
  await tx.order.update({ where: { id: orderId }, data: { status: "paid", paidAt: new Date(), cancelledAt: null } });
  if (order.couponId) {
    await tx.couponRedemption.createMany({
      data: [{ couponId: order.couponId, orderId, userId: order.userId, guestEmail: order.userId ? null : order.guestEmail, amountMinor: order.discountMinor }],
      skipDuplicates: true,
    });
  }
  if (order.userId) await grantOrderItems(tx, orderId, order.userId);

  const [legalName, taxId, address, storeName] = await Promise.all([
    getSetting("store.legalName"),
    getSetting("store.taxId"),
    getSetting("store.address"),
    getSetting("store.name"),
  ]);
  await tx.invoice.createMany({
    data: [
      {
        orderId,
        legalSnapshot: {
          seller: { name: legalName || storeName, taxId: taxId || null, address: address || null },
          buyer: { name: order.billingName, email: order.user?.email ?? order.guestEmail, country: order.billingCountry, address: order.billingAddress ?? null },
          currency: order.currency,
          taxInclusive: true,
          lines: order.items.map((i) => ({
            title: i.titleSnapshot,
            type: i.typeSnapshot,
            unitPriceMinor: i.unitPriceMinor,
            discountMinor: i.discountMinor,
            taxMinor: i.taxMinor,
            totalMinor: i.unitPriceMinor - i.discountMinor,
          })),
          subtotalMinor: order.subtotalMinor,
          discountMinor: order.discountMinor,
          taxMinor: order.taxMinor,
          totalMinor: order.totalMinor,
          coupon: order.couponCodeSnapshot,
        },
      },
    ],
    skipDuplicates: true,
  });
}

/** Side effects that must not run inside the transaction: emails and cart cleanup. */
export async function afterFulfilment(orderId: string): Promise<void> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: { select: { productId: true, titleSnapshot: true } }, user: { select: { name: true, email: true } }, payments: { select: { metadata: true } } },
  });
  if (!order) return;
  const productIds = order.items.map((i) => i.productId);
  const cartIds = order.payments.map((p) => (p.metadata as { cartId?: string } | null)?.cartId).filter((id): id is string => Boolean(id));
  try {
    await db.cartItem.deleteMany({
      where: { productId: { in: productIds }, cart: { OR: [...(order.userId ? [{ userId: order.userId }] : []), ...(cartIds.length ? [{ id: { in: cartIds } }] : [])] } },
    });
  } catch (error) {
    logger.warn("cart_cleanup_failed", { orderId, error });
  }
  const email = order.user?.email ?? order.guestEmail;
  if (!email) return;
  const total = formatMoney({ amountMinor: order.totalMinor, currency: order.currency as Currency });
  await sendEmail(email, "order_confirmation", {
    name: order.user?.name ?? order.billingName ?? "there",
    orderNumber: order.orderNumber,
    total,
    items: order.items.map((i) => i.titleSnapshot),
    url: orderUrl(order),
  });
  if (!order.userId) await sendEmail(email, "guest_library_access", { orderNumber: order.orderNumber, url: orderUrl(order) });
}

/**
 * Applies a provider-reported state to a payment, idempotently and under row locks. Used by
 * client verification, webhooks and reconciliation alike, so whichever arrives first wins and
 * the rest are no-ops. Never called with client-supplied status.
 */
export async function applyProviderState(paymentId: string, state: ProviderState, source: StateSource): Promise<ApplyOutcome> {
  const target = targetPaymentStatus(state.status);
  const { orderId } = await db.payment.findUniqueOrThrow({ where: { id: paymentId }, select: { orderId: true } });

  const result = await db.$transaction(async (tx) => {
    await lockRows(tx, orderId, paymentId);
    const payment = await tx.payment.findUniqueOrThrow({ where: { id: paymentId }, include: { order: { select: { status: true, totalMinor: true, currency: true, userId: true } } } });
    const unchanged = { orderId, paymentStatus: payment.status, orderStatus: payment.order.status, changed: false, fulfilled: false, notify: null as null | "failed" | "pending" };

    if (!target || target === payment.status || !canTransitionPayment(payment.status, target)) {
      if (target && target !== payment.status) logger.info("payment_transition_ignored", { paymentId, from: payment.status, to: target, source });
      return unchanged;
    }

    if (target === "succeeded") {
      const expected = { amountMinor: payment.amountMinor, currency: payment.currency as Currency };
      if (!amountMatches(expected, state) || payment.amountMinor !== payment.order.totalMinor || payment.currency !== payment.order.currency) {
        await tx.payment.update({
          where: { id: paymentId },
          data: { status: "pending_verification", providerPaymentRef: state.providerPaymentRef, failureCode: "AMOUNT_MISMATCH", failureMessage: `Provider reported ${state.amountMinor} ${state.currency}` },
        });
        const next = orderStatusAfter(payment.order.status, "pending_verification");
        if (next) await tx.order.update({ where: { id: orderId }, data: { status: next } });
        await tx.securityEvent.create({ data: { type: "payment_amount_mismatch", severity: "critical", userId: payment.order.userId, meta: { paymentId, source, expected, reported: { amountMinor: state.amountMinor, currency: state.currency } } } });
        return { ...unchanged, paymentStatus: "pending_verification" as const, orderStatus: next ?? payment.order.status, changed: true, notify: "pending" as const };
      }

      const duplicate = isOrderPaid(payment.order.status);
      await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: "succeeded",
          verifiedAt: new Date(),
          providerPaymentRef: state.providerPaymentRef ?? payment.providerPaymentRef,
          method: state.method,
          failureCode: duplicate ? "DUPLICATE_PAYMENT" : null,
          failureMessage: duplicate ? "Order was already paid by another attempt — refund required." : null,
        },
      });
      await tx.paymentTransaction.createMany({
        data: [{ paymentId, provider: payment.provider, type: "charge", providerTxnRef: state.providerPaymentRef ?? payment.providerOrderRef ?? paymentId, amountMinor: state.amountMinor!, currency: payment.currency, status: "succeeded" }],
        skipDuplicates: true,
      });
      if (duplicate) {
        await tx.securityEvent.create({ data: { type: "payment_duplicate", severity: "warning", userId: payment.order.userId, meta: { paymentId, orderId } } });
        return { ...unchanged, paymentStatus: "succeeded" as const, changed: true };
      }
      await fulfilOrderInTx(tx, orderId);
      return { ...unchanged, paymentStatus: "succeeded" as const, orderStatus: "paid" as const, changed: true, fulfilled: true };
    }

    await tx.payment.update({
      where: { id: paymentId },
      data: {
        status: target,
        providerPaymentRef: state.providerPaymentRef ?? payment.providerPaymentRef,
        method: state.method ?? payment.method,
        ...(target === "failed" ? { failureCode: state.failureCode, failureMessage: state.failureMessage } : {}),
      },
    });
    const next = orderStatusAfter(payment.order.status, target);
    if (next) await tx.order.update({ where: { id: orderId }, data: { status: next } });
    return {
      ...unchanged,
      paymentStatus: target,
      orderStatus: next ?? payment.order.status,
      changed: true,
      notify: target === "failed" && source !== "client_verify" ? ("failed" as const) : null,
    };
  });

  if (result.fulfilled) await afterFulfilment(orderId);
  else if (result.notify) await notifyPaymentProblem(orderId, result.notify);
  const { notify: _notify, ...outcome } = result;
  return outcome;
}

/** A payment we believe happened but couldn't confirm yet (provider unreachable): held for reconciliation. */
export async function holdForVerification(paymentId: string, providerPaymentRef: string | null): Promise<void> {
  await db.$transaction(async (tx) => {
    const { orderId } = await tx.payment.findUniqueOrThrow({ where: { id: paymentId }, select: { orderId: true } });
    await lockRows(tx, orderId, paymentId);
    const payment = await tx.payment.findUniqueOrThrow({ where: { id: paymentId }, include: { order: { select: { status: true } } } });
    if (!canTransitionPayment(payment.status, "pending_verification")) return;
    await tx.payment.update({ where: { id: paymentId }, data: { status: "pending_verification", providerPaymentRef: providerPaymentRef ?? payment.providerPaymentRef } });
    const next = orderStatusAfter(payment.order.status, "pending_verification");
    if (next) await tx.order.update({ where: { id: orderId }, data: { status: next } });
  });
}

async function notifyPaymentProblem(orderId: string, kind: "failed" | "pending"): Promise<void> {
  const order = await db.order.findUnique({ where: { id: orderId }, include: { user: { select: { name: true, email: true } } } });
  const email = order?.user?.email ?? order?.guestEmail;
  if (!order || !email) return;
  const data = { name: order.user?.name ?? order.billingName ?? "there", orderNumber: order.orderNumber, url: orderUrl(order) };
  await sendEmail(email, kind === "failed" ? "payment_failed" : "payment_pending", data);
}

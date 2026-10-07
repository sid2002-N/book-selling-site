import "server-only";
import { z } from "zod";
import { safeEqual, sha256 } from "@/lib/crypto";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import type { Currency } from "@/lib/money";
import { enforceRateLimit } from "@/lib/rate-limit";
import { requestContext } from "@/lib/request";
import { emailSchema, getCurrentUser } from "@/modules/auth";
import { cartView, clearPurchasedItems } from "@/modules/cart";
import {
  afterFulfilment,
  applyProviderState,
  assertProviderUsable,
  CANCELLABLE_ORDER_STATES,
  fulfilOrderInTx,
  grantOrderItems,
  guestOrderToken,
  holdForVerification,
  isOrderPaid,
  provider,
  reconcilePayment,
  RETRYABLE_ORDER_STATES,
  verifyRazorpayCheckoutSignature,
  type ClientParams,
  type ProviderName,
} from "@/modules/payments";
import { quote } from "@/modules/pricing";
import { getSetting } from "@/modules/settings";
import { ORDER_STATUS_LABEL, paymentScreen, type ScreenModel } from "./status-view";

export const providerSchema = z.enum(["razorpay", "stripe"]);

export const checkoutInput = z.object({
  idempotencyKey: z.string().min(16).max(100),
  email: emailSchema.optional(),
  name: z.string().trim().min(2, { error: "Enter your full name." }).max(120),
  country: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{2}$/, { error: "Choose your country." })
    .transform((c) => c.toUpperCase()),
  provider: providerSchema.optional(),
  acceptTerms: z.literal(true, { error: "Please accept the terms to continue." }),
});
export type CheckoutInput = z.infer<typeof checkoutInput>;

export const orderRefInput = z.object({ orderId: z.uuid(), token: z.string().max(200).optional() });

export type CheckoutResult = {
  orderId: string;
  orderNumber: string;
  status: string;
  accessToken: string | null;
  client: ClientParams | null;
};

/** Whoever placed the order — the signed-in owner, or a guest holding the order's access token. */
export async function orderForViewer(orderId: string, token: string | undefined | null) {
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) throw new AppError("ORDER_NOT_FOUND", "We couldn't find that order.");
  const user = await getCurrentUser();
  if (user && order.userId === user.id) return order;
  if (token && order.guestAccessHash && safeEqual(sha256(token), order.guestAccessHash))
    return order;
  throw new AppError("ORDER_NOT_FOUND", "We couldn't find that order.");
}

/** Creates the provider order for a local payment row and stores the reference. */
async function startProviderPayment(
  paymentId: string,
  contact: { email: string; name: string | null },
): Promise<ClientParams> {
  const payment = await db.payment.findUniqueOrThrow({
    where: { id: paymentId },
    include: { order: { select: { orderNumber: true } } },
  });
  try {
    const { providerOrderRef, client } = await provider(
      payment.provider as ProviderName,
    ).createProviderOrder({
      paymentId: payment.id,
      orderNumber: payment.order.orderNumber,
      amountMinor: payment.amountMinor,
      currency: payment.currency as Currency,
      email: contact.email,
      name: contact.name,
      idempotencyKey: payment.idempotencyKey,
    });
    if (payment.providerOrderRef !== providerOrderRef)
      await db.payment.update({ where: { id: payment.id }, data: { providerOrderRef } });
    return client;
  } catch (error) {
    logger.error("provider_order_failed", { paymentId, provider: payment.provider, error });
    throw error instanceof AppError
      ? error
      : new AppError(
          "SERVICE_UNAVAILABLE",
          "We couldn't start the payment. Your card hasn't been charged — please try again.",
        );
  }
}

/**
 * Places an order from the visitor's cart (Flow 7). Prices are recomputed server-side; the
 * order, its item snapshots and the first payment attempt are created in one transaction and
 * keyed by the client's Idempotency-Key, so retries never create a second order.
 */
export async function placeOrder(input: CheckoutInput): Promise<CheckoutResult> {
  const user = await getCurrentUser();
  const ctx = await requestContext();
  await enforceRateLimit("orderCreate", user?.id ?? ctx.ip ?? "anonymous");
  if (!user && !(await getSetting("checkout.guestEnabled")))
    throw new AppError("AUTH_REQUIRED", "Please sign in to check out.");
  const email = user?.email ?? input.email;
  if (!email)
    throw new AppError("VALIDATION_ERROR", "Enter your email address.", {
      fields: { email: "Enter your email address." },
    });

  const existing = await db.order.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
    include: { payments: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  if (existing) {
    const sameBuyer = user
      ? existing.userId === user.id
      : !existing.userId && existing.guestEmail?.toLowerCase() === email.toLowerCase();
    if (!sameBuyer)
      throw new AppError(
        "IDEMPOTENCY_CONFLICT",
        "This checkout was already used. Please refresh and try again.",
      );
    const open = existing.payments[0];
    const client =
      open && open.status === "created"
        ? await startProviderPayment(open.id, { email, name: existing.billingName })
        : null;
    return {
      orderId: existing.id,
      orderNumber: existing.orderNumber,
      status: existing.status,
      accessToken: user ? null : guestOrderToken(existing.id),
      client,
    };
  }

  const cart = await cartView();
  if (!cart.cartId || cart.items.length === 0)
    throw new AppError("INVALID_REQUEST", "Your cart is empty.");
  const productIds = cart.items.map((i) => i.id);
  const q = await quote({
    productIds,
    currency: cart.currency,
    couponCode: cart.couponCode,
    customer: { userId: user?.id, email },
    billingCountry: input.country,
  });
  if (q.couponError)
    throw new AppError(q.couponError.code, q.couponError.message, {
      fields: { code: q.couponError.message },
    });
  if (q.lines.length !== productIds.length)
    throw new AppError(
      "PRODUCT_UNAVAILABLE",
      "Some items in your cart changed. Please review your cart.",
    );

  const free = q.totalMinor === 0;
  if (!free && !input.provider)
    throw new AppError("VALIDATION_ERROR", "Choose a payment method.", {
      fields: { provider: "Choose a payment method." },
    });
  if (!free) await assertProviderUsable(input.provider!, cart.currency);

  const versions = await db.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, currentVersionId: true },
  });
  const versionOf = new Map(versions.map((v) => [v.id, v.currentVersionId]));

  const created = await db.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        userId: user?.id ?? null,
        guestEmail: user ? null : email,
        currency: cart.currency,
        subtotalMinor: q.subtotalMinor,
        discountMinor: q.discountMinor,
        taxMinor: q.taxMinor,
        totalMinor: q.totalMinor,
        billingName: input.name,
        billingCountry: input.country,
        couponId: q.coupon?.id ?? null,
        couponCodeSnapshot: q.coupon?.code ?? null,
        idempotencyKey: input.idempotencyKey,
        ip: ctx.ip,
        items: {
          create: q.lines.map((l) => ({
            productId: l.productId,
            productVersionId: versionOf.get(l.productId) ?? null,
            titleSnapshot: l.title,
            typeSnapshot: l.type as "book",
            unitPriceMinor: l.unitMinor,
            compareAtMinor: l.compareAtMinor,
            discountMinor: l.discountMinor,
            taxMinor: l.taxMinor,
          })),
        },
      },
    });
    if (!user)
      await tx.order.update({
        where: { id: order.id },
        data: { guestAccessHash: sha256(guestOrderToken(order.id)) },
      });
    if (free) {
      await fulfilOrderInTx(tx, order.id);
      return { order, paymentId: null };
    }
    const payment = await tx.payment.create({
      data: {
        orderId: order.id,
        provider: input.provider!,
        amountMinor: q.totalMinor,
        currency: cart.currency,
        idempotencyKey: `${input.idempotencyKey}:1`,
        metadata: { cartId: cart.cartId },
      },
    });
    return { order, paymentId: payment.id };
  });

  const accessToken = user ? null : guestOrderToken(created.order.id);
  if (!created.paymentId) {
    await clearPurchasedItems(cart.cartId, productIds);
    await afterFulfilment(created.order.id);
    return {
      orderId: created.order.id,
      orderNumber: created.order.orderNumber,
      status: "paid",
      accessToken,
      client: null,
    };
  }
  const client = await startProviderPayment(created.paymentId, { email, name: input.name });
  return {
    orderId: created.order.id,
    orderNumber: created.order.orderNumber,
    status: created.order.status,
    accessToken,
    client,
  };
}

/** New payment attempt on the same order at the same locked price (Retry Payment screen). */
export async function retryPayment(input: {
  orderId: string;
  token?: string;
  provider: ProviderName;
}): Promise<CheckoutResult> {
  const order = await orderForViewer(input.orderId, input.token);
  if (!RETRYABLE_ORDER_STATES.includes(order.status))
    throw new AppError("INVALID_REQUEST", "This order can't be paid again.");
  await assertProviderUsable(input.provider, order.currency as Currency);
  const attempts = await db.payment.count({ where: { orderId: order.id } });
  const payment = await db.$transaction(async (tx) => {
    if (order.status === "failed")
      await tx.order.update({ where: { id: order.id }, data: { status: "pending_payment" } });
    await tx.payment.updateMany({
      where: { orderId: order.id, status: "created" },
      data: { status: "cancelled" },
    });
    const previous = await tx.payment.findFirst({
      where: { orderId: order.id },
      orderBy: { createdAt: "desc" },
      select: { metadata: true },
    });
    return tx.payment.create({
      data: {
        orderId: order.id,
        provider: input.provider,
        amountMinor: order.totalMinor,
        currency: order.currency,
        idempotencyKey: `${order.idempotencyKey}:${attempts + 1}`,
        metadata: previous?.metadata ?? undefined,
      },
    });
  });
  const email =
    order.guestEmail ??
    (await db.user.findUnique({ where: { id: order.userId! }, select: { email: true } }))!.email;
  const client = await startProviderPayment(payment.id, { email, name: order.billingName });
  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    status: "pending_payment",
    accessToken: input.token ?? null,
    client,
  };
}

export async function cancelOrder(input: { orderId: string; token?: string }): Promise<void> {
  const order = await orderForViewer(input.orderId, input.token);
  if (!CANCELLABLE_ORDER_STATES.includes(order.status))
    throw new AppError("INVALID_REQUEST", "This order can't be cancelled.");
  const inFlight = await db.payment.count({
    where: {
      orderId: order.id,
      status: { in: ["processing", "requires_action", "pending_verification", "succeeded"] },
    },
  });
  if (inFlight)
    throw new AppError(
      "PAYMENT_PENDING_VERIFICATION",
      "A payment for this order is still being confirmed, so it can't be cancelled yet.",
    );
  await db.$transaction([
    db.order.update({
      where: { id: order.id },
      data: { status: "cancelled", cancelledAt: new Date() },
    }),
    db.payment.updateMany({
      where: { orderId: order.id, status: "created" },
      data: { status: "cancelled" },
    }),
  ]);
}

export type OrderStatusView = ScreenModel & {
  orderId: string;
  orderNumber: string;
  orderStatus: string;
  orderStatusLabel: string;
  provider: ProviderName | null;
  currency: Currency;
  totalMinor: number;
  placedAt: string;
  isGuest: boolean;
  items: { productId: string; title: string; type: string; amountMinor: number }[];
};

const REFRESH_AFTER_MS = 5_000;

/**
 * Status for the status page / polling endpoint. While a payment is unsettled the provider is
 * asked directly (throttled), so the page resolves even if a webhook is late.
 */
export async function orderStatus(input: {
  orderId: string;
  token?: string | null;
  refresh?: boolean;
}): Promise<OrderStatusView> {
  let order = await orderForViewer(input.orderId, input.token);
  const latest = await db.payment.findFirst({
    where: { orderId: order.id },
    orderBy: { createdAt: "desc" },
  });
  if (
    input.refresh &&
    latest?.providerOrderRef &&
    ["created", "processing", "requires_action", "pending_verification"].includes(latest.status) &&
    Date.now() - latest.updatedAt.getTime() > REFRESH_AFTER_MS
  ) {
    try {
      await db.payment.update({ where: { id: latest.id }, data: { updatedAt: new Date() } });
      await reconcilePayment(latest.id);
      order = await db.order.findUniqueOrThrow({ where: { id: order.id } });
    } catch (error) {
      logger.warn("status_refresh_failed", { orderId: order.id, error });
    }
  }
  const [payment, items] = await Promise.all([
    db.payment.findFirst({ where: { orderId: order.id }, orderBy: { createdAt: "desc" } }),
    db.orderItem.findMany({ where: { orderId: order.id }, orderBy: { id: "asc" } }),
  ]);
  return {
    ...paymentScreen(order.status, payment?.status ?? null),
    orderId: order.id,
    orderNumber: order.orderNumber,
    orderStatus: order.status,
    orderStatusLabel: ORDER_STATUS_LABEL[order.status],
    provider: (payment?.provider as ProviderName | undefined) ?? null,
    currency: order.currency as Currency,
    totalMinor: order.totalMinor,
    placedAt: order.placedAt.toISOString(),
    isGuest: !order.userId,
    items: items.map((i) => ({
      productId: i.productId,
      title: i.titleSnapshot,
      type: i.typeSnapshot,
      amountMinor: i.unitPriceMinor - i.discountMinor,
    })),
  };
}

export const razorpayVerifyInput = orderRefInput.extend({
  razorpayOrderId: z.string().min(1).max(100),
  razorpayPaymentId: z.string().min(1).max(100),
  razorpaySignature: z.string().min(1).max(200),
});

/**
 * Razorpay handler callback: verifies the HMAC signature AND asks Razorpay for the payment's
 * real status before anything is marked paid (SECURITY §6). The browser's word is never enough.
 */
export async function verifyRazorpayPayment(
  input: z.infer<typeof razorpayVerifyInput>,
): Promise<OrderStatusView> {
  const order = await orderForViewer(input.orderId, input.token);
  const payment = await db.payment.findFirst({
    where: { orderId: order.id, provider: "razorpay", providerOrderRef: input.razorpayOrderId },
  });
  if (!payment)
    throw new AppError(
      "PAYMENT_VERIFICATION_FAILED",
      "We couldn't match this payment to your order.",
    );
  const valid = verifyRazorpayCheckoutSignature({
    orderId: input.razorpayOrderId,
    paymentId: input.razorpayPaymentId,
    signature: input.razorpaySignature,
  });
  if (!valid) {
    const ctx = await requestContext();
    await db.securityEvent.create({
      data: {
        type: "payment_signature_invalid",
        severity: "warning",
        userId: order.userId,
        ip: ctx.ip,
        meta: { paymentId: payment.id },
      },
    });
    throw new AppError(
      "PAYMENT_VERIFICATION_FAILED",
      "We couldn't verify this payment. If money was deducted, it will be confirmed or refunded automatically.",
    );
  }
  try {
    const state = await provider("razorpay").fetchState({
      providerOrderRef: input.razorpayOrderId,
      providerPaymentRef: input.razorpayPaymentId,
    });
    await applyProviderState(payment.id, state, "client_verify");
  } catch (error) {
    // Signature was valid but Razorpay couldn't be reached: hold for verification, reconcile later.
    logger.warn("razorpay_verify_fetch_failed", { paymentId: payment.id, error });
    await holdForVerification(payment.id, input.razorpayPaymentId);
  }
  return orderStatus({ orderId: order.id, token: input.token });
}

export const stripeConfirmInput = orderRefInput.extend({
  paymentIntentId: z.string().regex(/^pi_[A-Za-z0-9_]+$/),
});

/** After Stripe's redirect or confirmPayment: retrieve the PaymentIntent server-side. */
export async function confirmStripePayment(
  input: z.infer<typeof stripeConfirmInput>,
): Promise<OrderStatusView> {
  const order = await orderForViewer(input.orderId, input.token);
  const payment = await db.payment.findFirst({
    where: { orderId: order.id, provider: "stripe", providerOrderRef: input.paymentIntentId },
  });
  if (!payment)
    throw new AppError(
      "PAYMENT_VERIFICATION_FAILED",
      "We couldn't match this payment to your order.",
    );
  const state = await provider("stripe").fetchState({
    providerOrderRef: input.paymentIntentId,
    providerPaymentRef: null,
  });
  await applyProviderState(payment.id, state, "client_verify");
  return orderStatus({ orderId: order.id, token: input.token });
}

/** Guest checkout → account: paid guest orders for a verified email join the user's library. */
export async function claimGuestOrdersForUser(userId: string): Promise<number> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, emailVerifiedAt: true },
  });
  if (!user?.emailVerifiedAt) return 0;
  const orders = await db.order.findMany({
    where: { userId: null, guestEmail: user.email },
    select: { id: true, status: true },
  });
  if (!orders.length) return 0;
  try {
    await db.$transaction(async (tx) => {
      for (const order of orders) {
        await tx.order.update({
          where: { id: order.id },
          data: { userId: user.id, guestEmail: null, guestAccessHash: null },
        });
        if (order.status === "paid") await grantOrderItems(tx, order.id, user.id);
      }
      await tx.couponRedemption.updateMany({
        where: { orderId: { in: orders.map((o) => o.id) } },
        data: { userId: user.id },
      });
    });
  } catch (error) {
    logger.error("guest_order_claim_failed", { userId, error });
    return 0;
  }
  return orders.filter((o) => isOrderPaid(o.status)).length;
}

import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { register } from "@/modules/auth";
import { addToCart, applyCoupon, cartView, mergeGuestCart } from "@/modules/cart";
import { cancelOrder, claimGuestOrdersForUser, orderStatus, placeOrder, retryPayment, verifyRazorpayPayment } from "@/modules/checkout";
import { completeRefund, receiveWebhook, requestRefund, executeRefund, setProviderForTests, type PaymentProviderAdapter, type ProviderState } from "@/modules/payments";
import { razorpay } from "@/modules/payments/razorpay";
import { cookieJar } from "../helpers/cookie-jar";

const KEY_SECRET = "rzp_test_key_secret";
const WEBHOOK_SECRET = "rzp_test_webhook_secret";
const ctx = { ip: "203.0.113.9", userAgent: "vitest", requestId: "t" };

/** Fake Razorpay I/O; signature checks stay real (they use the env secrets above). */
let providerState: ProviderState;
const fakeRazorpay: PaymentProviderAdapter = {
  ...razorpay,
  configured: () => true,
  async createProviderOrder(input) {
    const ref = `order_${input.idempotencyKey.replace(/[^a-z0-9]/gi, "").slice(-12)}`;
    return { providerOrderRef: ref, client: { provider: "razorpay", keyId: "rzp_test_key", providerOrderRef: ref, amountMinor: input.amountMinor, currency: input.currency, orderNumber: input.orderNumber, prefill: { name: input.name, email: input.email } } };
  },
  fetchState: async () => providerState,
  refund: async ({ refundId }) => ({ providerRefundRef: `rfnd_${refundId.slice(0, 8)}`, status: "completed" }),
};

const sign = (body: string) => createHmac("sha256", WEBHOOK_SECRET).update(body).digest("hex");
const checkoutSig = (orderId: string, paymentId: string) => createHmac("sha256", KEY_SECRET).update(`${orderId}|${paymentId}`).digest("hex");

async function product(slug: string, inr = 79900) {
  return db.product.create({
    data: { slug, title: slug.replace(/-/g, " "), type: "book", status: "published", publishedAt: new Date(Date.now() - 86_400_000), prices: { create: [{ currency: "INR", amountMinor: inr }, { currency: "USD", amountMinor: 999 }] } },
  });
}

function captured(entity: { order_id: string; amount: number; id?: string; status?: string }) {
  return { id: entity.id ?? "pay_live_1", order_id: entity.order_id, status: entity.status ?? "captured", amount: entity.amount, currency: "INR", method: "upi" };
}

function webhook(event: string, entity: ReturnType<typeof captured>, eventId: string) {
  const body = JSON.stringify({ event, payload: { payment: { entity: { ...entity, email: "buyer@example.com", contact: "+910000000000" } } }, created_at: 1 });
  return receiveWebhook("razorpay", body, new Headers({ "x-razorpay-signature": sign(body), "x-razorpay-event-id": eventId }));
}

const input = (over: Record<string, unknown> = {}) => ({ idempotencyKey: `idem-${Math.random().toString(36).slice(2)}-key`, email: "guest@example.com", name: "Guest Reader", country: "IN", provider: "razorpay" as const, acceptTerms: true as const, ...over });

async function signIn(email = "reader@example.com") {
  const { userId } = await register({ name: "Mira Reader", email, password: "readmore42" }, ctx);
  await db.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date() } });
  return userId;
}

beforeEach(() => {
  process.env.RAZORPAY_KEY_SECRET = KEY_SECRET;
  process.env.RAZORPAY_WEBHOOK_SECRET = WEBHOOK_SECRET;
  cookieJar.set("krm_currency", "INR");
  setProviderForTests("razorpay", fakeRazorpay);
  providerState = { status: "pending", providerPaymentRef: null, amountMinor: null, currency: null, method: null, failureCode: null, failureMessage: null };
});
afterEach(() => setProviderForTests("razorpay", null));

describe("order creation", () => {
  it("recomputes prices server-side and is idempotent per Idempotency-Key", async () => {
    const book = await product("deep-work-notes", 79900);
    await addToCart(book.id);
    const req = input();
    const first = await placeOrder(req);
    const again = await placeOrder(req);
    expect(again.orderId).toBe(first.orderId);
    expect(await db.order.count()).toBe(1);
    expect(await db.payment.count()).toBe(1);
    const order = await db.order.findUniqueOrThrow({ where: { id: first.orderId }, include: { items: true, payments: true } });
    expect(order).toMatchObject({ status: "pending_payment", totalMinor: 79900, currency: "INR", guestEmail: "guest@example.com" });
    expect(order.orderNumber).toMatch(/^KRM-\d{6}$/);
    expect(order.items[0]).toMatchObject({ titleSnapshot: "deep work notes", unitPriceMinor: 79900 });
    expect(order.payments[0]).toMatchObject({ provider: "razorpay", status: "created", amountMinor: 79900 });
    expect(first.client).toMatchObject({ provider: "razorpay", amountMinor: 79900 });
    // Guests get an access token; only its hash is stored.
    expect(first.accessToken).toBeTruthy();
    expect(order.guestAccessHash).not.toBe(first.accessToken);
  });

  it("rejects an empty cart and refuses a provider that can't take the currency", async () => {
    await expect(placeOrder(input())).rejects.toMatchObject({ code: "INVALID_REQUEST" });
    const book = await product("currency-test");
    await addToCart(book.id);
    await expect(placeOrder(input({ provider: "stripe" }))).rejects.toMatchObject({ code: "INVALID_REQUEST" });
  });

  it("completes a zero-total order without a payment and delivers it", async () => {
    const userId = await signIn();
    const book = await product("gifted-book", 50000);
    await db.coupon.create({ data: { code: "ALLFREE", type: "percent", value: 100 } });
    await addToCart(book.id);
    await applyCoupon("ALLFREE");
    const result = await placeOrder(input({ email: undefined, provider: undefined }));
    expect(result.status).toBe("paid");
    expect(await db.payment.count()).toBe(0);
    expect(await db.libraryItem.count({ where: { userId, productId: book.id } })).toBe(1);
    expect(await db.couponRedemption.count()).toBe(1);
    expect((await cartView()).items).toHaveLength(0);
  });
});

describe("razorpay verification", () => {
  it("marks paid only after a valid signature AND a provider status check", async () => {
    const book = await product("verified-book", 49900);
    await addToCart(book.id);
    const { orderId, accessToken, client } = await placeOrder(input());
    const ref = client!.provider === "razorpay" ? client!.providerOrderRef : "";
    providerState = { status: "succeeded", providerPaymentRef: "pay_ok", amountMinor: 49900, currency: "INR", method: "upi", failureCode: null, failureMessage: null };
    const view = await verifyRazorpayPayment({ orderId, token: accessToken!, razorpayOrderId: ref, razorpayPaymentId: "pay_ok", razorpaySignature: checkoutSig(ref, "pay_ok") });
    expect(view).toMatchObject({ screen: "success", charged: "yes", orderStatus: "paid" });
    expect(await db.invoice.count({ where: { orderId } })).toBe(1);
    expect(await db.paymentTransaction.count({ where: { type: "charge" } })).toBe(1);
  });

  it("rejects a forged signature without touching the order", async () => {
    const book = await product("forged-book");
    await addToCart(book.id);
    const { orderId, accessToken, client } = await placeOrder(input());
    const ref = client!.provider === "razorpay" ? client!.providerOrderRef : "";
    providerState = { status: "succeeded", providerPaymentRef: "pay_x", amountMinor: 79900, currency: "INR", method: null, failureCode: null, failureMessage: null };
    await expect(verifyRazorpayPayment({ orderId, token: accessToken!, razorpayOrderId: ref, razorpayPaymentId: "pay_x", razorpaySignature: "deadbeef" })).rejects.toMatchObject({ code: "PAYMENT_VERIFICATION_FAILED" });
    expect((await db.order.findUniqueOrThrow({ where: { id: orderId } })).status).toBe("pending_payment");
    expect(await db.securityEvent.count({ where: { type: "payment_signature_invalid" } })).toBe(1);
  });

  it("holds a payment whose amount doesn't match for verification instead of fulfilling", async () => {
    const book = await product("mismatch-book", 79900);
    await addToCart(book.id);
    const { orderId, accessToken, client } = await placeOrder(input());
    const ref = client!.provider === "razorpay" ? client!.providerOrderRef : "";
    providerState = { status: "succeeded", providerPaymentRef: "pay_low", amountMinor: 100, currency: "INR", method: null, failureCode: null, failureMessage: null };
    const view = await verifyRazorpayPayment({ orderId, token: accessToken!, razorpayOrderId: ref, razorpayPaymentId: "pay_low", razorpaySignature: checkoutSig(ref, "pay_low") });
    expect(view).toMatchObject({ screen: "verification", orderStatus: "payment_pending" });
    expect(await db.invoice.count()).toBe(0);
    expect(await db.securityEvent.count({ where: { type: "payment_amount_mismatch" } })).toBe(1);
  });

  it("does not show an order to someone without the owner session or token", async () => {
    const book = await product("private-order");
    await addToCart(book.id);
    const { orderId } = await placeOrder(input());
    await expect(orderStatus({ orderId, token: "wrong" })).rejects.toMatchObject({ code: "ORDER_NOT_FOUND" });
  });
});

describe("webhooks", () => {
  it("processes once, acknowledges replays, ignores out-of-order failures and bad signatures", async () => {
    const userId = await signIn();
    const book = await product("webhook-book", 59900);
    await addToCart(book.id);
    const { orderId, client } = await placeOrder(input({ email: undefined }));
    const ref = client!.provider === "razorpay" ? client!.providerOrderRef : "";

    const ok = await webhook("payment.captured", captured({ order_id: ref, amount: 59900 }), "evt_1");
    expect(ok).toMatchObject({ status: 200, outcome: "processed" });
    expect((await db.order.findUniqueOrThrow({ where: { id: orderId } })).status).toBe("paid");
    expect(await db.libraryItem.count({ where: { userId, productId: book.id } })).toBe(1);
    expect((await cartView()).items).toHaveLength(0);

    expect(await webhook("payment.captured", captured({ order_id: ref, amount: 59900 }), "evt_1")).toMatchObject({ outcome: "duplicate" });
    expect(await db.webhookEvent.count()).toBe(1);

    // A stale failure for an earlier attempt arrives late: the paid order must not regress.
    await webhook("payment.failed", captured({ order_id: ref, amount: 59900, id: "pay_old", status: "failed" }), "evt_0");
    expect((await db.payment.findFirstOrThrow({ where: { orderId } })).status).toBe("succeeded");
    expect((await db.order.findUniqueOrThrow({ where: { id: orderId } })).status).toBe("paid");

    const stored = await db.webhookEvent.findFirstOrThrow({ where: { eventId: "evt_1" } });
    expect(JSON.stringify(stored.payload)).not.toContain("buyer@example.com");

    const body = JSON.stringify({ event: "payment.captured", payload: {} });
    const forged = await receiveWebhook("razorpay", body, new Headers({ "x-razorpay-signature": "bad", "x-razorpay-event-id": "evt_9" }));
    expect(forged).toMatchObject({ status: 400, outcome: "invalid_signature" });
  });

  it("marks a failed payment and lets the customer retry on the same order", async () => {
    const book = await product("retry-book", 39900);
    await addToCart(book.id);
    const { orderId, accessToken, client } = await placeOrder(input());
    const ref = client!.provider === "razorpay" ? client!.providerOrderRef : "";
    await webhook("payment.failed", captured({ order_id: ref, amount: 39900, status: "failed" }), "evt_f");
    expect((await orderStatus({ orderId, token: accessToken })).screen).toBe("failed");
    const retry = await retryPayment({ orderId, token: accessToken!, provider: "razorpay" });
    expect(retry.client).toBeTruthy();
    expect(await db.payment.count({ where: { orderId } })).toBe(2);
    expect((await db.order.findUniqueOrThrow({ where: { id: orderId } })).status).toBe("pending_payment");
    await cancelOrder({ orderId, token: accessToken! });
    expect((await db.order.findUniqueOrThrow({ where: { id: orderId } })).status).toBe("cancelled");
  });
});

describe("guest orders and carts", () => {
  it("joins paid guest orders to the account once the email is verified", async () => {
    const book = await product("guest-book", 29900);
    await addToCart(book.id);
    const { client } = await placeOrder(input({ email: "later@example.com" }));
    const ref = client!.provider === "razorpay" ? client!.providerOrderRef : "";
    await webhook("payment.captured", captured({ order_id: ref, amount: 29900 }), "evt_g");
    cookieJar.clear();
    const { userId } = await register({ name: "Later Reader", email: "later@example.com", password: "readmore42" }, ctx);
    expect(await claimGuestOrdersForUser(userId)).toBe(0); // unverified: nothing claimed
    await db.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date() } });
    expect(await claimGuestOrdersForUser(userId)).toBe(1);
    expect(await db.libraryItem.count({ where: { userId, productId: book.id } })).toBe(1);
  });

  it("merges the guest cart into the account without duplicates or owned items", async () => {
    const a = await product("merge-a");
    const b = await product("merge-b");
    const owned = await product("merge-owned");
    await addToCart(a.id);
    await addToCart(b.id);
    await addToCart(owned.id);
    const guestToken = cookieJar.get("krm_cart")!.value;
    const userId = await signIn("merger@example.com");
    await db.libraryItem.create({ data: { userId, productId: owned.id, source: "admin_grant" } });
    const cart = await db.cart.create({ data: { userId } });
    await db.cartItem.create({ data: { cartId: cart.id, productId: a.id } });
    cookieJar.set("krm_cart", guestToken);
    const result = await mergeGuestCart(userId);
    expect(result).toEqual({ merged: 2, droppedOwned: 1 });
    const items = await db.cartItem.findMany({ where: { cartId: cart.id } });
    expect(items.map((i) => i.productId).sort()).toEqual([a.id, b.id].sort());
    expect(await db.cart.count()).toBe(1);
  });
});

describe("refunds", () => {
  it("refunds through the provider and revokes access on a full refund", async () => {
    const userId = await signIn();
    const book = await product("refund-book", 49900);
    await addToCart(book.id);
    const { orderId, client } = await placeOrder(input({ email: undefined }));
    const ref = client!.provider === "razorpay" ? client!.providerOrderRef : "";
    await webhook("payment.captured", captured({ order_id: ref, amount: 49900, id: "pay_r" }), "evt_r");
    const refund = await requestRefund({ userId, orderId, reason: "Bought the wrong edition by mistake." });
    await expect(requestRefund({ userId, orderId, reason: "Asking twice should be blocked." })).rejects.toMatchObject({ code: "INVALID_REQUEST" });
    await executeRefund(refund.id);
    await completeRefund(refund.id); // idempotent
    expect((await db.order.findUniqueOrThrow({ where: { id: orderId } })).status).toBe("refunded");
    expect((await db.payment.findFirstOrThrow({ where: { orderId } })).status).toBe("refunded");
    expect((await db.libraryItem.findFirstOrThrow({ where: { userId, productId: book.id } })).revokedAt).not.toBeNull();
    expect(await db.paymentTransaction.count({ where: { type: "refund" } })).toBe(1);
  });
});

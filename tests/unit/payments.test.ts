// @vitest-environment node
import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { paymentScreen } from "@/modules/checkout/status-view";
import { redactPayload, refundEligibility } from "@/modules/payments/policy";
import { pickRazorpayAttempt, razorpayPaymentState, verifyRazorpayCheckoutSignature, verifyRazorpayWebhookSignature, type RazorpayPayment } from "@/modules/payments/razorpay";
import { amountMatches, canTransitionPayment, orderStatusAfter, targetPaymentStatus } from "@/modules/payments/state";
import { stripeIntentState } from "@/modules/payments/stripe";
import type { ProviderState } from "@/modules/payments/types";

const state = (over: Partial<ProviderState> = {}): ProviderState => ({
  status: "succeeded",
  providerPaymentRef: "pay_1",
  amountMinor: 79900,
  currency: "INR",
  method: "upi",
  failureCode: null,
  failureMessage: null,
  ...over,
});

describe("payment state machine", () => {
  it("never moves a succeeded payment backwards (out-of-order webhooks)", () => {
    expect(canTransitionPayment("succeeded", "failed")).toBe(false);
    expect(canTransitionPayment("succeeded", "processing")).toBe(false);
    expect(canTransitionPayment("succeeded", "cancelled")).toBe(false);
    expect(canTransitionPayment("succeeded", "refunded")).toBe(true);
  });
  it("allows a later success after a failed or cancelled attempt", () => {
    expect(canTransitionPayment("failed", "succeeded")).toBe(true);
    expect(canTransitionPayment("cancelled", "succeeded")).toBe(true);
    expect(canTransitionPayment("created", "succeeded")).toBe(true);
  });
  it("treats refunded as terminal", () => {
    for (const to of ["succeeded", "failed", "processing", "disputed"] as const) expect(canTransitionPayment("refunded", to)).toBe(false);
  });
  it("maps a not-yet-attempted provider state to no change", () => {
    expect(targetPaymentStatus("pending")).toBeNull();
    expect(targetPaymentStatus("requires_action")).toBe("requires_action");
  });
});

describe("order status follows payments", () => {
  it("never un-pays an order", () => {
    expect(orderStatusAfter("paid", "failed")).toBeNull();
    expect(orderStatusAfter("refunded", "succeeded")).toBeNull();
  });
  it("moves through pending → paid / failed", () => {
    expect(orderStatusAfter("pending_payment", "processing")).toBe("payment_pending");
    expect(orderStatusAfter("payment_pending", "succeeded")).toBe("paid");
    expect(orderStatusAfter("pending_payment", "failed")).toBe("failed");
    expect(orderStatusAfter("failed", "succeeded")).toBe("paid");
  });
  it("returns a cancelled attempt to awaiting payment", () => {
    expect(orderStatusAfter("payment_pending", "cancelled")).toBe("pending_payment");
    expect(orderStatusAfter("pending_payment", "cancelled")).toBeNull();
  });
});

describe("amount and currency must match", () => {
  it("rejects a different amount or currency", () => {
    expect(amountMatches({ amountMinor: 79900, currency: "INR" }, state())).toBe(true);
    expect(amountMatches({ amountMinor: 79900, currency: "INR" }, state({ amountMinor: 100 }))).toBe(false);
    expect(amountMatches({ amountMinor: 79900, currency: "INR" }, state({ currency: "USD" }))).toBe(false);
    expect(amountMatches({ amountMinor: 79900, currency: "INR" }, state({ amountMinor: null }))).toBe(false);
  });
});

describe("razorpay", () => {
  const secret = "rzp_test_secret";
  it("verifies the checkout signature over order_id|payment_id", () => {
    const signature = createHmac("sha256", secret).update("order_A|pay_B").digest("hex");
    expect(verifyRazorpayCheckoutSignature({ orderId: "order_A", paymentId: "pay_B", signature }, secret)).toBe(true);
    expect(verifyRazorpayCheckoutSignature({ orderId: "order_A", paymentId: "pay_C", signature }, secret)).toBe(false);
    expect(verifyRazorpayCheckoutSignature({ orderId: "order_A", paymentId: "pay_B", signature: "00" }, secret)).toBe(false);
  });
  it("verifies webhook signatures over the exact raw body", () => {
    const body = '{"event":"payment.captured"}';
    const sig = createHmac("sha256", "whsec").update(body).digest("hex");
    expect(verifyRazorpayWebhookSignature(body, sig, "whsec")).toBe(true);
    expect(verifyRazorpayWebhookSignature(`${body} `, sig, "whsec")).toBe(false);
    expect(verifyRazorpayWebhookSignature(body, null, "whsec")).toBe(false);
  });
  it("normalises payment entities and prefers the captured attempt", () => {
    const failed: RazorpayPayment = { id: "pay_1", order_id: "order_1", status: "failed", amount: 100, currency: "INR", error_code: "BAD_REQUEST_ERROR", created_at: 2 };
    const captured: RazorpayPayment = { id: "pay_2", order_id: "order_1", status: "captured", amount: 100, currency: "INR", method: "upi", created_at: 1 };
    expect(razorpayPaymentState(failed)).toMatchObject({ status: "failed", failureCode: "BAD_REQUEST_ERROR" });
    expect(razorpayPaymentState({ ...captured, status: "authorized" }).status).toBe("processing");
    expect(pickRazorpayAttempt([failed, captured])?.id).toBe("pay_2");
    expect(pickRazorpayAttempt([])).toBeNull();
  });
});

describe("stripe", () => {
  const pi = { id: "pi_1", amount: 1999, amount_received: 0, currency: "usd", last_payment_error: null, payment_method_types: ["card"] };
  it("maps PaymentIntent statuses", () => {
    expect(stripeIntentState({ ...pi, status: "succeeded", amount_received: 1999 })).toMatchObject({ status: "succeeded", amountMinor: 1999, currency: "USD" });
    expect(stripeIntentState({ ...pi, status: "processing" }).status).toBe("processing");
    expect(stripeIntentState({ ...pi, status: "requires_action" }).status).toBe("requires_action");
    expect(stripeIntentState({ ...pi, status: "canceled" }).status).toBe("cancelled");
    expect(stripeIntentState({ ...pi, status: "requires_payment_method" }).status).toBe("pending");
  });
  it("reports a decline as failed", () => {
    const declined = stripeIntentState({ ...pi, status: "requires_payment_method", last_payment_error: { type: "card_error", code: "card_declined", decline_code: "insufficient_funds", message: "Your card has insufficient funds." } as never });
    expect(declined).toMatchObject({ status: "failed", failureCode: "insufficient_funds" });
  });
});

describe("customer status screens", () => {
  it("answers 'was I charged?' for every state", () => {
    expect(paymentScreen("paid", "succeeded")).toMatchObject({ screen: "success", charged: "yes", terminal: true });
    expect(paymentScreen("payment_pending", "pending_verification")).toMatchObject({ screen: "verification", charged: "maybe", terminal: false });
    expect(paymentScreen("payment_pending", "processing")).toMatchObject({ screen: "processing", charged: "maybe" });
    expect(paymentScreen("failed", "failed")).toMatchObject({ screen: "failed", charged: "no", canRetry: true });
    expect(paymentScreen("pending_payment", "cancelled")).toMatchObject({ screen: "cancelled", charged: "no", canRetry: true });
    expect(paymentScreen("cancelled", null)).toMatchObject({ screen: "cancelled", canRetry: false });
    expect(paymentScreen("pending_payment", null)).toMatchObject({ screen: "awaiting", terminal: false });
  });
});

describe("refund eligibility", () => {
  const paidAt = new Date("2026-09-20T00:00:00Z");
  const base = { status: "paid", paidAt, totalMinor: 79900, windowDays: 30, hasOpenRefund: false, now: new Date("2026-10-04T00:00:00Z") };
  it("allows a paid order inside the window", () => expect(refundEligibility(base)).toEqual({ ok: true }));
  it("blocks outside the window, duplicates, unpaid and free orders", () => {
    expect(refundEligibility({ ...base, now: new Date("2026-10-21T00:00:00Z") })).toMatchObject({ ok: false });
    expect(refundEligibility({ ...base, hasOpenRefund: true })).toMatchObject({ ok: false });
    expect(refundEligibility({ ...base, status: "pending_payment" })).toMatchObject({ ok: false });
    expect(refundEligibility({ ...base, totalMinor: 0 })).toMatchObject({ ok: false });
    expect(refundEligibility({ ...base, windowDays: 0 })).toMatchObject({ ok: false });
  });
});

describe("webhook payload redaction", () => {
  it("strips personal data at any depth", () => {
    const out = redactPayload({ payload: { payment: { entity: { id: "pay_1", email: "a@b.c", contact: "+91", card: { last4: "4242" }, amount: 1 } } } });
    expect(out).toEqual({ payload: { payment: { entity: { id: "pay_1", email: "[redacted]", contact: "[redacted]", card: "[redacted]", amount: 1 } } } });
  });
});

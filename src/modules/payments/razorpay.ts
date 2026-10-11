import "server-only";
import { hmacSha256Hex, safeEqual } from "@/lib/crypto";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import type { Currency } from "@/lib/money";
import type { PaymentProviderAdapter, ProviderState } from "./types";

/**
 * Razorpay adapter (INR) over the REST API — no SDK needed. Checkout signatures and webhooks are
 * verified with HMAC-SHA256 and compared in constant time.
 */
const API = "https://api.razorpay.com/v1";

function credentials() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) throw new AppError("PROVIDER_NOT_CONFIGURED", "Razorpay isn't available right now.");
  return { keyId, keySecret };
}

async function call<T>(path: string, init: { method?: "GET" | "POST"; body?: unknown; idempotencyKey?: string } = {}): Promise<T> {
  const { keyId, keySecret } = credentials();
  const response = await fetch(`${API}${path}`, {
    method: init.method ?? "GET",
    headers: {
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
      "Content-Type": "application/json",
      ...(init.idempotencyKey ? { "X-Razorpay-Idempotency-Key": init.idempotencyKey } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    logger.error("razorpay_api_error", { path, status: response.status, detail: detail.slice(0, 300) });
    throw new AppError("SERVICE_UNAVAILABLE", "We couldn't reach Razorpay. Please try again in a moment.", { meta: { status: response.status } });
  }
  return (await response.json()) as T;
}

export type RazorpayPayment = {
  id: string;
  order_id: string | null;
  status: "created" | "authorized" | "captured" | "refunded" | "failed";
  amount: number;
  currency: string;
  method?: string | null;
  error_code?: string | null;
  error_description?: string | null;
  created_at?: number;
};

const toCurrency = (c: string): Currency | null => (c === "INR" || c === "USD" ? c : null);

/** Normalises a Razorpay payment entity. `authorized` is captured automatically, so it is still processing. */
export function razorpayPaymentState(p: RazorpayPayment): ProviderState {
  const status: ProviderState["status"] =
    p.status === "captured" || p.status === "refunded" ? "succeeded" : p.status === "failed" ? "failed" : p.status === "authorized" ? "processing" : "pending";
  return {
    status,
    providerPaymentRef: p.id,
    amountMinor: p.amount,
    currency: toCurrency(p.currency),
    method: p.method ?? null,
    failureCode: p.error_code ?? null,
    failureMessage: p.error_description ?? null,
  };
}

/** Picks the most meaningful attempt on an order: captured beats in-flight beats failed. */
export function pickRazorpayAttempt(items: RazorpayPayment[]): RazorpayPayment | null {
  const rank = (p: RazorpayPayment) => ({ captured: 4, refunded: 4, authorized: 3, created: 2, failed: 1 })[p.status];
  return [...items].sort((a, b) => rank(b) - rank(a) || (b.created_at ?? 0) - (a.created_at ?? 0))[0] ?? null;
}

/** `razorpay_signature` = HMAC_SHA256(order_id + "|" + payment_id, key_secret). */
export function verifyRazorpayCheckoutSignature(input: { orderId: string; paymentId: string; signature: string }, secret?: string): boolean {
  const keySecret = secret ?? process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) return false;
  return safeEqual(hmacSha256Hex(keySecret, `${input.orderId}|${input.paymentId}`), input.signature);
}

export function verifyRazorpayWebhookSignature(rawBody: string, signature: string | null, secret?: string): boolean {
  const webhookSecret = secret ?? process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret || !signature) return false;
  return safeEqual(hmacSha256Hex(webhookSecret, rawBody), signature);
}

export const razorpay: PaymentProviderAdapter = {
  name: "razorpay",
  currencies: ["INR"],
  configured: () => Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),

  async createProviderOrder(input) {
    const order = await call<{ id: string; amount: number; currency: string }>("/orders", {
      method: "POST",
      idempotencyKey: input.idempotencyKey,
      body: {
        amount: input.amountMinor,
        currency: input.currency,
        receipt: input.orderNumber,
        notes: { payment_id: input.paymentId, order_number: input.orderNumber },
      },
    });
    if (order.amount !== input.amountMinor || order.currency !== input.currency) {
      throw new AppError("PAYMENT_VERIFICATION_FAILED", "We couldn't start this payment. Please try again.");
    }
    return {
      providerOrderRef: order.id,
      client: {
        provider: "razorpay",
        keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? credentials().keyId,
        providerOrderRef: order.id,
        amountMinor: input.amountMinor,
        currency: input.currency,
        orderNumber: input.orderNumber,
        prefill: { name: input.name, email: input.email },
      },
    };
  },

  async fetchState({ providerOrderRef, providerPaymentRef }) {
    if (providerPaymentRef) {
      const payment = await call<RazorpayPayment>(`/payments/${encodeURIComponent(providerPaymentRef)}`);
      if (payment.order_id === providerOrderRef) return razorpayPaymentState(payment);
    }
    const list = await call<{ items: RazorpayPayment[] }>(`/orders/${encodeURIComponent(providerOrderRef)}/payments`);
    const attempt = pickRazorpayAttempt(list.items);
    if (!attempt) return { status: "pending", providerPaymentRef: null, amountMinor: null, currency: null, method: null, failureCode: null, failureMessage: null };
    return razorpayPaymentState(attempt);
  },

  parseWebhook(rawBody, headers) {
    if (!verifyRazorpayWebhookSignature(rawBody, headers.get("x-razorpay-signature"))) return null;
    const payload = JSON.parse(rawBody) as Record<string, unknown> & { event?: string; created_at?: number };
    // Razorpay sends a unique event id header; fall back to a body hash if it is ever missing.
    const eventId = headers.get("x-razorpay-event-id") ?? `body:${hmacSha256Hex("razorpay-event", rawBody)}`;
    return { eventId, type: String(payload.event ?? "unknown"), payload };
  },

  async refund({ providerPaymentRef, amountMinor, refundId }) {
    const refund = await call<{ id: string; status: "pending" | "processed" | "failed" }>(`/payments/${encodeURIComponent(providerPaymentRef)}/refund`, {
      method: "POST",
      idempotencyKey: refundId,
      body: { amount: amountMinor, speed: "normal", notes: { refund_id: refundId } },
    });
    return { providerRefundRef: refund.id, status: refund.status === "processed" ? "completed" : refund.status === "failed" ? "failed" : "processing" };
  },
};

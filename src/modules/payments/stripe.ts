import "server-only";
import Stripe from "stripe";
import { AppError } from "@/lib/errors";
import type { Currency } from "@/lib/money";
import type { PaymentProviderAdapter, ProviderState } from "./types";

/** Stripe adapter (USD): PaymentIntents + Payment Element; webhooks verified with the SDK. */
let client: Stripe | null = null;

function stripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new AppError("PROVIDER_NOT_CONFIGURED", "Stripe isn't available right now.");
  client ??= new Stripe(key, { maxNetworkRetries: 2, timeout: 20_000, appInfo: { name: "KRM.lib" } });
  return client;
}

const toCurrency = (c: string): Currency | null => {
  const upper = c.toUpperCase();
  return upper === "INR" || upper === "USD" ? upper : null;
};

export function stripeIntentState(pi: Pick<Stripe.PaymentIntent, "id" | "status" | "amount" | "amount_received" | "currency" | "last_payment_error" | "payment_method_types">): ProviderState {
  const base = {
    providerPaymentRef: pi.id,
    currency: toCurrency(pi.currency),
    method: pi.last_payment_error?.payment_method?.type ?? pi.payment_method_types[0] ?? null,
    failureCode: pi.last_payment_error?.decline_code ?? pi.last_payment_error?.code ?? null,
    failureMessage: pi.last_payment_error?.message ?? null,
  };
  switch (pi.status) {
    case "succeeded":
      return { ...base, status: "succeeded", amountMinor: pi.amount_received };
    case "processing":
      return { ...base, status: "processing", amountMinor: pi.amount };
    case "requires_action":
    case "requires_confirmation":
    case "requires_capture":
      return { ...base, status: "requires_action", amountMinor: pi.amount };
    case "canceled":
      return { ...base, status: "cancelled", amountMinor: pi.amount };
    case "requires_payment_method":
      // Back to "needs a method" after a decline means the last attempt failed.
      return { ...base, status: pi.last_payment_error ? "failed" : "pending", amountMinor: pi.amount };
    default:
      return { ...base, status: "pending", amountMinor: pi.amount };
  }
}

export const stripeProvider: PaymentProviderAdapter = {
  name: "stripe",
  currencies: ["USD"],
  configured: () => Boolean(process.env.STRIPE_SECRET_KEY && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY),

  async createProviderOrder(input) {
    const intent = await stripe().paymentIntents.create(
      {
        amount: input.amountMinor,
        currency: input.currency.toLowerCase(),
        automatic_payment_methods: { enabled: true },
        receipt_email: input.email,
        description: `KRM.lib order ${input.orderNumber}`,
        metadata: { payment_id: input.paymentId, order_number: input.orderNumber },
      },
      { idempotencyKey: input.idempotencyKey },
    );
    if (!intent.client_secret) throw new AppError("SERVICE_UNAVAILABLE", "We couldn't start this payment. Please try again.");
    return {
      providerOrderRef: intent.id,
      client: {
        provider: "stripe",
        publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
        clientSecret: intent.client_secret,
        amountMinor: input.amountMinor,
        currency: input.currency,
        orderNumber: input.orderNumber,
      },
    };
  },

  async fetchState({ providerOrderRef }) {
    return stripeIntentState(await stripe().paymentIntents.retrieve(providerOrderRef, { expand: ["last_payment_error.payment_method"] }));
  },

  parseWebhook(rawBody, headers) {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    const signature = headers.get("stripe-signature");
    if (!secret || !signature) return null;
    try {
      const event = Stripe.webhooks.constructEvent(rawBody, signature, secret);
      return { eventId: event.id, type: event.type, payload: event as unknown as Record<string, unknown> };
    } catch {
      return null;
    }
  },

  async refund({ providerPaymentRef, amountMinor, refundId }) {
    const refund = await stripe().refunds.create({ payment_intent: providerPaymentRef, amount: amountMinor, metadata: { refund_id: refundId } }, { idempotencyKey: `refund:${refundId}` });
    return {
      providerRefundRef: refund.id,
      status: refund.status === "succeeded" ? "completed" : refund.status === "failed" || refund.status === "canceled" ? "failed" : "processing",
    };
  },
};

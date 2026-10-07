import type { Currency } from "@/lib/money";

export type ProviderName = "razorpay" | "stripe";

/** What a provider reports about a payment, normalised. Never built from client input. */
export type ProviderState = {
  status: "succeeded" | "failed" | "processing" | "requires_action" | "pending" | "cancelled";
  providerPaymentRef: string | null;
  amountMinor: number | null;
  currency: Currency | null;
  method: string | null;
  failureCode: string | null;
  failureMessage: string | null;
};

export type RazorpayClientParams = {
  provider: "razorpay";
  keyId: string;
  providerOrderRef: string;
  amountMinor: number;
  currency: Currency;
  orderNumber: string;
  prefill: { name: string | null; email: string };
};

export type StripeClientParams = {
  provider: "stripe";
  publishableKey: string;
  clientSecret: string;
  amountMinor: number;
  currency: Currency;
  orderNumber: string;
};

export type ClientParams = RazorpayClientParams | StripeClientParams;

/** A verified, parsed webhook event. `eventId` is the provider's id used for idempotency. */
export type WebhookEventInput = {
  eventId: string;
  type: string;
  payload: Record<string, unknown>;
};

export type ProviderRefundState = { providerRefundRef: string; status: "processing" | "completed" | "failed" };

/** PaymentPort (ARCHITECTURE §5): adapters do provider I/O only; state lives in our services. */
export interface PaymentProviderAdapter {
  readonly name: ProviderName;
  readonly currencies: readonly Currency[];
  configured(): boolean;
  createProviderOrder(input: {
    paymentId: string;
    orderNumber: string;
    amountMinor: number;
    currency: Currency;
    email: string;
    name: string | null;
    idempotencyKey: string;
  }): Promise<{ providerOrderRef: string; client: ClientParams }>;
  fetchState(ref: { providerOrderRef: string; providerPaymentRef: string | null }): Promise<ProviderState>;
  /** Returns null when the signature is invalid. */
  parseWebhook(rawBody: string, headers: Headers): WebhookEventInput | null;
  refund(input: { providerPaymentRef: string; amountMinor: number; currency: Currency; refundId: string }): Promise<ProviderRefundState>;
}

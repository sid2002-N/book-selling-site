import "server-only";
import { AppError } from "@/lib/errors";
import type { Currency } from "@/lib/money";
import { getSetting } from "@/modules/settings";
import { razorpay } from "./razorpay";
import { stripeProvider } from "./stripe";
import type { PaymentProviderAdapter, ProviderName } from "./types";

const ADAPTERS: Record<ProviderName, PaymentProviderAdapter> = { razorpay, stripe: stripeProvider };

/** Test seam: integration tests swap in a fake adapter (never used by app code). */
export function setProviderForTests(name: ProviderName, adapter: PaymentProviderAdapter | null): void {
  ADAPTERS[name] = adapter ?? (name === "razorpay" ? razorpay : stripeProvider);
}

export function provider(name: ProviderName): PaymentProviderAdapter {
  return ADAPTERS[name];
}

export type ProviderOption = {
  name: ProviderName;
  label: string;
  description: string;
  available: boolean;
};

const COPY: Record<ProviderName, { label: string; description: string }> = {
  razorpay: { label: "Razorpay", description: "UPI, cards, net banking and wallets (India)" },
  stripe: { label: "Stripe", description: "International cards, Apple Pay and Google Pay" },
};

/**
 * Providers that can take payment in this currency (Razorpay → INR, Stripe → USD). An enabled
 * provider without keys is listed as unavailable so the UI can explain instead of faking it.
 */
export async function providersFor(currency: Currency): Promise<ProviderOption[]> {
  const [razorpayEnabled, stripeEnabled] = await Promise.all([getSetting("payments.razorpayEnabled"), getSetting("payments.stripeEnabled")]);
  const enabled: Record<ProviderName, boolean> = { razorpay: razorpayEnabled, stripe: stripeEnabled };
  return (Object.keys(COPY) as ProviderName[])
    .filter((name) => enabled[name] && ADAPTERS[name].currencies.includes(currency))
    .map((name) => ({ name, ...COPY[name], available: ADAPTERS[name].configured() }));
}

export async function assertProviderUsable(name: ProviderName, currency: Currency): Promise<PaymentProviderAdapter> {
  const option = (await providersFor(currency)).find((p) => p.name === name);
  if (!option) throw new AppError("INVALID_REQUEST", `${COPY[name].label} can't take payments in ${currency}.`);
  if (!option.available) throw new AppError("PROVIDER_NOT_CONFIGURED", `${COPY[name].label} isn't set up yet, so payments can't be taken right now.`);
  return ADAPTERS[name];
}

export function providerLabel(name: ProviderName): string {
  return COPY[name].label;
}

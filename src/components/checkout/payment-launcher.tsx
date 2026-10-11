"use client";

import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe, type Appearance, type Stripe } from "@stripe/stripe-js";
import { Lock } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import type { ClientParams } from "@/modules/payments";
import { FormAlert } from "@/components/auth/FormAlert";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogContent } from "@/components/ui/Dialog";
import { formatMoney } from "@/lib/money";

export type OrderRef = { orderId: string; token: string | null };

export function statusUrl(ref: OrderRef, extra: Record<string, string> = {}): string {
  const params = new URLSearchParams({ order: ref.orderId, ...(ref.token ? { token: ref.token } : {}), ...extra });
  return `/checkout/status?${params.toString()}`;
}

async function postJson<T>(url: string, body: unknown): Promise<{ data: T | null; error: { code: string; message: string } | null }> {
  try {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    return await res.json();
  } catch {
    return { data: null, error: { code: "NETWORK", message: "We lost the connection. Check your internet and try again." } };
  }
}

// ── Razorpay ──────────────────────────────────────────────────────────────

type RazorpayResponse = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
type RazorpayInstance = { open: () => void; on: (event: string, cb: () => void) => void };
type RazorpayCtor = new (options: Record<string, unknown>) => RazorpayInstance;

let razorpayScript: Promise<RazorpayCtor> | null = null;

function loadRazorpay(): Promise<RazorpayCtor> {
  razorpayScript ??= new Promise((resolve, reject) => {
    const w = window as unknown as { Razorpay?: RazorpayCtor };
    if (w.Razorpay) return resolve(w.Razorpay);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => (w.Razorpay ? resolve(w.Razorpay) : reject(new Error("Razorpay unavailable")));
    script.onerror = () => {
      razorpayScript = null;
      reject(new Error("Razorpay failed to load"));
    };
    document.head.appendChild(script);
  });
  return razorpayScript;
}

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

// ── Stripe ────────────────────────────────────────────────────────────────

const stripePromises = new Map<string, Promise<Stripe | null>>();
function stripeFor(key: string) {
  if (!stripePromises.has(key)) stripePromises.set(key, loadStripe(key));
  return stripePromises.get(key)!;
}

function stripeAppearance(): Appearance {
  // Read the design tokens at runtime so the Payment Element matches the theme without hardcoding.
  return {
    theme: "stripe",
    variables: {
      colorPrimary: cssVar("--ink"),
      colorBackground: cssVar("--surface"),
      colorText: cssVar("--ink"),
      colorDanger: cssVar("--error"),
      fontFamily: getComputedStyle(document.body).fontFamily,
      ...(cssVar("--radius-md") ? { borderRadius: cssVar("--radius-md") } : {}),
    },
  };
}

function StripeForm({ client, order, onSettled }: { client: Extract<ClientParams, { provider: "stripe" }>; order: OrderRef; onSettled: (url: string) => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setBusy(true);
    setError(null);
    const result = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${window.location.origin}${statusUrl(order)}` },
      redirect: "if_required",
    });
    if (result.error) {
      // Declines keep the dialog open so the customer can fix details; nothing was charged.
      setError(result.error.message ?? "Your payment couldn't be completed. No money was deducted.");
      setBusy(false);
      return;
    }
    await postJson("/api/v1/payments/stripe/confirm-status", { orderId: order.orderId, token: order.token ?? undefined, paymentIntentId: result.paymentIntent.id });
    onSettled(statusUrl(order));
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <p className="font-serif text-h2 tabular-nums">{formatMoney({ amountMinor: client.amountMinor, currency: client.currency })}</p>
      <PaymentElement options={{ layout: "tabs" }} />
      {error ? <FormAlert>{error}</FormAlert> : null}
      <Button type="submit" size="lg" block loading={busy} disabled={!stripe}>
        <Lock /> Pay {formatMoney({ amountMinor: client.amountMinor, currency: client.currency })}
      </Button>
      <p className="text-center text-caption text-fg-muted">Card details go straight to Stripe — KRM.lib never sees or stores them.</p>
    </form>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────

/**
 * Opens the right provider UI for a server-issued payment (Razorpay Checkout modal or Stripe
 * Payment Element). Success is only ever reported to the server for verification — the page
 * that follows reads the verified status, never the browser's claim.
 */
export function usePaymentLauncher(options: { onSettled: (url: string) => void; onDismiss: (message: string) => void; onError: (message: string) => void }) {
  const [stripeSession, setStripeSession] = useState<{ client: Extract<ClientParams, { provider: "stripe" }>; order: OrderRef } | null>(null);
  const callbacks = useRef(options);
  useEffect(() => {
    callbacks.current = options;
  });

  const launch = useCallback(async (client: ClientParams, order: OrderRef) => {
    if (client.provider === "stripe") {
      setStripeSession({ client, order });
      return;
    }
    let Razorpay: RazorpayCtor;
    try {
      Razorpay = await loadRazorpay();
    } catch {
      callbacks.current.onError("Razorpay couldn't load. Check your connection or disable content blockers, then try again.");
      return;
    }
    const instance = new Razorpay({
      key: client.keyId,
      order_id: client.providerOrderRef,
      amount: client.amountMinor,
      currency: client.currency,
      name: "KRM.lib",
      description: `Order ${client.orderNumber}`,
      prefill: { name: client.prefill.name ?? undefined, email: client.prefill.email },
      theme: { color: cssVar("--ink") },
      handler: async (response: RazorpayResponse) => {
        await postJson("/api/v1/payments/razorpay/verify", {
          orderId: order.orderId,
          token: order.token ?? undefined,
          razorpayOrderId: response.razorpay_order_id,
          razorpayPaymentId: response.razorpay_payment_id,
          razorpaySignature: response.razorpay_signature,
        });
        // Whatever verification said, the status page shows the server's verified state.
        callbacks.current.onSettled(statusUrl(order));
      },
      modal: {
        confirm_close: true,
        ondismiss: () => callbacks.current.onDismiss("Payment window closed. No money was deducted — you can pay whenever you're ready."),
      },
    });
    instance.open();
  }, []);

  const appearance = useMemo(() => (stripeSession ? stripeAppearance() : undefined), [stripeSession]);

  const element: ReactNode = stripeSession ? (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) {
          setStripeSession(null);
          callbacks.current.onDismiss("Payment window closed. No money was deducted — you can pay whenever you're ready.");
        }
      }}
    >
      <DialogContent title="Pay with Stripe" description={`Order ${stripeSession.client.orderNumber} · secure card payment`} className="sm:max-w-md">
        <Elements stripe={stripeFor(stripeSession.client.publishableKey)} options={{ clientSecret: stripeSession.client.clientSecret, appearance }}>
          <StripeForm client={stripeSession.client} order={stripeSession.order} onSettled={(url) => callbacks.current.onSettled(url)} />
        </Elements>
      </DialogContent>
    </Dialog>
  ) : null;

  return { launch, element };
}

export { postJson };

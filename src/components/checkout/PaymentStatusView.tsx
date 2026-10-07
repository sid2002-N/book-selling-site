"use client";

import {
  ArrowRight,
  Ban,
  Check,
  CircleAlert,
  CircleCheck,
  CircleX,
  Clock,
  Download,
  Library,
  Loader,
  RotateCcw,
  ShieldCheck,
  TriangleAlert,
  Undo2,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { OrderStatusView, PaymentScreen } from "@/modules/checkout";
import type { ProviderName, ProviderOption } from "@/modules/payments";
import { FormAlert } from "@/components/auth/FormAlert";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/money";
import { postJson, usePaymentLauncher, type OrderRef } from "./payment-launcher";

type Spec = { icon: LucideIcon; tone: "success" | "error" | "warning" | "accent" | "info"; title: string; message: string };

const PROVIDER_LABEL: Record<ProviderName, string> = { razorpay: "Razorpay", stripe: "Stripe" };

function spec(screen: PaymentScreen, view: OrderStatusView, dismissed: boolean): Spec {
  const via = view.provider ? ` with ${PROVIDER_LABEL[view.provider]}` : "";
  switch (screen) {
    case "success":
      return { icon: CircleCheck, tone: "success", title: view.totalMinor === 0 ? "Order placed successfully!" : "Payment successful!", message: view.totalMinor === 0 ? "Your free order is complete." : `Your payment${via} has been completed and your order is confirmed.` };
    case "processing":
      return { icon: Loader, tone: "accent", title: "Processing your payment", message: `Please don't close this window. We're confirming your payment${via}.` };
    case "verification":
      return { icon: ShieldCheck, tone: "info", title: "Payment under verification", message: "Your payment has been received and is being verified by our payment partner." };
    case "failed":
      return { icon: CircleX, tone: "error", title: "Payment failed", message: `We couldn't complete your payment${via}. Please try again or use a different payment method.` };
    case "cancelled":
      return view.orderStatus === "cancelled"
        ? { icon: Ban, tone: "warning", title: "Order cancelled", message: "This order was cancelled before any payment was made." }
        : { icon: Ban, tone: "warning", title: "Payment cancelled", message: "You cancelled the payment process." };
    case "refunded":
      return { icon: Undo2, tone: "info", title: view.orderStatus === "partially_refunded" ? "Order partially refunded" : "Order refunded", message: "This order has been refunded to your original payment method." };
    case "disputed":
      return { icon: TriangleAlert, tone: "warning", title: "Payment dispute raised", message: "A dispute was opened for this payment and our team is reviewing it. Access may be paused until it's resolved." };
    case "awaiting":
      return dismissed
        ? { icon: Ban, tone: "warning", title: "Payment not completed", message: "The payment window was closed before paying." }
        : { icon: Clock, tone: "accent", title: "Waiting for payment", message: "Your order is reserved at this price, but it hasn't been paid yet." };
  }
}

function chargedLine(view: OrderStatusView, screen: PaymentScreen): string {
  if (screen === "success") return view.totalMinor === 0 ? "Nothing was charged." : "A confirmation email with your receipt is on its way.";
  if (screen === "refunded") return "Refunds usually reach your account within 5–7 working days.";
  if (screen === "disputed") return "We'll email you with updates. Most disputes are resolved within a few business days.";
  if (view.charged === "maybe") return "If money has left your account, it's safe — this page updates automatically, and we'll email you once it's confirmed.";
  if (screen === "failed") return "No money has been deducted for this attempt. If your bank shows a debit, it will be reversed automatically.";
  return "No money has been deducted.";
}

const REASONS: Record<ProviderName, string[]> = {
  razorpay: ["Insufficient balance", "Bank declined the payment", "UPI request timed out", "Network issue"],
  stripe: ["Card declined", "Insufficient funds", "Incorrect card details", "Bank authentication failed"],
};

const TONE: Record<Spec["tone"], string> = {
  success: "bg-success-soft text-success",
  error: "bg-error-soft text-error",
  warning: "bg-warning-soft text-warning",
  accent: "bg-accent-soft text-accent-strong",
  info: "bg-info-soft text-info",
};

type Props = {
  initial: OrderStatusView;
  token: string | null;
  providers: ProviderOption[];
  signedIn: boolean;
  supportEmail: string;
  stripeIntent: string | null;
  dismissed: boolean;
};

/**
 * PaymentStatusTemplate + OrderResultTemplate (Payment Flow Showcase): one component, every
 * state. Unsettled states poll the server, which re-checks the provider; nothing is inferred
 * from the browser.
 */
export function PaymentStatusView({ initial, token, providers, signedIn, supportEmail, stripeIntent, dismissed }: Props) {
  const router = useRouter();
  const [view, setView] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [slow, setSlow] = useState(false);
  const [showMethods, setShowMethods] = useState(false);
  const polls = useRef(0);
  const order: OrderRef = { orderId: view.orderId, token };

  const refresh = useCallback(async () => {
    const qs = new URLSearchParams({ refresh: "1", ...(token ? { token } : {}) });
    try {
      const res = await fetch(`/api/v1/checkout/orders/${initial.orderId}/status?${qs.toString()}`, { cache: "no-store" });
      const body = (await res.json()) as { data: OrderStatusView | null };
      if (body.data) setView(body.data);
    } catch {
      // Offline blip: the next poll tries again.
    }
  }, [initial.orderId, token]);

  // Stripe redirect-based methods come back with ?payment_intent=…; confirm it server-side once.
  useEffect(() => {
    if (!stripeIntent) return;
    void postJson<OrderStatusView>("/api/v1/payments/stripe/confirm-status", { orderId: initial.orderId, token: token ?? undefined, paymentIntentId: stripeIntent }).then((r) => {
      if (r.data) setView(r.data);
    });
  }, [stripeIntent, initial.orderId, token]);

  useEffect(() => {
    if (view.terminal || (view.screen === "awaiting" && !view.provider)) return;
    const delay = polls.current < 40 ? 3000 : 15000;
    const timer = setTimeout(() => {
      polls.current += 1;
      if (polls.current === 40) setSlow(true);
      void refresh();
    }, delay);
    return () => clearTimeout(timer);
  }, [view, refresh]);

  // Layouts persist across client navigation: refresh once on success so the header cart count clears.
  const refreshedOnSuccess = useRef(false);
  useEffect(() => {
    if (view.screen !== "success" || refreshedOnSuccess.current) return;
    refreshedOnSuccess.current = true;
    router.refresh();
  }, [view.screen, router]);

  const { launch, element } = usePaymentLauncher({
    onSettled: () => {
      setBusy(null);
      void refresh();
      router.refresh();
    },
    onDismiss: () => setBusy(null),
    onError: (message) => {
      setBusy(null);
      setError(message);
    },
  });

  async function retry(provider: ProviderName) {
    setBusy(provider);
    setError(null);
    const res = await postJson<{ client: Parameters<typeof launch>[0] | null }>(`/api/v1/checkout/orders/${view.orderId}/retry`, { provider, token: token ?? undefined });
    if (!res.data?.client) {
      setBusy(null);
      setError(res.error?.message ?? "We couldn't start a new payment. Please try again.");
      return;
    }
    await refresh();
    await launch(res.data.client, order);
  }

  async function cancel() {
    setBusy("cancel");
    const res = await postJson(`/api/v1/checkout/orders/${view.orderId}/cancel`, { token: token ?? undefined });
    setBusy(null);
    if (res.error) setError(res.error.message);
    await refresh();
  }

  const s = spec(view.screen, view, dismissed);
  const Icon = s.icon;
  const usable = providers.filter((p) => p.available);
  const lastProvider = usable.find((p) => p.name === view.provider) ?? usable[0];
  const money = (amountMinor: number) => formatMoney({ amountMinor, currency: view.currency });
  const invoiceHref = `/api/v1/account/orders/${view.orderId}/invoice${token ? `?token=${encodeURIComponent(token)}` : ""}`;
  const steps = view.screen === "verification"
    ? ["Payment received", "Verifying with bank", "Confirming transaction", "Finalising your order"]
    : ["Payment details sent", `Verifying with ${view.provider ? PROVIDER_LABEL[view.provider] : "provider"}`, "Confirming with your bank", "Finalising your order"];

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-6 text-center">
      <span className={cn("flex size-20 items-center justify-center rounded-full", TONE[s.tone])}>
        <Icon className={cn("size-10", view.screen === "processing" && "animate-spin motion-reduce:animate-none")} aria-hidden />
      </span>
      <div className="flex flex-col gap-2" aria-live="polite">
        <h1 className="text-h1">{s.title}</h1>
        <p className="text-body-lg text-fg-secondary">{s.message}</p>
        <p className="text-body-sm text-fg-muted">{chargedLine(view, view.screen)}</p>
      </div>

      <p className="rounded-full border border-line bg-surface px-4 py-1.5 text-caption text-fg-secondary">
        Order <span className="font-semibold text-fg">#{view.orderNumber}</span> · {view.orderStatusLabel}
      </p>

      {error ? <FormAlert className="w-full text-left">{error}</FormAlert> : null}

      {view.screen === "processing" || view.screen === "verification" ? (
        <ol className="flex w-full max-w-sm flex-col gap-3 text-left text-body-sm">
          {steps.map((label, i) => {
            const done = i === 0 || (view.screen === "verification" && i === 1);
            const current = !done && (i === 1 || (view.screen === "verification" && i === 2));
            return (
              <li key={label} className="flex items-center gap-3">
                <span className={cn("flex size-6 items-center justify-center rounded-full", done ? "bg-success text-fg-on-ink" : current ? "border-2 border-accent" : "border border-line-strong")}>
                  {done ? <Check className="size-3.5" aria-hidden /> : current ? <Loader className="size-3 animate-spin text-accent-strong motion-reduce:animate-none" aria-hidden /> : null}
                </span>
                <span className={done || current ? "text-fg" : "text-fg-muted"}>{label}</span>
              </li>
            );
          })}
        </ol>
      ) : null}
      {slow && !view.terminal ? (
        <p className="flex items-start gap-2 rounded-md bg-warning-soft px-4 py-3 text-left text-body-sm text-fg">
          <CircleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden /> This is taking longer than usual. You can safely close this page — we&apos;ll email you as soon as your payment is confirmed.
        </p>
      ) : null}

      {view.screen === "failed" && view.provider ? (
        <div className="w-full rounded-lg bg-error-soft px-5 py-4 text-left">
          <p className="flex items-center gap-2 text-label font-semibold text-error">
            <CircleAlert className="size-4" aria-hidden /> Common reasons
          </p>
          <ul className="mt-2 flex flex-col gap-1 text-body-sm text-fg-secondary">
            {REASONS[view.provider].map((r) => (
              <li key={r} className="flex items-center gap-2">
                <span aria-hidden className="size-1.5 rounded-full bg-error" /> {r}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {view.screen === "success" || view.screen === "refunded" ? (
        <div className="w-full rounded-xl border border-line bg-surface p-5 text-left shadow-1">
          <div className="mb-3 flex justify-between text-caption text-fg-muted">
            <span className="font-semibold text-fg">Order #{view.orderNumber}</span>
            <time dateTime={view.placedAt}>{new Date(view.placedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</time>
          </div>
          <ul className="flex flex-col gap-2 border-y border-line py-3 text-body-sm">
            {view.items.map((item) => (
              <li key={item.productId} className="flex justify-between gap-4">
                <span className="truncate">{item.title}</span>
                <span className="tabular-nums">{money(item.amountMinor)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex justify-between text-body font-semibold">
            <span>Total paid</span>
            <span className="tabular-nums">{money(view.totalMinor)}</span>
          </div>
        </div>
      ) : null}

      <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
        {view.screen === "success" ? (
          view.isGuest ? (
            <>
              <Button asChild size="lg">
                <Link href="/register?next=/account/library">
                  Create account to keep your library <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <a href={invoiceHref}>
                  <Download /> Invoice
                </a>
              </Button>
            </>
          ) : (
            <>
              <Button asChild size="lg">
                <Link href="/account/library">
                  <Library /> Go to My Library
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href={`/account/orders/${view.orderId}`}>
                  View order <ArrowRight />
                </Link>
              </Button>
            </>
          )
        ) : null}

        {view.canRetry && usable.length ? (
          <>
            <Button size="lg" loading={busy === lastProvider?.name} disabled={Boolean(busy)} onClick={() => lastProvider && retry(lastProvider.name)}>
              <RotateCcw /> {view.screen === "awaiting" && !dismissed ? "Complete payment" : "Try again"}
            </Button>
            {usable.length > 1 ? (
              <Button size="lg" variant="secondary" disabled={Boolean(busy)} onClick={() => setShowMethods((v) => !v)} aria-expanded={showMethods}>
                Choose different method
              </Button>
            ) : null}
          </>
        ) : null}

        {view.screen === "cancelled" || view.screen === "failed" ? (
          <Button asChild size="lg" variant={view.canRetry && usable.length ? "ghost" : "primary"}>
            <Link href="/cart">Back to cart</Link>
          </Button>
        ) : null}

        {(view.screen === "processing" || view.screen === "verification") && signedIn ? (
          <Button asChild size="lg" variant="secondary">
            <Link href={`/account/orders/${view.orderId}`}>View order status</Link>
          </Button>
        ) : null}
      </div>

      {showMethods ? (
        <ul className="flex w-full flex-col gap-2 text-left">
          {usable.map((p) => (
            <li key={p.name}>
              <button
                type="button"
                disabled={Boolean(busy)}
                onClick={() => retry(p.name)}
                className="flex w-full items-center justify-between gap-4 rounded-lg border border-line bg-surface px-4 py-3 hover:border-line-strong disabled:opacity-60"
              >
                <span>
                  <span className="block text-body-sm font-semibold">Try again with {p.label}</span>
                  <span className="block text-caption text-fg-muted">{p.description}</span>
                </span>
                <ArrowRight className="size-4 text-fg-muted" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {view.canCancel && view.screen === "awaiting" ? (
        <Button variant="ghost" size="sm" loading={busy === "cancel"} disabled={Boolean(busy)} onClick={cancel}>
          Cancel this order
        </Button>
      ) : null}

      <p className="text-caption text-fg-muted">
        Need help?{" "}
        <a href={`mailto:${supportEmail}?subject=${encodeURIComponent(`Order ${view.orderNumber}`)}`} className="underline underline-offset-2">
          Contact support
        </a>{" "}
        and mention order #{view.orderNumber}.
      </p>
      {element}
    </div>
  );
}

"use client";

import { ArrowLeft, ArrowRight, CreditCard, Landmark, Lock, Pencil, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { ProviderName, ProviderOption } from "@/modules/payments";
import type { CheckoutResult } from "@/modules/checkout";
import { FormAlert } from "@/components/auth/FormAlert";
import { CurrencySwitcher } from "@/components/commerce/CurrencySwitcher";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Checkbox, Radio, RadioGroup } from "@/components/ui/Choice";
import { Divider, Stepper } from "@/components/ui/Feedback";
import { Field, Input, Label } from "@/components/ui/Field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { toast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import { formatMoney, type Currency } from "@/lib/money";
import { postJson, statusUrl, usePaymentLauncher } from "./payment-launcher";

type CheckoutFlowProps = {
  user: { name: string; email: string } | null;
  currency: Currency;
  totalMinor: number;
  providers: ProviderOption[];
  defaultCountry: string;
  countries: { code: string; name: string }[];
};

const STEPS = ["Information", "Payment", "Review"];
const PROVIDER_ICON: Record<ProviderName, typeof CreditCard> = { razorpay: Landmark, stripe: CreditCard };

/**
 * Checkout (Flow 7, sheet "Cozy Ecommerce Checkout"): Information → Payment → Review. Guest and
 * signed-in modes share one template. The server re-prices on submit; nothing here is trusted.
 */
export function CheckoutFlow({ user, currency, totalMinor, providers, defaultCountry, countries }: CheckoutFlowProps) {
  const router = useRouter();
  const free = totalMinor === 0;
  const usable = providers.filter((p) => p.available);
  const recommended = usable.find((p) => (defaultCountry === "IN" ? p.name === "razorpay" : p.name === "stripe")) ?? usable[0];

  const [step, setStep] = useState(0);
  const [email, setEmail] = useState("");
  const [name, setName] = useState(user?.name ?? "");
  const [country, setCountry] = useState(defaultCountry);
  const [provider, setProvider] = useState<ProviderName | undefined>(recommended?.name);
  const [accept, setAccept] = useState(false);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  const { launch, element } = usePaymentLauncher({
    onSettled: (url) => router.push(url),
    onDismiss: (message) => {
      setBusy(false);
      toast({ title: "Payment not completed", description: message });
    },
    onError: (message) => {
      setBusy(false);
      setError(message);
    },
  });

  const total = formatMoney({ amountMinor: totalMinor, currency });
  const countryName = countries.find((c) => c.code === country)?.name ?? country;
  const chosen = providers.find((p) => p.name === provider);

  function nextFromInformation(e: FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!user && !/^\S+@\S+\.\S+$/.test(email.trim())) errs.email = "Enter a valid email address.";
    if (name.trim().length < 2) errs.name = "Enter your full name.";
    if (!country) errs.country = "Choose your country.";
    setFields(errs);
    if (Object.keys(errs).length === 0) setStep(free ? 2 : 1);
  }

  function nextFromPayment(e: FormEvent) {
    e.preventDefault();
    if (!provider) {
      setFields({ provider: "Choose a payment method." });
      return;
    }
    setFields({});
    setStep(2);
  }

  async function placeOrder(e: FormEvent) {
    e.preventDefault();
    if (!accept) {
      setFields({ acceptTerms: "Please accept the terms to continue." });
      return;
    }
    setBusy(true);
    setError(null);
    const body = { idempotencyKey, email: user ? undefined : email.trim(), name: name.trim(), country, provider: free ? undefined : provider, acceptTerms: true };
    const res = await postJson<CheckoutResult>("/api/v1/checkout/orders", body);
    if (!res.data) {
      setBusy(false);
      const err = res.error as { code: string; message: string; fields?: Record<string, string> } | null;
      setError(err?.message ?? "Something went wrong. Please try again.");
      if (err?.fields) {
        setFields(err.fields);
        if (err.fields.email || err.fields.name || err.fields.country) setStep(0);
        else if (err.fields.provider) setStep(1);
      }
      return;
    }
    const order = { orderId: res.data.orderId, token: res.data.accessToken };
    if (!res.data.client) {
      router.push(statusUrl(order));
      return;
    }
    await launch(res.data.client, order);
  }

  return (
    <div className="flex flex-col gap-6">
      <Stepper steps={STEPS} current={step} className="max-w-xl" />
      {error ? <FormAlert>{error}</FormAlert> : null}

      {step === 0 ? (
        <form onSubmit={nextFromInformation} noValidate className="flex flex-col gap-6 rounded-xl border border-line bg-surface p-6 shadow-1">
          {user ? (
            <section className="flex flex-col gap-2">
              <h2 className="font-sans text-h4 font-semibold">Contact information</h2>
              <p className="text-body-sm text-fg-secondary">
                Signed in as <span className="font-semibold text-fg">{user.email}</span>. Your purchase goes straight to your library.
              </p>
            </section>
          ) : (
            <section className="flex flex-col gap-4">
              <div>
                <h2 className="font-sans text-h4 font-semibold">Checkout as guest</h2>
                <p className="text-body-sm text-fg-muted">No account needed. We&apos;ll email your receipt and a link to your downloads.</p>
              </div>
              <Field label="Email address" error={fields.email}>
                {(ids) => (
                  <Input id={ids.id} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-describedby={ids.describedBy} aria-invalid={ids.invalid} />
                )}
              </Field>
              <Divider label="or" />
              <p className="text-center text-body-sm text-fg-secondary">
                Already have an account?{" "}
                <Link href="/login?next=/checkout" className="font-semibold text-fg underline underline-offset-2">
                  Sign in
                </Link>{" "}
                to keep everything in your library.
              </p>
            </section>
          )}

          <section className="flex flex-col gap-4 border-t border-line pt-6">
            <h2 className="font-sans text-h4 font-semibold">Billing details</h2>
            <Field label="Full name" error={fields.name}>
              {(ids) => <Input id={ids.id} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} aria-describedby={ids.describedBy} aria-invalid={ids.invalid} />}
            </Field>
            <Field label="Country" hint="Used for tax on your invoice." error={fields.country}>
              {(ids) => (
                <Select value={country} onValueChange={setCountry}>
                  <SelectTrigger id={ids.id} aria-describedby={ids.describedBy} aria-invalid={ids.invalid}>
                    <SelectValue placeholder="Choose your country" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {countries.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </Field>
          </section>

          <Button type="submit" size="lg" className="self-stretch sm:self-start">
            {free ? "Continue to Review" : "Continue to Payment"} <ArrowRight />
          </Button>
        </form>
      ) : null}

      {step === 1 ? (
        <form onSubmit={nextFromPayment} className="flex flex-col gap-5 rounded-xl border border-line bg-surface p-6 shadow-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-sans text-h4 font-semibold">Choose payment method</h2>
              <p className="text-body-sm text-fg-muted">Paying {total} in {currency}.</p>
            </div>
            <div className="flex items-center gap-2 text-caption text-fg-muted">
              Currency <CurrencySwitcher current={currency} />
            </div>
          </div>

          {providers.length === 0 ? (
            <FormAlert>Payments in {currency} aren&apos;t available right now. Try switching currency above.</FormAlert>
          ) : usable.length === 0 ? (
            <div role="status" className="flex flex-col gap-1 rounded-md bg-warning-soft px-4 py-3 text-body-sm text-fg">
              <p className="font-semibold">Online payments aren&apos;t switched on yet</p>
              <p className="text-fg-secondary">The store hasn&apos;t connected its payment partner, so we can&apos;t take payment right now. Your cart is saved — please check back soon.</p>
            </div>
          ) : null}

          {providers.length ? (
            <RadioGroup value={provider} onValueChange={(v) => setProvider(v as ProviderName)} aria-label="Payment method" className="flex flex-col gap-3">
              {providers.map((p) => {
                const Icon = PROVIDER_ICON[p.name];
                return (
                  <Label
                    key={p.name}
                    htmlFor={`provider-${p.name}`}
                    className={cn(
                      "flex cursor-pointer items-center gap-4 rounded-lg border p-4 transition-colors duration-fast",
                      provider === p.name ? "border-ink bg-canvas-subtle" : "border-line hover:border-line-strong",
                      !p.available && "cursor-not-allowed opacity-60",
                    )}
                  >
                    <Radio id={`provider-${p.name}`} value={p.name} disabled={!p.available} />
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent-strong">
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="flex flex-wrap items-center gap-2 text-body font-semibold text-fg">
                        {p.label}
                        {p.available && recommended?.name === p.name ? <Badge tone="accent">Recommended</Badge> : null}
                        {!p.available ? <Badge tone="neutral">Not set up yet</Badge> : null}
                      </span>
                      <span className="text-caption text-fg-muted">{p.description}</span>
                    </span>
                  </Label>
                );
              })}
            </RadioGroup>
          ) : null}
          {fields.provider ? <p className="text-caption text-error">{fields.provider}</p> : null}

          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="secondary" onClick={() => setStep(0)}>
              <ArrowLeft /> Back
            </Button>
            <Button type="submit" disabled={!usable.length}>
              Continue to Review <ArrowRight />
            </Button>
          </div>
        </form>
      ) : null}

      {step === 2 ? (
        <form onSubmit={placeOrder} className="flex flex-col gap-5 rounded-xl border border-line bg-surface p-6 shadow-1">
          <h2 className="font-sans text-h4 font-semibold">Review your order</h2>
          <dl className="divide-y divide-line rounded-lg border border-line text-body-sm">
            <ReviewRow label="Contact" value={user ? user.email : email} onEdit={() => setStep(0)} />
            <ReviewRow label="Billing" value={`${name} · ${countryName}`} onEdit={() => setStep(0)} />
            {!free ? <ReviewRow label="Payment" value={chosen ? `${chosen.label} — ${chosen.description}` : "—"} onEdit={() => setStep(1)} /> : null}
          </dl>
          <div className="flex items-start gap-3">
            <Checkbox id="accept" checked={accept} onCheckedChange={(v) => setAccept(v === true)} aria-describedby={fields.acceptTerms ? "accept-error" : undefined} />
            <Label htmlFor="accept" className="text-body-sm font-normal text-fg-secondary">
              I agree to the{" "}
              <Link href="/terms" className="underline underline-offset-2">
                Terms
              </Link>{" "}
              and{" "}
              <Link href="/refund-policy" className="underline underline-offset-2">
                Refund Policy
              </Link>
              . Digital products are delivered to my library as soon as payment is confirmed.
            </Label>
          </div>
          {fields.acceptTerms ? (
            <p id="accept-error" className="-mt-3 text-caption text-error">
              {fields.acceptTerms}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="secondary" onClick={() => setStep(free ? 0 : 1)} disabled={busy}>
              <ArrowLeft /> Back
            </Button>
            <Button type="submit" size="lg" loading={busy} className="flex-1 sm:flex-none">
              {free ? (
                <>
                  Complete order <ArrowRight />
                </>
              ) : (
                <>
                  <Lock /> Pay {total} securely
                </>
              )}
            </Button>
          </div>
          <p className="flex items-center gap-2 text-caption text-fg-muted">
            <ShieldCheck className="size-3.5 text-accent-strong" aria-hidden />{" "}
            {free ? "No payment is needed for this order." : `Payment is processed securely by ${chosen?.label ?? "our payment partner"}. KRM.lib never stores card details.`}
          </p>
        </form>
      ) : null}
      {element}
    </div>
  );
}

function ReviewRow({ label, value, onEdit }: { label: string; value: string; onEdit: () => void }) {
  return (
    <div className="flex items-center gap-4 px-4 py-3">
      <dt className="w-20 shrink-0 text-fg-muted">{label}</dt>
      <dd className="min-w-0 flex-1 truncate text-fg">{value}</dd>
      <Button type="button" variant="ghost" size="sm" onClick={onEdit} aria-label={`Edit ${label.toLowerCase()}`}>
        <Pencil /> Edit
      </Button>
    </div>
  );
}

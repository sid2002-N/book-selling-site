"use client";

import { TicketPercent, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";

/** Coupon input; validation and amounts are server-side, with a distinct message per failure. */
export function CouponForm({ applied }: { applied: string | null }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const apply = (e: FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      setError(null);
      const res = await fetch("/api/v1/cart/coupon", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
      const body = (await res.json().catch(() => null)) as { error?: { message: string } } | null;
      if (!res.ok) {
        setError(body?.error?.message ?? "This coupon couldn't be applied.");
        return;
      }
      setCode("");
      router.refresh();
    });
  };

  const remove = () =>
    startTransition(async () => {
      await fetch("/api/v1/cart/coupon", { method: "DELETE" });
      router.refresh();
    });

  if (applied) {
    return (
      <div className="flex items-center justify-between rounded-md bg-success-soft px-3 py-2 text-body-sm text-success">
        <span className="flex items-center gap-2 font-medium">
          <TicketPercent className="size-4" aria-hidden /> {applied} applied
        </span>
        <button type="button" onClick={remove} disabled={pending} className="flex items-center gap-1 text-caption underline" aria-label={`Remove coupon ${applied}`}>
          <X className="size-3.5" aria-hidden /> Remove
        </button>
      </div>
    );
  }
  return (
    <form onSubmit={apply} className="flex flex-col gap-2" noValidate>
      <label htmlFor="coupon" className="text-label font-medium text-fg-secondary">
        Have a coupon?
      </label>
      <div className="flex gap-2">
        <Input
          id="coupon"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Enter code"
          autoComplete="off"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "coupon-error" : undefined}
          className="uppercase"
        />
        <Button type="submit" variant="secondary" loading={pending} disabled={code.trim().length < 3}>
          Apply
        </Button>
      </div>
      {error ? (
        <p id="coupon-error" role="alert" className="text-caption text-error">
          {error}
        </p>
      ) : null}
    </form>
  );
}

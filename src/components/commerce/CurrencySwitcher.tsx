"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { Currency } from "@/lib/money";
import { cn } from "@/lib/cn";

const OPTIONS: { value: Currency; label: string }[] = [
  { value: "INR", label: "INR" },
  { value: "USD", label: "USD" },
];

/** Segmented currency choice; the server re-prices everything after the switch. */
export function CurrencySwitcher({ current, className, tone = "light" }: { current: Currency; className?: string; tone?: "light" | "dark" }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const choose = (currency: Currency) =>
    startTransition(async () => {
      await fetch("/api/v1/preferences/currency", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currency }) });
      router.refresh();
    });
  return (
    <div role="group" aria-label="Currency" aria-busy={pending} className={cn("inline-flex rounded-full border p-0.5", tone === "dark" ? "border-fg-on-ink/30" : "border-line-strong", className)}>
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={current === o.value}
          disabled={pending}
          onClick={() => current !== o.value && choose(o.value)}
          className={cn(
            "rounded-full px-3 py-1 text-caption font-semibold transition-colors duration-fast",
            current === o.value
              ? tone === "dark"
                ? "bg-fg-on-ink text-ink"
                : "bg-ink text-fg-on-ink"
              : tone === "dark"
                ? "text-fg-on-ink/80 hover:text-fg-on-ink"
                : "text-fg-secondary hover:text-fg",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

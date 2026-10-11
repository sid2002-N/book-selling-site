"use client";

import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import type { ProductCard } from "@/modules/catalog";
import { formatMoney } from "@/lib/money";
import { BookCover } from "@/components/library/BookCover";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Choice";
import { toast } from "@/components/ui/Toast";

/**
 * "Frequently Bought Together". The total shown is a display sum of server prices; the cart
 * recomputes everything server-side.
 */
export function FrequentlyBought({ items, basis }: { items: ProductCard[]; basis: "orders" | "related" }) {
  const router = useRouter();
  const [selected, setSelected] = useState(() => new Set(items.map((i) => i.id)));
  const [pending, startTransition] = useTransition();
  const chosen = items.filter((i) => selected.has(i.id) && i.price);
  const currency = items.find((i) => i.price)?.price?.currency;
  const total = useMemo(() => chosen.reduce((acc, i) => acc + (i.price?.amountMinor ?? 0), 0), [chosen]);

  const addAll = () =>
    startTransition(async () => {
      let added = 0;
      for (const item of chosen) {
        const res = await fetch("/api/v1/cart/items", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId: item.id }) });
        if (res.ok) added++;
      }
      router.refresh();
      toast(added ? { title: `Added ${added} item${added === 1 ? "" : "s"} to cart`, tone: "success", action: { label: "View Cart", onClick: () => router.push("/cart") } } : { title: "Nothing was added", description: "These items may already be in your cart or library.", tone: "error" });
    });

  return (
    <section aria-labelledby="fbt" className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-5">
      <div>
        <h2 id="fbt" className="text-h3">
          {basis === "orders" ? "Frequently Bought Together" : "Pairs Well With"}
        </h2>
        {basis === "related" ? <p className="text-caption text-fg-muted">Suggested from the same collection.</p> : null}
      </div>
      <ul className="flex flex-col gap-3">
        {items.map((item) => (
          <li key={item.id}>
            <label className="flex cursor-pointer items-center gap-3">
              <Checkbox
                checked={selected.has(item.id)}
                onCheckedChange={(v) => setSelected((s) => { const n = new Set(s); if (v) n.add(item.id); else n.delete(item.id); return n; })}
                aria-label={`Include ${item.title}`}
              />
              <span className="w-12 shrink-0">
                <BookCover id={item.id} title={item.title} coverUrl={item.coverUrl} spineColor={item.spineColor} sizes="48px" compact className="shadow-1" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="line-clamp-2 text-body-sm font-medium text-fg">{item.title}</span>
                <span className="text-caption text-fg-muted">{item.price?.label}</span>
              </span>
            </label>
          </li>
        ))}
      </ul>
      {currency && chosen.length ? (
        <div className="flex flex-col gap-3 border-t border-line pt-4">
          <p className="flex items-baseline justify-between text-body-sm">
            <span className="font-medium">Total</span>
            <span className="font-serif text-h4 font-semibold">{formatMoney({ amountMinor: total, currency })}</span>
          </p>
          <Button onClick={addAll} loading={pending} block>
            Add {chosen.length === 1 ? "to Cart" : "All to Cart"} <ArrowRight />
          </Button>
        </div>
      ) : null}
    </section>
  );
}

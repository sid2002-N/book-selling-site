"use client";

import { Bookmark, ShoppingBag, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { ProductCard } from "@/modules/catalog";
import { BookCover } from "@/components/library/BookCover";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import { Price } from "./Price";

/** One cart line. Quantity is fixed at 1 for digital products (C2), so there is no stepper. */
export function CartItemRow({ item, saved = false }: { item: ProductCard; saved?: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const call = (input: RequestInfo, init: RequestInit, success: string) =>
    startTransition(async () => {
      const res = await fetch(input, { ...init, headers: { "Content-Type": "application/json" } });
      if (!res.ok) {
        toast({ title: "Something went wrong", description: "Please try again.", tone: "error" });
        return;
      }
      toast({ title: success, description: item.title });
      router.refresh();
    });

  return (
    <li className="flex gap-4 py-5" aria-busy={pending}>
      <Link href={item.href} className="w-20 shrink-0 sm:w-24" tabIndex={-1} aria-hidden>
        <BookCover id={item.id} title={item.title} coverUrl={item.coverUrl} spineColor={item.spineColor} sizes="96px" />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
          <div className="min-w-0">
            <Link href={item.href} className="line-clamp-2 font-sans text-body font-semibold text-fg hover:underline">
              {item.title}
            </Link>
            <p className="text-caption text-fg-muted">
              {item.typeLabel} · Digital download
            </p>
          </div>
          <Price price={item.price} size="sm" />
        </div>
        <div className="mt-auto flex flex-wrap gap-1 pt-2">
          {saved ? (
            <Button variant="ghost" size="sm" disabled={pending} onClick={() => call(`/api/v1/cart/items/${item.id}/save-for-later`, { method: "POST", body: JSON.stringify({ saved: false }) }, "Moved to cart")}>
              <ShoppingBag /> Move to cart
            </Button>
          ) : (
            <Button variant="ghost" size="sm" disabled={pending} onClick={() => call(`/api/v1/cart/items/${item.id}/save-for-later`, { method: "POST", body: JSON.stringify({ saved: true }) }, "Saved for later")}>
              <Bookmark /> Save for later
            </Button>
          )}
          <Button variant="ghost" size="sm" disabled={pending} onClick={() => call(`/api/v1/cart/items/${item.id}`, { method: "DELETE" }, "Removed from cart")} aria-label={`Remove ${item.title}`}>
            <Trash2 /> Remove
          </Button>
        </div>
      </div>
    </li>
  );
}

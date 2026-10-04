"use client";

import { Check, ShoppingBag } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, type ButtonProps } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";

type Props = {
  productId: string;
  title: string;
  mode?: "add" | "buy";
  iconOnly?: boolean;
} & Pick<ButtonProps, "variant" | "size" | "block" | "className">;

/**
 * Adds to the server-side cart (quantity is always 1, C2). "Buy" adds then goes to checkout.
 * Prices are never sent from the client.
 */
export function AddToCartButton({ productId, title, mode = "add", iconOnly, variant, size, block, className }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [added, setAdded] = useState(false);

  const onClick = () =>
    startTransition(async () => {
      const res = await fetch("/api/v1/cart/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      const body = (await res.json().catch(() => null)) as { error?: { code: string; message: string } } | null;
      if (!res.ok) {
        if (body?.error?.code === "ALREADY_OWNED") {
          toast({ title: "Already in your library", description: title, action: { label: "Open Library", onClick: () => router.push("/account/library") } });
          return;
        }
        toast({ title: "Couldn't add to cart", description: body?.error?.message ?? "Please try again.", tone: "error" });
        return;
      }
      router.refresh();
      if (mode === "buy") {
        router.push("/checkout");
        return;
      }
      setAdded(true);
      toast({ title: "Added to cart", description: title, tone: "success", action: { label: "View Cart", onClick: () => router.push("/cart") } });
    });

  if (iconOnly) {
    return (
      <Button variant={variant ?? "primary"} size="icon-sm" onClick={onClick} loading={pending} aria-label={`Add ${title} to cart`} className={className}>
        {added ? <Check /> : <ShoppingBag />}
      </Button>
    );
  }
  return (
    <Button variant={variant ?? (mode === "buy" ? "primary" : "secondary")} size={size} block={block} onClick={onClick} loading={pending} className={className}>
      {mode === "buy" ? "Buy Now" : added ? (<><Check /> Added</>) : (<><ShoppingBag /> Add to Cart</>)}
    </Button>
  );
}

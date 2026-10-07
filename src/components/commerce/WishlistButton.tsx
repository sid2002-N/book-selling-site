"use client";

import { Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cn } from "@/lib/cn";
import { toast } from "@/components/ui/Toast";

/** Optimistic wishlist heart (Flow 11). Signed-out visitors are sent to sign in. */
export function WishlistButton({
  productId,
  title,
  initial = false,
  signedIn,
  className,
  variant = "overlay",
}: {
  productId: string;
  title: string;
  initial?: boolean;
  signedIn: boolean;
  className?: string;
  variant?: "overlay" | "outline";
}) {
  const [saved, setSaved] = useState(initial);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const toggle = () => {
    if (!signedIn) {
      router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    const next = !saved;
    setSaved(next);
    startTransition(async () => {
      const res = await fetch("/api/v1/account/wishlist", {
        method: next ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      if (!res.ok) {
        setSaved(!next);
        toast({ title: "Couldn't update your wishlist", description: "Please try again.", tone: "error" });
        return;
      }
      toast({ title: next ? "Saved to wishlist" : "Removed from wishlist", description: title, tone: "success" });
    });
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${title} from wishlist` : `Save ${title} to wishlist`}
      className={cn(
        "flex items-center justify-center rounded-full transition-[transform,background-color,color] duration-fast active:scale-90",
        variant === "overlay" ? "size-9 bg-surface-raised/90 text-fg-secondary shadow-1 hover:text-terracotta" : "size-11 border border-line-strong bg-surface text-fg-secondary hover:text-terracotta",
        saved && "text-terracotta",
        className,
      )}
    >
      <Heart className={cn("size-4.5", saved && "fill-terracotta")} aria-hidden />
    </button>
  );
}

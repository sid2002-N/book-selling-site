"use client";

import { Library } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";

/** Free resources go straight into the library (no checkout) for signed-in, verified readers. */
export function ClaimFreeButton({ productId, title, signedIn }: { productId: string; title: string; signedIn: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const claim = () => {
    if (!signedIn) {
      router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    startTransition(async () => {
      const res = await fetch("/api/v1/library/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      const body = (await res.json().catch(() => null)) as { error?: { code: string; message: string } } | null;
      if (!res.ok) {
        if (body?.error?.code === "EMAIL_NOT_VERIFIED") {
          toast({ title: "Verify your email first", description: "We'll add it to your library once your email is confirmed.", tone: "error", action: { label: "Verify", onClick: () => router.push("/verify-email") } });
          return;
        }
        toast({ title: "Couldn't add to your library", description: body?.error?.message ?? "Please try again.", tone: "error" });
        return;
      }
      toast({ title: "Added to your library", description: title, tone: "success", action: { label: "Open Library", onClick: () => router.push("/account/library") } });
      router.refresh();
    });
  };
  return (
    <Button size="lg" block onClick={claim} loading={pending}>
      <Library /> Add to My Library
    </Button>
  );
}

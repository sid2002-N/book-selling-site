"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { toast } from "@/components/ui/Toast";

export function DeleteReviewButton({ reviewId }: { reviewId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Trash2 /> Delete
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Delete this review?"
        description="It will be removed from the product page. You can write a new one later."
        confirmLabel="Delete review"
        destructive
        loading={busy}
        onConfirm={async () => {
          setBusy(true);
          const res = await fetch(`/api/v1/account/reviews/${reviewId}`, { method: "DELETE" });
          setBusy(false);
          setOpen(false);
          if (!res.ok) return toast({ title: "Couldn't delete review", description: "Please try again.", tone: "error" });
          toast({ title: "Review deleted" });
          router.refresh();
        }}
      />
    </>
  );
}

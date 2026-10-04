"use client";

import { Undo2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { FormAlert } from "@/components/auth/FormAlert";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/Dialog";
import { Field, Textarea } from "@/components/ui/Field";
import { toast } from "@/components/ui/Toast";

/** Customer refund request; eligibility (window, status, duplicates) is enforced server-side. */
export function RefundRequestDialog({ orderId, orderNumber, amount }: { orderId: string; orderNumber: string; amount: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setFieldError(undefined);
    const res = await fetch(`/api/v1/account/orders/${orderId}/refund-requests`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason }) });
    const body = (await res.json().catch(() => null)) as { error?: { message: string; fields?: Record<string, string> } } | null;
    setBusy(false);
    if (!res.ok) {
      if (body?.error?.fields?.reason) setFieldError(body.error.fields.reason);
      else setError(body?.error?.message ?? "We couldn't send your request. Please try again.");
      return;
    }
    setOpen(false);
    toast({ title: "Refund requested", description: `We'll review your request for order #${orderNumber} and email you.`, tone: "success" });
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">
          <Undo2 /> Request refund
        </Button>
      </DialogTrigger>
      <DialogContent title="Request a refund" description={`Order #${orderNumber} · ${amount}`}>
        <form onSubmit={submit} className="flex flex-col gap-4">
          {error ? <FormAlert>{error}</FormAlert> : null}
          <Field label="What went wrong?" hint="Our team reviews every request. Access is removed once a full refund completes." error={fieldError}>
            {(ids) => <Textarea id={ids.id} rows={4} value={reason} onChange={(e) => setReason(e.target.value)} aria-describedby={ids.describedBy} aria-invalid={ids.invalid} maxLength={1000} />}
          </Field>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={busy}>
              Send request
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

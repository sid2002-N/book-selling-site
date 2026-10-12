"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { issueRefundAction } from "../../actions";
import { FormAlert } from "@/components/auth/FormAlert";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogContent } from "@/components/ui/Dialog";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { toast } from "@/components/ui/Toast";

/** Full or partial admin refund (UX Flow 18). The server re-checks orders.refund and the balance. */
export function IssueRefund({ orderId, refundableLabel, currencySymbol }: { orderId: string; refundableLabel: string; currencySymbol: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();

  return (
    <>
      <Button size="sm" variant="destructive-outline" onClick={() => setOpen(true)}>
        Refund order
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title="Refund this order" description={`Refundable balance: ${refundableLabel}. The refund goes back through the original payment provider.`}>
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              start(async () => {
                const result = await issueRefundAction(orderId, { amount, reason });
                if (result.status === "error") {
                  setError(result.message ?? "The refund couldn't be issued.");
                  setFields(result.fields ?? {});
                  return;
                }
                setOpen(false);
                toast({ title: result.message ?? "Refund issued", tone: "success" });
                router.refresh();
              });
            }}
          >
            {error ? <FormAlert>{error}</FormAlert> : null}
            <Field label={`Amount (${currencySymbol})`} optional hint="Leave blank to refund the full balance." error={fields.amount}>
              {(ids) => <Input id={ids.id} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} aria-describedby={ids.describedBy} aria-invalid={ids.invalid} />}
            </Field>
            <Field label="Reason" hint="Shared with the customer and kept in the audit log." error={fields.reason}>
              {(ids) => <Textarea id={ids.id} rows={3} required maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} aria-describedby={ids.describedBy} aria-invalid={ids.invalid} />}
            </Field>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="destructive" size="sm" loading={pending}>
                Issue refund
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

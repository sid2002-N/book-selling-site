"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { FormAlert } from "@/components/auth/FormAlert";
import { Button, type ButtonProps } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Dialog, DialogContent } from "@/components/ui/Dialog";
import { Field, Textarea } from "@/components/ui/Field";
import { toast } from "@/components/ui/Toast";
import type { FormState } from "@/lib/form-state";

type Props = {
  /** A bound Server Action; the server re-checks permission and writes the audit entry. */
  action: (input: { reason?: string }) => Promise<FormState>;
  children: ReactNode;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  confirm?: { title: string; description: ReactNode; confirmLabel: string; destructive?: boolean };
  /** Ask for a note first (rejections, blocks); required notes block an empty submit. */
  reason?: { title: string; description?: ReactNode; label: string; required?: boolean; confirmLabel: string; destructive?: boolean };
  success?: string;
  className?: string;
};

export function ActionButton({ action, children, variant = "secondary", size = "sm", confirm, reason, success, className }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  function run(input: { reason?: string }) {
    setError(null);
    start(async () => {
      const result = await action(input);
      if (result.status === "error") {
        const message = result.fields?.reason ?? result.fields?.note ?? result.message ?? "That didn't work.";
        if (reason) setError(message);
        else toast({ title: message, tone: "error" });
        return;
      }
      setOpen(false);
      setNote("");
      toast({ title: result.message ?? success ?? "Saved", tone: "success" });
      router.refresh();
    });
  }

  if (reason) {
    return (
      <>
        <Button type="button" variant={variant} size={size} className={className} onClick={() => setOpen(true)}>
          {children}
        </Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent title={reason.title} description={reason.description}>
            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (reason.required && !note.trim()) {
                  setError("Please add a note.");
                  return;
                }
                run({ reason: note });
              }}
            >
              {error ? <FormAlert>{error}</FormAlert> : null}
              <Field label={reason.label} optional={!reason.required}>
                {(ids) => <Textarea id={ids.id} rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} aria-describedby={ids.describedBy} />}
              </Field>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" variant={reason.destructive ? "destructive" : "primary"} loading={pending}>
                  {reason.confirmLabel}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  if (confirm) {
    return (
      <>
        <Button type="button" variant={variant} size={size} className={className} onClick={() => setOpen(true)} loading={pending}>
          {children}
        </Button>
        <ConfirmDialog
          open={open}
          onOpenChange={setOpen}
          title={confirm.title}
          description={confirm.description}
          confirmLabel={confirm.confirmLabel}
          destructive={confirm.destructive}
          loading={pending}
          onConfirm={() => run({})}
        />
      </>
    );
  }

  return (
    <Button type="button" variant={variant} size={size} className={className} loading={pending} onClick={() => run({})}>
      {children}
    </Button>
  );
}

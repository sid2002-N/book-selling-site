"use client";

import { useActionState } from "react";
import { FormAlert } from "@/components/auth/FormAlert";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { initialFormState } from "@/lib/form-state";
import { recoveryCodeAction } from "../../actions";

export function RecoveryForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(recoveryCodeAction, initialFormState);
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      {state.status === "error" && !state.fields ? <FormAlert>{state.message}</FormAlert> : null}
      <Field label="Recovery code" hint="Enter one of the 10-character codes you saved when you set up 2FA." error={state.fields?.code}>
        {({ id, describedBy, invalid }) => (
          <Input id={id} name="code" autoComplete="one-time-code" placeholder="XXXX-XXXX-XX" className="font-mono uppercase" aria-describedby={describedBy} aria-invalid={invalid} />
        )}
      </Field>
      <Button type="submit" block loading={pending}>
        Use recovery code
      </Button>
    </form>
  );
}

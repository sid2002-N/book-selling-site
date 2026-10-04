"use client";

import { useActionState, useState } from "react";
import { FormAlert } from "@/components/auth/FormAlert";
import { PasswordChecklist } from "@/components/auth/PasswordChecklist";
import { Button } from "@/components/ui/Button";
import { Field, PasswordInput } from "@/components/ui/Field";
import { initialFormState } from "@/lib/form-state";
import { resetPasswordAction } from "../actions";

export function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPasswordAction, initialFormState);
  const [password, setPassword] = useState("");
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="token" value={token} />
      {state.status === "error" && !state.fields ? (
        <FormAlert>
          {state.message}{" "}
          {state.code === "TOKEN_EXPIRED" || state.code === "TOKEN_INVALID" ? (
            <a href="/forgot-password" className="font-medium underline">
              Request a new link
            </a>
          ) : null}
        </FormAlert>
      ) : null}
      <Field label="New password" error={state.fields?.password}>
        {({ id, describedBy, invalid }) => (
          <div className="flex flex-col gap-2">
            <PasswordInput
              id={id}
              name="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-describedby={[describedBy, `${id}-rules`].filter(Boolean).join(" ")}
              aria-invalid={invalid}
            />
            <PasswordChecklist value={password} id={`${id}-rules`} />
          </div>
        )}
      </Field>
      <Field label="Confirm password" error={state.fields?.confirm}>
        {({ id, describedBy, invalid }) => (
          <PasswordInput id={id} name="confirm" autoComplete="new-password" aria-describedby={describedBy} aria-invalid={invalid} />
        )}
      </Field>
      <Button type="submit" block loading={pending}>
        Reset Password
      </Button>
    </form>
  );
}

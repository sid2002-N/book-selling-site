"use client";

import { useActionState, useState } from "react";
import { FormAlert } from "@/components/auth/FormAlert";
import { PasswordChecklist } from "@/components/auth/PasswordChecklist";
import { Button } from "@/components/ui/Button";
import { Field, PasswordInput } from "@/components/ui/Field";
import { initialFormState } from "@/lib/form-state";
import { changePasswordAction } from "./actions";

export function ChangePasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [state, action, pending] = useActionState(changePasswordAction, initialFormState);
  const [password, setPassword] = useState("");
  return (
    <form action={action} className="flex max-w-md flex-col gap-4" noValidate>
      {state.status !== "idle" && !state.fields ? (
        <FormAlert tone={state.status === "success" ? "success" : "error"}>{state.message}</FormAlert>
      ) : null}
      {hasPassword ? (
        <Field label="Current password" error={state.fields?.currentPassword}>
          {({ id, describedBy, invalid }) => (
            <PasswordInput id={id} name="currentPassword" autoComplete="current-password" aria-describedby={describedBy} aria-invalid={invalid} />
          )}
        </Field>
      ) : (
        <input type="hidden" name="currentPassword" value="" />
      )}
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
      <Field label="Confirm new password" error={state.fields?.confirm}>
        {({ id, describedBy, invalid }) => (
          <PasswordInput id={id} name="confirm" autoComplete="new-password" aria-describedby={describedBy} aria-invalid={invalid} />
        )}
      </Field>
      <div>
        <Button type="submit" loading={pending}>
          {hasPassword ? "Update Password" : "Set Password"}
        </Button>
      </div>
    </form>
  );
}

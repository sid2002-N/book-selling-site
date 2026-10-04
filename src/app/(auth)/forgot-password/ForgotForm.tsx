"use client";

import { useActionState } from "react";
import { FormAlert } from "@/components/auth/FormAlert";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { initialFormState } from "@/lib/form-state";
import { forgotPasswordAction } from "../actions";

export function ForgotForm() {
  const [state, action, pending] = useActionState(forgotPasswordAction, initialFormState);
  if (state.status === "success") return <FormAlert tone="success">{state.message}</FormAlert>;
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {state.status === "error" && !state.fields ? <FormAlert>{state.message}</FormAlert> : null}
      <Field label="Email address" error={state.fields?.email}>
        {({ id, describedBy, invalid }) => (
          <Input key={state.values?.email ?? ""} defaultValue={state.values?.email} id={id} name="email" type="email" autoComplete="email" required placeholder="you@example.com" aria-describedby={describedBy} aria-invalid={invalid} />
        )}
      </Field>
      <Button type="submit" block loading={pending}>
        Send Reset Link
      </Button>
    </form>
  );
}

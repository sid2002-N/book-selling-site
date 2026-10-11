"use client";

import { useActionState, useState } from "react";
import { FormAlert } from "@/components/auth/FormAlert";
import { PasswordChecklist } from "@/components/auth/PasswordChecklist";
import { Button } from "@/components/ui/Button";
import { Field, Input, PasswordInput } from "@/components/ui/Field";
import { initialFormState } from "@/lib/form-state";
import { registerAction } from "../actions";

export function RegisterForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(registerAction, initialFormState);
  const [password, setPassword] = useState("");
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="next" value={next} />
      {state.status === "error" && !state.fields ? <FormAlert>{state.message}</FormAlert> : null}
      <Field label="Full name" error={state.fields?.name}>
        {({ id, describedBy, invalid }) => (
          <Input key={state.values?.name ?? ""} defaultValue={state.values?.name} id={id} name="name" autoComplete="name" required aria-describedby={describedBy} aria-invalid={invalid} />
        )}
      </Field>
      <Field label="Email address" error={state.fields?.email}>
        {({ id, describedBy, invalid }) => (
          <Input key={state.values?.email ?? ""} defaultValue={state.values?.email} id={id} name="email" type="email" autoComplete="email" required placeholder="you@example.com" aria-describedby={describedBy} aria-invalid={invalid} />
        )}
      </Field>
      <Field label="Password" error={state.fields?.password}>
        {({ id, describedBy, invalid }) => (
          <div className="flex flex-col gap-2">
            <PasswordInput
              id={id}
              name="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-describedby={[describedBy, `${id}-rules`].filter(Boolean).join(" ")}
              aria-invalid={invalid}
            />
            <PasswordChecklist value={password} id={`${id}-rules`} />
          </div>
        )}
      </Field>
      <Button type="submit" block loading={pending}>
        Create Account
      </Button>
      <p className="text-caption text-fg-muted">
        By creating an account you agree to our <a href="/terms" className="underline">Terms of Service</a> and{" "}
        <a href="/privacy" className="underline">Privacy Policy</a>.
      </p>
    </form>
  );
}

"use client";

import Link from "next/link";
import { useActionState } from "react";
import { FormAlert } from "@/components/auth/FormAlert";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Choice";
import { Field, Input, PasswordInput } from "@/components/ui/Field";
import { initialFormState } from "@/lib/form-state";
import { loginAction } from "../actions";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(loginAction, initialFormState);
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="next" value={next} />
      {state.status === "error" && !state.fields ? <FormAlert>{state.message}</FormAlert> : null}
      <Field label="Email address" error={state.fields?.email}>
        {({ id, describedBy, invalid }) => (
          <Input key={state.values?.email ?? ""} defaultValue={state.values?.email} id={id} name="email" type="email" autoComplete="email" required placeholder="you@example.com" aria-describedby={describedBy} aria-invalid={invalid} />
        )}
      </Field>
      <Field label="Password" error={state.fields?.password}>
        {({ id, describedBy, invalid }) => (
          <PasswordInput id={id} name="password" autoComplete="current-password" required aria-describedby={describedBy} aria-invalid={invalid} />
        )}
      </Field>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <label className="flex items-center gap-2 text-body-sm text-fg-secondary">
          <Checkbox name="remember" /> Keep me signed in
        </label>
        <Link href="/forgot-password" className="text-body-sm font-medium whitespace-nowrap text-fg underline-offset-4 hover:underline">
          Forgot password?
        </Link>
      </div>
      <Button type="submit" block loading={pending}>
        Sign In
      </Button>
    </form>
  );
}

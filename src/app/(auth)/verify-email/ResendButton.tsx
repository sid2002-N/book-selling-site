"use client";

import { useActionState } from "react";
import { FormAlert } from "@/components/auth/FormAlert";
import { Button } from "@/components/ui/Button";
import { initialFormState } from "@/lib/form-state";
import { resendVerificationAction } from "../actions";

export function ResendButton({ label = "Resend email", variant = "secondary" }: { label?: string; variant?: "primary" | "secondary" }) {
  const [state, action, pending] = useActionState(resendVerificationAction, initialFormState);
  return (
    <form action={action} className="flex flex-col gap-3">
      {state.status !== "idle" ? <FormAlert tone={state.status === "success" ? "success" : "error"}>{state.message}</FormAlert> : null}
      <Button type="submit" variant={variant} block loading={pending}>
        {label}
      </Button>
    </form>
  );
}

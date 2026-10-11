"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { FormAlert } from "@/components/auth/FormAlert";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Choice";
import { OTPInput } from "@/components/ui/OTPInput";
import { initialFormState } from "@/lib/form-state";
import { twoFactorAction } from "../actions";

export function TwoFactorForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(twoFactorAction, initialFormState);
  const [code, setCode] = useState("");
  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="next" value={next} />
      <input type="hidden" name="code" value={code} />
      {state.status === "error" ? <FormAlert>{state.fields?.code ?? state.message}</FormAlert> : null}
      <OTPInput value={code} onChange={setCode} invalid={state.status === "error"} />
      <label className="flex items-center gap-2 text-body-sm text-fg-secondary">
        <Checkbox name="remember" /> Remember this device for 30 days
      </label>
      <Button type="submit" block loading={pending} disabled={code.length !== 6}>
        Verify
      </Button>
      <Link href={`/2fa/recovery?next=${encodeURIComponent(next)}`} className="text-center text-body-sm font-medium text-fg underline underline-offset-4">
        Use a different method
      </Link>
    </form>
  );
}

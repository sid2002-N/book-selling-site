"use client";

import { Check, Copy, Download, ShieldCheck } from "lucide-react";
import Image from "next/image";
import { useActionState, useState, useTransition } from "react";
import { FormAlert } from "@/components/auth/FormAlert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { OTPInput } from "@/components/ui/OTPInput";
import { initialFormState } from "@/lib/form-state";
import { confirmTwoFactorAction, disableTwoFactorAction, startTwoFactorAction } from "./actions";

type Step = { kind: "intro" } | { kind: "scan"; qrDataUrl: string; secret: string } | { kind: "codes"; codes: string[] };

export function TwoFactorSetup({ enabled, isAdmin, autoStart }: { enabled: boolean; isAdmin: boolean; autoStart?: boolean }) {
  const [step, setStep] = useState<Step>({ kind: "intro" });
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  const start = () =>
    startTransition(async () => {
      setError(null);
      const result = await startTwoFactorAction();
      if (result.ok) setStep({ kind: "scan", qrDataUrl: result.qrDataUrl, secret: result.secret });
      else setError(result.message);
    });

  const confirm = () =>
    startTransition(async () => {
      setError(null);
      const result = await confirmTwoFactorAction(code);
      if (result.ok) setStep({ kind: "codes", codes: result.recoveryCodes });
      else setError(result.message);
    });

  if (step.kind === "codes") {
    const text = step.codes.join("\n");
    return (
      <div className="flex flex-col gap-4">
        <FormAlert tone="success">Two-factor authentication is on. Save these recovery codes now — they won&apos;t be shown again.</FormAlert>
        <ul className="grid grid-cols-2 gap-2 rounded-md bg-canvas-subtle p-4 font-mono text-body-sm sm:grid-cols-5" aria-label="Recovery codes">
          {step.codes.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="secondary"
            onClick={async () => {
              await navigator.clipboard.writeText(text);
              setCopied(true);
            }}
          >
            {copied ? <Check /> : <Copy />} {copied ? "Copied" : "Copy codes"}
          </Button>
          <Button asChild variant="secondary">
            <a href={`data:text/plain;charset=utf-8,${encodeURIComponent(`KRM.lib recovery codes\n\n${text}\n`)}`} download="krm-lib-recovery-codes.txt">
              <Download /> Download
            </a>
          </Button>
          <Button onClick={() => window.location.reload()}>Done</Button>
        </div>
      </div>
    );
  }

  if (enabled) return <TwoFactorEnabled isAdmin={isAdmin} />;

  if (step.kind === "scan") {
    return (
      <div className="flex flex-col gap-5">
        <ol className="flex list-decimal flex-col gap-1 pl-5 text-body-sm text-fg-secondary">
          <li>Open an authenticator app (Google Authenticator, 1Password, Authy…).</li>
          <li>Scan the QR code, or enter the setup key manually.</li>
          <li>Enter the 6-digit code the app shows.</li>
        </ol>
        <div className="flex flex-col items-start gap-5 sm:flex-row">
          <Image src={step.qrDataUrl} alt="QR code for your authenticator app" width={180} height={180} unoptimized className="rounded-md border border-line" />
          <div className="flex flex-col gap-2">
            <p className="text-label text-fg-muted">Setup key</p>
            <code className="rounded-sm bg-canvas-subtle px-3 py-2 font-mono text-body-sm break-all">{step.secret}</code>
          </div>
        </div>
        {error ? <FormAlert>{error}</FormAlert> : null}
        <OTPInput value={code} onChange={setCode} invalid={Boolean(error)} />
        <div className="flex gap-3">
          <Button onClick={confirm} loading={pending} disabled={code.length !== 6}>
            Verify &amp; enable
          </Button>
          <Button variant="ghost" onClick={() => setStep({ kind: "intro" })}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {autoStart || isAdmin ? (
        <FormAlert>Admin accounts must use two-factor authentication. Set it up to continue to the admin area.</FormAlert>
      ) : null}
      <ul className="flex flex-col gap-2 text-body-sm text-fg-secondary">
        {["Stronger account security", "Protects your purchases and library", "Quick and easy to set up"].map((b) => (
          <li key={b} className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-accent-strong" aria-hidden /> {b}
          </li>
        ))}
      </ul>
      {error ? <FormAlert>{error}</FormAlert> : null}
      <div>
        <Button onClick={start} loading={pending}>
          Set Up 2FA
        </Button>
      </div>
    </div>
  );
}

function TwoFactorEnabled({ isAdmin }: { isAdmin: boolean }) {
  const [state, action, pending] = useActionState(disableTwoFactorAction, initialFormState);
  const [code, setCode] = useState("");
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Badge tone="success">
          <ShieldCheck aria-hidden /> Enabled
        </Badge>
        <span className="text-body-sm text-fg-secondary">Authenticator app</span>
      </div>
      {state.status !== "idle" ? <FormAlert tone={state.status === "success" ? "success" : "error"}>{state.message}</FormAlert> : null}
      {isAdmin ? (
        <p className="text-caption text-fg-muted">Two-factor authentication is required for admin accounts and can&apos;t be turned off.</p>
      ) : open ? (
        <form action={action} className="flex flex-col gap-3">
          <input type="hidden" name="code" value={code} />
          <p className="text-body-sm text-fg-secondary">Enter a current code from your authenticator app to turn 2FA off.</p>
          <OTPInput value={code} onChange={setCode} />
          <div className="flex gap-3">
            <Button type="submit" variant="destructive-outline" loading={pending} disabled={code.length !== 6}>
              Turn off 2FA
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <div>
          <Button variant="secondary" onClick={() => setOpen(true)}>
            Turn off
          </Button>
        </div>
      )}
    </div>
  );
}

"use client";

import { ArrowRight, CircleCheck } from "lucide-react";
import { useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";

export function NewsletterForm({ source = "home", tone = "light" }: { source?: string; tone?: "light" | "dark" }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<{ kind: "idle" | "done" | "error"; message?: string }>({ kind: "idle" });
  const [pending, startTransition] = useTransition();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await fetch("/api/v1/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source }),
      });
      const body = (await res.json().catch(() => null)) as { error?: { message: string; fields?: Record<string, string> } } | null;
      if (res.ok) setState({ kind: "done" });
      else setState({ kind: "error", message: body?.error?.fields?.email ?? body?.error?.message ?? "Please try again." });
    });
  };

  if (state.kind === "done") {
    return (
      <p role="status" className="flex items-center justify-center gap-2 text-body-sm font-medium text-success">
        <CircleCheck className="size-4" aria-hidden /> You&apos;re subscribed. Welcome to the library.
      </p>
    );
  }
  return (
    <form onSubmit={submit} className="flex w-full max-w-md flex-col gap-2" noValidate>
      <div className="flex gap-2">
        <label htmlFor={`newsletter-${source}`} className="sr-only">
          Email address
        </label>
        <Input
          id={`newsletter-${source}`}
          type="email"
          required
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={state.kind === "error"}
          aria-describedby={state.kind === "error" ? `newsletter-${source}-error` : undefined}
          className={tone === "dark" ? "border-white/20 bg-white/10 text-fg-on-ink placeholder:text-fg-on-ink/60" : undefined}
        />
        <Button type="submit" loading={pending}>
          Subscribe <ArrowRight />
        </Button>
      </div>
      {state.kind === "error" ? (
        <p id={`newsletter-${source}-error`} role="alert" className="text-caption text-error">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

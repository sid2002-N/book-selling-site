import { Check, Circle } from "lucide-react";
import { cn } from "@/lib/cn";

const rules = [
  { id: "length", label: "At least 8 characters", test: (v: string) => v.length >= 8 },
  { id: "mix", label: "Include a number and a letter", test: (v: string) => /[A-Za-z]/.test(v) && /[0-9]/.test(v) },
];

/** Live password checklist (Register / Reset Password screens). Mirrors `passwordSchema`. */
export function PasswordChecklist({ value, id }: { value: string; id?: string }) {
  return (
    <ul id={id} className="flex flex-col gap-1.5" aria-live="polite">
      {rules.map((rule) => {
        const met = rule.test(value);
        return (
          <li key={rule.id} className={cn("flex items-center gap-2 text-caption", met ? "text-success" : "text-fg-muted")}>
            {met ? <Check className="size-3.5" aria-hidden /> : <Circle className="size-3.5" aria-hidden />}
            {rule.label}
            <span className="sr-only">{met ? "(met)" : "(not met)"}</span>
          </li>
        );
      })}
    </ul>
  );
}

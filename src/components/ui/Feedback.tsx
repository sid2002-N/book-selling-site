import { Check } from "lucide-react";
import { Avatar as AvatarPrimitive, Progress as ProgressPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

/** Skeleton matches the final layout; shimmer is disabled under reduced motion by the global rule. */
export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      aria-hidden
      className={cn(
        "bg-shimmer animate-shimmer rounded-md",
        className,
      )}
      {...props}
    />
  );
}

export function ProgressBar({
  value,
  label,
  tone = "success",
  className,
}: {
  value: number;
  label: string;
  tone?: "success" | "accent" | "error";
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const toneClass = { success: "bg-success", accent: "bg-accent", error: "bg-error" }[tone];
  return (
    <ProgressPrimitive.Root
      value={clamped}
      aria-label={label}
      className={cn("relative h-1.5 w-full overflow-hidden rounded-full bg-canvas-subtle", className)}
    >
      <ProgressPrimitive.Indicator
        className={cn("h-full rounded-full transition-[width] duration-slow ease-out-soft", toneClass)}
        style={{ width: `${clamped}%` }}
      />
    </ProgressPrimitive.Root>
  );
}

export function Avatar({ src, name, className }: { src?: string | null; name: string; className?: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  return (
    <AvatarPrimitive.Root
      className={cn("inline-flex size-9 shrink-0 overflow-hidden rounded-full bg-accent-soft", className)}
    >
      {src ? <AvatarPrimitive.Image src={src} alt="" className="size-full object-cover" /> : null}
      <AvatarPrimitive.Fallback className="flex size-full items-center justify-center text-label font-semibold text-accent-strong">
        {initials}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
}

export function Stepper({ steps, current, className }: { steps: string[]; current: number; className?: string }) {
  return (
    <ol className={cn("flex items-center gap-2", className)} aria-label="Progress">
      {steps.map((step, i) => {
        const state = i < current ? "done" : i === current ? "current" : "upcoming";
        return (
          <li key={step} className="flex flex-1 items-center gap-2 last:flex-none">
            <span
              aria-current={state === "current" ? "step" : undefined}
              className="flex items-center gap-2 text-label font-medium whitespace-nowrap"
            >
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full text-caption font-semibold",
                  state === "upcoming" ? "border border-line-strong text-fg-muted" : "bg-ink text-fg-on-ink",
                )}
              >
                {state === "done" ? <Check className="size-3.5" aria-hidden /> : i + 1}
              </span>
              <span className={state === "upcoming" ? "text-fg-muted" : "text-fg"}>
                {step}
                {state === "done" ? <span className="sr-only"> (completed)</span> : null}
              </span>
            </span>
            {i < steps.length - 1 ? <span aria-hidden className="h-px flex-1 bg-line-strong" /> : null}
          </li>
        );
      })}
    </ol>
  );
}

export function Divider({ className, label }: { className?: string; label?: string }) {
  if (!label) return <hr className={cn("border-line", className)} />;
  return (
    <div className={cn("flex items-center gap-3 text-caption text-fg-muted", className)} role="separator">
      <span className="h-px flex-1 bg-line" />
      {label}
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}

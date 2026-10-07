import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type AuthCardProps = {
  title: string;
  description?: ReactNode;
  /** Handwritten-sign microcopy on the illustrated panel (Authentication Storyboard). */
  sign: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
};

/**
 * AuthCardTemplate: illustrated side panel + form card. The panel collapses on phones so the
 * form leads (DESIGN_SYSTEM §14). Panel art is a slot until final illustrations exist (OQ-12).
 */
export function AuthCard({ title, description, sign, children, footer, className }: AuthCardProps) {
  return (
    <div
      className={cn(
        "mx-auto grid w-full max-w-4xl overflow-hidden rounded-xl border border-line bg-surface shadow-2 md:grid-cols-2",
        className,
      )}
    >
      <div aria-hidden className="relative hidden min-h-80 flex-col justify-between gap-10 bg-canvas-subtle p-8 md:flex">
        <div>
          <div className="flex items-end gap-1.5 px-3">
            {["#2F4A3A", "#6B2A3A", "#B7832F", "#1F3B4D", "#9A4A2A", "#5A5A2E"].map((c, i) => (
              <span key={c} className="w-6 rounded-t-sm" style={{ backgroundColor: c, height: `${72 + ((i * 23) % 44)}px` }} />
            ))}
          </div>
          <div className="bg-shelf h-2.5 rounded-sm shadow-2" />
        </div>
        <div className="max-w-56 -rotate-2 self-start rounded-md border border-line-strong bg-surface-raised px-5 py-4 shadow-2">
          <p className="font-serif text-h4 text-fg-secondary italic">{sign}</p>
        </div>
      </div>
      <div className="flex flex-col gap-6 p-6 sm:p-10">
        <header className="flex flex-col gap-2">
          <h1 className="text-h1 text-fg">{title}</h1>
          {description ? <div className="text-body-sm text-fg-muted">{description}</div> : null}
        </header>
        {children}
        {footer ? <div className="text-body-sm text-fg-secondary">{footer}</div> : null}
      </div>
    </div>
  );
}

type AuthStatusProps = {
  tone: "success" | "error" | "warning" | "info";
  icon: ReactNode;
  title: string;
  description: ReactNode;
  children?: ReactNode;
};

const toneClasses: Record<AuthStatusProps["tone"], string> = {
  success: "bg-success-soft text-success",
  error: "bg-error-soft text-error",
  warning: "bg-warning-soft text-warning",
  info: "bg-accent-soft text-accent-strong",
};

/** AuthStatusTemplate: verification success/failure, locked, expired, reset done. */
export function AuthStatus({ tone, icon, title, description, children }: AuthStatusProps) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-5 rounded-xl border border-line bg-surface p-8 text-center shadow-2 sm:p-10">
      <div className={cn("flex size-16 items-center justify-center rounded-full [&_svg]:size-8", toneClasses[tone])}>{icon}</div>
      <h1 className="text-h2 text-fg">{title}</h1>
      <div className="text-body-sm text-fg-secondary">{description}</div>
      {children ? <div className="flex w-full flex-col gap-3">{children}</div> : null}
    </div>
  );
}

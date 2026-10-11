import { CircleAlert, CircleCheck } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Form-level message announced to assistive tech (DESIGN_SYSTEM §10). */
export function FormAlert({ tone = "error", children, className }: { tone?: "error" | "success"; children: ReactNode; className?: string }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2.5 rounded-md px-4 py-3 text-body-sm",
        tone === "error" ? "bg-error-soft text-error" : "bg-success-soft text-success",
        className,
      )}
    >
      {tone === "error" ? <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden /> : <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden />}
      <div>{children}</div>
    </div>
  );
}

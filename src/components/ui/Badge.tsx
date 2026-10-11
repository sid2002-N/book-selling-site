import { cva, type VariantProps } from "class-variance-authority";
import {
  CircleAlert,
  CircleCheck,
  CircleDashed,
  CircleDot,
  CircleSlash,
  Clock,
  RotateCcw,
  type LucideIcon,
} from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full font-semibold whitespace-nowrap [&_svg]:size-3",
  {
    variants: {
      tone: {
        neutral: "bg-canvas-subtle text-fg-secondary",
        accent: "bg-accent-soft text-accent-strong",
        deal: "bg-terracotta text-white",
        plum: "bg-plum-soft text-plum",
        success: "bg-success-soft text-success",
        warning: "bg-warning-soft text-warning",
        error: "bg-error-soft text-error",
        info: "bg-info-soft text-info",
        ink: "bg-ink text-fg-on-ink",
      },
      size: {
        sm: "px-2 py-0.5 text-micro uppercase",
        md: "px-2.5 py-1 text-caption",
      },
    },
    defaultVariants: { tone: "neutral", size: "md" },
  },
);

export function Badge({
  className,
  tone,
  size,
  ...props
}: ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone, size }), className)} {...props} />;
}

export type Status =
  | "published"
  | "draft"
  | "pending"
  | "processing"
  | "completed"
  | "success"
  | "active"
  | "inactive"
  | "scheduled"
  | "expired"
  | "failed"
  | "refunded"
  | "cancelled"
  | "open"
  | "resolved"
  | "archived";

const statusMap: Record<Status, { tone: VariantProps<typeof badgeVariants>["tone"]; icon: LucideIcon; label: string }> = {
  published: { tone: "success", icon: CircleCheck, label: "Published" },
  draft: { tone: "neutral", icon: CircleDashed, label: "Draft" },
  pending: { tone: "warning", icon: Clock, label: "Pending" },
  processing: { tone: "warning", icon: CircleDot, label: "Processing" },
  completed: { tone: "success", icon: CircleCheck, label: "Completed" },
  success: { tone: "success", icon: CircleCheck, label: "Success" },
  active: { tone: "success", icon: CircleCheck, label: "Active" },
  inactive: { tone: "neutral", icon: CircleSlash, label: "Inactive" },
  scheduled: { tone: "info", icon: Clock, label: "Scheduled" },
  expired: { tone: "error", icon: CircleSlash, label: "Expired" },
  failed: { tone: "error", icon: CircleAlert, label: "Failed" },
  refunded: { tone: "plum", icon: RotateCcw, label: "Refunded" },
  cancelled: { tone: "neutral", icon: CircleSlash, label: "Cancelled" },
  open: { tone: "error", icon: CircleDot, label: "Open" },
  resolved: { tone: "success", icon: CircleCheck, label: "Resolved" },
  archived: { tone: "neutral", icon: CircleSlash, label: "Archived" },
};

/** Status is never colour-only: icon + text + tone (DESIGN_SYSTEM §13). */
export function StatusBadge({ status, label, className }: { status: Status; label?: string; className?: string }) {
  const { tone, icon: Icon, label: defaultLabel } = statusMap[status];
  return (
    <Badge tone={tone} className={className}>
      <Icon aria-hidden />
      {label ?? defaultLabel}
    </Badge>
  );
}

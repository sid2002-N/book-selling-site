import { Badge } from "@/components/ui/Badge";

type Tone = "success" | "warning" | "error" | "info" | "neutral" | "plum";

const TONES: Record<string, Tone> = {
  paid: "success",
  pending_payment: "warning",
  payment_pending: "warning",
  failed: "error",
  cancelled: "neutral",
  refunded: "info",
  partially_refunded: "info",
  disputed: "plum",
  // refund statuses
  requested: "warning",
  approved: "info",
  processing: "warning",
  completed: "success",
  rejected: "neutral",
};

/** Status chip for orders and refunds (DESIGN_SYSTEM §9 status colours). */
export function OrderStatusBadge({ status, label }: { status: string; label: string }) {
  return <Badge tone={TONES[status] ?? "neutral"}>{label}</Badge>;
}

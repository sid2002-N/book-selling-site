/**
 * Payment and order state machines (docs/DATABASE.md §5). Pure so the guards can be tested
 * exhaustively; services apply them inside a row-locked transaction.
 */
import type { OrderStatus, PaymentStatus } from "@/generated/prisma/enums";
import type { Currency } from "@/lib/money";
import type { ProviderState } from "./types";

const PAYMENT_NEXT: Record<PaymentStatus, readonly PaymentStatus[]> = {
  created: ["processing", "requires_action", "pending_verification", "succeeded", "failed", "cancelled"],
  processing: ["requires_action", "pending_verification", "succeeded", "failed", "cancelled"],
  requires_action: ["processing", "pending_verification", "succeeded", "failed", "cancelled"],
  pending_verification: ["processing", "succeeded", "failed", "cancelled"],
  // Razorpay allows another attempt on the same provider order after a failure.
  failed: ["processing", "requires_action", "pending_verification", "succeeded"],
  // A capture can land after the customer closed the window.
  cancelled: ["pending_verification", "succeeded"],
  succeeded: ["partially_refunded", "refunded", "disputed"],
  partially_refunded: ["refunded", "disputed"],
  refunded: [],
  disputed: ["succeeded", "refunded"],
};

export function canTransitionPayment(from: PaymentStatus, to: PaymentStatus): boolean {
  return PAYMENT_NEXT[from].includes(to);
}

/** Maps a provider report to our payment status; `pending` (nothing attempted yet) maps to no change. */
export function targetPaymentStatus(state: ProviderState["status"]): PaymentStatus | null {
  switch (state) {
    case "succeeded":
      return "succeeded";
    case "failed":
      return "failed";
    case "processing":
      return "processing";
    case "requires_action":
      return "requires_action";
    case "cancelled":
      return "cancelled";
    case "pending":
      return null;
  }
}

const PAID_STATES: readonly OrderStatus[] = ["paid", "refunded", "partially_refunded", "disputed"];

export function isOrderPaid(status: OrderStatus): boolean {
  return PAID_STATES.includes(status);
}

/** Order status that follows a payment status change, or null to leave the order alone. */
export function orderStatusAfter(order: OrderStatus, payment: PaymentStatus): OrderStatus | null {
  if (isOrderPaid(order)) return null; // a paid order never goes backwards via a payment attempt
  switch (payment) {
    case "succeeded":
      return "paid";
    case "processing":
    case "requires_action":
    case "pending_verification":
      return order === "payment_pending" ? null : order === "cancelled" ? null : "payment_pending";
    case "failed":
      return order === "pending_payment" || order === "payment_pending" ? "failed" : null;
    case "cancelled":
      return order === "payment_pending" ? "pending_payment" : null;
    default:
      return null;
  }
}

/** Amount and currency reported by the provider must equal what we asked for (SECURITY §6). */
export function amountMatches(expected: { amountMinor: number; currency: Currency }, state: ProviderState): boolean {
  return state.amountMinor === expected.amountMinor && state.currency === expected.currency;
}

export const RETRYABLE_ORDER_STATES: readonly OrderStatus[] = ["pending_payment", "failed"];
export const CANCELLABLE_ORDER_STATES: readonly OrderStatus[] = ["pending_payment", "failed"];

/**
 * What the customer sees after paying (Flow 7, Payment Flow Showcase): every screen answers
 * what happened, whether money was charged, what to do next, and the order status. Pure.
 */
import type { OrderStatus, PaymentStatus } from "@/generated/prisma/enums";

export type PaymentScreen = "awaiting" | "processing" | "verification" | "success" | "failed" | "cancelled" | "refunded" | "disputed";
export type Charged = "yes" | "no" | "maybe";

export type ScreenModel = { screen: PaymentScreen; charged: Charged; terminal: boolean; canRetry: boolean; canCancel: boolean };

export function paymentScreen(order: OrderStatus, payment: PaymentStatus | null): ScreenModel {
  const base = { canRetry: false, canCancel: false };
  switch (order) {
    case "paid":
      return { ...base, screen: "success", charged: "yes", terminal: true };
    case "refunded":
    case "partially_refunded":
      return { ...base, screen: "refunded", charged: "yes", terminal: true };
    case "disputed":
      return { ...base, screen: "disputed", charged: "yes", terminal: true };
    case "cancelled":
      return { ...base, screen: "cancelled", charged: "no", terminal: true };
    case "failed":
      return { screen: "failed", charged: "no", terminal: true, canRetry: true, canCancel: true };
    case "payment_pending":
      return payment === "pending_verification"
        ? { ...base, screen: "verification", charged: "maybe", terminal: false }
        : { ...base, screen: "processing", charged: "maybe", terminal: false };
    case "pending_payment":
      if (payment === "cancelled") return { screen: "cancelled", charged: "no", terminal: true, canRetry: true, canCancel: true };
      if (payment === "failed") return { screen: "failed", charged: "no", terminal: true, canRetry: true, canCancel: true };
      return { screen: "awaiting", charged: "no", terminal: false, canRetry: true, canCancel: true };
  }
}

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment: "Awaiting payment",
  payment_pending: "Payment processing",
  paid: "Paid",
  failed: "Payment failed",
  cancelled: "Cancelled",
  refunded: "Refunded",
  partially_refunded: "Partially refunded",
  disputed: "Disputed",
};

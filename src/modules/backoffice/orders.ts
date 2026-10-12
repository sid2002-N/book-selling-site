import "server-only";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import type { OrderStatus, PaymentProvider, RefundStatus } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { audit, requirePermission } from "@/modules/admin";
import { decideRefund, executeRefund } from "@/modules/payments/refunds";
import { parseMajorToMinor } from "./files";

const PAGE_SIZE = 25;

/** Admin order tabs (sheet "Order Management" 193–197). */
export const ORDER_TABS = {
  all: null,
  pending: ["pending_payment", "payment_pending"],
  completed: ["paid"],
  failed: ["failed", "cancelled"],
  refunded: ["refunded", "partially_refunded"],
  disputed: ["disputed"],
} as const satisfies Record<string, readonly OrderStatus[] | null>;
export type OrderTab = keyof typeof ORDER_TABS;

export async function listOrders(params: { tab?: string; q?: string; provider?: string; page?: number }) {
  await requirePermission("orders.read");
  const tab = (params.tab && params.tab in ORDER_TABS ? params.tab : "all") as OrderTab;
  const statuses = ORDER_TABS[tab];
  const where: Prisma.OrderWhereInput = {};
  if (statuses) where.status = { in: [...statuses] };
  if (params.provider === "razorpay" || params.provider === "stripe") where.payments = { some: { provider: params.provider as PaymentProvider } };
  const q = params.q?.trim();
  if (q) {
    where.OR = [
      { orderNumber: { contains: q.toUpperCase() } },
      { guestEmail: { contains: q, mode: "insensitive" } },
      { user: { email: { contains: q, mode: "insensitive" } } },
      { user: { name: { contains: q, mode: "insensitive" } } },
      { billingName: { contains: q, mode: "insensitive" } },
    ];
  }
  const page = Math.max(1, params.page ?? 1);
  const [rows, total, grouped] = await Promise.all([
    db.order.findMany({
      where,
      orderBy: { placedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        currency: true,
        totalMinor: true,
        placedAt: true,
        guestEmail: true,
        billingName: true,
        user: { select: { name: true, email: true } },
        _count: { select: { items: true } },
        payments: { orderBy: { createdAt: "desc" }, take: 1, select: { provider: true, status: true } },
      },
    }),
    db.order.count({ where }),
    db.order.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const byStatus = Object.fromEntries(grouped.map((g) => [g.status, g._count._all])) as Partial<Record<OrderStatus, number>>;
  const tabCounts = Object.fromEntries(
    Object.entries(ORDER_TABS).map(([key, list]) => [key, list ? list.reduce((n, s) => n + (byStatus[s] ?? 0), 0) : Object.values(byStatus).reduce((n, c) => n + (c ?? 0), 0)]),
  ) as Record<OrderTab, number>;
  return { rows, total, page, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)), tab, tabCounts };
}

export async function adminOrderDetail(orderId: string) {
  const ctx = await requirePermission("orders.read");
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      user: { select: { id: true, name: true, email: true, status: true } },
      coupon: { select: { code: true } },
      items: { include: { product: { select: { id: true, slug: true, type: true, spineColor: true } }, version: { select: { version: true } } } },
      payments: { orderBy: { createdAt: "asc" }, include: { transactions: { orderBy: { occurredAt: "asc" } } } },
      refunds: { orderBy: { createdAt: "desc" } },
      invoice: { select: { invoiceNumber: true } },
    },
  });
  if (!order) throw new AppError("ORDER_NOT_FOUND", "We couldn't find that order.");
  const deciders = await db.user.findMany({ where: { id: { in: order.refunds.map((r) => r.decidedByAdminId).filter((x): x is string => Boolean(x)) } }, select: { id: true, name: true } });
  const refunded = order.refunds.filter((r) => ["completed", "processing", "approved"].includes(r.status)).reduce((n, r) => n + r.amountMinor, 0);
  return {
    order,
    deciderNames: Object.fromEntries(deciders.map((d) => [d.id, d.name])),
    refundableMinor: Math.max(0, order.totalMinor - refunded),
    canRefund: ctx.permissions.has("orders.refund"),
    canManagePayments: ctx.permissions.has("payments.manage"),
  };
}

export async function listRefunds(params: { status?: string; page?: number }) {
  await requirePermission("orders.read");
  const valid: RefundStatus[] = ["requested", "approved", "processing", "completed", "rejected", "failed"];
  const where: Prisma.RefundWhereInput = params.status && valid.includes(params.status as RefundStatus) ? { status: params.status as RefundStatus } : {};
  const page = Math.max(1, params.page ?? 1);
  const [rows, total, requested] = await Promise.all([
    db.refund.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { order: { select: { id: true, orderNumber: true, totalMinor: true, guestEmail: true, user: { select: { name: true, email: true } } } } },
    }),
    db.refund.count({ where }),
    db.refund.count({ where: { status: "requested" } }),
  ]);
  return { rows, total, page, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)), requested };
}

export async function decideRefundAsAdmin(refundId: string, approve: boolean, note: string | null) {
  const ctx = await requirePermission("orders.refund");
  if (!approve && !note?.trim()) throw new AppError("VALIDATION_ERROR", "Add a reason so the customer knows why.", { fields: { note: "A reason is required when rejecting." } });
  return decideRefund({ refundId, adminUserId: ctx.user.id, approve, note: note?.trim().slice(0, 500) || null });
}

/** Retries a refund whose provider call failed. */
export async function retryRefund(refundId: string) {
  const ctx = await requirePermission("orders.refund");
  const refund = await db.refund.findUnique({ where: { id: refundId } });
  if (!refund || refund.status !== "failed") throw new AppError("INVALID_REQUEST", "Only failed refunds can be retried.");
  await db.refund.update({ where: { id: refundId }, data: { status: "approved" } });
  await audit({ actorUserId: ctx.user.id, action: "refund.retry", entityType: "refund", entityId: refundId, before: { status: "failed" }, after: { status: "approved" } });
  return executeRefund(refundId);
}

export const adminRefundInput = z.object({
  amount: z.string().optional(),
  reason: z.string().trim().min(3, { error: "Give a reason for the refund." }).max(500),
});

/** Admin-initiated refund (UX Flow 18): full by default, partial when an amount is given. */
export async function issueRefund(orderId: string, input: z.input<typeof adminRefundInput>) {
  const ctx = await requirePermission("orders.refund");
  const data = adminRefundInput.parse(input);
  const order = await db.order.findUnique({ where: { id: orderId }, include: { refunds: true } });
  if (!order) throw new AppError("ORDER_NOT_FOUND", "We couldn't find that order.");
  if (!["paid", "partially_refunded"].includes(order.status)) throw new AppError("INVALID_REQUEST", "Only paid orders can be refunded.");
  if (order.refunds.some((r) => ["requested", "approved", "processing"].includes(r.status))) {
    throw new AppError("INVALID_REQUEST", "This order already has a refund in progress — decide that one first.");
  }
  const refunded = order.refunds.filter((r) => r.status === "completed").reduce((n, r) => n + r.amountMinor, 0);
  const refundable = order.totalMinor - refunded;
  const requested = parseMajorToMinor(data.amount);
  if (requested === "invalid") throw new AppError("VALIDATION_ERROR", "Please check the highlighted fields.", { fields: { amount: "Enter an amount like 499 or 9.99." } });
  const amountMinor = requested ?? refundable;
  if (amountMinor <= 0 || amountMinor > refundable) {
    throw new AppError("VALIDATION_ERROR", "Please check the highlighted fields.", { fields: { amount: "Must be above 0 and no more than the refundable balance." } });
  }
  const payment = await db.payment.findFirst({ where: { orderId, status: { in: ["succeeded", "partially_refunded"] } }, orderBy: { createdAt: "desc" } });
  if (!payment) throw new AppError("INVALID_REQUEST", "This order has no captured payment to refund.");
  const refund = await db.refund.create({ data: { orderId, paymentId: payment.id, reason: data.reason, amountMinor, currency: order.currency } });
  await audit({ actorUserId: ctx.user.id, action: "refund.create", entityType: "refund", entityId: refund.id, after: { orderId, amountMinor, reason: data.reason } });
  return decideRefund({ refundId: refund.id, adminUserId: ctx.user.id, approve: true, note: "Issued by an administrator." });
}

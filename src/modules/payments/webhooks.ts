import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import type { Currency } from "@/lib/money";
import { applyProviderState } from "./fulfilment";
import { provider } from "./providers";
import { razorpayPaymentState, type RazorpayPayment } from "./razorpay";
import { redactPayload } from "./policy";
import { applyRefundEvent } from "./refunds";
import { stripeIntentState } from "./stripe";
import type { ProviderName, WebhookEventInput } from "./types";

export type WebhookResult = { status: number; outcome: "processed" | "ignored" | "duplicate" | "invalid_signature" | "failed" };

/**
 * Webhook pipeline (API §3.4): verify the signature over the raw body → persist once per
 * (provider, event_id) → process idempotently. Already-processed events are acknowledged
 * without re-running; failed ones are retried when the provider redelivers.
 */
export async function receiveWebhook(name: ProviderName, rawBody: string, headers: Headers): Promise<WebhookResult> {
  let event: WebhookEventInput | null = null;
  try {
    event = provider(name).parseWebhook(rawBody, headers);
  } catch (error) {
    logger.warn("webhook_parse_failed", { provider: name, error });
  }
  if (!event) {
    await db.securityEvent.create({ data: { type: "webhook_signature_invalid", severity: "warning", meta: { provider: name } } });
    return { status: 400, outcome: "invalid_signature" };
  }

  let row = await db.webhookEvent.findUnique({ where: { provider_eventId: { provider: name, eventId: event.eventId } } });
  if (!row) {
    try {
      row = await db.webhookEvent.create({
        data: { provider: name, eventId: event.eventId, type: event.type, signatureValid: true, payload: redactPayload(event.payload) as Prisma.InputJsonValue },
      });
    } catch {
      row = await db.webhookEvent.findUniqueOrThrow({ where: { provider_eventId: { provider: name, eventId: event.eventId } } });
    }
  }
  if (row.status === "processed" || row.status === "ignored") return { status: 200, outcome: "duplicate" };

  await db.webhookEvent.update({ where: { id: row.id }, data: { attempts: { increment: 1 } } });
  try {
    const handled = name === "razorpay" ? await handleRazorpay(event) : await handleStripe(event);
    await db.webhookEvent.update({ where: { id: row.id }, data: { status: handled, processedAt: new Date(), error: null } });
    return { status: 200, outcome: handled };
  } catch (error) {
    logger.error("webhook_processing_failed", { provider: name, eventId: event.eventId, type: event.type, error });
    await db.webhookEvent.update({ where: { id: row.id }, data: { status: "failed", error: String(error).slice(0, 500) } });
    return { status: 500, outcome: "failed" };
  }
}

async function paymentByProviderOrder(name: ProviderName, providerOrderRef: string | null | undefined) {
  if (!providerOrderRef) return null;
  return db.payment.findUnique({ where: { provider_providerOrderRef: { provider: name, providerOrderRef } }, select: { id: true } });
}

type RazorpayEnvelope = {
  event: string;
  payload: {
    payment?: { entity: RazorpayPayment };
    refund?: { entity: { id: string; payment_id: string; amount: number; status: string; notes?: Record<string, string> | [] } };
    dispute?: { entity: { id: string; payment_id: string; amount: number; currency: string; reason_code?: string; status: string; respond_by?: number } };
  };
};

async function handleRazorpay(event: WebhookEventInput): Promise<"processed" | "ignored"> {
  const body = event.payload as unknown as RazorpayEnvelope;
  if (event.type.startsWith("payment.") && !event.type.startsWith("payment.dispute") && body.payload.payment) {
    const entity = body.payload.payment.entity;
    const payment = await paymentByProviderOrder("razorpay", entity.order_id);
    if (!payment) return "ignored";
    await applyProviderState(payment.id, razorpayPaymentState(entity), "webhook");
    return "processed";
  }
  if (event.type === "order.paid" && body.payload.payment) {
    const entity = body.payload.payment.entity;
    const payment = await paymentByProviderOrder("razorpay", entity.order_id);
    if (!payment) return "ignored";
    await applyProviderState(payment.id, razorpayPaymentState(entity), "webhook");
    return "processed";
  }
  if (event.type.startsWith("refund.") && body.payload.refund) {
    const r = body.payload.refund.entity;
    const notes = Array.isArray(r.notes) ? {} : (r.notes ?? {});
    const status = event.type === "refund.processed" || r.status === "processed" ? "completed" : event.type === "refund.failed" || r.status === "failed" ? "failed" : "processing";
    return applyRefundEvent({ provider: "razorpay", providerRefundRef: r.id, providerPaymentRef: r.payment_id, internalRefundId: notes.refund_id ?? null, amountMinor: r.amount, status }).then((o) => (o === "handled" ? "processed" : "ignored"));
  }
  if (event.type.startsWith("payment.dispute.") && body.payload.dispute) {
    const d = body.payload.dispute.entity;
    return recordDispute("razorpay", { ref: d.id, paymentRef: d.payment_id, amountMinor: d.amount, currency: d.currency, reason: d.reason_code ?? null, status: d.status, dueBy: d.respond_by ? new Date(d.respond_by * 1000) : null });
  }
  return "ignored";
}

async function handleStripe(event: WebhookEventInput): Promise<"processed" | "ignored"> {
  const e = event.payload as unknown as Stripe.Event;
  if (e.type.startsWith("payment_intent.")) {
    const pi = e.data.object as Stripe.PaymentIntent;
    const payment = await paymentByProviderOrder("stripe", pi.id);
    if (!payment) return "ignored";
    await applyProviderState(payment.id, stripeIntentState(pi), "webhook");
    return "processed";
  }
  if (e.type.startsWith("refund.") || e.type === "charge.refund.updated") {
    const r = e.data.object as Stripe.Refund;
    const piRef = typeof r.payment_intent === "string" ? r.payment_intent : (r.payment_intent?.id ?? null);
    const status = r.status === "succeeded" ? "completed" : r.status === "failed" || r.status === "canceled" ? "failed" : "processing";
    return applyRefundEvent({ provider: "stripe", providerRefundRef: r.id, providerPaymentRef: piRef, internalRefundId: r.metadata?.refund_id ?? null, amountMinor: r.amount, status }).then((o) => (o === "handled" ? "processed" : "ignored"));
  }
  if (e.type.startsWith("charge.dispute.")) {
    const d = e.data.object as Stripe.Dispute;
    const piRef = typeof d.payment_intent === "string" ? d.payment_intent : (d.payment_intent?.id ?? null);
    return recordDispute("stripe", { ref: d.id, paymentRef: piRef, amountMinor: d.amount, currency: d.currency, reason: d.reason, status: d.status, dueBy: d.evidence_details?.due_by ? new Date(d.evidence_details.due_by * 1000) : null });
  }
  return "ignored";
}

/** Disputes mark the payment and order `disputed`; a won dispute restores `succeeded`/`paid`. */
async function recordDispute(
  name: ProviderName,
  d: { ref: string; paymentRef: string | null; amountMinor: number; currency: string; reason: string | null; status: string; dueBy: Date | null },
): Promise<"processed" | "ignored"> {
  if (!d.paymentRef) return "ignored";
  const payment = await db.payment.findFirst({ where: { provider: name, OR: [{ providerPaymentRef: d.paymentRef }, { providerOrderRef: d.paymentRef }] }, include: { order: { select: { status: true } } } });
  if (!payment) return "ignored";
  const currency = d.currency.toUpperCase() as Currency;
  const won = d.status === "won";
  await db.$transaction(async (tx) => {
    await tx.dispute.upsert({
      where: { providerDisputeRef: d.ref },
      create: { paymentId: payment.id, providerDisputeRef: d.ref, status: d.status, reason: d.reason, amountMinor: d.amountMinor, currency, dueBy: d.dueBy },
      update: { status: d.status, dueBy: d.dueBy },
    });
    if (won && payment.status === "disputed") {
      await tx.payment.update({ where: { id: payment.id }, data: { status: "succeeded" } });
      if (payment.order.status === "disputed") await tx.order.update({ where: { id: payment.orderId }, data: { status: "paid" } });
    } else if (!won && ["succeeded", "partially_refunded"].includes(payment.status) && !["lost", "closed"].includes(d.status)) {
      await tx.payment.update({ where: { id: payment.id }, data: { status: "disputed" } });
      await tx.order.update({ where: { id: payment.orderId }, data: { status: "disputed" } });
    }
  });
  return "processed";
}

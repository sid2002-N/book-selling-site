/** Pure payment policies — no I/O, so they are unit-tested directly. */

/** Pure policy check so it can be unit-tested (PRD F14: refund window is a setting, OQ-3). */
export function refundEligibility(input: { status: string; paidAt: Date | null; totalMinor: number; windowDays: number; hasOpenRefund: boolean; now?: Date }):
  | { ok: true }
  | { ok: false; reason: string } {
  const now = input.now ?? new Date();
  if (input.totalMinor === 0) return { ok: false, reason: "Free orders can't be refunded." };
  if (!["paid", "partially_refunded"].includes(input.status) || !input.paidAt) return { ok: false, reason: "Only paid orders can be refunded." };
  if (input.hasOpenRefund) return { ok: false, reason: "A refund request for this order is already being reviewed." };
  if (input.windowDays <= 0) return { ok: false, reason: "Refunds aren't available for this order." };
  const deadline = input.paidAt.getTime() + input.windowDays * 86_400_000;
  if (now.getTime() > deadline) return { ok: false, reason: `The ${input.windowDays}-day refund window for this order has closed.` };
  return { ok: true };
}

/** Personal data is stripped before a payload is stored (SECURITY §10). */
const PERSONAL = new Set(["email", "contact", "vpa", "card", "bank_account", "billing_details", "receipt_email", "customer_details", "shipping", "phone", "address", "name"]);

export function redactPayload(value: unknown, depth = 0): unknown {
  if (depth > 8 || value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((v) => redactPayload(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) out[k] = PERSONAL.has(k) ? "[redacted]" : redactPayload(v, depth + 1);
  return out;
}

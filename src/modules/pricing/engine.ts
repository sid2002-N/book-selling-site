/**
 * Pricing engine (ARCHITECTURE §5 rule 4): the ONLY place prices, discounts and tax are
 * computed. Pure and deterministic so cart, checkout and order creation all agree, and so it
 * can be tested exhaustively. Prices are tax-inclusive (DEC-028).
 */
import { inclusiveTax, percentOf, type Currency } from "@/lib/money";

export type PriceLine = {
  productId: string;
  title: string;
  type: string;
  unitMinor: number;
  compareAtMinor: number | null;
  categoryIds: string[];
};

export type CouponRule = {
  id: string;
  code: string;
  type: "percent" | "fixed";
  value: number;
  currency: Currency | null;
  minOrderMinor: number | null;
  maxDiscountMinor: number | null;
  startsAt: Date | null;
  endsAt: Date | null;
  isActive: boolean;
  archived: boolean;
  usageLimit: number | null;
  usedCount: number;
  perCustomerLimit: number | null;
  usedByCustomer: number;
  appliesTo: { scope: "all" } | { scope: "categories"; ids: string[] } | { scope: "products"; ids: string[] };
};

export type CouponErrorCode = "COUPON_INVALID" | "COUPON_EXPIRED" | "COUPON_NOT_APPLICABLE" | "COUPON_LIMIT_REACHED" | "COUPON_MIN_ORDER";

export type CouponResult =
  | { ok: true; discountMinor: number; eligible: string[] }
  | { ok: false; code: CouponErrorCode; message: string };

export type QuoteLine = PriceLine & { discountMinor: number; totalMinor: number; taxMinor: number };

export type Quote = {
  currency: Currency;
  lines: QuoteLine[];
  subtotalMinor: number;
  discountMinor: number;
  taxMinor: number;
  totalMinor: number;
  /** Savings vs compare-at prices (display only). */
  savingsMinor: number;
  coupon: { id: string; code: string; discountMinor: number } | null;
  couponError: { code: CouponErrorCode; message: string } | null;
};

function eligibleLines(rule: CouponRule, lines: PriceLine[]): PriceLine[] {
  const scope = rule.appliesTo;
  if (scope.scope === "all") return lines;
  if (scope.scope === "products") return lines.filter((l) => scope.ids.includes(l.productId));
  return lines.filter((l) => l.categoryIds.some((c) => scope.ids.includes(c)));
}

/** Validates a coupon against the cart; every failure has a distinct, user-facing reason (Flow 6). */
export function evaluateCoupon(rule: CouponRule | null, lines: PriceLine[], currency: Currency, now = new Date()): CouponResult {
  if (!rule || !rule.isActive || rule.archived) return { ok: false, code: "COUPON_INVALID", message: "This coupon code isn't valid." };
  if (rule.startsAt && rule.startsAt > now) return { ok: false, code: "COUPON_INVALID", message: "This coupon isn't active yet." };
  if (rule.endsAt && rule.endsAt <= now) return { ok: false, code: "COUPON_EXPIRED", message: "This coupon has expired." };
  if (rule.usageLimit != null && rule.usedCount >= rule.usageLimit) {
    return { ok: false, code: "COUPON_LIMIT_REACHED", message: "This coupon has reached its usage limit." };
  }
  if (rule.perCustomerLimit != null && rule.usedByCustomer >= rule.perCustomerLimit) {
    return { ok: false, code: "COUPON_LIMIT_REACHED", message: "You've already used this coupon." };
  }
  if (rule.type === "fixed" && rule.currency !== currency) {
    return { ok: false, code: "COUPON_NOT_APPLICABLE", message: `This coupon can't be used for payments in ${currency}.` };
  }
  const eligible = eligibleLines(rule, lines).filter((l) => l.unitMinor > 0);
  if (eligible.length === 0) return { ok: false, code: "COUPON_NOT_APPLICABLE", message: "This coupon doesn't apply to the items in your cart." };
  const subtotal = lines.reduce((acc, l) => acc + l.unitMinor, 0);
  if (rule.minOrderMinor != null && subtotal < rule.minOrderMinor) {
    return { ok: false, code: "COUPON_MIN_ORDER", message: "Your order doesn't meet this coupon's minimum amount." };
  }
  const base = eligible.reduce((acc, l) => acc + l.unitMinor, 0);
  let discount = rule.type === "percent" ? percentOf(base, rule.value) : rule.value;
  if (rule.maxDiscountMinor != null) discount = Math.min(discount, rule.maxDiscountMinor);
  discount = Math.min(discount, base);
  return { ok: true, discountMinor: discount, eligible: eligible.map((l) => l.productId) };
}

/**
 * Splits an order-level discount across eligible lines in proportion to price; rounding
 * remainders go to the most expensive lines so the parts always sum exactly.
 */
export function allocateDiscount(lines: PriceLine[], eligible: string[], discountMinor: number): Map<string, number> {
  const pool = lines.filter((l) => eligible.includes(l.productId));
  const base = pool.reduce((acc, l) => acc + l.unitMinor, 0);
  const out = new Map<string, number>(lines.map((l) => [l.productId, 0]));
  if (base === 0 || discountMinor === 0) return out;
  let assigned = 0;
  const shares = pool.map((l) => {
    const exact = (discountMinor * l.unitMinor) / base;
    const floor = Math.floor(exact);
    assigned += floor;
    return { id: l.productId, floor, frac: exact - floor, unit: l.unitMinor };
  });
  let remainder = discountMinor - assigned;
  shares.sort((a, b) => b.frac - a.frac || b.unit - a.unit);
  for (const s of shares) {
    const extra = remainder > 0 ? 1 : 0;
    remainder -= extra;
    out.set(s.id, s.floor + extra);
  }
  return out;
}

export function computeQuote(input: {
  lines: PriceLine[];
  currency: Currency;
  coupon?: CouponRule | null;
  couponRequested?: boolean;
  taxRateBps?: number;
  now?: Date;
}): Quote {
  const { lines, currency, taxRateBps = 0 } = input;
  const subtotal = lines.reduce((acc, l) => acc + l.unitMinor, 0);
  const savings = lines.reduce((acc, l) => acc + (l.compareAtMinor && l.compareAtMinor > l.unitMinor ? l.compareAtMinor - l.unitMinor : 0), 0);

  let coupon: Quote["coupon"] = null;
  let couponError: Quote["couponError"] = null;
  let allocation = new Map<string, number>();
  if (input.couponRequested || input.coupon) {
    const result = evaluateCoupon(input.coupon ?? null, lines, currency, input.now);
    if (result.ok) {
      coupon = { id: input.coupon!.id, code: input.coupon!.code, discountMinor: result.discountMinor };
      allocation = allocateDiscount(lines, result.eligible, result.discountMinor);
    } else {
      couponError = { code: result.code, message: result.message };
    }
  }

  const quoteLines: QuoteLine[] = lines.map((l) => {
    const discountMinor = allocation.get(l.productId) ?? 0;
    const totalMinor = l.unitMinor - discountMinor;
    return { ...l, discountMinor, totalMinor, taxMinor: inclusiveTax(totalMinor, taxRateBps) };
  });
  const discount = quoteLines.reduce((acc, l) => acc + l.discountMinor, 0);
  return {
    currency,
    lines: quoteLines,
    subtotalMinor: subtotal,
    discountMinor: discount,
    taxMinor: quoteLines.reduce((acc, l) => acc + l.taxMinor, 0),
    totalMinor: subtotal - discount,
    savingsMinor: savings,
    coupon,
    couponError,
  };
}

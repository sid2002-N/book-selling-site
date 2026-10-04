import { describe, expect, it } from "vitest";
import { allocateDiscount, computeQuote, evaluateCoupon, type CouponRule, type PriceLine } from "@/modules/pricing/engine";

const line = (id: string, unitMinor: number, extra: Partial<PriceLine> = {}): PriceLine => ({
  productId: id,
  title: id,
  type: "book",
  unitMinor,
  compareAtMinor: null,
  categoryIds: ["cat-a"],
  ...extra,
});

const coupon = (over: Partial<CouponRule> = {}): CouponRule => ({
  id: "c1",
  code: "WELCOME10",
  type: "percent",
  value: 10,
  currency: null,
  minOrderMinor: null,
  maxDiscountMinor: null,
  startsAt: null,
  endsAt: null,
  isActive: true,
  archived: false,
  usageLimit: null,
  usedCount: 0,
  perCustomerLimit: null,
  usedByCustomer: 0,
  appliesTo: { scope: "all" },
  ...over,
});

const cart = [line("a", 79900), line("b", 49900), line("c", 39900, { categoryIds: ["cat-b"] })];
const now = new Date("2026-10-04T12:00:00Z");

describe("evaluateCoupon — every failure has its own code", () => {
  it("COUPON_INVALID when missing, inactive, archived or not started", () => {
    expect(evaluateCoupon(null, cart, "INR", now)).toMatchObject({ ok: false, code: "COUPON_INVALID" });
    expect(evaluateCoupon(coupon({ isActive: false }), cart, "INR", now)).toMatchObject({ code: "COUPON_INVALID" });
    expect(evaluateCoupon(coupon({ archived: true }), cart, "INR", now)).toMatchObject({ code: "COUPON_INVALID" });
    expect(evaluateCoupon(coupon({ startsAt: new Date("2026-11-01") }), cart, "INR", now)).toMatchObject({ code: "COUPON_INVALID" });
  });
  it("COUPON_EXPIRED after the end date", () => {
    expect(evaluateCoupon(coupon({ endsAt: new Date("2026-10-01") }), cart, "INR", now)).toMatchObject({ code: "COUPON_EXPIRED" });
  });
  it("COUPON_LIMIT_REACHED for global and per-customer limits", () => {
    expect(evaluateCoupon(coupon({ usageLimit: 5, usedCount: 5 }), cart, "INR", now)).toMatchObject({ code: "COUPON_LIMIT_REACHED" });
    expect(evaluateCoupon(coupon({ perCustomerLimit: 1, usedByCustomer: 1 }), cart, "INR", now)).toMatchObject({ code: "COUPON_LIMIT_REACHED" });
  });
  it("COUPON_NOT_APPLICABLE for scope or currency mismatch", () => {
    expect(evaluateCoupon(coupon({ appliesTo: { scope: "products", ids: ["zzz"] } }), cart, "INR", now)).toMatchObject({ code: "COUPON_NOT_APPLICABLE" });
    expect(evaluateCoupon(coupon({ type: "fixed", value: 10000, currency: "INR" }), cart, "USD", now)).toMatchObject({ code: "COUPON_NOT_APPLICABLE" });
  });
  it("COUPON_MIN_ORDER below the minimum", () => {
    expect(evaluateCoupon(coupon({ minOrderMinor: 500000 }), cart, "INR", now)).toMatchObject({ code: "COUPON_MIN_ORDER" });
  });
});

describe("evaluateCoupon — amounts", () => {
  it("applies percent to eligible lines only", () => {
    const result = evaluateCoupon(coupon({ value: 20, appliesTo: { scope: "categories", ids: ["cat-b"] } }), cart, "INR", now);
    expect(result).toEqual({ ok: true, discountMinor: 7980, eligible: ["c"] });
  });
  it("caps by max discount and never exceeds the eligible amount", () => {
    expect(evaluateCoupon(coupon({ value: 50, maxDiscountMinor: 20000 }), cart, "INR", now)).toMatchObject({ discountMinor: 20000 });
    expect(evaluateCoupon(coupon({ type: "fixed", value: 9_999_999, currency: "INR" }), cart, "INR", now)).toMatchObject({ discountMinor: 169700 });
  });
});

describe("allocateDiscount", () => {
  it("splits proportionally and the parts sum exactly", () => {
    const split = allocateDiscount(cart, ["a", "b", "c"], 1001);
    expect([...split.values()].reduce((a, b) => a + b, 0)).toBe(1001);
    expect(split.get("a")!).toBeGreaterThan(split.get("c")!);
  });
});

describe("computeQuote", () => {
  it("totals subtotal − discount with tax contained in the price", () => {
    const quote = computeQuote({ lines: cart, currency: "INR", coupon: coupon(), taxRateBps: 1800, now });
    expect(quote.subtotalMinor).toBe(169700);
    expect(quote.discountMinor).toBe(16970);
    expect(quote.totalMinor).toBe(152730);
    expect(quote.lines.reduce((a, l) => a + l.totalMinor, 0)).toBe(quote.totalMinor);
    expect(quote.taxMinor).toBeGreaterThan(0);
    expect(quote.taxMinor).toBeLessThan(quote.totalMinor);
  });

  it("reports a coupon error without changing totals", () => {
    const quote = computeQuote({ lines: cart, currency: "INR", coupon: coupon({ endsAt: new Date("2026-01-01") }), now });
    expect(quote.couponError?.code).toBe("COUPON_EXPIRED");
    expect(quote.discountMinor).toBe(0);
    expect(quote.totalMinor).toBe(169700);
  });

  it("reports COUPON_INVALID when a code was requested but not found", () => {
    expect(computeQuote({ lines: cart, currency: "INR", coupon: null, couponRequested: true }).couponError?.code).toBe("COUPON_INVALID");
  });

  it("derives display savings from compare-at prices", () => {
    const quote = computeQuote({ lines: [line("a", 79900, { compareAtMinor: 129900 })], currency: "INR" });
    expect(quote.savingsMinor).toBe(50000);
  });
});

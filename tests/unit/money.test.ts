import { describe, expect, it } from "vitest";
import { discountPercent, formatMoney, inclusiveTax, money, percentOf } from "@/lib/money";

describe("money", () => {
  it("formats INR and USD from minor units without hardcoded symbols", () => {
    expect(formatMoney(money(79900, "INR"))).toBe("₹799");
    expect(formatMoney(money(124580_00, "INR"))).toBe("₹1,24,580");
    expect(formatMoney(money(999, "USD"))).toBe("$9.99");
  });

  it("rejects fractional minor units", () => {
    expect(() => money(10.5, "INR")).toThrow();
  });

  it("computes whole-percent discounts", () => {
    expect(discountPercent(79900, 129900)).toBe(38);
    expect(discountPercent(79900, null)).toBeNull();
    expect(discountPercent(79900, 79900)).toBeNull();
  });

  it("rounds percentage amounts to whole minor units", () => {
    expect(percentOf(129900, 10)).toBe(12990);
    expect(percentOf(999, 15)).toBe(150);
  });

  it("extracts tax from a tax-inclusive amount", () => {
    expect(inclusiveTax(118000, 1800)).toBe(18000);
    expect(inclusiveTax(50000, 0)).toBe(0);
  });
});

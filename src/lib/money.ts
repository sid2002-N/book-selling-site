/**
 * Money helpers (docs/CODE_STYLE.md §6): integer minor units + ISO currency. Never hardcode ₹/$.
 */
export const CURRENCIES = ["INR", "USD"] as const;
export type Currency = (typeof CURRENCIES)[number];

export type Money = { amountMinor: number; currency: Currency };

const MINOR_DIGITS: Record<Currency, number> = { INR: 2, USD: 2 };
const LOCALE: Record<Currency, string> = { INR: "en-IN", USD: "en-US" };

export function isCurrency(value: string): value is Currency {
  return (CURRENCIES as readonly string[]).includes(value);
}

export function formatMoney(money: Money, options: { showZeroDecimals?: boolean; code?: boolean } = {}): string {
  const digits = MINOR_DIGITS[money.currency];
  const major = money.amountMinor / 10 ** digits;
  const whole = Number.isInteger(major);
  return new Intl.NumberFormat(LOCALE[money.currency], {
    style: "currency",
    currency: money.currency,
    // ISO code instead of a symbol where the symbol can't be rendered (e.g. PDF base fonts).
    currencyDisplay: options.code ? "code" : "symbol",
    minimumFractionDigits: whole && !options.showZeroDecimals ? 0 : digits,
    maximumFractionDigits: digits,
  }).format(major);
}

export function money(amountMinor: number, currency: Currency): Money {
  if (!Number.isInteger(amountMinor)) throw new Error("Money amounts must be integer minor units");
  return { amountMinor, currency };
}

/** Whole-percent discount between a compare-at and current price, or null. */
export function discountPercent(currentMinor: number, compareAtMinor?: number | null): number | null {
  if (!compareAtMinor || compareAtMinor <= currentMinor) return null;
  return Math.round(((compareAtMinor - currentMinor) / compareAtMinor) * 100);
}

/** Percentage of an amount in minor units, rounded half-up to a whole minor unit. */
export function percentOf(amountMinor: number, percent: number): number {
  return Math.round((amountMinor * percent) / 100);
}

/** Tax contained in a tax-inclusive amount, for a rate in basis points. */
export function inclusiveTax(amountMinor: number, rateBps: number): number {
  if (rateBps <= 0) return 0;
  return Math.round(amountMinor - amountMinor / (1 + rateBps / 10000));
}

import "server-only";
import { db } from "@/lib/db";
import type { Currency } from "@/lib/money";
import { publicProductWhere } from "@/modules/catalog/service";
import { computeQuote, type CouponRule, type PriceLine, type Quote } from "./engine";

/** Current per-currency price lines for products (published only). Missing prices are omitted. */
export async function loadPriceLines(productIds: string[], currency: Currency): Promise<PriceLine[]> {
  if (!productIds.length) return [];
  const now = new Date();
  const rows = await db.product.findMany({
    where: { id: { in: productIds }, ...publicProductWhere() },
    select: {
      id: true,
      title: true,
      type: true,
      categories: { select: { categoryId: true } },
      prices: {
        where: { currency, OR: [{ startsAt: null }, { startsAt: { lte: now } }], AND: [{ OR: [{ endsAt: null }, { endsAt: { gt: now } }] }] },
        orderBy: { startsAt: { sort: "desc", nulls: "last" } },
        take: 1,
      },
    },
  });
  const byId = new Map(rows.map((r) => [r.id, r]));
  return productIds.flatMap((id) => {
    const r = byId.get(id);
    const price = r?.prices[0];
    if (!r || !price) return [];
    return [{ productId: r.id, title: r.title, type: r.type, unitMinor: price.amountMinor, compareAtMinor: price.compareAtMinor, categoryIds: r.categories.map((c) => c.categoryId) }];
  });
}

/** Loads a coupon with usage counts derived from redemptions (no stored counters). */
export async function loadCoupon(code: string, customer: { userId?: string | null; email?: string | null }): Promise<CouponRule | null> {
  const coupon = await db.coupon.findUnique({ where: { code: code.trim() } });
  if (!coupon) return null;
  const [usedCount, usedByCustomer] = await Promise.all([
    db.couponRedemption.count({ where: { couponId: coupon.id } }),
    customer.userId || customer.email
      ? db.couponRedemption.count({
          where: { couponId: coupon.id, OR: [...(customer.userId ? [{ userId: customer.userId }] : []), ...(customer.email ? [{ guestEmail: customer.email }] : [])] },
        })
      : Promise.resolve(0),
  ]);
  const applies = coupon.appliesTo as CouponRule["appliesTo"];
  return {
    id: coupon.id,
    code: coupon.code,
    type: coupon.type,
    value: coupon.value,
    currency: coupon.currency,
    minOrderMinor: coupon.minOrderMinor,
    maxDiscountMinor: coupon.maxDiscountMinor,
    startsAt: coupon.startsAt,
    endsAt: coupon.endsAt,
    isActive: coupon.isActive,
    archived: Boolean(coupon.archivedAt),
    usageLimit: coupon.usageLimit,
    usedCount,
    perCustomerLimit: coupon.perCustomerLimit,
    usedByCustomer,
    appliesTo: applies && "scope" in applies ? applies : { scope: "all" },
  };
}

/** Inclusive tax rate for a billing country (configurable `tax_rate` rows; none → 0). */
export async function taxRateFor(country: string | null | undefined): Promise<number> {
  if (!country) return 0;
  const now = new Date();
  const rate = await db.taxRate.findFirst({
    where: { country: country.toUpperCase(), isActive: true, validFrom: { lte: now }, OR: [{ validTo: null }, { validTo: { gt: now } }] },
    orderBy: { validFrom: "desc" },
  });
  return rate?.rateBps ?? 0;
}

export async function quote(input: {
  productIds: string[];
  currency: Currency;
  couponCode?: string | null;
  customer?: { userId?: string | null; email?: string | null };
  billingCountry?: string | null;
}): Promise<Quote> {
  const [lines, coupon, taxRateBps] = await Promise.all([
    loadPriceLines(input.productIds, input.currency),
    input.couponCode ? loadCoupon(input.couponCode, input.customer ?? {}) : Promise.resolve(null),
    taxRateFor(input.billingCountry ?? (input.currency === "INR" ? "IN" : null)),
  ]);
  return computeQuote({ lines, currency: input.currency, coupon, couponRequested: Boolean(input.couponCode), taxRateBps });
}

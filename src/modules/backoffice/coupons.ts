import "server-only";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { audit, requirePermission } from "@/modules/admin";
import { parseMajorToMinor } from "./files";

export async function listCoupons(params: { view?: string }) {
  await requirePermission("marketing.manage");
  const where: Prisma.CouponWhereInput = params.view === "archived" ? { archivedAt: { not: null } } : { archivedAt: null };
  const rows = await db.coupon.findMany({ where, orderBy: { createdAt: "desc" }, include: { _count: { select: { redemptions: true } } } });
  const totals = await db.couponRedemption.groupBy({ by: ["couponId"], where: { couponId: { in: rows.map((r) => r.id) } }, _sum: { amountMinor: true } });
  const discount = new Map(totals.map((t) => [t.couponId, t._sum.amountMinor ?? 0]));
  const now = Date.now();
  return rows.map((r) => ({ ...r, discountGivenMinor: discount.get(r.id) ?? 0, state: couponState(r, now) }));
}

export type CouponState = "archived" | "inactive" | "expired" | "scheduled" | "active";

export function couponState(c: { archivedAt: Date | null; isActive: boolean; startsAt: Date | null; endsAt: Date | null }, now: number): CouponState {
  if (c.archivedAt) return "archived";
  if (!c.isActive) return "inactive";
  if (c.endsAt && c.endsAt.getTime() < now) return "expired";
  if (c.startsAt && c.startsAt.getTime() > now) return "scheduled";
  return "active";
}

export async function getCoupon(id: string) {
  await requirePermission("marketing.manage");
  const coupon = await db.coupon.findUnique({ where: { id }, include: { _count: { select: { redemptions: true } } } });
  if (!coupon) throw new AppError("NOT_FOUND", "That coupon doesn't exist.");
  return coupon;
}

const optionalInt = z
  .string()
  .trim()
  .optional()
  .transform((s, ctx) => {
    if (!s) return null;
    if (!/^\d{1,7}$/.test(s) || Number(s) < 1) {
      ctx.addIssue({ code: "custom", message: "Enter a whole number of 1 or more, or leave blank." });
      return z.NEVER;
    }
    return Number(s);
  });

const optionalDate = z
  .string()
  .trim()
  .optional()
  .transform((s, ctx) => {
    if (!s) return null;
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) {
      ctx.addIssue({ code: "custom", message: "Enter a valid date." });
      return z.NEVER;
    }
    return d;
  });

export const couponInput = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9_-]{3,32}$/, { error: "3–32 letters, numbers, - or _." }),
    description: z.string().trim().max(200).optional(),
    type: z.enum(["percent", "fixed"]),
    value: z.string().trim(),
    currency: z.enum(["INR", "USD"]).optional().or(z.literal("").transform(() => undefined)),
    minOrder: z.string().optional(),
    maxDiscount: z.string().optional(),
    usageLimit: optionalInt,
    perCustomerLimit: optionalInt,
    startsAt: optionalDate,
    endsAt: optionalDate,
    isActive: z.boolean().default(true),
    isPublic: z.boolean().default(false),
    scope: z.enum(["all", "categories", "products"]).default("all"),
    scopeIds: z.array(z.uuid()).max(100).default([]),
  })
  .superRefine((d, ctx) => {
    if (d.startsAt && d.endsAt && d.endsAt <= d.startsAt) ctx.addIssue({ code: "custom", path: ["endsAt"], message: "Must be after the start date." });
    if (d.scope !== "all" && d.scopeIds.length === 0) ctx.addIssue({ code: "custom", path: ["scopeIds"], message: "Choose at least one." });
  });

function toData(input: z.output<typeof couponInput>) {
  const fields: Record<string, string> = {};
  let value: number;
  if (input.type === "percent") {
    value = /^\d{1,3}$/.test(input.value) ? Number(input.value) : NaN;
    if (!(value >= 1 && value <= 100)) fields.value = "Enter a whole percent from 1 to 100.";
  } else {
    const minor = parseMajorToMinor(input.value);
    value = typeof minor === "number" ? minor : NaN;
    if (!(value > 0)) fields.value = "Enter an amount above 0.";
    if (!input.currency) fields.currency = "Fixed-amount coupons need a currency.";
  }
  const money = (raw: string | undefined, key: string) => {
    const v = parseMajorToMinor(raw);
    if (v === "invalid") {
      fields[key] = "Enter an amount like 499 or 9.99.";
      return null;
    }
    return v;
  };
  const minOrderMinor = money(input.minOrder, "minOrder");
  const maxDiscountMinor = money(input.maxDiscount, "maxDiscount");
  if ((minOrderMinor !== null || maxDiscountMinor !== null) && !input.currency) fields.currency = "Amount limits need a currency.";
  if (Object.keys(fields).length) throw new AppError("VALIDATION_ERROR", "Please check the highlighted fields.", { fields });
  return {
    code: input.code,
    description: input.description || null,
    type: input.type,
    value,
    currency: input.currency ?? null,
    minOrderMinor,
    maxDiscountMinor: input.type === "percent" ? maxDiscountMinor : null,
    usageLimit: input.usageLimit,
    perCustomerLimit: input.perCustomerLimit,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    isActive: input.isActive,
    isPublic: input.isPublic,
    appliesTo: input.scope === "all" ? { scope: "all" } : { scope: input.scope, ids: input.scopeIds },
  };
}

export async function createCoupon(raw: z.input<typeof couponInput>) {
  const ctx = await requirePermission("marketing.manage");
  const data = toData(couponInput.parse(raw));
  if (await db.coupon.findUnique({ where: { code: data.code } })) throw new AppError("VALIDATION_ERROR", "That code is already used.", { fields: { code: "Already used — codes are unique." } });
  const coupon = await db.coupon.create({ data });
  await audit({ actorUserId: ctx.user.id, action: "coupon.create", entityType: "coupon", entityId: coupon.id, after: data });
  return coupon;
}

/** Once redeemed, the code and discount terms are fixed so past orders stay explainable. */
export async function updateCoupon(id: string, raw: z.input<typeof couponInput>) {
  const ctx = await requirePermission("marketing.manage");
  const before = await db.coupon.findUnique({ where: { id }, include: { _count: { select: { redemptions: true } } } });
  if (!before) throw new AppError("NOT_FOUND", "That coupon doesn't exist.");
  const data = toData(couponInput.parse(raw));
  if (before._count.redemptions > 0) {
    const locked = before.code !== data.code || before.type !== data.type || before.value !== data.value || before.currency !== data.currency;
    if (locked) throw new AppError("INVALID_REQUEST", "This coupon has been used, so its code and discount can't change. Archive it and create a new one instead.");
  } else if (data.code !== before.code && (await db.coupon.findUnique({ where: { code: data.code } }))) {
    throw new AppError("VALIDATION_ERROR", "That code is already used.", { fields: { code: "Already used — codes are unique." } });
  }
  const coupon = await db.coupon.update({ where: { id }, data });
  const { _count, ...beforeData } = before;
  void _count;
  await audit({ actorUserId: ctx.user.id, action: "coupon.update", entityType: "coupon", entityId: id, before: beforeData, after: data });
  return coupon;
}

export async function setCouponArchived(id: string, archived: boolean) {
  const ctx = await requirePermission("marketing.manage");
  const before = await db.coupon.findUnique({ where: { id } });
  if (!before) throw new AppError("NOT_FOUND", "That coupon doesn't exist.");
  await db.coupon.update({ where: { id }, data: archived ? { archivedAt: new Date(), isActive: false } : { archivedAt: null } });
  await audit({ actorUserId: ctx.user.id, action: archived ? "coupon.archive" : "coupon.restore", entityType: "coupon", entityId: id, before: { archivedAt: before.archivedAt }, after: { archived } });
}

export async function couponScopeOptions() {
  await requirePermission("marketing.manage");
  const [categories, products] = await Promise.all([
    db.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.product.findMany({ where: { deletedAt: null, status: { not: "archived" } }, orderBy: { title: "asc" }, select: { id: true, title: true } }),
  ]);
  return { categories, products: products.map((p) => ({ id: p.id, name: p.title })) };
}

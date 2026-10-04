import "server-only";
import { cookies } from "next/headers";
import { z } from "zod";
import { randomToken, sha256 } from "@/lib/crypto";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import type { Currency } from "@/lib/money";
import { getCurrentUser } from "@/modules/auth";
import { cardInclude, publicProductWhere, toCard } from "@/modules/catalog/service";
import type { ProductCard } from "@/modules/catalog/types";
import { ownedProductIds } from "@/modules/entitlements";
import { getDisplayCurrency, quote, type Quote } from "@/modules/pricing";

export const CART_COOKIE = "krm_cart";
const GUEST_CART_DAYS = 30;

export const productIdInput = z.object({ productId: z.uuid() });
export const couponInput = z.object({ code: z.string().trim().min(3).max(32) });

type CartRef = { id: string; userId: string | null; couponCode: string | null };

async function guestToken(create: boolean): Promise<string | null> {
  const jar = await cookies();
  const existing = jar.get(CART_COOKIE)?.value;
  if (existing || !create) return existing ?? null;
  const token = randomToken(24);
  jar.set(CART_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: GUEST_CART_DAYS * 86_400,
  });
  return token;
}

/** Resolves the visitor's cart: the user's cart when signed in, otherwise the cookie-bound guest cart. */
async function resolveCart(create: boolean): Promise<CartRef | null> {
  const user = await getCurrentUser();
  if (user) {
    const existing = await db.cart.findUnique({ where: { userId: user.id }, select: { id: true, userId: true, couponCode: true } });
    if (existing || !create) return existing;
    return db.cart.create({ data: { userId: user.id }, select: { id: true, userId: true, couponCode: true } });
  }
  const token = await guestToken(create);
  if (!token) return null;
  const hash = sha256(token);
  const existing = await db.cart.findUnique({ where: { guestTokenHash: hash }, select: { id: true, userId: true, couponCode: true } });
  if (existing || !create) return existing;
  return db.cart.create({
    data: { guestTokenHash: hash, expiresAt: new Date(Date.now() + GUEST_CART_DAYS * 86_400_000) },
    select: { id: true, userId: true, couponCode: true },
  });
}

export async function addToCart(productId: string): Promise<void> {
  const product = await db.product.findFirst({ where: { id: productId, ...publicProductWhere() }, select: { id: true, type: true, prices: { select: { amountMinor: true } } } });
  if (!product) throw new AppError("PRODUCT_NOT_FOUND", "This product isn't available.");
  if (product.type === "free_resource" || product.prices.every((p) => p.amountMinor === 0)) {
    throw new AppError("PRODUCT_UNAVAILABLE", "This one is free — add it to your library from the product page.");
  }
  const user = await getCurrentUser();
  if (user && (await ownedProductIds(user.id, [productId])).has(productId)) {
    throw new AppError("ALREADY_OWNED", "This is already in your library.");
  }
  const cart = (await resolveCart(true))!;
  // No quantity: adding twice is a no-op (C2).
  await db.cartItem.upsert({
    where: { cartId_productId: { cartId: cart.id, productId } },
    create: { cartId: cart.id, productId },
    update: { savedForLater: false },
  });
}

export async function removeFromCart(productId: string): Promise<void> {
  const cart = await resolveCart(false);
  if (cart) await db.cartItem.deleteMany({ where: { cartId: cart.id, productId } });
}

export async function setSavedForLater(productId: string, saved: boolean): Promise<void> {
  const cart = await resolveCart(false);
  if (cart) await db.cartItem.updateMany({ where: { cartId: cart.id, productId }, data: { savedForLater: saved } });
}

export async function applyCoupon(code: string): Promise<Quote> {
  const cart = await resolveCart(false);
  if (!cart) throw new AppError("COUPON_NOT_APPLICABLE", "Add something to your cart first.");
  const view = await cartView({ couponOverride: code });
  if (view.quote.couponError) throw new AppError(view.quote.couponError.code, view.quote.couponError.message, { fields: { code: view.quote.couponError.message } });
  await db.cart.update({ where: { id: cart.id }, data: { couponCode: code.trim() } });
  return view.quote;
}

export async function removeCoupon(): Promise<void> {
  const cart = await resolveCart(false);
  if (cart) await db.cart.update({ where: { id: cart.id }, data: { couponCode: null } });
}

export type CartView = {
  cartId: string | null;
  currency: Currency;
  items: ProductCard[];
  savedForLater: ProductCard[];
  quote: Quote;
  couponCode: string | null;
  notices: string[];
};

/** Cart with server-computed totals. Owned or unavailable items are dropped with a notice. */
export async function cartView(options: { couponOverride?: string } = {}): Promise<CartView> {
  const currency = await getDisplayCurrency();
  const user = await getCurrentUser();
  const cart = await resolveCart(false);
  const empty = { cartId: null, currency, items: [], savedForLater: [], couponCode: null, notices: [] };
  if (!cart) return { ...empty, quote: await quote({ productIds: [], currency }) };

  const rows = await db.cartItem.findMany({
    where: { cartId: cart.id },
    orderBy: { addedAt: "asc" },
    include: { product: { include: cardInclude(currency) } },
  });
  const notices: string[] = [];
  const owned = user ? await ownedProductIds(user.id, rows.map((r) => r.productId)) : new Set<string>();
  const stale = rows.filter((r) => owned.has(r.productId) || r.product.status !== "published" || r.product.deletedAt);
  if (stale.length) {
    await db.cartItem.deleteMany({ where: { id: { in: stale.map((r) => r.id) } } });
    for (const r of stale) notices.push(owned.has(r.productId) ? `“${r.product.title}” is already in your library, so we removed it.` : `“${r.product.title}” is no longer available and was removed.`);
  }
  const live = rows.filter((r) => !stale.includes(r));
  const active = live.filter((r) => !r.savedForLater);
  const couponCode = options.couponOverride ?? cart.couponCode;
  const q = await quote({
    productIds: active.map((r) => r.productId),
    currency,
    couponCode,
    customer: { userId: user?.id, email: user?.email },
  });
  const priced = new Set(q.lines.map((l) => l.productId));
  for (const r of active) if (!priced.has(r.productId)) notices.push(`“${r.product.title}” isn't sold in ${currency}, so it's not included in your total.`);
  return {
    cartId: cart.id,
    currency,
    items: active.filter((r) => priced.has(r.productId)).map((r) => toCard(r.product)),
    savedForLater: live.filter((r) => r.savedForLater).map((r) => toCard(r.product)),
    quote: q,
    couponCode: q.coupon ? q.coupon.code : null,
    notices,
  };
}

export async function cartCount(): Promise<number> {
  const cart = await resolveCart(false);
  if (!cart) return 0;
  return db.cartItem.count({ where: { cartId: cart.id, savedForLater: false } });
}

/**
 * Called right after sign-in: moves guest items into the user's cart without duplicates,
 * drops items the user already owns, then deletes the guest cart (Flow 6).
 */
export async function mergeGuestCart(userId: string): Promise<{ merged: number; droppedOwned: number }> {
  const jar = await cookies();
  const token = jar.get(CART_COOKIE)?.value;
  if (!token) return { merged: 0, droppedOwned: 0 };
  const guest = await db.cart.findUnique({ where: { guestTokenHash: sha256(token) }, include: { items: true } });
  jar.delete(CART_COOKIE);
  if (!guest || guest.userId) return { merged: 0, droppedOwned: 0 };
  const owned = await ownedProductIds(userId, guest.items.map((i) => i.productId));
  const userCart = await db.cart.upsert({ where: { userId }, create: { userId, couponCode: guest.couponCode }, update: {} });
  let merged = 0;
  for (const item of guest.items) {
    if (owned.has(item.productId)) continue;
    await db.cartItem.upsert({
      where: { cartId_productId: { cartId: userCart.id, productId: item.productId } },
      create: { cartId: userCart.id, productId: item.productId, savedForLater: item.savedForLater },
      update: {},
    });
    merged++;
  }
  if (!userCart.couponCode && guest.couponCode) await db.cart.update({ where: { id: userCart.id }, data: { couponCode: guest.couponCode } });
  await db.cart.delete({ where: { id: guest.id } });
  return { merged, droppedOwned: owned.size };
}

/** Empties the active (non-saved) items after an order is placed. */
export async function clearPurchasedItems(cartId: string, productIds: string[]): Promise<void> {
  await db.cartItem.deleteMany({ where: { cartId, productId: { in: productIds } } });
  await db.cart.update({ where: { id: cartId }, data: { couponCode: null } });
}

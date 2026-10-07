import "server-only";
import { cookies, headers } from "next/headers";
import { isCurrency, type Currency } from "@/lib/money";

export const CURRENCY_COOKIE = "krm_currency";

/**
 * Display/checkout currency: explicit choice (cookie) → visitor country (IN → INR, otherwise
 * USD) → store default. Prices are explicit per-currency rows; there is no FX conversion (OQ-8).
 */
export async function getDisplayCurrency(): Promise<Currency> {
  const jar = await cookies();
  const chosen = jar.get(CURRENCY_COOKIE)?.value;
  if (chosen && isCurrency(chosen)) return chosen;
  const h = await headers();
  const country = h.get("x-vercel-ip-country") ?? h.get("cf-ipcountry");
  if (country) return country.toUpperCase() === "IN" ? "INR" : "USD";
  const fallback = process.env.NEXT_PUBLIC_DEFAULT_CURRENCY;
  return fallback && isCurrency(fallback) ? fallback : "INR";
}

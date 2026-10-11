import { cookies } from "next/headers";
import { z } from "zod";
import { ok, parseJson, route } from "@/lib/http";
import { CURRENCY_COOKIE } from "@/modules/pricing";

/** Remembers the visitor's display/checkout currency (DEC-030). Prices are per currency — no FX. */
export const POST = route(async (request) => {
  const { currency } = await parseJson(request, z.object({ currency: z.enum(["INR", "USD"]) }));
  (await cookies()).set(CURRENCY_COOKIE, currency, { path: "/", sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 365 * 86_400 });
  return ok({ currency });
});

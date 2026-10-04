import { ok, parseJson, route } from "@/lib/http";
import { enforceRateLimit } from "@/lib/rate-limit";
import { requestContext } from "@/lib/request";
import { applyCoupon, couponInput, removeCoupon } from "@/modules/cart";

export const POST = route(async (request) => {
  await enforceRateLimit("coupon", (await requestContext()).ip ?? "anon");
  const { code } = await parseJson(request, couponInput);
  const quote = await applyCoupon(code);
  return ok({ code: quote.coupon?.code, discountMinor: quote.discountMinor });
});

export const DELETE = route(async () => {
  await removeCoupon();
  return ok({ removed: true });
});

import { z } from "zod";
import { ok, route } from "@/lib/http";
import { cartCount, removeFromCart } from "@/modules/cart";

export const DELETE = route(async (_request, ctx: RouteContext<"/api/v1/cart/items/[productId]">) => {
  const productId = z.uuid().parse((await ctx.params).productId);
  await removeFromCart(productId);
  return ok({ productId, count: await cartCount() });
});

import { z } from "zod";
import { ok, parseJson, route } from "@/lib/http";
import { setSavedForLater } from "@/modules/cart";

export const POST = route(async (request, ctx: RouteContext<"/api/v1/cart/items/[productId]/save-for-later">) => {
  const productId = z.uuid().parse((await ctx.params).productId);
  const { saved } = await parseJson(request, z.object({ saved: z.boolean() }));
  await setSavedForLater(productId, saved);
  return ok({ productId, saved });
});

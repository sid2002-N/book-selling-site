import { z } from "zod";
import { ok, parseJson, route } from "@/lib/http";
import { cancelOrder } from "@/modules/checkout";

export const POST = route(async (request, ctx: RouteContext<"/api/v1/checkout/orders/[id]/cancel">) => {
  const orderId = z.uuid().parse((await ctx.params).id);
  const { token } = await parseJson(request, z.object({ token: z.string().max(200).optional() }));
  await cancelOrder({ orderId, token });
  return ok({ cancelled: true });
});

import { z } from "zod";
import { ok, parseJson, route } from "@/lib/http";
import { providerSchema, retryPayment } from "@/modules/checkout";

const input = z.object({ provider: providerSchema, token: z.string().max(200).optional() });

export const POST = route(async (request, ctx: RouteContext<"/api/v1/checkout/orders/[id]/retry">) => {
  const orderId = z.uuid().parse((await ctx.params).id);
  const body = await parseJson(request, input);
  return ok(await retryPayment({ orderId, ...body }));
});

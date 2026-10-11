import { z } from "zod";
import { ok, route } from "@/lib/http";
import { orderStatus } from "@/modules/checkout";

export const dynamic = "force-dynamic";

export const GET = route(async (request, ctx: RouteContext<"/api/v1/checkout/orders/[id]/status">) => {
  const orderId = z.uuid().parse((await ctx.params).id);
  const url = new URL(request.url);
  const view = await orderStatus({ orderId, token: url.searchParams.get("token"), refresh: url.searchParams.get("refresh") === "1" });
  return ok(view, {}, { headers: { "Cache-Control": "no-store" } });
});

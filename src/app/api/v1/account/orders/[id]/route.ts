import { z } from "zod";
import { ok, route } from "@/lib/http";
import { requireUser } from "@/modules/auth";
import { orderDetail } from "@/modules/orders";

export const GET = route(async (_request, ctx: RouteContext<"/api/v1/account/orders/[id]">) => {
  const { user } = await requireUser();
  return ok(await orderDetail(user.id, z.uuid().parse((await ctx.params).id)));
});

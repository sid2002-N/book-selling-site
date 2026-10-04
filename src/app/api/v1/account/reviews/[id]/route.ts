import { z } from "zod";
import { ok, route } from "@/lib/http";
import { requireUser } from "@/modules/auth";
import { deleteReview } from "@/modules/engagement";

export const DELETE = route(async (_request, ctx: RouteContext<"/api/v1/account/reviews/[id]">) => {
  const { user } = await requireUser();
  await deleteReview(user.id, z.uuid().parse((await ctx.params).id));
  return ok({ deleted: true });
});

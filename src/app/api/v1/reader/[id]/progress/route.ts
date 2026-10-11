import { z } from "zod";
import { ok, parseJson, route } from "@/lib/http";
import { requireUser } from "@/modules/auth";
import { progressInput, saveProgress } from "@/modules/reader";

export const PUT = route(async (request, ctx: RouteContext<"/api/v1/reader/[id]/progress">) => {
  const { user } = await requireUser();
  await saveProgress(user.id, z.uuid().parse((await ctx.params).id), await parseJson(request, progressInput));
  return ok({ saved: true });
});

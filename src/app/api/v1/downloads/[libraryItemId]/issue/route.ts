import { z } from "zod";
import { ok, route } from "@/lib/http";
import { requireUser } from "@/modules/auth";
import { issueDownload } from "@/modules/delivery";

export const POST = route(async (_request, ctx: RouteContext<"/api/v1/downloads/[libraryItemId]/issue">) => {
  const { user } = await requireUser();
  const libraryItemId = z.uuid().parse((await ctx.params).libraryItemId);
  const issued = await issueDownload({ userId: user.id, emailVerified: user.emailVerified, libraryItemId });
  return ok(issued, {}, { headers: { "Cache-Control": "no-store" } });
});

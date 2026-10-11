import { z } from "zod";
import { ok, route } from "@/lib/http";
import { requireUser } from "@/modules/auth";
import { readerManifest } from "@/modules/reader";

export const GET = route(async (_request, ctx: RouteContext<"/api/v1/reader/[id]/manifest">) => {
  const { user } = await requireUser();
  const manifest = await readerManifest(user.id, user.emailVerified, z.uuid().parse((await ctx.params).id));
  return ok(manifest, {}, { headers: { "Cache-Control": "private, no-store" } });
});

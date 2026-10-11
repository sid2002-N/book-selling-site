import { z } from "zod";
import { ok, parseJson, route } from "@/lib/http";
import { requireUser } from "@/modules/auth";
import { addBookmark, bookmarkInput, removeBookmark } from "@/modules/reader";

export const POST = route(async (request, ctx: RouteContext<"/api/v1/reader/[id]/bookmarks">) => {
  const { user } = await requireUser();
  return ok(await addBookmark(user.id, z.uuid().parse((await ctx.params).id), await parseJson(request, bookmarkInput)), {}, { status: 201 });
});

export const DELETE = route(async (request, ctx: RouteContext<"/api/v1/reader/[id]/bookmarks">) => {
  const { user } = await requireUser();
  const page = z.coerce.number().int().min(1).parse(new URL(request.url).searchParams.get("page"));
  await removeBookmark(user.id, z.uuid().parse((await ctx.params).id), page);
  return ok({ removed: true });
});

import { z } from "zod";
import { ok, route } from "@/lib/http";
import { requireUser } from "@/modules/auth";
import { setLibraryFlag } from "@/modules/library";

const handler = (value: boolean) =>
  route(async (_request, ctx: RouteContext<"/api/v1/account/library/[id]/archive">) => {
    const { user } = await requireUser();
    await setLibraryFlag(user.id, z.uuid().parse((await ctx.params).id), "archive", value);
    return ok({ archive: value });
  });

export const POST = handler(true);
export const DELETE = handler(false);

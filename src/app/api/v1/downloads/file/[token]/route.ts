import { NextResponse } from "next/server";
import { Readable } from "node:stream";
import { getCurrentUser } from "@/modules/auth";
import { redeemDownloadToken } from "@/modules/delivery";

/** Protected, single-use file stream (local storage driver). Failures land on a branded state. */
export async function GET(request: Request, ctx: RouteContext<"/api/v1/downloads/file/[token]">) {
  const { token } = await ctx.params;
  const user = await getCurrentUser();
  const result = await redeemDownloadToken(token, user?.id ?? null);
  if (!result.ok) return NextResponse.redirect(new URL(`/account/downloads?error=${result.reason}`, request.url), 303);
  const safeName = result.fileName.replace(/[^\w.\- ]+/g, "_");
  return new Response(Readable.toWeb(result.object.body) as ReadableStream, {
    headers: {
      "Content-Type": result.object.contentType,
      "Content-Length": String(result.object.size),
      "Content-Disposition": `attachment; filename="${safeName}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    },
  });
}

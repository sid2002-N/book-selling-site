import { Readable } from "node:stream";
import { z } from "zod";
import { handleError } from "@/lib/http";
import { requireUser } from "@/modules/auth";
import { readerFile } from "@/modules/reader";

/** Range-request PDF stream for the in-app reader. Owner-only, never cached or indexed. */
export async function GET(request: Request, ctx: RouteContext<"/api/v1/reader/[id]/file">) {
  try {
    const { user } = await requireUser();
    const id = z.uuid().parse((await ctx.params).id);
    const { object, status } = await readerFile(user.id, user.emailVerified, id, request.headers.get("range"));
    const headers: Record<string, string> = {
      "Content-Type": "application/pdf",
      "Content-Length": String(object.size),
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex",
      "Content-Disposition": "attachment",
    };
    if (object.range) headers["Content-Range"] = `bytes ${object.range.start}-${object.range.end}/${object.range.total}`;
    return new Response(Readable.toWeb(object.body) as ReadableStream, { status, headers });
  } catch (error) {
    return handleError(error);
  }
}

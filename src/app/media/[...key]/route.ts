import { Readable } from "node:stream";
import { storage } from "@/modules/storage";

/**
 * Serves the PUBLIC bucket in local development (covers, watermarked previews). Paid files live
 * in the private bucket and are never reachable here. With R2, public assets come from the CDN.
 */
export async function GET(_request: Request, ctx: RouteContext<"/media/[...key]">) {
  if (process.env.STORAGE_DRIVER === "r2") return new Response("Not found", { status: 404 });
  const { key } = await ctx.params;
  const object = await storage().get("public", key.join("/")).catch(() => null);
  if (!object) return new Response("Not found", { status: 404 });
  return new Response(Readable.toWeb(object.body) as ReadableStream, {
    headers: {
      "Content-Type": object.contentType,
      "Content-Length": String(object.size),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

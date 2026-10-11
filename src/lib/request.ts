import "server-only";
import { headers } from "next/headers";

export type RequestContext = { ip: string | null; userAgent: string | null; requestId: string };

/** Client IP, user agent and request id for logging, rate limits and audit entries. */
export async function requestContext(): Promise<RequestContext> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return {
    ip: forwarded || h.get("x-real-ip") || null,
    userAgent: h.get("user-agent"),
    requestId: h.get("x-request-id") ?? crypto.randomUUID(),
  };
}

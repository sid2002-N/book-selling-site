import { NextResponse } from "next/server";
import { isAppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { verifyEmail } from "@/modules/auth";

/** Email links land here; the token is consumed server-side, then the user sees a status page. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? "";
  const to = (status: string) => NextResponse.redirect(new URL(`/verify-email?status=${status}`, url.origin), 303);
  try {
    await verifyEmail(token);
    return to("success");
  } catch (error) {
    if (isAppError(error)) {
      const reason = error.code === "TOKEN_EXPIRED" ? "expired" : error.meta?.reason === "used" ? "used" : "invalid";
      return to(reason);
    }
    logger.error("verify_email_failed", { error });
    return to("invalid");
  }
}

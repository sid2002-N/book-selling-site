import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { requestContext } from "@/lib/request";
import { handleGoogleCallback } from "@/modules/auth";
import { mergeGuestCart } from "@/modules/cart";
import { claimGuestOrdersForUser } from "@/modules/checkout";

export async function GET(request: Request) {
  const url = new URL(request.url);
  try {
    const { redirectTo, userId } = await handleGoogleCallback(
      { code: url.searchParams.get("code"), state: url.searchParams.get("state") },
      await requestContext(),
    );
    await mergeGuestCart(userId);
    await claimGuestOrdersForUser(userId);
    return NextResponse.redirect(new URL(redirectTo, url.origin), 303);
  } catch (error) {
    logger.warn("google_callback_failed", { error });
    return NextResponse.redirect(new URL("/login?error=google", url.origin), 303);
  }
}

import { NextResponse } from "next/server";
import { googleAuthorizationUrl, googleConfigured } from "@/modules/auth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (!googleConfigured()) return NextResponse.redirect(new URL("/login", url.origin), 303);
  const authorizationUrl = await googleAuthorizationUrl(url.searchParams.get("next"));
  return NextResponse.redirect(authorizationUrl, 302);
}

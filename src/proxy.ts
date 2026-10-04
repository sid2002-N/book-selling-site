import { NextResponse, type NextRequest } from "next/server";

/**
 * Network-boundary concerns only (Next 16 `proxy`): request ids and the pathname header used
 * by layouts to build `next=` redirects. Authorization happens in pages and services.
 */
export function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set("x-pathname", request.nextUrl.pathname + request.nextUrl.search);
  if (!headers.has("x-request-id")) headers.set("x-request-id", crypto.randomUUID());
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:png|jpg|jpeg|webp|svg|ico)$).*)"],
};

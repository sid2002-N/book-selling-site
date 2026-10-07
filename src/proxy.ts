import { NextResponse, type NextRequest } from "next/server";

/**
 * Network-boundary concerns only (Next 16 `proxy`): request ids and the pathname header used
 * by layouts to build `next=` redirects. Authorization happens in pages and services.
 */
export function proxy(request: NextRequest) {
  // A deployment without a database can't render any page: explain instead of a bare 500.
  if (!process.env.DATABASE_URL && process.env.NODE_ENV === "production") {
    const path = request.nextUrl.pathname;
    if (path !== "/setup-required" && path !== "/api/health") {
      if (path.startsWith("/api/")) {
        return NextResponse.json(
          { data: null, error: { code: "SERVICE_UNAVAILABLE", message: "This deployment isn't connected to a database yet." }, meta: {} },
          { status: 503 },
        );
      }
      return NextResponse.rewrite(new URL("/setup-required", request.url));
    }
  }
  const headers = new Headers(request.headers);
  headers.set("x-pathname", request.nextUrl.pathname + request.nextUrl.search);
  if (!headers.has("x-request-id")) headers.set("x-request-id", crypto.randomUUID());
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:png|jpg|jpeg|webp|svg|ico)$).*)"],
};

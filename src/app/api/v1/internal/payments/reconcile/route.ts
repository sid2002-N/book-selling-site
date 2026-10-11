import { NextResponse } from "next/server";
import { safeEqual, serverSecret } from "@/lib/crypto";
import { handleError, ok } from "@/lib/http";
import { reconcileOpenPayments } from "@/modules/payments";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Internal job (Vercel Cron, DEC-008). Vercel sends `Authorization: Bearer $CRON_SECRET`. */
async function handler(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  if (!safeEqual(header, `Bearer ${serverSecret("CRON_SECRET")}`)) {
    return NextResponse.json({ data: null, error: { code: "FORBIDDEN", message: "Forbidden" }, meta: {} }, { status: 403 });
  }
  try {
    return ok(await reconcileOpenPayments());
  } catch (error) {
    return handleError(error);
  }
}

export { handler as GET, handler as POST };

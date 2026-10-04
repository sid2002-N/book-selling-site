import { NextResponse } from "next/server";
import { receiveWebhook } from "@/modules/payments";

/** Provider webhook: signature verified over the exact raw body; no cookies, no CSRF origin check. */
export async function POST(request: Request) {
  const raw = await request.text();
  const result = await receiveWebhook("stripe", raw, request.headers);
  return NextResponse.json({ received: result.status < 300, outcome: result.outcome }, { status: result.status });
}

import { NextResponse } from "next/server";
import { healthReport } from "@/modules/system/health";

export const dynamic = "force-dynamic";

/** Deployment self-check. Reports which configuration is missing; never secret values. */
export async function GET() {
  const report = await healthReport();
  // "empty" still serves pages, so only hard failures return 503.
  const hard = report.database.state === "missing" || report.database.state === "unreachable" || report.database.state === "not_migrated";
  return NextResponse.json(report, { status: hard ? 503 : 200, headers: { "Cache-Control": "no-store" } });
}

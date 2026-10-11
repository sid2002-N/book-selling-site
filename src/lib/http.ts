import "server-only";
import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { AppError, isAppError } from "./errors";
import { logger } from "./logger";

/** API envelope (docs/API.md §1): { data, error, meta }. */
export type ApiError = { code: string; message: string; fields?: Record<string, string> };

export function ok<T>(data: T, meta: Record<string, unknown> = {}, init?: ResponseInit) {
  return NextResponse.json({ data, error: null, meta }, init);
}

export function zodFields(error: ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    fields[key] ??= issue.message;
  }
  return fields;
}

/** Maps any thrown value to a user-safe envelope; originals are logged with the request id. */
export function handleError(error: unknown, requestId: string = crypto.randomUUID()) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { data: null, error: { code: "VALIDATION_ERROR", message: "Please check the highlighted fields.", fields: zodFields(error) }, meta: { requestId } },
      { status: 400 },
    );
  }
  if (isAppError(error)) {
    if (error.httpStatus >= 500) logger.error("app_error", { requestId, code: error.code, cause: error.cause, meta: error.meta });
    const headers: Record<string, string> = {};
    if (error.code === "RATE_LIMITED" && typeof error.meta?.retryAfter === "number") headers["Retry-After"] = String(error.meta.retryAfter);
    return NextResponse.json(
      { data: null, error: { code: error.code, message: error.userMessage, fields: error.fields }, meta: { requestId } },
      { status: error.httpStatus, headers },
    );
  }
  logger.error("unhandled_error", { requestId, error });
  return NextResponse.json(
    { data: null, error: { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." }, meta: { requestId } },
    { status: 500 },
  );
}

export async function parseJson<T>(request: Request, schema: ZodType<T>): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new AppError("INVALID_REQUEST", "The request could not be read.");
  }
  return schema.parse(body);
}

/**
 * CSRF defence for cookie-authenticated mutations (SECURITY §5): SameSite=Lax cookies plus an
 * Origin check against the app URL. Webhooks are exempt (signature-verified instead).
 */
export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (!origin) return; // Same-origin fetches from older browsers / server-to-server: SameSite covers these.
  const allowed = new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").origin;
  const host = request.headers.get("host");
  const originHost = new URL(origin).host;
  if (new URL(origin).origin !== allowed && originHost !== host) {
    throw new AppError("FORBIDDEN", "This request was blocked for your security.");
  }
}

export function route<Ctx>(handler: (request: Request, ctx: Ctx) => Promise<Response>) {
  return async (request: Request, ctx: Ctx) => {
    const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
    try {
      if (request.method !== "GET" && request.method !== "HEAD") assertSameOrigin(request);
      return await handler(request, ctx);
    } catch (error) {
      return handleError(error, requestId);
    }
  };
}

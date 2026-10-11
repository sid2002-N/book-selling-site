/**
 * Stable, machine-readable error codes (docs/API.md §5). `userMessage` is always safe to show;
 * technical detail goes to `cause`/`meta` and the logs only.
 */
export const ERROR_CODES = {
  VALIDATION_ERROR: 400,
  INVALID_REQUEST: 400,
  AUTH_REQUIRED: 401,
  SESSION_EXPIRED: 401,
  INVALID_CREDENTIALS: 401,
  TWO_FACTOR_REQUIRED: 401,
  TWO_FACTOR_INVALID: 401,
  FORBIDDEN: 403,
  EMAIL_NOT_VERIFIED: 403,
  ACCOUNT_LOCKED: 403,
  ACCOUNT_BLOCKED: 403,
  NOT_FOUND: 404,
  PRODUCT_NOT_FOUND: 404,
  ORDER_NOT_FOUND: 404,
  ALREADY_OWNED: 409,
  DUPLICATE_PURCHASE: 409,
  SLUG_TAKEN: 409,
  IDEMPOTENCY_CONFLICT: 409,
  PRODUCT_UNAVAILABLE: 409,
  PRODUCT_INCOMPLETE: 409,
  EMAIL_TAKEN: 409,
  COUPON_INVALID: 422,
  COUPON_EXPIRED: 422,
  COUPON_NOT_APPLICABLE: 422,
  COUPON_LIMIT_REACHED: 422,
  COUPON_MIN_ORDER: 422,
  TOKEN_INVALID: 400,
  TOKEN_EXPIRED: 410,
  PAYMENT_FAILED: 402,
  PAYMENT_CANCELLED: 409,
  PAYMENT_PENDING_VERIFICATION: 409,
  PAYMENT_VERIFICATION_FAILED: 409,
  PROVIDER_NOT_CONFIGURED: 503,
  DOWNLOAD_LIMIT_REACHED: 403,
  DOWNLOAD_EXPIRED: 410,
  DOWNLOAD_UNAUTHORIZED: 403,
  FILE_UNAVAILABLE: 503,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
  MAINTENANCE: 503,
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly httpStatus: number;
  readonly userMessage: string;
  readonly fields?: Record<string, string>;
  readonly meta?: Record<string, unknown>;

  constructor(
    code: ErrorCode,
    userMessage: string,
    options: { cause?: unknown; fields?: Record<string, string>; meta?: Record<string, unknown> } = {},
  ) {
    super(userMessage, { cause: options.cause });
    this.name = "AppError";
    this.code = code;
    this.httpStatus = ERROR_CODES[code];
    this.userMessage = userMessage;
    this.fields = options.fields;
    this.meta = options.meta;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/** Discriminated result for expected business outcomes (e.g. coupon validation). */
export type Result<T, E extends ErrorCode = ErrorCode> =
  | { ok: true; value: T }
  | { ok: false; code: E; message: string };

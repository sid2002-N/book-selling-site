import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { AppError } from "./errors";
import { logger } from "./logger";

/** Limits from docs/SECURITY.md §5 (tune later). */
export const LIMITS = {
  login: { tokens: 5, window: "1 m" },
  register: { tokens: 5, window: "1 h" },
  forgotPassword: { tokens: 3, window: "1 h" },
  verifyResend: { tokens: 3, window: "1 h" },
  twoFactor: { tokens: 6, window: "5 m" },
  search: { tokens: 60, window: "1 m" },
  coupon: { tokens: 10, window: "1 m" },
  downloadIssue: { tokens: 20, window: "1 h" },
  reviewCreate: { tokens: 5, window: "1 d" },
  newsletter: { tokens: 5, window: "1 h" },
  orderCreate: { tokens: 10, window: "10 m" },
} as const satisfies Record<string, { tokens: number; window: `${number} ${"s" | "m" | "h" | "d"}` }>;

export type LimitName = keyof typeof LIMITS;

/** Endpoints that must fail closed when the limiter store is unavailable (ARCHITECTURE §12). */
const FAIL_CLOSED: ReadonlySet<LimitName> = new Set(["login", "register", "forgotPassword", "twoFactor", "orderCreate"]);

type Limiter = { limit: (key: string) => Promise<{ success: boolean; reset: number }> };

const windowMs = (w: string) => {
  const [n, unit] = w.split(" ") as [string, "s" | "m" | "h" | "d"];
  return Number(n) * { s: 1e3, m: 6e4, h: 3.6e6, d: 8.64e7 }[unit];
};

/** In-memory fixed-window limiter for local development and tests only. */
function memoryLimiter(tokens: number, window: string): Limiter {
  const hits = new Map<string, { count: number; reset: number }>();
  return {
    async limit(key) {
      const now = Date.now();
      const entry = hits.get(key);
      if (!entry || entry.reset <= now) {
        hits.set(key, { count: 1, reset: now + windowMs(window) });
        return { success: true, reset: now + windowMs(window) };
      }
      entry.count += 1;
      return { success: entry.count <= tokens, reset: entry.reset };
    },
  };
}

const limiters = new Map<LimitName, Limiter>();
const redisConfigured = Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

function limiterFor(name: LimitName): Limiter {
  const existing = limiters.get(name);
  if (existing) return existing;
  const { tokens, window } = LIMITS[name];
  let limiter: Limiter;
  if (redisConfigured) {
    limiter = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(tokens, window),
      prefix: `krm:rl:${name}`,
    });
  } else {
    if (process.env.APP_ENV === "production") throw new Error("Rate limiting requires Upstash Redis in production");
    limiter = memoryLimiter(tokens, window);
  }
  limiters.set(name, limiter);
  return limiter;
}

/** Throws RATE_LIMITED (with retry-after seconds in meta) when the key exceeds its budget. */
export async function enforceRateLimit(name: LimitName, key: string): Promise<void> {
  let result: { success: boolean; reset: number };
  try {
    result = await limiterFor(name).limit(key);
  } catch (error) {
    logger.error("rate_limit_store_error", { name, error });
    if (FAIL_CLOSED.has(name)) {
      throw new AppError("SERVICE_UNAVAILABLE", "This is temporarily unavailable. Please try again in a moment.", { cause: error });
    }
    return;
  }
  if (!result.success) {
    const retryAfter = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));
    throw new AppError("RATE_LIMITED", "Too many attempts. Please wait a moment and try again.", { meta: { retryAfter, name } });
  }
}

/** Test helper: forget in-memory counters between test cases. */
export function resetRateLimitsForTests(): void {
  if (process.env.NODE_ENV !== "test") throw new Error("resetRateLimitsForTests is for tests only");
  limiters.clear();
}

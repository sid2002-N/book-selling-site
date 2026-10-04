import "server-only";
import { z } from "zod";

/**
 * Server environment, parsed once at boot (docs/ENVIRONMENT.md).
 * Provider credentials are optional so local development works without them; each provider
 * adapter reports "not configured" instead of faking behaviour (master prompt §76).
 */
const optional = z
  .string()
  .trim()
  .transform((v) => (v === "" ? undefined : v))
  .optional();

const schema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    APP_ENV: z.enum(["development", "staging", "production"]).default("development"),
    NEXT_PUBLIC_APP_URL: z.url().default("http://localhost:3000"),
    NEXT_PUBLIC_DEFAULT_CURRENCY: z.enum(["INR", "USD"]).default("INR"),

    DATABASE_URL: optional,
    DIRECT_DATABASE_URL: optional,
    REDIS_URL: optional,
    UPSTASH_REDIS_REST_URL: optional,
    UPSTASH_REDIS_REST_TOKEN: optional,

    AUTH_SECRET: optional,
    GOOGLE_CLIENT_ID: optional,
    GOOGLE_CLIENT_SECRET: optional,
    ENCRYPTION_KEY: optional,
    DOWNLOAD_SIGNING_SECRET: optional,
    CRON_SECRET: optional,

    RAZORPAY_KEY_ID: optional,
    RAZORPAY_KEY_SECRET: optional,
    RAZORPAY_WEBHOOK_SECRET: optional,
    STRIPE_SECRET_KEY: optional,
    STRIPE_WEBHOOK_SECRET: optional,
    NEXT_PUBLIC_RAZORPAY_KEY_ID: optional,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: optional,

    STORAGE_DRIVER: z.enum(["local", "r2"]).default("local"),
    STORAGE_ENDPOINT: optional,
    STORAGE_REGION: z.string().default("auto"),
    STORAGE_ACCESS_KEY_ID: optional,
    STORAGE_SECRET_ACCESS_KEY: optional,
    STORAGE_BUCKET_PRIVATE: optional,
    STORAGE_BUCKET_PUBLIC: optional,
    CDN_BASE_URL: optional,

    EMAIL_PROVIDER: z.enum(["console", "resend"]).default("console"),
    EMAIL_API_KEY: optional,
    EMAIL_FROM: z.string().default("KRM.lib <noreply@krmlib.local>"),
    EMAIL_REPLY_TO: optional,

    INNGEST_EVENT_KEY: optional,
    INNGEST_SIGNING_KEY: optional,

    ERROR_TRACKING_DSN: optional,
    LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
    FEATURE_CREATOR_SYSTEM: z
      .enum(["true", "false"])
      .default("false")
      .transform((v) => v === "true"),
  })
  .superRefine((env, ctx) => {
    if (env.APP_ENV !== "production") return;
    const required = [
      "DATABASE_URL",
      "AUTH_SECRET",
      "ENCRYPTION_KEY",
      "DOWNLOAD_SIGNING_SECRET",
      "CRON_SECRET",
    ] as const;
    for (const key of required) {
      if (!env[key]) ctx.addIssue({ code: "custom", path: [key], message: "required in production" });
    }
    if (env.STRIPE_SECRET_KEY?.startsWith("sk_test_")) {
      ctx.addIssue({ code: "custom", path: ["STRIPE_SECRET_KEY"], message: "test key in production" });
    }
    if (env.RAZORPAY_KEY_ID?.startsWith("rzp_test_")) {
      ctx.addIssue({ code: "custom", path: ["RAZORPAY_KEY_ID"], message: "test key in production" });
    }
  });

export type Env = z.infer<typeof schema>;

function parseEnv(): Env {
  const result = schema.safeParse(process.env);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid environment configuration — ${issues}`);
  }
  return result.data;
}

export const env: Env = parseEnv();

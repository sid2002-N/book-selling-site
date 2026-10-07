import "server-only";
import { db } from "@/lib/db";

export type CheckState = "ok" | "missing" | "unreachable" | "not_migrated" | "empty";

/** Settings the app needs at runtime. Only names are ever reported — never values. */
const REQUIRED_SECRETS = ["AUTH_SECRET", "ENCRYPTION_KEY", "DOWNLOAD_SIGNING_SECRET", "CRON_SECRET"] as const;

/**
 * Deployment self-check (docs/DEPLOYMENT.md): tells an operator exactly which piece of
 * configuration is missing instead of a bare 500. Safe to expose: names and states only.
 */
export async function healthReport() {
  const database = await databaseState();
  const isVercel = Boolean(process.env.VERCEL);
  const storageDriver = process.env.STORAGE_DRIVER ?? "local";
  return {
    status: database.state === "ok" ? "ok" : "setup_required",
    database,
    secretsMissing: REQUIRED_SECRETS.filter((k) => !process.env[k]),
    storage: {
      driver: storageDriver,
      // Local files don't exist on serverless hosts, so covers and downloads need R2 there.
      ready: storageDriver === "r2" ? Boolean(process.env.STORAGE_BUCKET_PRIVATE && process.env.STORAGE_ACCESS_KEY_ID) : !isVercel,
    },
    email: process.env.EMAIL_PROVIDER === "resend" && process.env.EMAIL_API_KEY ? "resend" : "console (emails are only logged)",
    payments: {
      razorpay: Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
      stripe: Boolean(process.env.STRIPE_SECRET_KEY && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY),
    },
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? null,
  };
}

async function databaseState(): Promise<{ state: CheckState; detail: string }> {
  if (!process.env.DATABASE_URL) return { state: "missing", detail: "DATABASE_URL is not set." };
  try {
    const tables = await db.$queryRaw<{ ok: boolean }[]>`SELECT to_regclass('public.product') IS NOT NULL AS ok`;
    if (!tables[0]?.ok) return { state: "not_migrated", detail: "Connected, but the tables don't exist yet. Run `pnpm db:migrate`." };
    const products = await db.product.count({ where: { status: "published" } });
    if (products === 0) return { state: "empty", detail: "Connected and migrated, but there are no published products. Run `pnpm db:seed:demo` or add products." };
    return { state: "ok", detail: `Connected · ${products} published products.` };
  } catch (error) {
    const code = (error as { code?: string }).code;
    return { state: "unreachable", detail: `Couldn't connect to the database${code ? ` (${code})` : ""}. Check DATABASE_URL, SSL settings and that the database is running.` };
  }
}

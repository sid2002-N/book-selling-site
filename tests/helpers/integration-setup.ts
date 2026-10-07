import { afterAll, beforeEach, vi } from "vitest";
import { cookieJar, headerJar } from "./cookie-jar";

process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgresql://krm:krm@localhost:5432/krm_lib_test";
process.env.APP_ENV = "development";
process.env.EMAIL_PROVIDER = "console";
process.env.LOG_LEVEL = "error";

vi.mock("next/headers", () => ({
  cookies: async () => cookieJar,
  headers: async () => headerJar,
}));

// React's `cache` is a per-request memo; in tests every call should hit the store.
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return { ...actual, cache: <T extends (...args: never[]) => unknown>(fn: T) => fn };
});

beforeEach(async () => {
  cookieJar.clear();
  headerJar.clear();
  const { resetDatabase } = await import("./db");
  const { resetRateLimitsForTests } = await import("@/lib/rate-limit");
  resetRateLimitsForTests();
  await resetDatabase();
});

afterAll(async () => {
  const { db } = await import("@/lib/db");
  await db.$disconnect();
});

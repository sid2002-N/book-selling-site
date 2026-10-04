import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * Single Prisma client per process. Only `src/modules/**` (repositories/services) may import
 * this — UI code is blocked by the ESLint layer rule.
 */
function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not configured");
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

const globalForDb = globalThis as unknown as { __krmDb?: PrismaClient };

export const db: PrismaClient = globalForDb.__krmDb ?? createClient();

if (process.env.NODE_ENV !== "production") globalForDb.__krmDb = db;

export type Db = PrismaClient;
export type Tx = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

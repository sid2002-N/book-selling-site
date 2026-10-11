import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * Single Prisma client per process. Only `src/modules/**` (repositories/services) may import
 * this — UI code is blocked by the ESLint layer rule.
 *
 * Created lazily on first use: `next build` imports route modules to collect page data, and
 * that must not require a database. A missing DATABASE_URL still fails loudly on first query.
 */
function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not configured");
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

const globalForDb = globalThis as unknown as { __krmDb?: PrismaClient };

function client(): PrismaClient {
  if (!globalForDb.__krmDb) globalForDb.__krmDb = createClient();
  return globalForDb.__krmDb;
}

export const db: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const c = client();
    const value = Reflect.get(c, prop, c);
    return typeof value === "function" ? value.bind(c) : value;
  },
});

export type Db = PrismaClient;
export type Tx = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

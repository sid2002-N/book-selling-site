import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * `prisma generate` needs no database, so a missing URL must not fail installs (CI, Vercel
 * builds before a database is attached). Migrate/seed commands still require one. Migrations
 * prefer the direct (unpooled) URL when a pooler is in front of Postgres.
 */
const url = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed/index.ts",
  },
  ...(url ? { datasource: { url } } : {}),
});

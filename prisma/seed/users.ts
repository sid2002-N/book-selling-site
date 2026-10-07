import { randomBytes } from "node:crypto";
import { hash } from "@node-rs/argon2";
import type { PrismaClient } from "../../src/generated/prisma/client";

const ARGON = { memoryCost: 19456, timeCost: 2, parallelism: 1, outputLen: 32 } as const;

/** DEMO DATA — development accounts. Passwords come from env or are generated and printed once. */
export async function seedDemoUsers(db: PrismaClient): Promise<{ adminId: string; readerId: string }> {
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? `Admin-${randomBytes(4).toString("hex")}1`;
  const readerPassword = process.env.SEED_READER_PASSWORD ?? `Reader-${randomBytes(4).toString("hex")}1`;

  async function upsertUser(email: string, name: string, password: string) {
    const passwordHash = await hash(password, ARGON);
    const user = await db.user.upsert({
      where: { email },
      create: { email, name, emailVerifiedAt: new Date() },
      update: { name },
    });
    await db.account.upsert({
      where: { provider_providerAccountId: { provider: "credentials", providerAccountId: email } },
      create: { userId: user.id, provider: "credentials", providerAccountId: email, passwordHash },
      update: { passwordHash },
    });
    return user;
  }

  const admin = await upsertUser("admin@krmlib.local", "Demo Admin", adminPassword);
  const superAdmin = await db.adminRole.findUniqueOrThrow({ where: { key: "super_admin" } });
  await db.adminUser.upsert({ where: { userId: admin.id }, create: { userId: admin.id }, update: { status: "active" } });
  await db.adminUserRole.upsert({
    where: { adminUserId_roleId: { adminUserId: admin.id, roleId: superAdmin.id } },
    create: { adminUserId: admin.id, roleId: superAdmin.id },
    update: {},
  });

  const reader = await upsertUser("reader@krmlib.local", "Demo Reader", readerPassword);

  console.log("seed:demo — DEMO accounts (development only):");
  console.log(`  admin@krmlib.local  / ${adminPassword}   (super_admin; set up 2FA on first sign-in)`);
  console.log(`  reader@krmlib.local / ${readerPassword}`);
  return { adminId: admin.id, readerId: reader.id };
}

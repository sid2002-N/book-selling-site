import { Secret, TOTP } from "otpauth";
import { describe, expect, it } from "vitest";
import { decrypt } from "@/lib/crypto";
import { db } from "@/lib/db";
import { requirePermission } from "@/modules/admin";
import { DEFAULT_ROLES, PERMISSIONS } from "@/modules/admin/permissions";
import {
  beginTwoFactorSetup,
  confirmTwoFactorSetup,
  getCurrentSession,
  login,
  redeemRecoveryCode,
  register,
  verifyTwoFactorChallenge,
} from "@/modules/auth";
import { cookieJar } from "../helpers/cookie-jar";

const ctx = { ip: "203.0.113.50", userAgent: "test", requestId: "t" };
const creds = { name: "Ravi Admin", email: "ravi@example.com", password: "readmore42" };

async function seedRoles() {
  for (const [key, description] of Object.entries(PERMISSIONS)) await db.permission.create({ data: { key, description } });
  for (const [key, role] of Object.entries(DEFAULT_ROLES)) {
    await db.adminRole.create({
      data: { key, name: role.name, isSystem: true, permissions: { create: role.permissions.map((permissionKey) => ({ permissionKey })) } },
    });
  }
}

async function makeAdmin(userId: string, roleKey: string) {
  const role = await db.adminRole.findUniqueOrThrow({ where: { key: roleKey } });
  await db.adminUser.create({ data: { userId, roles: { create: { roleId: role.id } } } });
}

async function currentCode(userId: string, offsetMs = 0) {
  const record = await db.twoFactor.findUniqueOrThrow({ where: { userId } });
  return new TOTP({ secret: Secret.fromBase32(decrypt(record.secretEncrypted)) }).generate({ timestamp: Date.now() + offsetMs });
}

describe("two-factor authentication", () => {
  it("enables 2FA, challenges the next login, and accepts a recovery code once", async () => {
    const { userId } = await register(creds, ctx);
    await beginTwoFactorSetup();
    const { recoveryCodes } = await confirmTwoFactorSetup(await currentCode(userId));
    expect(recoveryCodes).toHaveLength(10);
    // Stored hashed, not raw.
    const stored = await db.recoveryCode.findMany({ where: { userId } });
    expect(stored.some((r) => recoveryCodes.includes(r.codeHash))).toBe(false);

    cookieJar.clear();
    const result = await login({ email: creds.email, password: creds.password }, ctx);
    expect(result.next).toBe("two_factor");
    expect((await getCurrentSession())?.twoFactorPassed).toBe(false);

    await expect(verifyTwoFactorChallenge("000000", false)).rejects.toMatchObject({ code: "TWO_FACTOR_INVALID" });
    await redeemRecoveryCode(recoveryCodes[0]!);
    expect((await getCurrentSession())?.twoFactorPassed).toBe(true);

    cookieJar.clear();
    await login({ email: creds.email, password: creds.password }, { ...ctx, ip: "203.0.113.51" });
    await expect(redeemRecoveryCode(recoveryCodes[0]!)).rejects.toMatchObject({ code: "TWO_FACTOR_INVALID" });
  });
});

describe("RBAC", () => {
  it("requires 2FA for admins, then enforces granular permissions", async () => {
    await seedRoles();
    const { userId } = await register(creds, ctx);
    await makeAdmin(userId, "support");

    await expect(requirePermission("orders.read")).rejects.toMatchObject({ code: "TWO_FACTOR_REQUIRED" });

    await beginTwoFactorSetup();
    await confirmTwoFactorSetup(await currentCode(userId));

    await expect(requirePermission("orders.read")).resolves.toMatchObject({ user: { id: userId } });
    await expect(requirePermission("settings.manage")).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(requirePermission("payments.read")).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(await db.securityEvent.count({ where: { type: "permission_denied", userId } })).toBe(2);
  });

  it("denies non-admin customers", async () => {
    await seedRoles();
    await register(creds, ctx);
    await expect(requirePermission("products.read")).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

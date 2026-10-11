import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { sha256 } from "@/lib/crypto";
import { getCurrentSession, login, register, requestPasswordReset, resetPassword, verifyEmail } from "@/modules/auth";
import { cookieJar } from "../helpers/cookie-jar";

const ctx = { ip: "203.0.113.7", userAgent: "Mozilla/5.0 (Windows NT 10.0) Chrome/130", requestId: "test" };
const creds = { name: "Asha Rao", email: "asha@example.com", password: "readmore42" };

async function issueKnownToken(purpose: "email_verify" | "password_reset", userId: string, email: string, expiresInMs = 60_000) {
  const token = `test-token-${purpose}-${Math.random().toString(36).slice(2)}-padding`;
  await db.verificationToken.create({
    data: { userId, identifier: email, purpose, tokenHash: sha256(token), expiresAt: new Date(Date.now() + expiresInMs) },
  });
  return token;
}

describe("register", () => {
  it("creates an unverified user with a hashed password and signs them in", async () => {
    const { userId } = await register(creds, ctx);
    const account = await db.account.findFirstOrThrow({ where: { userId, provider: "credentials" } });
    expect(account.passwordHash).toMatch(/^\$argon2id\$/);
    const session = await getCurrentSession();
    expect(session?.user.email).toBe("asha@example.com");
    expect(session?.user.emailVerified).toBe(false);
    // Session token is stored hashed, never raw.
    const raw = cookieJar.get("krm_session")!.value;
    expect(await db.session.count({ where: { tokenHash: raw } })).toBe(0);
    expect(await db.session.count({ where: { tokenHash: sha256(raw) } })).toBe(1);
  });

  it("rejects a duplicate email", async () => {
    await register(creds, ctx);
    await expect(register({ ...creds, email: "ASHA@example.com" }, { ...ctx, ip: "203.0.113.8" })).rejects.toMatchObject({ code: "EMAIL_TAKEN" });
  });
});

describe("login", () => {
  it("signs in with correct credentials", async () => {
    await register(creds, ctx);
    cookieJar.clear();
    const result = await login({ email: creds.email, password: creds.password }, ctx);
    expect(result.next).toBe("done");
    expect((await getCurrentSession())?.twoFactorPassed).toBe(true);
  });

  it("gives the same error for unknown email and wrong password (no enumeration)", async () => {
    await register(creds, ctx);
    await expect(login({ email: "nobody@example.com", password: "whatever1" }, { ...ctx, ip: "198.51.100.1" })).rejects.toMatchObject({
      code: "INVALID_CREDENTIALS",
    });
    await expect(login({ email: creds.email, password: "wrongpass1" }, { ...ctx, ip: "198.51.100.2" })).rejects.toMatchObject({
      code: "INVALID_CREDENTIALS",
    });
  });

  it("locks the account after 5 failed attempts", async () => {
    await register(creds, ctx);
    for (let i = 0; i < 4; i++) {
      await expect(login({ email: creds.email, password: "wrongpass1" }, { ...ctx, ip: `192.0.2.${i}` })).rejects.toMatchObject({
        code: "INVALID_CREDENTIALS",
      });
    }
    await expect(login({ email: creds.email, password: "wrongpass1" }, { ...ctx, ip: "192.0.2.9" })).rejects.toMatchObject({
      code: "ACCOUNT_LOCKED",
    });
    // Even the right password is refused while locked.
    await expect(login({ email: creds.email, password: creds.password }, { ...ctx, ip: "192.0.2.10" })).rejects.toMatchObject({
      code: "ACCOUNT_LOCKED",
    });
    expect(await db.securityEvent.count({ where: { type: "account_locked" } })).toBe(1);
  });
});

describe("email verification", () => {
  it("verifies once, then reports the link as used", async () => {
    const { userId } = await register(creds, ctx);
    const token = await issueKnownToken("email_verify", userId, creds.email);
    await verifyEmail(token);
    const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
    expect(user.emailVerifiedAt).not.toBeNull();
    await expect(verifyEmail(token)).rejects.toMatchObject({ code: "TOKEN_INVALID" });
  });

  it("rejects expired links", async () => {
    const { userId } = await register(creds, ctx);
    const token = await issueKnownToken("email_verify", userId, creds.email, -1000);
    await expect(verifyEmail(token)).rejects.toMatchObject({ code: "TOKEN_EXPIRED" });
  });
});

describe("password reset", () => {
  it("never reveals whether an email exists", async () => {
    await expect(requestPasswordReset({ email: "ghost@example.com" }, ctx)).resolves.toBeUndefined();
  });

  it("sets the new password and revokes every session", async () => {
    const { userId } = await register(creds, ctx);
    const token = await issueKnownToken("password_reset", userId, creds.email);
    await resetPassword({ token, password: "newpass2026", confirm: "newpass2026" });
    expect(await db.session.count({ where: { userId, revokedAt: null } })).toBe(0);
    cookieJar.clear();
    await expect(login({ email: creds.email, password: creds.password }, { ...ctx, ip: "198.51.100.20" })).rejects.toMatchObject({
      code: "INVALID_CREDENTIALS",
    });
    await expect(login({ email: creds.email, password: "newpass2026" }, { ...ctx, ip: "198.51.100.21" })).resolves.toMatchObject({
      next: "done",
    });
  });
});

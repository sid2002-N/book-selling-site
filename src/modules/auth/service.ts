import "server-only";
import { randomToken, sha256 } from "@/lib/crypto";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/rate-limit";
import type { RequestContext } from "@/lib/request";
import { sendEmail } from "@/modules/notifications";
import { burnPasswordCheck, hashPassword, verifyPassword } from "./password";
import { loginSchema, registerSchema, resetPasswordSchema, forgotPasswordSchema } from "./schemas";
import { createSession, getCurrentSession, revokeAllSessions, revokeCurrentSession } from "./session";
import { isTrustedDevice } from "./two-factor";

const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 30;
const VERIFY_TTL_MS = 24 * 3_600_000;
const RESET_TTL_MS = 3_600_000;

const appUrl = () => process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

async function issueToken(
  purpose: "email_verify" | "password_reset",
  identifier: string,
  userId: string,
  ttlMs: number,
): Promise<string> {
  const token = randomToken(32);
  // Only one live token per purpose: older links stop working when a new one is sent.
  await db.verificationToken.updateMany({
    where: { identifier, purpose, usedAt: null },
    data: { usedAt: new Date() },
  });
  await db.verificationToken.create({
    data: { userId, identifier, purpose, tokenHash: sha256(token), expiresAt: new Date(Date.now() + ttlMs) },
  });
  return token;
}

async function consumeToken(token: string, purpose: "email_verify" | "password_reset") {
  const record = await db.verificationToken.findUnique({ where: { tokenHash: sha256(token) } });
  if (!record || record.purpose !== purpose || !record.userId) {
    throw new AppError("TOKEN_INVALID", "This link is invalid or has already been used.", { meta: { reason: "invalid" } });
  }
  if (record.usedAt) {
    throw new AppError("TOKEN_INVALID", "This link has already been used.", { meta: { reason: "used" } });
  }
  if (record.expiresAt.getTime() < Date.now()) {
    throw new AppError("TOKEN_EXPIRED", "This link has expired.", { meta: { reason: "expired" } });
  }
  await db.verificationToken.update({ where: { id: record.id }, data: { usedAt: new Date() } });
  return record as typeof record & { userId: string };
}

export async function sendVerificationEmail(userId: string): Promise<void> {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true, name: true, emailVerifiedAt: true } });
  if (user.emailVerifiedAt) return;
  const token = await issueToken("email_verify", user.email, userId, VERIFY_TTL_MS);
  await sendEmail(user.email, "verify_email", { name: user.name, url: `${appUrl()}/api/v1/auth/verify-email?token=${token}` });
}

export async function register(input: unknown, ctx: RequestContext): Promise<{ userId: string }> {
  await enforceRateLimit("register", ctx.ip ?? "unknown");
  const { name, email, password } = registerSchema.parse(input);
  const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    throw new AppError("EMAIL_TAKEN", "An account with this email already exists. Try signing in instead.", {
      fields: { email: "An account with this email already exists." },
    });
  }
  const passwordHash = await hashPassword(password);
  const user = await db.user.create({
    data: {
      name,
      email,
      accounts: { create: { provider: "credentials", providerAccountId: email, passwordHash } },
    },
    select: { id: true },
  });
  await sendVerificationEmail(user.id);
  await createSession(user.id, { twoFactorPassed: true, ip: ctx.ip, userAgent: ctx.userAgent });
  logger.info("auth_register", { userId: user.id });
  return { userId: user.id };
}

export type LoginResult = { next: "done" | "two_factor"; isAdmin: boolean; userId: string };

export async function login(input: unknown, ctx: RequestContext): Promise<LoginResult> {
  const { email, password, remember } = loginSchema.parse(input);
  await enforceRateLimit("login", `${ctx.ip ?? "unknown"}:${email}`);

  const user = await db.user.findUnique({
    where: { email },
    select: {
      id: true,
      status: true,
      lockedUntil: true,
      failedLoginCount: true,
      accounts: { where: { provider: "credentials" }, select: { passwordHash: true } },
      adminUser: { select: { status: true } },
      twoFactor: { select: { enabledAt: true } },
    },
  });
  const passwordHash = user?.accounts[0]?.passwordHash;

  const recordAttempt = (success: boolean, reason?: string) =>
    db.loginAttempt.create({ data: { identifier: email, userId: user?.id ?? null, ip: ctx.ip, success, reason } });

  if (!user || !passwordHash) {
    await burnPasswordCheck(password);
    await recordAttempt(false, user ? "no_password" : "unknown_email");
    throw new AppError("INVALID_CREDENTIALS", "The email or password is incorrect.");
  }

  if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
    await recordAttempt(false, "locked");
    throw new AppError("ACCOUNT_LOCKED", "Your account is temporarily locked.", { meta: { lockedUntil: user.lockedUntil.toISOString() } });
  }

  const valid = await verifyPassword(passwordHash, password);
  if (!valid) {
    const failed = user.failedLoginCount + 1;
    const lock = failed >= MAX_FAILED_LOGINS;
    const lockedUntil = lock ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null;
    await db.user.update({
      where: { id: user.id },
      data: { failedLoginCount: lock ? 0 : failed, ...(lock ? { lockedUntil } : {}) },
    });
    await recordAttempt(false, "bad_password");
    if (lock) {
      await db.securityEvent.create({ data: { type: "account_locked", severity: "warning", userId: user.id, ip: ctx.ip } });
      throw new AppError("ACCOUNT_LOCKED", "Your account is temporarily locked.", { meta: { lockedUntil: lockedUntil!.toISOString() } });
    }
    throw new AppError("INVALID_CREDENTIALS", "The email or password is incorrect.");
  }

  if (user.status === "blocked" || user.status === "deleted") {
    await recordAttempt(false, user.status);
    throw new AppError("ACCOUNT_BLOCKED", "This account can't sign in. Please contact support.");
  }

  await db.user.update({
    where: { id: user.id },
    data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
  });
  await recordAttempt(true);

  const isAdmin = user.adminUser?.status === "active";
  const needsSecondFactor = Boolean(user.twoFactor?.enabledAt) && !(await isTrustedDevice(user.id));
  await createSession(user.id, {
    remember,
    isAdmin,
    twoFactorPassed: !needsSecondFactor,
    ip: ctx.ip,
    userAgent: ctx.userAgent,
  });
  if (isAdmin) await db.adminUser.update({ where: { userId: user.id }, data: { lastAdminLoginAt: new Date() } });
  logger.info("auth_login", { userId: user.id, twoFactor: needsSecondFactor });
  return { next: needsSecondFactor ? "two_factor" : "done", isAdmin, userId: user.id };
}

export async function verifyEmail(token: string): Promise<{ userId: string }> {
  const record = await consumeToken(token, "email_verify");
  const user = await db.user.update({
    where: { id: record.userId },
    data: { emailVerifiedAt: new Date() },
    select: { id: true, name: true, email: true },
  });
  await sendEmail(user.email, "welcome", { name: user.name, libraryUrl: `${appUrl()}/account/library` });
  return { userId: user.id };
}

export async function resendVerification(ctx: RequestContext): Promise<void> {
  const session = await getCurrentSession();
  if (!session) throw new AppError("AUTH_REQUIRED", "Please sign in to continue.");
  await enforceRateLimit("verifyResend", session.user.id);
  await sendVerificationEmail(session.user.id);
  logger.info("auth_verify_resend", { userId: session.user.id, ip: ctx.ip });
}

/** Always resolves the same way, whether or not the email exists (no enumeration). */
export async function requestPasswordReset(input: unknown, ctx: RequestContext): Promise<void> {
  const { email } = forgotPasswordSchema.parse(input);
  await enforceRateLimit("forgotPassword", `${ctx.ip ?? "unknown"}:${email}`);
  const user = await db.user.findUnique({ where: { email }, select: { id: true, name: true, status: true } });
  if (!user || user.status === "deleted" || user.status === "blocked") return;
  const token = await issueToken("password_reset", email, user.id, RESET_TTL_MS);
  await sendEmail(email, "password_reset", { name: user.name, url: `${appUrl()}/reset-password?token=${token}` });
}

export async function resetPassword(input: unknown): Promise<void> {
  const { token, password } = resetPasswordSchema.parse(input);
  const record = await consumeToken(token, "password_reset");
  const passwordHash = await hashPassword(password);
  const user = await db.user.findUniqueOrThrow({ where: { id: record.userId }, select: { id: true, email: true, name: true } });
  await db.$transaction([
    db.account.upsert({
      where: { provider_providerAccountId: { provider: "credentials", providerAccountId: user.email } },
      create: { userId: user.id, provider: "credentials", providerAccountId: user.email, passwordHash },
      update: { passwordHash },
    }),
    // Resetting via an emailed link also proves ownership of the address.
    db.user.update({
      where: { id: user.id },
      data: { failedLoginCount: 0, lockedUntil: null, emailVerifiedAt: new Date() },
    }),
  ]);
  await revokeAllSessions(user.id);
  await sendEmail(user.email, "password_changed", { name: user.name });
  logger.info("auth_password_reset", { userId: user.id });
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string, sessionId: string): Promise<void> {
  const account = await db.account.findFirst({ where: { userId, provider: "credentials" }, select: { id: true, passwordHash: true } });
  if (account?.passwordHash && !(await verifyPassword(account.passwordHash, currentPassword))) {
    throw new AppError("INVALID_CREDENTIALS", "Your current password is incorrect.", { fields: { currentPassword: "Incorrect password." } });
  }
  const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true, name: true } });
  const passwordHash = await hashPassword(newPassword);
  await db.account.upsert({
    where: { provider_providerAccountId: { provider: "credentials", providerAccountId: user.email } },
    create: { userId, provider: "credentials", providerAccountId: user.email, passwordHash },
    update: { passwordHash },
  });
  await revokeAllSessions(userId, sessionId);
  await sendEmail(user.email, "password_changed", { name: user.name });
}

export async function logout(): Promise<void> {
  await revokeCurrentSession();
}

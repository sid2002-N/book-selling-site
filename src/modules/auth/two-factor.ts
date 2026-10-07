import "server-only";
import { cookies } from "next/headers";
import { Secret } from "otpauth";
import QRCode from "qrcode";
import { decrypt, encrypt, randomToken, sha256 } from "@/lib/crypto";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { enforceRateLimit } from "@/lib/rate-limit";
import { sendEmail } from "@/modules/notifications";
import { recoveryCodeSchema, totpCodeSchema } from "./schemas";
import { TRUSTED_DEVICE_COOKIE, getCurrentSession, markTwoFactorPassed } from "./session";
import { checkTotp, generateRecoveryCode, totpFor } from "./totp";

const TRUSTED_DEVICE_DAYS = 30;
const RECOVERY_CODE_COUNT = 10;

const normaliseRecovery = (code: string) => code.toUpperCase().replace(/[^A-Z0-9]/g, "");

async function requireSession() {
  const session = await getCurrentSession();
  if (!session) throw new AppError("AUTH_REQUIRED", "Please sign in to continue.");
  return session;
}

/** Step 1: create (or replace) a pending secret and return what the QR screen needs. */
export async function beginTwoFactorSetup(): Promise<{ qrDataUrl: string; secret: string }> {
  const session = await requireSession();
  if (session.user.twoFactorEnabled) throw new AppError("INVALID_REQUEST", "Two-factor authentication is already on.");
  const secret = new Secret({ size: 20 }).base32;
  await db.twoFactor.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, secretEncrypted: encrypt(secret) },
    update: { secretEncrypted: encrypt(secret), enabledAt: null, lastUsedStep: null },
  });
  const uri = totpFor(secret, session.user.email).toString();
  return { qrDataUrl: await QRCode.toDataURL(uri, { margin: 1, width: 220, color: { dark: "#2B1E18", light: "#FFFDF9" } }), secret };
}

/** Step 2: confirm with a first code; returns recovery codes exactly once. */
export async function confirmTwoFactorSetup(codeInput: string): Promise<{ recoveryCodes: string[] }> {
  const session = await requireSession();
  const code = totpCodeSchema.parse(codeInput);
  await enforceRateLimit("twoFactor", session.user.id);
  const record = await db.twoFactor.findUnique({ where: { userId: session.user.id } });
  if (!record || record.enabledAt) throw new AppError("INVALID_REQUEST", "Start the setup again.");
  const result = checkTotp(decrypt(record.secretEncrypted), code, record.lastUsedStep);
  if (!result.ok) throw new AppError("TWO_FACTOR_INVALID", "That code didn't match. Check your authenticator app and try again.");

  const recoveryCodes = Array.from({ length: RECOVERY_CODE_COUNT }, generateRecoveryCode);
  await db.$transaction([
    db.twoFactor.update({ where: { userId: session.user.id }, data: { enabledAt: new Date(), lastUsedStep: result.step } }),
    db.recoveryCode.deleteMany({ where: { userId: session.user.id } }),
    db.recoveryCode.createMany({
      data: recoveryCodes.map((c) => ({ userId: session.user.id, codeHash: sha256(normaliseRecovery(c)) })),
    }),
    db.session.update({ where: { id: session.sessionId }, data: { twoFactorPassed: true } }),
  ]);
  await sendEmail(session.user.email, "two_factor_enabled", { name: session.user.name });
  return { recoveryCodes };
}

/** Login challenge: verifies the code for a session that is waiting on its second factor. */
export async function verifyTwoFactorChallenge(codeInput: string, rememberDevice: boolean): Promise<void> {
  const session = await requireSession();
  const code = totpCodeSchema.parse(codeInput);
  await enforceRateLimit("twoFactor", session.user.id);
  const record = await db.twoFactor.findUnique({ where: { userId: session.user.id } });
  if (!record?.enabledAt) throw new AppError("INVALID_REQUEST", "Two-factor authentication isn't enabled.");
  const result = checkTotp(decrypt(record.secretEncrypted), code, record.lastUsedStep);
  if (!result.ok) {
    await db.securityEvent.create({ data: { type: "two_factor_failed", severity: "info", userId: session.user.id } });
    throw new AppError("TWO_FACTOR_INVALID", "That code didn't match. Codes refresh every 30 seconds.");
  }
  await db.twoFactor.update({ where: { userId: session.user.id }, data: { lastUsedStep: result.step } });
  await markTwoFactorPassed(session.sessionId);
  if (rememberDevice) await trustThisDevice(session.user.id);
}

export async function redeemRecoveryCode(codeInput: string): Promise<{ remaining: number }> {
  const session = await requireSession();
  const code = recoveryCodeSchema.parse(codeInput);
  await enforceRateLimit("twoFactor", session.user.id);
  const match = await db.recoveryCode.findFirst({
    where: { userId: session.user.id, usedAt: null, codeHash: sha256(normaliseRecovery(code)) },
  });
  if (!match) throw new AppError("TWO_FACTOR_INVALID", "That recovery code isn't valid or was already used.");
  await db.recoveryCode.update({ where: { id: match.id }, data: { usedAt: new Date() } });
  await markTwoFactorPassed(session.sessionId);
  await db.securityEvent.create({ data: { type: "recovery_code_used", severity: "warning", userId: session.user.id } });
  const remaining = await db.recoveryCode.count({ where: { userId: session.user.id, usedAt: null } });
  return { remaining };
}

export async function disableTwoFactor(codeInput: string): Promise<void> {
  const session = await requireSession();
  if (session.user.isAdmin) throw new AppError("FORBIDDEN", "Two-factor authentication is required for admin accounts.");
  const code = totpCodeSchema.parse(codeInput);
  const record = await db.twoFactor.findUnique({ where: { userId: session.user.id } });
  if (!record?.enabledAt) return;
  const result = checkTotp(decrypt(record.secretEncrypted), code, record.lastUsedStep);
  if (!result.ok) throw new AppError("TWO_FACTOR_INVALID", "That code didn't match.");
  await db.$transaction([
    db.twoFactor.delete({ where: { userId: session.user.id } }),
    db.recoveryCode.deleteMany({ where: { userId: session.user.id } }),
    db.trustedDevice.deleteMany({ where: { userId: session.user.id } }),
  ]);
}

async function trustThisDevice(userId: string): Promise<void> {
  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + TRUSTED_DEVICE_DAYS * 86_400_000);
  await db.trustedDevice.create({ data: { userId, tokenHash: sha256(token), expiresAt } });
  const jar = await cookies();
  jar.set(TRUSTED_DEVICE_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TRUSTED_DEVICE_DAYS * 86_400,
  });
}

/** "Remember this device for 30 days": a hashed per-user token cookie. */
export async function isTrustedDevice(userId: string): Promise<boolean> {
  const jar = await cookies();
  const token = jar.get(TRUSTED_DEVICE_COOKIE)?.value;
  if (!token) return false;
  const device = await db.trustedDevice.findUnique({ where: { tokenHash: sha256(token) } });
  return Boolean(device && device.userId === userId && device.expiresAt.getTime() > Date.now());
}

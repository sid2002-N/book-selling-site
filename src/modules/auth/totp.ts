import { randomInt } from "node:crypto";
import { Secret, TOTP } from "otpauth";

/** Pure TOTP and recovery-code helpers (no I/O), shared by the 2FA service and tests. */
const ISSUER = "KRM.lib";
const RECOVERY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function totpFor(secretBase32: string, label: string) {
  return new TOTP({ issuer: ISSUER, label, algorithm: "SHA1", digits: 6, period: 30, secret: Secret.fromBase32(secretBase32) });
}

/** Validates a TOTP code (±1 step) and rejects replays of an already-used step (RFC 6238 §5.2). */
export function checkTotp(secretBase32: string, code: string, lastUsedStep: bigint | null, now = Date.now()) {
  const totp = totpFor(secretBase32, "check");
  const delta = totp.validate({ token: code, window: 1, timestamp: now });
  if (delta === null) return { ok: false as const };
  const step = BigInt(Math.floor(now / 1000 / 30) + delta);
  if (lastUsedStep !== null && step <= lastUsedStep) return { ok: false as const };
  return { ok: true as const, step };
}

export function generateRecoveryCode(): string {
  let code = "";
  for (let i = 0; i < 10; i++) code += RECOVERY_ALPHABET[randomInt(RECOVERY_ALPHABET.length)];
  return `${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8, 10)}`;
}


import "server-only";
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/** 256-bit URL-safe random token (sessions, verification links, download tokens). */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

/** SHA-256 hex digest — tokens are stored hashed, never raw. */
export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function hmacSha256Hex(secret: string, value: string): string {
  return createHmac("sha256", secret).update(value).digest("hex");
}

/** Constant-time comparison of two strings (avoids timing leaks on signatures). */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

const DEV_FALLBACK = "krm-development-only-secret-do-not-use-in-production";

/**
 * Resolves a server secret. Production refuses to start without it (lib/env); development
 * falls back to a fixed local value so the app runs without configuration.
 */
export function serverSecret(name: "AUTH_SECRET" | "ENCRYPTION_KEY" | "DOWNLOAD_SIGNING_SECRET" | "CRON_SECRET"): string {
  const value = process.env[name];
  if (value) return value;
  if (process.env.APP_ENV === "production" || process.env.APP_ENV === "staging") {
    throw new Error(`${name} is required`);
  }
  return `${DEV_FALLBACK}:${name}`;
}

function encryptionKey(): Buffer {
  return createHash("sha256").update(serverSecret("ENCRYPTION_KEY")).digest();
}

/** AES-256-GCM encryption for secrets at rest (2FA secrets, protected links). Output: iv.tag.ciphertext */
export function encrypt(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, ciphertext].map((b) => b.toString("base64url")).join(".");
}

export function decrypt(payload: string): string {
  const [iv, tag, ciphertext] = payload.split(".").map((p) => Buffer.from(p, "base64url"));
  if (!iv || !tag || !ciphertext) throw new Error("Malformed encrypted payload");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

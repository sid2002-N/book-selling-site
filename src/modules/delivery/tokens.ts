import "server-only";
import { hmacSha256Hex, safeEqual, serverSecret } from "@/lib/crypto";

/** Download tokens for the protected streaming route (local driver). */
/** `<eventId>.<expiresAtMs>.<hmac>` — signed with DOWNLOAD_SIGNING_SECRET, single-use via the event row. */
export function signDownloadToken(eventId: string, expiresAt: number): string {
  const payload = `${eventId}.${expiresAt}`;
  return `${payload}.${hmacSha256Hex(serverSecret("DOWNLOAD_SIGNING_SECRET"), payload)}`;
}

export function readDownloadToken(token: string): { eventId: string; expiresAt: number } | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [eventId, exp, sig] = parts as [string, string, string];
  if (!safeEqual(hmacSha256Hex(serverSecret("DOWNLOAD_SIGNING_SECRET"), `${eventId}.${exp}`), sig)) return null;
  const expiresAt = Number(exp);
  return Number.isFinite(expiresAt) ? { eventId, expiresAt } : null;
}

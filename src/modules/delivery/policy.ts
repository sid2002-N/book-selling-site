/**
 * Download entitlement decision table (SECURITY §8). Pure, so every branch is unit-tested;
 * the service supplies facts from the database and enforces the verdict.
 */
export type DownloadFacts = {
  owned: boolean;
  revoked: boolean;
  emailVerified: boolean;
  requireVerifiedEmail: boolean;
  hasFile: boolean;
  used: number;
  limit: number;
};

export type DownloadDenial = "DOWNLOAD_UNAUTHORIZED" | "EMAIL_NOT_VERIFIED" | "FILE_UNAVAILABLE" | "DOWNLOAD_LIMIT_REACHED";

export function downloadDecision(f: DownloadFacts): { ok: true } | { ok: false; code: DownloadDenial } {
  if (!f.owned || f.revoked) return { ok: false, code: "DOWNLOAD_UNAUTHORIZED" };
  if (f.requireVerifiedEmail && !f.emailVerified) return { ok: false, code: "EMAIL_NOT_VERIFIED" };
  if (!f.hasFile) return { ok: false, code: "FILE_UNAVAILABLE" };
  if (f.limit > 0 && f.used >= f.limit) return { ok: false, code: "DOWNLOAD_LIMIT_REACHED" };
  return { ok: true };
}

export type DownloadState = "available" | "update_available" | "limit_reached" | "unavailable";

export function downloadState(input: { hasFile: boolean; used: number; limit: number; updateAvailable: boolean }): DownloadState {
  if (!input.hasFile) return "unavailable";
  if (input.limit > 0 && input.used >= input.limit) return "limit_reached";
  return input.updateAvailable ? "update_available" : "available";
}

/** Reading progress as a whole percentage (0–100); first page counts as started. */
export function progressPercent(lastPage: number | null | undefined, totalPages: number | null | undefined): number {
  if (!lastPage || !totalPages || totalPages <= 0) return 0;
  return Math.min(100, Math.max(1, Math.round((lastPage / totalPages) * 100)));
}

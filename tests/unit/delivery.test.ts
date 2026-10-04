// @vitest-environment node
import { describe, expect, it } from "vitest";
import { downloadDecision, downloadState, progressPercent } from "@/modules/delivery/policy";
import { readDownloadToken, signDownloadToken } from "@/modules/delivery/tokens";
import { parseRange } from "@/modules/reader/range";

const facts = { owned: true, revoked: false, emailVerified: true, requireVerifiedEmail: true, hasFile: true, used: 0, limit: 5 };

describe("download entitlement decision table", () => {
  it("allows an owner with a verified email under the limit", () => expect(downloadDecision(facts)).toEqual({ ok: true }));
  it.each([
    [{ owned: false }, "DOWNLOAD_UNAUTHORIZED"],
    [{ revoked: true }, "DOWNLOAD_UNAUTHORIZED"],
    [{ emailVerified: false }, "EMAIL_NOT_VERIFIED"],
    [{ hasFile: false }, "FILE_UNAVAILABLE"],
    [{ used: 5 }, "DOWNLOAD_LIMIT_REACHED"],
  ])("denies %o with %s", (patch, code) => {
    expect(downloadDecision({ ...facts, ...patch })).toEqual({ ok: false, code });
  });
  it("checks ownership before anything else and treats limit 0 as unlimited", () => {
    expect(downloadDecision({ ...facts, owned: false, used: 99, hasFile: false })).toMatchObject({ code: "DOWNLOAD_UNAUTHORIZED" });
    expect(downloadDecision({ ...facts, limit: 0, used: 999 })).toEqual({ ok: true });
    expect(downloadDecision({ ...facts, emailVerified: false, requireVerifiedEmail: false })).toEqual({ ok: true });
  });
});

describe("download center states and progress", () => {
  it("derives a row state", () => {
    expect(downloadState({ hasFile: false, used: 0, limit: 5, updateAvailable: true })).toBe("unavailable");
    expect(downloadState({ hasFile: true, used: 5, limit: 5, updateAvailable: true })).toBe("limit_reached");
    expect(downloadState({ hasFile: true, used: 1, limit: 5, updateAvailable: true })).toBe("update_available");
    expect(downloadState({ hasFile: true, used: 1, limit: 5, updateAvailable: false })).toBe("available");
  });
  it("computes whole-percent progress", () => {
    expect(progressPercent(null, 100)).toBe(0);
    expect(progressPercent(1, 400)).toBe(1);
    expect(progressPercent(32, 100)).toBe(32);
    expect(progressPercent(120, 100)).toBe(100);
  });
});

describe("download tokens", () => {
  it("round-trips and rejects tampering", () => {
    const token = signDownloadToken("01a1-event", 1_900_000_000_000);
    expect(readDownloadToken(token)).toEqual({ eventId: "01a1-event", expiresAt: 1_900_000_000_000 });
    expect(readDownloadToken(token.replace("01a1", "01a2"))).toBeNull();
    expect(readDownloadToken(token.replace("1900", "1999"))).toBeNull();
    expect(readDownloadToken("garbage")).toBeNull();
  });
});

describe("reader range parsing", () => {
  it("accepts single byte ranges only", () => {
    expect(parseRange("bytes=0-65535")).toEqual({ start: 0, end: 65535 });
    expect(parseRange("bytes=1000-")).toEqual({ start: 1000, end: undefined });
    expect(parseRange("bytes=500-100")).toBeNull();
    expect(parseRange("bytes=0-1,5-9")).toBeNull();
    expect(parseRange(null)).toBeNull();
  });
});

import { Secret, TOTP } from "otpauth";
import { describe, expect, it } from "vitest";
import { checkTotp, generateRecoveryCode } from "@/modules/auth/totp";
import { passwordSchema, registerSchema, safeNext } from "@/modules/auth/schemas";

describe("checkTotp", () => {
  const secret = new Secret({ size: 20 }).base32;
  const totp = new TOTP({ secret: Secret.fromBase32(secret), digits: 6, period: 30 });
  const now = Date.UTC(2026, 9, 4, 12, 0, 0);

  it("accepts the current code and returns its step", () => {
    const result = checkTotp(secret, totp.generate({ timestamp: now }), null, now);
    expect(result.ok).toBe(true);
  });

  it("accepts one step of clock drift", () => {
    expect(checkTotp(secret, totp.generate({ timestamp: now - 30_000 }), null, now).ok).toBe(true);
  });

  it("rejects codes outside the window", () => {
    expect(checkTotp(secret, totp.generate({ timestamp: now - 120_000 }), null, now).ok).toBe(false);
  });

  it("rejects a replayed step", () => {
    const code = totp.generate({ timestamp: now });
    const first = checkTotp(secret, code, null, now);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(checkTotp(secret, code, first.step, now).ok).toBe(false);
  });
});

describe("recovery codes", () => {
  it("uses the XXXX-XXXX-XX format without ambiguous characters", () => {
    for (let i = 0; i < 50; i++) {
      const code = generateRecoveryCode();
      expect(code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{2}$/);
      expect(code).not.toMatch(/[01OI]/);
    }
  });
});

describe("password policy", () => {
  it("requires 8+ characters with a letter and a number", () => {
    expect(passwordSchema.safeParse("short1").success).toBe(false);
    expect(passwordSchema.safeParse("longenough").success).toBe(false);
    expect(passwordSchema.safeParse("12345678").success).toBe(false);
    expect(passwordSchema.safeParse("readmore42").success).toBe(true);
  });

  it("normalises email case and whitespace", () => {
    const parsed = registerSchema.parse({ name: "Asha Rao", email: "  Asha@Example.COM ", password: "readmore42" });
    expect(parsed.email).toBe("asha@example.com");
  });
});

describe("safeNext", () => {
  it("allows same-site paths only", () => {
    expect(safeNext("/account/library")).toBe("/account/library");
    expect(safeNext("https://evil.example")).toBe("/account");
    expect(safeNext("//evil.example")).toBe("/account");
    expect(safeNext("/\\evil.example")).toBe("/account");
    expect(safeNext(undefined, "/")).toBe("/");
  });
});

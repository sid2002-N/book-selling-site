import "server-only";
import { Google, decodeIdToken, generateCodeVerifier, generateState } from "arctic";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import type { RequestContext } from "@/lib/request";
import { safeNext } from "./schemas";
import { createSession, revokeAllSessions } from "./session";
import { isTrustedDevice } from "./two-factor";

const STATE_COOKIE = "krm_oauth_state";
const VERIFIER_COOKIE = "krm_oauth_verifier";
const NEXT_COOKIE = "krm_oauth_next";

export function googleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function client(): Google {
  if (!googleConfigured()) throw new AppError("PROVIDER_NOT_CONFIGURED", "Google sign-in isn't available right now.");
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return new Google(process.env.GOOGLE_CLIENT_ID!, process.env.GOOGLE_CLIENT_SECRET!, `${base}/api/v1/auth/google/callback`);
}

/** Starts OAuth with state + PKCE (SECURITY §1). */
export async function googleAuthorizationUrl(next?: string | null): Promise<URL> {
  const state = generateState();
  const verifier = generateCodeVerifier();
  const url = client().createAuthorizationURL(state, verifier, ["openid", "profile", "email"]);
  const jar = await cookies();
  const opts = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: 600 };
  jar.set(STATE_COOKIE, state, opts);
  jar.set(VERIFIER_COOKIE, verifier, opts);
  jar.set(NEXT_COOKIE, safeNext(next), opts);
  return url;
}

type GoogleClaims = { sub: string; email?: string; email_verified?: boolean; name?: string; picture?: string };

export async function handleGoogleCallback(
  params: { code: string | null; state: string | null },
  ctx: RequestContext,
): Promise<{ redirectTo: string }> {
  const jar = await cookies();
  const expectedState = jar.get(STATE_COOKIE)?.value;
  const verifier = jar.get(VERIFIER_COOKIE)?.value;
  const next = safeNext(jar.get(NEXT_COOKIE)?.value);
  jar.delete(STATE_COOKIE);
  jar.delete(VERIFIER_COOKIE);
  jar.delete(NEXT_COOKIE);

  if (!params.code || !params.state || !expectedState || !verifier || params.state !== expectedState) {
    throw new AppError("INVALID_REQUEST", "Google sign-in couldn't be completed. Please try again.");
  }

  const tokens = await client().validateAuthorizationCode(params.code, verifier);
  const claims = decodeIdToken(tokens.idToken()) as GoogleClaims;
  if (!claims.email || claims.email_verified !== true) {
    throw new AppError("INVALID_REQUEST", "Your Google account email must be verified to sign in.");
  }
  const email = claims.email.toLowerCase();

  let userId: string;
  const linked = await db.account.findUnique({
    where: { provider_providerAccountId: { provider: "google", providerAccountId: claims.sub } },
    select: { userId: true },
  });
  if (linked) {
    userId = linked.userId;
  } else {
    const existing = await db.user.findUnique({ where: { email }, select: { id: true, emailVerifiedAt: true } });
    if (existing) {
      if (!existing.emailVerifiedAt) {
        // An unverified password account could have been created by someone else with this
        // address. Google has proved ownership, so drop that password and its sessions.
        await db.account.deleteMany({ where: { userId: existing.id, provider: "credentials" } });
        await revokeAllSessions(existing.id);
      }
      await db.account.create({ data: { userId: existing.id, provider: "google", providerAccountId: claims.sub } });
      await db.user.update({ where: { id: existing.id }, data: { emailVerifiedAt: existing.emailVerifiedAt ?? new Date() } });
      userId = existing.id;
    } else {
      const created = await db.user.create({
        data: {
          email,
          name: claims.name?.trim() || email.split("@")[0]!,
          avatarUrl: claims.picture ?? null,
          emailVerifiedAt: new Date(),
          accounts: { create: { provider: "google", providerAccountId: claims.sub } },
        },
        select: { id: true },
      });
      userId = created.id;
    }
  }

  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { status: true, lockedUntil: true, adminUser: { select: { status: true } }, twoFactor: { select: { enabledAt: true } } },
  });
  if (user.status === "blocked" || user.status === "deleted") {
    throw new AppError("ACCOUNT_BLOCKED", "This account can't sign in. Please contact support.");
  }
  const isAdmin = user.adminUser?.status === "active";
  const needsSecondFactor = Boolean(user.twoFactor?.enabledAt) && !(await isTrustedDevice(userId));
  await createSession(userId, { isAdmin, twoFactorPassed: !needsSecondFactor, ip: ctx.ip, userAgent: ctx.userAgent });
  await db.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
  logger.info("auth_google_login", { userId });
  return { redirectTo: needsSecondFactor ? `/2fa?next=${encodeURIComponent(next)}` : next };
}

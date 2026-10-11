import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { randomToken, sha256 } from "@/lib/crypto";
import { db } from "@/lib/db";

export const SESSION_COOKIE = "krm_session";
export const TRUSTED_DEVICE_COOKIE = "krm_trusted_device";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** Idle and absolute lifetimes (SECURITY §1). Admins get a shorter window. */
const LIFETIMES = {
  standard: { idle: DAY, absolute: 7 * DAY },
  remember: { idle: 30 * DAY, absolute: 60 * DAY },
  admin: { idle: 2 * HOUR, absolute: 12 * HOUR },
} as const;

type LifetimeKind = keyof typeof LIFETIMES;

const secureCookies = () => process.env.NODE_ENV === "production";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  emailVerified: boolean;
  status: string;
  isAdmin: boolean;
  twoFactorEnabled: boolean;
};

export type CurrentSession = {
  sessionId: string;
  twoFactorPassed: boolean;
  user: SessionUser;
};

export async function createSession(
  userId: string,
  options: { remember?: boolean; isAdmin?: boolean; twoFactorPassed: boolean; ip?: string | null; userAgent?: string | null },
): Promise<void> {
  const kind: LifetimeKind = options.isAdmin ? "admin" : options.remember ? "remember" : "standard";
  const { idle, absolute } = LIFETIMES[kind];
  const token = randomToken(32);
  const now = Date.now();
  await db.session.create({
    data: {
      userId,
      tokenHash: sha256(token),
      ip: options.ip ?? null,
      userAgent: options.userAgent?.slice(0, 400) ?? null,
      deviceLabel: deviceLabel(options.userAgent),
      twoFactorPassed: options.twoFactorPassed,
      expiresAt: new Date(now + idle),
      absoluteExpiresAt: new Date(now + absolute),
    },
  });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: secureCookies(),
    sameSite: "lax",
    path: "/",
    // "Keep me signed in" persists the cookie; otherwise it ends with the browser session.
    ...(kind === "remember" ? { maxAge: Math.floor(absolute / 1000) } : {}),
  });
}

/** Resolves the session from the cookie; memoised per request. Extends idle expiry (sliding). */
export const getCurrentSession = cache(async (): Promise<CurrentSession | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: sha256(token) },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
          emailVerifiedAt: true,
          status: true,
          adminUser: { select: { userId: true, status: true } },
          twoFactor: { select: { enabledAt: true } },
        },
      },
    },
  });
  const now = Date.now();
  if (
    !session ||
    session.revokedAt ||
    session.expiresAt.getTime() <= now ||
    session.absoluteExpiresAt.getTime() <= now ||
    session.user.status === "blocked" ||
    session.user.status === "deleted"
  ) {
    return null;
  }

  // Sliding idle window, written at most every 5 minutes.
  if (now - session.lastSeenAt.getTime() > 5 * 60_000) {
    const isAdmin = Boolean(session.user.adminUser && session.user.adminUser.status === "active");
    const kind: LifetimeKind = isAdmin
      ? "admin"
      : session.absoluteExpiresAt.getTime() - session.createdAt.getTime() > LIFETIMES.standard.absolute
        ? "remember"
        : "standard";
    const expiresAt = Math.min(now + LIFETIMES[kind].idle, session.absoluteExpiresAt.getTime());
    await db.session.update({
      where: { id: session.id },
      data: { lastSeenAt: new Date(now), expiresAt: new Date(expiresAt) },
    });
  }

  const u = session.user;
  return {
    sessionId: session.id,
    twoFactorPassed: session.twoFactorPassed,
    user: {
      id: u.id,
      email: u.email,
      name: u.name,
      avatarUrl: u.avatarUrl,
      emailVerified: Boolean(u.emailVerifiedAt),
      status: u.status,
      isAdmin: Boolean(u.adminUser && u.adminUser.status === "active"),
      twoFactorEnabled: Boolean(u.twoFactor?.enabledAt),
    },
  };
});

/** True when a session cookie was sent but no longer resolves (drives the Session Expired screen). */
export async function hasStaleSessionCookie(): Promise<boolean> {
  const jar = await cookies();
  return Boolean(jar.get(SESSION_COOKIE)?.value) && !(await getCurrentSession());
}

export async function markTwoFactorPassed(sessionId: string): Promise<void> {
  await db.session.update({ where: { id: sessionId }, data: { twoFactorPassed: true } });
}

export async function revokeCurrentSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.session.updateMany({ where: { tokenHash: sha256(token), revokedAt: null }, data: { revokedAt: new Date() } });
  }
  jar.delete(SESSION_COOKIE);
}

export async function revokeAllSessions(userId: string, exceptSessionId?: string): Promise<number> {
  const result = await db.session.updateMany({
    where: { userId, revokedAt: null, ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}) },
    data: { revokedAt: new Date() },
  });
  return result.count;
}

export async function listSessions(userId: string) {
  return db.session.findMany({
    where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
    select: { id: true, deviceLabel: true, ip: true, lastSeenAt: true, createdAt: true },
    orderBy: { lastSeenAt: "desc" },
  });
}

export async function revokeSessionById(userId: string, sessionId: string): Promise<void> {
  await db.session.updateMany({ where: { id: sessionId, userId, revokedAt: null }, data: { revokedAt: new Date() } });
}

/** Coarse device label for the Sessions / Devices screen ("Windows · Chrome"). */
export function deviceLabel(userAgent?: string | null): string | null {
  if (!userAgent) return null;
  const os = /Windows/.test(userAgent)
    ? "Windows"
    : /iPhone|iPad/.test(userAgent)
      ? "iOS"
      : /Android/.test(userAgent)
        ? "Android"
        : /Mac OS X/.test(userAgent)
          ? "macOS"
          : /Linux/.test(userAgent)
            ? "Linux"
            : "Unknown device";
  const browser = /Edg\//.test(userAgent)
    ? "Edge"
    : /Firefox\//.test(userAgent)
      ? "Firefox"
      : /Chrome\//.test(userAgent)
        ? "Chrome"
        : /Safari\//.test(userAgent)
          ? "Safari"
          : "Browser";
  return `${os} · ${browser}`;
}

import "server-only";
import { redirect } from "next/navigation";
import { AppError } from "@/lib/errors";
import { getCurrentSession, hasStaleSessionCookie, type CurrentSession, type SessionUser } from "./session";

/** Signed-in user with a satisfied second factor, or null. Safe for any server component. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await getCurrentSession();
  return session && session.twoFactorPassed ? session.user : null;
}

/** For pages: redirects to sign-in (or the 2FA challenge) when needed. */
export async function requireUserPage(next: string): Promise<CurrentSession> {
  const session = await getCurrentSession();
  if (!session) {
    const expired = await hasStaleSessionCookie();
    redirect(`/login?${expired ? "state=expired&" : ""}next=${encodeURIComponent(next)}`);
  }
  if (!session.twoFactorPassed) redirect(`/2fa?next=${encodeURIComponent(next)}`);
  return session;
}

/** For services/route handlers: throws AppError instead of redirecting. */
export async function requireUser(): Promise<CurrentSession> {
  const session = await getCurrentSession();
  if (!session) throw new AppError("AUTH_REQUIRED", "Please sign in to continue.");
  if (!session.twoFactorPassed) throw new AppError("TWO_FACTOR_REQUIRED", "Enter your verification code to continue.");
  return session;
}

/** Purchases deliver to the library only for verified emails (SECURITY §1). */
export async function requireVerifiedUser(): Promise<CurrentSession> {
  const session = await requireUser();
  if (!session.user.emailVerified) throw new AppError("EMAIL_NOT_VERIFIED", "Please verify your email to continue.");
  return session;
}

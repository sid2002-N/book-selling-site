import { Hourglass, LockKeyhole } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard, AuthStatus } from "@/components/auth/AuthCard";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { Button } from "@/components/ui/Button";
import { Divider } from "@/components/ui/Feedback";
import { getCurrentSession, googleConfigured, safeNext } from "@/modules/auth";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

function minutesUntil(iso: string | undefined): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  return Number.isFinite(ms) && ms > 0 ? Math.ceil(ms / 60_000) : null;
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = safeNext(typeof params.next === "string" ? params.next : null);
  const state = typeof params.state === "string" ? params.state : null;

  const session = await getCurrentSession();
  if (session?.twoFactorPassed && state !== "locked") redirect(next);

  if (state === "locked") {
    const minutes = minutesUntil(typeof params.until === "string" ? params.until : undefined);
    return (
      <AuthStatus
        tone="error"
        icon={<LockKeyhole />}
        title="Account Locked"
        description={<p>Your account has been temporarily locked due to multiple failed login attempts.</p>}
      >
        <div className="rounded-md bg-error-soft px-4 py-3 text-body-sm text-error">
          {minutes ? `Try again after ${minutes} minute${minutes === 1 ? "" : "s"}.` : "Try again in a little while."}
        </div>
        <p className="text-caption text-fg-muted">If you believe this is a mistake, please contact our support team.</p>
        <Button asChild>
          <Link href="/contact">Contact Support</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/forgot-password">Reset password instead</Link>
        </Button>
      </AuthStatus>
    );
  }

  if (state === "expired") {
    return (
      <AuthStatus
        tone="warning"
        icon={<Hourglass />}
        title="Your Session Has Expired"
        description={<p>For your security, we&apos;ve signed you out due to inactivity.</p>}
      >
        <Button asChild>
          <Link href={`/login?next=${encodeURIComponent(next)}`}>Sign In Again</Link>
        </Button>
        <Button asChild variant="tertiary">
          <Link href="/">Back to home</Link>
        </Button>
      </AuthStatus>
    );
  }

  return (
    <AuthCard
      title="Welcome Back"
      description="Continue your learning journey."
      sign="A small library for a bigger tomorrow."
      footer={
        <>
          New to KRM.lib?{" "}
          <Link href={`/register?next=${encodeURIComponent(next)}`} className="font-medium text-fg underline underline-offset-4">
            Create an account
          </Link>
        </>
      }
    >
      <LoginForm next={next} />
      <Divider label="or continue with" />
      <GoogleButton enabled={googleConfigured()} next={next} />
    </AuthCard>
  );
}

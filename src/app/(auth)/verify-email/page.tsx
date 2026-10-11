import { CircleCheck, CircleX, MailOpen } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AuthStatus } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/Button";
import { getCurrentUser, safeNext } from "@/modules/auth";
import { ResendButton } from "./ResendButton";

export const metadata: Metadata = { title: "Verify your email", robots: { index: false } };

const failureReasons = {
  expired: "The link has expired (links are valid for 24 hours).",
  used: "The link was already used.",
  invalid: "The link is incomplete or corrupted.",
} as const;

export default async function VerifyEmailPage({ searchParams }: PageProps<"/verify-email">) {
  const params = await searchParams;
  const status = typeof params.status === "string" ? params.status : null;
  const next = safeNext(typeof params.next === "string" ? params.next : null);
  const user = await getCurrentUser();

  if (status === "success" || (status === "used" && user?.emailVerified)) {
    return (
      <AuthStatus
        tone="success"
        icon={<CircleCheck />}
        title="Email Verified!"
        description={<p>Your account has been successfully verified.</p>}
      >
        <Button asChild>
          <Link href={user ? "/account" : "/login"}>{user ? "Continue to Dashboard" : "Sign In"}</Link>
        </Button>
      </AuthStatus>
    );
  }

  if (status === "expired" || status === "used" || status === "invalid") {
    return (
      <AuthStatus
        tone="error"
        icon={<CircleX />}
        title="Verification Link Invalid"
        description={<p>This verification link is invalid or has expired.</p>}
      >
        <div className="rounded-md bg-error-soft px-4 py-3 text-left text-body-sm text-error">
          <p className="font-medium">This could happen because:</p>
          <ul className="mt-1 list-disc pl-5">
            {Object.entries(failureReasons).map(([key, text]) => (
              <li key={key} className={key === status ? "font-semibold" : undefined}>
                {text}
              </li>
            ))}
          </ul>
        </div>
        {user ? (
          <ResendButton label="Resend Verification Email" variant="primary" />
        ) : (
          <Button asChild>
            <Link href="/login?next=/verify-email">Sign in to resend</Link>
          </Button>
        )}
        <Button asChild variant="tertiary">
          <Link href="/">Back to home</Link>
        </Button>
      </AuthStatus>
    );
  }

  if (user?.emailVerified) {
    return (
      <AuthStatus tone="success" icon={<CircleCheck />} title="You're verified" description={<p>Your email address is already confirmed.</p>}>
        <Button asChild>
          <Link href={next}>Continue</Link>
        </Button>
      </AuthStatus>
    );
  }

  return (
    <AuthStatus
      tone="info"
      icon={<MailOpen />}
      title="Verify Your Email"
      description={
        user ? (
          <p>
            We&apos;ve sent a verification link to <strong className="text-fg">{user.email}</strong>. Click the link in the email to
            activate your account.
          </p>
        ) : (
          <p>Check your inbox for a verification link. Sign in to resend it.</p>
        )
      }
    >
      {user ? (
        <div className="rounded-md bg-canvas-subtle p-4">
          <p className="mb-3 text-body-sm text-fg-secondary">Didn&apos;t receive the email? Check your spam folder or send it again.</p>
          <ResendButton />
        </div>
      ) : (
        <Button asChild>
          <Link href="/login">Sign In</Link>
        </Button>
      )}
      <Button asChild variant="tertiary">
        <Link href={user ? next : "/"}>{user ? "Continue browsing" : "Back to home"}</Link>
      </Button>
    </AuthStatus>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/AuthCard";
import { getCurrentSession, safeNext } from "@/modules/auth";
import { TwoFactorForm } from "./TwoFactorForm";

export const metadata: Metadata = { title: "Enter verification code", robots: { index: false } };

export default async function TwoFactorPage({ searchParams }: PageProps<"/2fa">) {
  const params = await searchParams;
  const next = safeNext(typeof params.next === "string" ? params.next : null);
  const session = await getCurrentSession();
  if (!session) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (session.twoFactorPassed) redirect(next);
  return (
    <AuthCard
      title="Enter Verification Code"
      description="Enter the 6-digit code from your authenticator app."
      sign="Same account. Stronger you."
      footer={
        <Link href="/login" className="text-body-sm text-fg-secondary hover:text-fg">
          ← Back to sign in
        </Link>
      }
    >
      <TwoFactorForm next={next} />
    </AuthCard>
  );
}

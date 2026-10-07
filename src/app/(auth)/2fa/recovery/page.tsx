import { KeyRound, LifeBuoy, Mail } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/AuthCard";
import { getCurrentSession, safeNext } from "@/modules/auth";
import { RecoveryForm } from "./RecoveryForm";

export const metadata: Metadata = { title: "Account recovery", robots: { index: false } };

export default async function RecoveryPage({ searchParams }: PageProps<"/2fa/recovery">) {
  const params = await searchParams;
  const next = safeNext(typeof params.next === "string" ? params.next : null);
  const session = await getCurrentSession();
  if (!session) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (session.twoFactorPassed) redirect(next);
  return (
    <AuthCard title="Account Recovery" description="Choose a recovery method to regain access to your account." sign="Same account. Stronger you.">
      <section className="flex flex-col gap-3 rounded-md border border-line p-4">
        <h2 className="flex items-center gap-2 font-sans text-h4 font-semibold">
          <KeyRound className="size-4" aria-hidden /> Use a recovery code
        </h2>
        <RecoveryForm next={next} />
      </section>
      <div className="flex flex-col gap-2 rounded-md border border-line p-4">
        <h2 className="flex items-center gap-2 font-sans text-h4 font-semibold">
          <Mail className="size-4" aria-hidden /> Reset by email
        </h2>
        <p className="text-body-sm text-fg-secondary">
          Lost your device and codes? Resetting your password by email signs you in again; you can then contact support to reset 2FA.
        </p>
        <Link href="/forgot-password" className="text-body-sm font-medium text-fg underline underline-offset-4">
          Send a reset link
        </Link>
      </div>
      <div className="flex flex-col gap-2 rounded-md border border-line p-4">
        <h2 className="flex items-center gap-2 font-sans text-h4 font-semibold">
          <LifeBuoy className="size-4" aria-hidden /> Contact support
        </h2>
        <p className="text-body-sm text-fg-secondary">Our team can verify your identity and help you regain access.</p>
        <Link href="/contact" className="text-body-sm font-medium text-fg underline underline-offset-4">
          Get help from our support team
        </Link>
      </div>
    </AuthCard>
  );
}

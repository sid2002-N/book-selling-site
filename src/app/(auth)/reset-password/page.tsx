import { CircleCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard, AuthStatus } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/Button";
import { ResetForm } from "./ResetForm";

export const metadata: Metadata = { title: "Create a new password", robots: { index: false } };

export default async function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  const params = await searchParams;
  if (params.done) {
    return (
      <AuthStatus
        tone="success"
        icon={<CircleCheck />}
        title="Password Reset Successfully"
        description={<p>Your password has been updated. You can now sign in with your new password.</p>}
      >
        <Button asChild>
          <Link href="/login">Sign In</Link>
        </Button>
      </AuthStatus>
    );
  }
  const token = typeof params.token === "string" ? params.token : "";
  return (
    <AuthCard title="Create a New Password" description="Enter your new password below." sign="Fresh pages, fresh start.">
      {token ? (
        <ResetForm token={token} />
      ) : (
        <p className="text-body-sm text-fg-secondary">
          This reset link is incomplete.{" "}
          <Link href="/forgot-password" className="font-medium text-fg underline">
            Request a new link
          </Link>
          .
        </p>
      )}
    </AuthCard>
  );
}

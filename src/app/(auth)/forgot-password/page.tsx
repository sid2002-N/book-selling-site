import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth/AuthCard";
import { ForgotForm } from "./ForgotForm";

export const metadata: Metadata = { title: "Reset your password", robots: { index: false } };

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Reset Your Password"
      description="Enter your email address and we'll send you a link to reset your password."
      sign="It's okay to take a fresh start."
      footer={
        <>
          Remember your password?{" "}
          <Link href="/login" className="font-medium text-fg underline underline-offset-4">
            Sign in
          </Link>
        </>
      }
    >
      <ForgotForm />
    </AuthCard>
  );
}

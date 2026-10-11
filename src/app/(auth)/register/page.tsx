import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/AuthCard";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { Divider } from "@/components/ui/Feedback";
import { getCurrentUser, googleConfigured, safeNext } from "@/modules/auth";
import { RegisterForm } from "./RegisterForm";

export const metadata: Metadata = { title: "Create your account", robots: { index: false } };

export default async function RegisterPage({ searchParams }: PageProps<"/register">) {
  const params = await searchParams;
  const next = safeNext(typeof params.next === "string" ? params.next : null);
  if (await getCurrentUser()) redirect(next);
  return (
    <AuthCard
      title="Create Your Account"
      description="Join a growing community of learners building a better version of themselves."
      sign="Learn. Explore. Build. Grow."
      footer={
        <>
          Already have an account?{" "}
          <Link href={`/login?next=${encodeURIComponent(next)}`} className="font-medium text-fg underline underline-offset-4">
            Sign in
          </Link>
        </>
      }
    >
      <RegisterForm next={next} />
      <Divider label="or sign up with" />
      <GoogleButton enabled={googleConfigured()} next={next} />
    </AuthCard>
  );
}

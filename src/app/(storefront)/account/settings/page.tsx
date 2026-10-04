import { ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ProfileForm } from "@/components/account/ProfileForm";
import { countryOptions } from "@/config/countries";
import { accountProfile } from "@/modules/account";
import { requireUserPage } from "@/modules/auth";

export const metadata: Metadata = { title: "Settings", robots: { index: false } };

export default async function SettingsPage() {
  const { user } = await requireUserPage("/account/settings");
  const profile = await accountProfile(user.id);
  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-h1">Account Settings</h1>
        <p className="text-body-sm text-fg-secondary">Member since {new Date(profile.createdAt).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}.</p>
      </header>
      <ProfileForm initial={{ name: profile.name, email: profile.email, country: profile.country, bio: profile.bio, newsletter: profile.newsletter, emailVerified: profile.emailVerified }} countries={countryOptions()} />
      <Link href="/account/security" className="flex items-center gap-3 rounded-xl border border-line bg-surface p-5 hover:border-line-strong">
        <ShieldCheck className="size-5 text-accent-strong" aria-hidden />
        <div>
          <p className="text-body-sm font-semibold">Password, two-factor & sessions</p>
          <p className="text-caption text-fg-muted">Manage how you sign in and where you&apos;re signed in.</p>
        </div>
      </Link>
    </div>
  );
}

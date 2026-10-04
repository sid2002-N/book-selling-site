import type { Metadata } from "next";
import Link from "next/link";
import { FormAlert } from "@/components/auth/FormAlert";
import { requireUserPage } from "@/modules/auth";

export const metadata: Metadata = { title: "Dashboard", robots: { index: false } };

function greeting(date = new Date()) {
  const h = Number(new Intl.DateTimeFormat("en-IN", { hour: "numeric", hour12: false, timeZone: "Asia/Kolkata" }).format(date));
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

/** Account dashboard. Library stats, continue reading and recent additions arrive in M5. */
export default async function AccountDashboardPage() {
  const { user } = await requireUserPage("/account");
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <p className="text-body-sm text-fg-muted">{greeting()},</p>
        <h1 className="text-h1 text-fg">{user.name}</h1>
        <p className="text-body-sm text-fg-secondary">Keep learning, keep growing.</p>
      </header>
      {!user.emailVerified ? (
        <FormAlert>
          Please verify your email to access downloads and your library.{" "}
          <Link href="/verify-email" className="font-medium underline">
            Verify now
          </Link>
        </FormAlert>
      ) : null}
    </div>
  );
}

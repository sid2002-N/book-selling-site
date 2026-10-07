import type { Metadata } from "next";
import { hasPasswordCredential, listSessions, requireUserPage } from "@/modules/auth";

import { ChangePasswordForm } from "./ChangePasswordForm";
import { SessionList } from "./SessionList";
import { TwoFactorSetup } from "./TwoFactorSetup";

export const metadata: Metadata = { title: "Security", robots: { index: false } };

const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
function ago(date: Date) {
  const minutes = Math.round((date.getTime() - Date.now()) / 60_000);
  if (Math.abs(minutes) < 60) return relative.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return relative.format(hours, "hour");
  return relative.format(Math.round(hours / 24), "day");
}

export default async function SecurityPage({ searchParams }: PageProps<"/account/security">) {
  const session = await requireUserPage("/account/security");
  const params = await searchParams;
  const [sessions, hasPassword] = await Promise.all([listSessions(session.user.id), hasPasswordCredential(session.user.id)]);
  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-h1">Security Settings</h1>
        <p className="text-body-sm text-fg-secondary">Keep your account safe and secure.</p>
      </header>

      <section aria-labelledby="twofa" className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-6">
        <div>
          <h2 id="twofa" className="text-h3">Two-Factor Authentication</h2>
          <p className="text-body-sm text-fg-muted">Add an extra layer of security with an authenticator app.</p>
        </div>
        <TwoFactorSetup enabled={session.user.twoFactorEnabled} isAdmin={session.user.isAdmin} autoStart={params.setup2fa === "1"} />
      </section>

      <section aria-labelledby="password" className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-6">
        <div>
          <h2 id="password" className="text-h3">{hasPassword ? "Change Password" : "Set a Password"}</h2>
          <p className="text-body-sm text-fg-muted">
            {hasPassword ? "Changing your password signs out your other devices." : "You sign in with Google. Add a password to sign in with email too."}
          </p>
        </div>
        <ChangePasswordForm hasPassword={hasPassword} />
      </section>

      <section aria-labelledby="sessions" className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-6">
        <div>
          <h2 id="sessions" className="text-h3">Sessions / Devices</h2>
          <p className="text-body-sm text-fg-muted">Manage where you&apos;re signed in.</p>
        </div>
        <SessionList
          sessions={sessions.map((s) => ({
            id: s.id,
            deviceLabel: s.deviceLabel,
            ip: s.ip,
            lastSeen: ago(s.lastSeenAt),
            current: s.id === session.sessionId,
          }))}
        />
      </section>
    </div>
  );
}

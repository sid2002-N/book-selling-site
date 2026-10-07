import { Database, KeyRound, type LucideIcon } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Setup required", robots: { index: false, follow: false } };

const STEPS: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: Database, title: "Connect a database", body: "Add a Postgres database (for example Neon from the Vercel Marketplace) and set DATABASE_URL, plus DIRECT_DATABASE_URL for a pooled connection." },
  { icon: Database, title: "Create the tables", body: "Run `pnpm db:migrate`, then `pnpm db:seed:demo` for the demo catalogue, against that database." },
  { icon: KeyRound, title: "Add the secrets", body: "Set AUTH_SECRET, ENCRYPTION_KEY, DOWNLOAD_SIGNING_SECRET and CRON_SECRET to long random strings, then redeploy." },
];

/**
 * Shown instead of a bare 500 while the deployment has no database configured. Visit
 * /api/health for the exact state of each requirement.
 */
export default function SetupRequiredPage() {
  return (
    <div className="container-page flex min-h-dvh flex-col items-center justify-center gap-8 py-16 text-center">
      <div className="flex max-w-xl flex-col gap-3">
        <p className="text-micro font-semibold tracking-widest text-accent-strong uppercase">KRM.lib · Setup required</p>
        <h1 className="text-display">Almost ready to open</h1>
        <p className="text-body-lg text-fg-secondary">This deployment is running, but it isn&apos;t connected to a database yet, so pages can&apos;t load.</p>
      </div>
      <ol className="grid w-full max-w-3xl gap-4 text-left md:grid-cols-3">
        {STEPS.map(({ icon: Icon, title, body }, i) => (
          <li key={title} className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-5 shadow-1">
            <span className="flex size-9 items-center justify-center rounded-md bg-accent-soft text-accent-strong">
              <Icon className="size-4" aria-hidden />
            </span>
            <p className="text-label font-semibold">
              {i + 1}. {title}
            </p>
            <p className="text-body-sm text-fg-secondary">{body}</p>
          </li>
        ))}
      </ol>
      <p className="text-body-sm text-fg-muted">
        Check progress at{" "}
        <a href="/api/health" className="font-medium underline underline-offset-2">
          /api/health
        </a>
        .
      </p>
    </div>
  );
}

# KRM.lib

**Knowledge · Resource · Management** — a premium digital knowledge marketplace for ebooks, guides, workbooks and collections, where every purchase becomes part of the customer's own growing digital library.

## Repository layout

| Path | Contents |
|---|---|
| `UIUX/` | UI/UX reference sheets (visual source of truth) |
| `prompt-doc/` | Original master prompts and the full project documentation |
| `docs/` | Project documentation split into individual files (PRD, design system, architecture, database, API, security, testing, …) |
| `src/` | Next.js application (added from milestone M1) |

## Stack

Next.js (App Router, TypeScript) · Tailwind + design tokens · PostgreSQL + Prisma · custom auth (Argon2id, DB sessions, TOTP — DEC-004) · Razorpay + Stripe · Cloudflare R2 · Resend · Vercel + Vercel Cron (DEC-008). See `docs/DECISIONS.md`.

## Payments

Razorpay takes INR and Stripe takes USD; the customer's currency (footer switcher, or their country) picks the provider. Without keys the checkout shows a "payments aren't switched on yet" state. It never fakes a success.

| Variable | Where it comes from |
|---|---|
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Razorpay Dashboard → Account & Settings → API keys (test mode) |
| `RAZORPAY_WEBHOOK_SECRET` | Razorpay Dashboard → Webhooks. Point it at `/api/v1/webhooks/razorpay` with the events `payment.*`, `order.paid`, `refund.*` and `payment.dispute.*` |
| `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe Dashboard → Developers → API keys |
| `STRIPE_WEBHOOK_SECRET` | `stripe listen --forward-to localhost:3000/api/v1/webhooks/stripe` locally, or a Dashboard endpoint in deployed environments |
| `CRON_SECRET` | Any long random string. Vercel Cron sends it to `/api/v1/internal/payments/reconcile` (see `vercel.json`) |

The reconcile cron in `vercel.json` runs daily (03:00 UTC), which the Hobby plan allows. On Pro you can tighten it to `*/15 * * * *`. Customers waiting on the status page don't depend on it: that page re-checks the provider directly.

## Admin

`/admin` is for staff accounts. Every admin must turn on two-factor authentication. Seeded demo admin: `admin@krmlib.local` (the password comes from `SEED_ADMIN_PASSWORD`). The first sign-in asks you to set up 2FA.

To add a book:
1. Go to **Products → New product**.
2. Work through the steps: details, cover, PDF, preview pages, pricing, categories and so on.
3. Press **Publish**. It stays disabled until every required step is done.

Once published, the book shows up on the shelf, in the catalogue and in search.

Uploads are stored in `./.storage` in development. Production needs R2 (`STORAGE_DRIVER=r2`).

What staff can do depends on their role (`super_admin`, `catalog_manager`, `finance`, `support`, `content_editor`, `analyst`). Every change they make is recorded in the audit log.

## Troubleshooting a deployment

Open `/api/health` on the deployed site. It reports, by name only and never with values:

- `database.state`: one of
  - `missing`: no `DATABASE_URL`. Every page then shows a "Setup required" page instead of a 500.
  - `unreachable`: wrong URL or SSL setting, or the database is paused.
  - `not_migrated`: run `pnpm db:migrate`.
  - `empty`: run `pnpm db:seed:demo` or add products.
  - `ok`
- `secretsMissing`: which of `AUTH_SECRET`, `ENCRYPTION_KEY`, `DOWNLOAD_SIGNING_SECRET` and `CRON_SECRET` are unset.
- `storage.ready`: whether file storage works on this host. Vercel needs `STORAGE_DRIVER=r2`.
- `email` and `payments`: which providers are configured.

To run migrations against a hosted database from your machine, set the variable and run the scripts:

- PowerShell: `$env:DATABASE_URL="…"; pnpm db:migrate; pnpm db:seed:demo`
- bash: `DATABASE_URL=… pnpm db:migrate && pnpm db:seed:demo`

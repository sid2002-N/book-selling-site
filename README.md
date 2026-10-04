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

The reconcile cron in `vercel.json` runs every 15 minutes, which needs a paid Vercel plan. On Hobby, change it to a daily schedule. The status page also re-checks the provider while a customer waits.

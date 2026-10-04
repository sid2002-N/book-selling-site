# Architecture Decisions — KRM.lib

Status legend: **Accepted** (stated in your source prompts) · **Proposed** (agent/author recommendation — needs your approval).

| ID | Title | Status | Decision | Reason / Trade-off |
|---|---|---|---|---|
| DEC-001 | Framework | **Accepted** (4 Oct 2026) | Next.js App Router + TypeScript strict | Greenfield repo (OQ-1 answered: no existing code). SSR/RSC, metadata, sitemap. |
| DEC-002 | Architecture style | **Accepted** (4 Oct 2026) | Modular monolith, service layer, ports/adapters | Transactional consistency; extractable modules |
| DEC-003 | Database | **Accepted** (4 Oct 2026) | PostgreSQL 16 + Prisma; partial uniques/CHECKs/sequences/FTS via raw SQL migration steps | Relational integrity, FTS, strong constraints. MongoDB considered and rejected (integrity would move into app code). |
| DEC-004 | Authentication | **Accepted, pending spike** (4 Oct 2026) | Better Auth (email/password, Google, DB sessions, TOTP 2FA plugin); lockout + admin-2FA enforcement implemented in `modules/auth` | Spike in M2 must confirm 2FA + lockout + admin 2FA; fall back to custom sessions if not |
| DEC-005 | Storage | **Accepted** (4 Oct 2026) | Cloudflare R2 (S3 API): private bucket for paid files, public/CDN bucket for images; local filesystem adapter for dev | Signed URLs; portability; matches Storage Settings mockup |
| DEC-006 | Styling | **Accepted** (4 Oct 2026) | Tailwind + CSS-variable tokens + Radix primitives + Lucide | Token-driven consistency + accessibility |
| DEC-007 | Search | **Accepted** (4 Oct 2026) | Postgres FTS + trigram behind `SearchPort` | Zero extra infra; swap later |
| DEC-008 | Jobs | **Accepted** (4 Oct 2026) | Inngest for background jobs (webhook processing, previews, emails, reconciliation); Vercel hosting | Works on Vercel serverless; local dev server |
| DEC-009 | PDF reading | **Accepted** (4 Oct 2026) | `pdfjs-dist` custom reader UI | Not a generic browser viewer |
| DEC-010 | Cart quantity | **Proposed** | Fixed at 1 | Digital products; resolves C2 |
| DEC-011 | Collection vs Bundle | **Proposed** | Editorial Collection vs sellable Bundle | Resolves C3 |
| DEC-012 | Accent colors | **Proposed** | Amber primary accent; plum secondary; warm chart palette | Resolves C1 |
| DEC-013 | Admin nav | **Proposed** | Master §73 grouped tree | Resolves C4 |
| DEC-014 | Checkout steps | **Proposed** | Information → Payment → Review | Resolves C5 |
| DEC-015 | Money model | **Proposed** | Integer minor units + currency; per-currency price rows | Avoid float/FX drift (OQ-8) |
| DEC-016 | Provider routing | **Proposed** | Default by billing country; user override where valid | OQ-7 |
| DEC-017 | Admin 2FA | **Proposed** | Mandatory | OQ-13 |
| DEC-018 | Server-authoritative commerce | **Accepted** | Prices, discounts, roles, payment status, download rights decided only on server | Master §21, 25, 55 |
| DEC-019 | Data-driven library | **Accepted** | Shelf/spines rendered from `Product` data | Master §8–9 |
| DEC-020 | Reusable templates over duplicate pages | **Accepted** | Templates with states | Master §52, 80 |
| DEC-021 | Dual payment providers | **Accepted** | Razorpay (India) + Stripe (global) with real backend flows | Master §21 |
| DEC-022 | Design reference authority | **Accepted** | Mockups define visual direction; recreate, don't embed screenshots | Master §71, 83 |
| DEC-023 | Creator system | **Accepted** | Architecture-ready, not exposed | Master §45 |
| DEC-024 | Email provider | **Accepted** (4 Oct 2026) | Resend behind `EmailPort`; React Email templates; console adapter for dev | Matches Email Settings mockup |
| DEC-025 | Hosting | **Accepted** (4 Oct 2026) | Vercel (app) + hosted Postgres (Neon/Supabase) + R2 + Upstash Redis (rate limits) | OQ-11 |
| DEC-026 | Package manager | **Accepted** (4 Oct 2026) | pnpm | |
| DEC-027 | Release slicing | **Accepted** (4 Oct 2026) | First slice = Storefront MVP (master phases 1–5 + minimum admin) | OQ-16 |

*Template for new decisions:*
```text
## DEC-0XX — Title
Date: · Status: Proposed|Accepted|Superseded
Context: · Decision: · Alternatives: · Reason: · Consequences (positive / trade-off):
```

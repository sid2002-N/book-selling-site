# Architecture Decisions — KRM.lib

Status legend: **Accepted** (stated in your source prompts) · **Proposed** (agent/author recommendation — needs your approval).

| ID | Title | Status | Decision | Reason / Trade-off |
|---|---|---|---|---|
| DEC-001 | Framework | **Accepted** (4 Oct 2026) | Next.js App Router + TypeScript strict | Greenfield repo (OQ-1 answered: no existing code). SSR/RSC, metadata, sitemap. |
| DEC-002 | Architecture style | **Accepted** (4 Oct 2026) | Modular monolith, service layer, ports/adapters | Transactional consistency; extractable modules |
| DEC-003 | Database | **Accepted** (4 Oct 2026) | PostgreSQL 16 + Prisma; partial uniques/CHECKs/sequences/FTS via raw SQL migration steps | Relational integrity, FTS, strong constraints. MongoDB considered and rejected (integrity would move into app code). |
| DEC-004 | Authentication | **Accepted** (4 Oct 2026) | Custom auth module (`src/modules/auth`): Argon2id (`@node-rs/argon2`), server-side sessions with SHA-256-hashed tokens, `arctic` for Google OAuth (state + PKCE), `otpauth` TOTP with replay protection, hashed recovery codes and trusted devices, lockout after 5 failures for 30 min, mandatory admin 2FA | Better Auth spike rejected: stores session tokens unhashed and lacks lockout — both required by SECURITY §1 |
| DEC-005 | Storage | **Accepted** (4 Oct 2026) | Cloudflare R2 (S3 API): private bucket for paid files, public/CDN bucket for images; local filesystem adapter for dev | Signed URLs; portability; matches Storage Settings mockup |
| DEC-006 | Styling | **Accepted** (4 Oct 2026) | Tailwind + CSS-variable tokens + Radix primitives + Lucide | Token-driven consistency + accessibility |
| DEC-007 | Search | **Accepted** (4 Oct 2026) | Postgres FTS + trigram behind `SearchPort` | Zero extra infra; swap later |
| DEC-008 | Jobs | **Accepted** (4 Oct 2026, revised in M4) | Vercel Cron → secret-protected internal routes (`/api/v1/internal/*`, `Authorization: Bearer $CRON_SECRET`). Webhooks are verified, stored once and processed inline (idempotent), so no queue is needed for v1. Inngest stays the upgrade path if job volume or fan-out grows | One less vendor; every job is an idempotent HTTP handler that can move to a queue unchanged |
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
| DEC-028 | Tax-inclusive pricing | **Accepted** (4 Oct 2026) | Catalogue prices include tax; `order.total = subtotal − discount` (DB CHECK) and tax is reported as the contained amount from configurable `tax_rate` rows | Matches Indian GST display norms; no surprise charges at checkout; rates stay configurable (OQ-2) |
| DEC-029 | ORM version | **Accepted** (4 Oct 2026) | Prisma 7.10 (stable) with `@prisma/adapter-pg`; npm `latest` currently points at an 8.0 release candidate, which is avoided | Stability |
| DEC-030 | Display currency | **Accepted** (4 Oct 2026) | Explicit choice (cookie `krm_currency`) → visitor country header (IN → INR, else USD) → store default; prices are explicit per-currency rows | OQ-7/OQ-8; no FX drift |
| DEC-031 | Storage keys & local dev | **Accepted** (4 Oct 2026) | `StoragePort` with local (`./.storage`, public bucket served at `/media/*`) and R2 drivers; random 128-bit object keys | Paid files never reachable by URL; dev works offline |
| DEC-032 | Newsletter v1 | **Accepted** (4 Oct 2026) | Single opt-in in v1 (recorded as subscribed); double opt-in moves to the marketing-extras milestone | Keeps the homepage band functional now without a half-built confirmation flow |
| DEC-033 | "Frequently bought together" | **Accepted** (4 Oct 2026) | Real co-purchases from paid orders when available; otherwise same-bundle/related items labelled "Pairs Well With" | Never implies purchase data that doesn't exist (C6) |
| DEC-027 | Release slicing | **Accepted** (4 Oct 2026) | First slice = Storefront MVP (master phases 1–5 + minimum admin) | OQ-16 |

*Template for new decisions:*
```text
## DEC-0XX — Title
Date: · Status: Proposed|Accepted|Superseded
Context: · Decision: · Alternatives: · Reason: · Consequences (positive / trade-off):
```

## DEC-034 — Payment attempts and guest order access (M4)

**Accepted (4 Oct 2026).**
- One `payment` row per provider order (Razorpay order / Stripe PaymentIntent). A retry creates a new row on the same order at the same locked price; the order's idempotency key plus attempt number is the provider idempotency key.
- Payment state changes go through one function (`applyProviderState`) under row locks (order, then payment), whether they come from the client verify call, a webhook or reconciliation. The state machine never moves `succeeded` backwards, so out-of-order webhooks are harmless.
- A success is accepted only if the provider-reported amount and currency equal the payment row and the order total. A mismatch puts the payment in `pending_verification` and records a critical security event.
- A second successful payment on an already-paid order is recorded as `DUPLICATE_PAYMENT` for a refund, not fulfilled twice.
- Guest order access uses an HMAC of the order id with `AUTH_SECRET`. Only its SHA-256 is stored (`order.guest_access_hash`), which lets emails regenerate the link. Paid guest orders join an account only when the account's email is verified (on verification, login or Google sign-in).
- Invoices are rendered on demand from the immutable `invoice.legal_snapshot` taken at payment time. The PDF base fonts can't draw ₹, so the PDF uses ISO currency codes.
- Unpaid orders with no payment in flight are cancelled after 24 hours by the reconcile job.


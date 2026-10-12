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


## DEC-035: Delivery, reader and reviews (M5)

**Accepted (4 Oct 2026).**
- **Download counting.** Each issued download counts once toward `downloads.limitPerProduct`, using `download_event` rows with status `issued` or `completed`. Denials are logged as `denied` and are not counted. Downloading the current version clears "update available".
- **Delivery by storage driver.**
  - R2 issues a presigned URL with `downloads.signedUrlTtlSeconds` (default 60 s).
  - The local driver issues an HMAC token (`DOWNLOAD_SIGNING_SECRET`). The token is single-use (claimed atomically), bound to the signed-in user, and re-checks the library item on redemption.
- **Bundles.** A bundle grants its contents as separate library items. A bundle without its own file is left out of the Download Center.
- **Reader.**
  - Uses `pdfjs-dist` **legacy** build, because the modern build needs `Map.prototype.getOrInsertComputed`, which current browsers don't all have.
  - The file streams through the owner-only `/api/v1/reader/:libraryItemId/file` endpoint with byte ranges, `private, no-store`.
  - Progress is saved debounced and flushed on page hide.
  - Reader URLs are keyed by library item, never by product.
- **Reviews.**
  - Only current owners can review; `is_verified_purchase` is set for purchases only.
  - New and edited reviews go to `pending` while `reviews.requireModeration` is on.
  - Product rating aggregates count approved reviews only.
- **Recommendations.** Unowned titles from the reader's owned categories (featured first), falling back to featured titles. No popularity numbers are shown.
- **Demo library.** `seed:demo` gives the demo reader six titles as `admin_grant` items, not fake purchases, so no orders or revenue are invented.

## DEC-036 — Tech & Culture page (live news digest)

**Accepted (12 Oct 2026).** `/tech-culture`, linked from the main menu and footer.
- **Sources.** Headlines come from publisher-provided public feeds: the Hacker News API, The Verge, Ars Technica, WIRED Culture and The Guardian Culture. The list can be replaced with the `NEWS_FEEDS` env var (JSON, validated; invalid input falls back to the defaults).
- **Display.** Only the title, a short plain-text summary (≤220 chars), the source and the time are shown. Every story links to the original article in a new tab, and KRM.lib never hosts or rewrites articles. A footer note attributes all sources.
- **Freshness and failure.** Feeds are cached for 15 minutes in the Next data cache, with a 6 s timeout and a 3 MB size cap per feed. Sources fail independently: a broken feed shows as "unavailable", and if every feed fails the page shows an honest "newsroom is quiet" state.
- **Safety.** Feed markup is decoded and stripped to text, and is never rendered as HTML. Links must be http(s). No remote images are loaded, for privacy, consistency and performance.
- **Motion** (first use of the motion layer; rules are in `globals.css`):
  - self-drawing hero network art, a word-by-word title, and a "live" pulse
  - a looping headline ticker that pauses on hover and focus
  - staggered scroll reveals, growing discussion bars, and headline underline sweeps
  - all of it disabled under `prefers-reduced-motion`, and reveals never hide content without JS
- **Menu bar.** With eight items, "Home" is shown only at 2xl (the logo links home below that), and the search pill is narrower at xl, so the bar fits from 1024 px up (checked at 1024–1920).

## DEC-037 — Minimum admin (M6)

**Accepted (12 Oct 2026).** `/admin` with a dense espresso shell; nav items appear only with the matching permission.
- **Access.** Every `/admin` page needs a signed-in, active admin with 2FA enabled *and* passed this session (`requireAdminArea` in the layout, `requireAdminPage(permission)` per page). An admin without `analytics.read` is sent to the first area they can use, not a 403.
- **Services, not pages, enforce rules.** `src/modules/backoffice/*` calls `requirePermission` in every read and mutation and writes an `audit_log` entry for every mutation (denials are logged as `permission_denied` security events). Server Actions and the upload route are thin wrappers.
- **Products — the 11-step flow** (UX Flow 16) is a stepper over one draft: basic info, cover, file and versions, preview pages, metadata, pricing (INR and USD set separately, no FX), categories, SEO, contents and FAQ, then review and publish.
  - **Required to publish:** title and slug, short and full descriptions, a primary category, and a price in both currencies (exactly 0 for free resources). Non-bundles also need a deliverable file and at least one watermarked preview; bundles need two or more items. Cover, ToC, FAQ and SEO are recommended.
  - **Enforcement.** The same pure `readinessChecks` drives the checklist and the server-side publish gate. Edits that would leave a *published* product incomplete roll back inside the transaction.
- **Uploads.** Uploads go multipart to `POST /api/v1/admin/products/:id/uploads`.
  - **Validation.** Types are decided by magic bytes. Covers and previews must be PNG, JPEG or WebP up to 8 MB; deliverables must be PDF or ZIP up to 90 MB. PDFs must parse, and their page count is recorded.
  - **Covers and previews** are re-encoded to WebP in the public bucket. Previews are stamped with a visible "KRM.lib · Preview" watermark.
  - **Deliverables** go to the private bucket with a SHA-256 checksum.
  - The proxy body limit is raised to 95 MB (`proxyClientMaxBodySize`).
  - Direct-to-R2 presigned uploads remain a later optimisation.
- **Versions.** An upload becomes a draft version (one draft at a time). Before first publish it is released by Publish; after that, "Release" makes it current, supersedes the old version, and owners see "Update available".
- **Lifecycle.** draft → published ⇄ unpublished, and anything not live can be archived and later restored to draft. Buyers keep what they own throughout. Catalogue changes revalidate the storefront layout, so the shelf, categories, search and sitemap pick them up with no code change.
- **Operations.**
  - **Orders.** Tabs and filters live in the URL. The order view shows payments with their provider transactions. Admins can make full or partial refunds (`orders.refund`, capped at the refundable balance, one refund in flight at a time) and approve or reject customer requests. Rejecting requires a reason, which is emailed to the customer.
  - **Payments** are re-checked with the provider (`payments.manage`). The provider's answer is authoritative, never the admin.
  - **Customers** can be blocked (reason required; this signs them out everywhere and keeps their library), unblocked, or signed out of all sessions. Admin accounts can't be changed here.
  - **Reviews.** Moderation recomputes ratings from approved reviews only.
  - **Coupons.** Codes are unique and upper-case. After the first redemption the code and terms are locked.
  - **Categories** support create, edit and hide.
  - **Audit log** viewer (`security.read`).
- **Dashboard** figures all come from source rows:
  - revenue per currency (paid order value minus completed refunds)
  - paid orders, new customers and completed downloads, each against the previous 30 days
  - a zero-filled daily revenue chart
  - top products
  - items needing attention (refund requests, pending reviews, failed webhooks)
- **Not in M6 (out of scope, not faked):** collections editor, authors CRUD, analytics suite, support desk, admin user and role management, and store settings UI. Those links are absent rather than dead.

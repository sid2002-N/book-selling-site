# Architecture — KRM.lib

> ⚠️ **Stack is a proposal.** Master prompt §75 requires inspecting any existing codebase first. If a stack/DB/auth/payment integration already exists, **it overrides the choices below** and `DECISIONS.md` must be updated. The *principles and boundaries* here hold regardless of stack.

## 1. System Overview

KRM.lib is one product with four surfaces on one codebase and one design system:

```text
┌───────────────────────────────────────────────────────────────────────────┐
│  PUBLIC STOREFRONT      CUSTOMER ACCOUNT        ADMIN (/admin)    CREATOR │
│  (SEO, SSR)             (/account, /read)       (RBAC, dense UI)  (flagged)│
└───────────────┬───────────────┬──────────────────────┬────────────────────┘
                │               │                      │
        ┌───────▼───────────────▼──────────────────────▼───────┐
        │  Next.js app: RSC pages + Route Handlers (/api/v1)   │
        │  Server Actions (thin) → Service layer (business)    │
        └───────┬───────────┬─────────────┬─────────────┬──────┘
                │           │             │             │
          PostgreSQL   Object Storage   Payment      Background jobs
          (Prisma)     (private+public) Providers    + Webhooks
                                        Razorpay/Stripe  Email/Analytics ports
```

## 2. Architecture Pattern

**Pattern:** Modular monolith (single deployable, strict module boundaries).
**Reason:** One team/product, tight transactional needs (orders/payments/entitlements), easiest to keep consistent; modules can be extracted later (e.g., creator system, search).

## 3. Technology Stack (PROPOSED — see DECISIONS DEC-001…DEC-010)

| Layer | Proposal | Notes |
|---|---|---|
| Language | TypeScript (strict) | Shared types front/back |
| Framework | Next.js App Router, React Server Components by default | SSR/ISR for SEO; client components only when interactive |
| Styling | Tailwind CSS mapped to CSS-variable tokens | No arbitrary values (DESIGN_SYSTEM §5) |
| UI primitives | Radix UI (accessible) + own components | Dialogs, menus, tabs, accordions |
| Motion | CSS transitions + Motion/Framer for library interactions | Lazy-loaded; reduced-motion aware |
| Icons | Lucide (outline) | |
| Server state (client) | TanStack Query | Only where client fetching needed |
| UI/Reader/Cart-local state | Zustand (small stores) | Cart truth lives on server |
| Forms/validation | React Hook Form + **Zod** (shared schemas) | Same schema validates API input |
| DB | PostgreSQL | Transactions, constraints, FTS (`tsvector`, `pg_trgm`) |
| ORM/migrations | Prisma (or Drizzle) | Migrations mandatory |
| Auth | Candidate: Better Auth or Auth.js; **must** meet SECURITY.md §1 (email/password, Google, verification, DB sessions, TOTP 2FA, lockout) | DEC-004 |
| Password hashing | Argon2id (or scrypt/bcrypt ≥ cost 12 if lib constraints) | |
| Object storage | S3-compatible; **private bucket** (paid files) + **public/CDN bucket** (covers, previews) | Signed URLs |
| PDF reader | `pdfjs-dist` wrapped in KRM reader UI | Worker, lazy-loaded |
| Preview generation | Server job renders selected pages → watermarked WebP | Never serve full PDF |
| Payments | Razorpay (INR) + Stripe (global), official server SDKs | Webhooks required |
| Email | Provider behind `EmailPort`; React Email templates | Candidates: Resend/Postmark/SES |
| Analytics | Behind `AnalyticsPort` | Provider TBD (OQ-14) |
| Search | Postgres FTS + trigram v1, behind `SearchPort` | Swap to Meilisearch/Typesense later |
| Jobs/queue | Vercel Cron → internal routes (DEC-008); Inngest is the upgrade path | Payment reconciliation, abandoned-order cleanup; webhooks processed inline and idempotently |
| Rate limiting/cache | Redis-compatible store | Auth, search, webhook, download endpoints |
| Testing | Vitest, Testing Library, Playwright, MSW | TESTING.md |
| Lint/format | ESLint + Prettier + `tsc --noEmit` | |
| Package manager | pnpm | |

## 4. System Components

### Frontend
- Render pages from server data; client components for: shelf interactions, reader, cart drawer, checkout widgets, command search, forms, admin tables/charts.
- No business rules (prices, entitlements, roles) decided client-side.

### Backend (service layer)
Modules (each owns its tables and exposes a service interface):
`auth` · `catalog` (products, versions, categories, collections, bundles, authors) · `search` · `cart` · `pricing` (single source of price/discount truth) · `checkout` · `payments` (providers, webhooks, reconciliation, refunds, disputes) · `orders` (orders, invoices) · `entitlements` (library items, downloads, access checks) · `delivery` (signed URLs, previews) · `reader` (progress, bookmarks) · `engagement` (wishlist, reviews, recommendations, recently viewed) · `marketing` (coupons, discount rules, referrals, affiliates, banners, newsletter, gifts) · `content` (articles, learning paths, homepage/nav/footer content, announcements) · `support` · `notifications` (in-app + email) · `analytics` · `admin` (RBAC, audit) · `settings` · `system` (health, jobs, logs) · `creator` (flagged).

### Database
System of record for all entities; enforces integrity (FKs, uniques, checks).

### Storage
Binary assets only; DB stores keys/metadata. Paid files private by default.

## 5. Dependency Rules

1. **UI/pages → services only.** Components never import the DB client.
2. **Route handlers/Server Actions are thin:** authenticate → authorize → validate (Zod) → call service → map result/error.
3. **Modules talk through service interfaces,** not by reaching into each other's tables (exception: read-only joins in reporting queries).
4. **Pricing is computed in exactly one place** (`pricing` module). Cart, checkout, orders, coupons all call it.
5. **Provider SDKs (Razorpay, Stripe, email, analytics, storage, search) live behind ports/adapters** inside their module.
6. **Entitlement checks live in `entitlements`** — every download/read/stream goes through it.
7. **No secrets or private env in client bundles.** Enforce with lint rule and `server-only` imports.
8. **Admin code imports admin-only services** guarded by `PermissionGate`/server checks.

## 6. Route Map (reconstructed from master §51 — approve or replace with G1)

**Public**
```text
/                      Home (library shelf + editorial)
/explore  /books  /guides  /workbooks  /collections  /new  /popular  /free-resources
/categories  /categories/[slug]
/books/[slug]  /guides/[slug]  /workbooks/[slug]  /collections/[slug]  /bundles  /bundles/[slug]
/search
/deals  /discounts(coupons info)  /gift  /referral  /newsletter
/journal  /journal/[slug]  /topics/[slug]  /authors/[slug]  /learning-paths  /learning-paths/[slug]
/about  /philosophy  /how-it-works  /why-digital  /our-library  /quality-standards  /contact  /faq
/help  /help/[slug]
/terms  /privacy  /cookies  /refund-policy  /license  /copyright  /acceptable-use  /disclaimer
```
**Commerce:** `/cart  /checkout  /checkout/gift  /checkout/success  /checkout/pending  /checkout/failed  /checkout/cancelled`
**Auth:** `/login  /register  /forgot-password  /reset-password  /verify-email  /2fa  /2fa/recovery`
**Account:** `/account  /account/library  /account/orders  /account/orders/[id]  /account/downloads  /account/wishlist  /account/reviews  /account/recommendations  /account/referral  /account/settings  /account/security  /account/support  /account/support/[id]`
**Reader:** `/read/[productId]` (resolves entitlement → library item)
**Admin:** `/admin` · `/admin/products` `/new` `/[id]` (+versions) · `/admin/categories` · `/admin/collections` · `/admin/orders` `/[id]` · `/admin/payments` · `/admin/refunds` · `/admin/customers` `/[id]` · `/admin/coupons` · `/admin/discount-rules` · `/admin/bundles` · `/admin/campaigns` · `/admin/email-campaigns` · `/admin/referrals` · `/admin/affiliates` · `/admin/banners` · `/admin/reviews` · `/admin/content/*` (articles, authors, learning-paths, homepage, navigation, footer, announcements) · `/admin/analytics/*` · `/admin/support` `/[id]` · `/admin/security/*` · `/admin/settings/*` · `/admin/system/*`
**Creator (flagged off):** `/creator/*` per Creator sheet (apply, dashboard, products, orders, revenue, analytics, payouts, profile, settings, verification, documents, support)
**System:** `not-found` (404) · `error` (500) · `/401` · `/403` · `/maintenance` · offline (service worker/client) · network error component

**Template principle (master §52, §80):** ~330 screens → reusable templates. Examples: `ProductDetailTemplate(state)`, `PaymentStatusTemplate(state)`, `SystemStateTemplate(variant)`, `AuthCardTemplate(variant)`, `AccountListTemplate`, `AdminListTemplate`, `AdminDashboardTemplate`, `AdminFormTemplate`, `AdminWizardTemplate`.

## 7. Admin Navigation (superset, from master §73)

```text
Dashboard
Catalog      → Products · Categories · Collections
Commerce     → Orders · Payments · Refunds
Customers    → Customers · Library · Activity
Marketing    → Coupons · Discount Rules · Bundles · Campaigns · Email Campaigns · Referrals · Affiliates · Banners
Content      → Articles · Authors · Learning Paths · Homepage · Navigation · Footer · Announcements
Analytics    (Sales · Revenue · Products · Customers · Funnel · Traffic · Downloads · Search · Coupons · Refunds · Geography · Devices)
Reviews
Support
Security     → Overview · Admin Users · Roles & Permissions · Login Activity · Audit Logs · Blocked Users · Rate-limit Events · Webhook Security
Settings
System       → Health · Jobs · Webhook Logs · Email Logs · Error Logs · API Logs · Storage · Database
```
Items render only if the user has the corresponding `*.read` permission.

## 8. Core Data Flows

### 8.1 Purchase (authoritative)
1. Client posts cart/checkout intent (product ids, coupon code, billing country, provider choice) — **no prices**.
2. `pricing.quote()` recomputes line prices, discounts, tax, currency from DB.
3. `checkout.createOrder()` in a **transaction**: Order(`PENDING_PAYMENT`) + OrderItems (price snapshots) + Payment(`CREATED`) with **idempotency key**.
4. Provider order/intent created server-side; client receives only provider ids/keys needed to open the provider UI.
5. Client completes payment with provider (client result is a *hint*).
6. **Verification:** (a) client callback hits `POST /payments/verify` → server verifies signature **and** fetches provider status; (b) provider **webhook** (signature-verified) arrives — either path may win; processing is **idempotent**.
7. On confirmed success, in one transaction: Payment→`SUCCEEDED`, Order→`PAID`, create `LibraryItem`s, record `PaymentTransaction`, enqueue emails/analytics.
8. If status unknown → Order `PAYMENT_PENDING`; reconciliation job polls provider until terminal.

### 8.2 Download
Request → authenticate → `entitlements.assertCanDownload(user, product, version)` (ownership, refund status, limits) → create `DownloadEvent` → return **short-lived signed URL** (or stream through protected endpoint) → log completion.

### 8.3 Publish product
Admin wizard → `catalog.publish(productId)` validates completeness → status `PUBLISHED`, `publishedAt` set → emits `product.published` → revalidate caches (home shelf, category, search index, sitemap) → previews generated by job beforehand (publish blocked until preview ready).

### 8.4 Reader
`/read/[id]` → entitlement check → short-lived PDF access (range requests via protected endpoint or signed URL) → pdf.js renders → progress `PUT /reader/progress` (debounced, last-write-wins by page+timestamp).

## 9. State Management (master §58)

| State | Where |
|---|---|
| Server data | Server components / TanStack Query cache |
| Auth/session | Server session; minimal client `useSession` snapshot |
| Cart | **Server-authoritative**; client store mirrors for optimistic UI |
| UI (menus, sheets, filters) | Local component state / small Zustand store |
| Reader | Dedicated reader store (page, zoom, panels), persisted progress via API |
| Admin | Table/filter state in URL search params; forms local |

No monolithic global store.

## 10. Performance Considerations
Server render catalog/product pages with caching (ISR + tag revalidation) · `next/image` with responsive sizes, blur placeholders, fixed aspect ratios (no CLS) · font subsetting + `display: swap` · lazy-load shelf interactions, reader, charts, rich-text editor · paginate/virtualize shelf & tables · select only needed columns, indexed queries, no N+1 · PDF.js worker + progressive page loading · skeletons everywhere · analytics/email/webhook work offloaded to jobs.

## 11. Scalability Considerations
Stateless app instances · DB indexes per `DATABASE.md` · read-heavy catalog cached at edge · search behind port · jobs horizontally scalable · object storage + CDN for assets · webhook handlers fast (verify → persist → enqueue → 2xx).

## 12. Failure Scenarios

| Scenario | Expected behavior |
|---|---|
| DB unavailable | 503 branded error page, health check fails, no partial writes; cached catalog pages may still serve |
| Payment provider API timeout at order creation | Order not shown as paid; user sees retry; no duplicate order (idempotency key) |
| Client says paid, server cannot verify | Order `PAYMENT_PENDING`, "We're confirming your payment", reconcile job + webhook finalize |
| Webhook arrives before client verify (or twice) | Idempotent: second is no-op |
| Webhook signature invalid | 400, log `SecurityEvent`, no state change |
| Storage unavailable / file missing | Download state "File unavailable" + auto-created support signal; never expose storage error |
| Email provider down | Job retries with backoff; order unaffected |
| Redis/rate-limit store down | Fail **closed** for auth/payment endpoints, open for catalog reads |
| Preview generation fails | Product cannot be published; admin sees error on step 4 |
| Session expires mid-checkout | Cart preserved; redirect to Session Expired → login → return to checkout |

## 13. Creator System (reserved)
Tables and routes prefixed `creator_*` / `/creator`, gated by `settings.creator_system_enabled`. `Product.owner_type/owner_id` supports house vs creator products. Payout ledger separate from store-credit ledger. Not exposed in nav while disabled.

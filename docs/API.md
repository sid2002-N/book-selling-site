# API — KRM.lib

Base path: `/api/v1`. JSON over HTTPS. Route Handlers are thin: **authenticate → authorize → validate (Zod) → service → map response.** Page-level reads use server components/services directly; this API serves client interactions, webhooks, admin tooling and future integrations.

## 1. Conventions

**Envelope (always):**
```json
{ "data": { }, "error": null, "meta": { "requestId": "req_01H..." } }
```
```json
{ "data": null, "error": { "code": "COUPON_EXPIRED", "message": "This coupon has expired.", "fields": { "code": "expired" } }, "meta": { "requestId": "req_01H..." } }
```
- `message` is user-safe. **Never** include stack traces, SQL, provider messages or internal IDs.
- Pagination: `?cursor=&limit=` (default 24, max 100) → `meta.nextCursor`. Admin tables may use `page/pageSize` + `meta.total`.
- Sorting/filtering via query params (`sort=-publishedAt`, `category=productivity`, `format=pdf`, `priceMax=2000`).
- Money = `{ "amountMinor": 79900, "currency": "INR" }`. **Clients never send prices.**
- Idempotency: mutating payment/order endpoints require header `Idempotency-Key`.
- IDs are opaque strings. Dates ISO-8601 UTC.
- Versioned path; breaking changes → `/v2`.

## 2. Auth levels
`public` · `session` (customer) · `verified` (session + verified email) · `admin:<permission>` (session + admin_user + RBAC permission, 2FA satisfied) · `webhook` (provider signature) · `internal` (job secret).

## 3. Endpoints

### 3.1 Authentication
| Method & Path | Auth | Purpose |
|---|---|---|
| `POST /auth/register` | public, rate-limited | Create account, send verification |
| `POST /auth/login` | public, rate-limited | Credentials login; returns 2FA challenge if enabled; enforces lockout |
| `GET /auth/google` + `/auth/google/callback` | public | OAuth (state + PKCE) |
| `POST /auth/verify-email` / `POST /auth/resend-verification` | public/session | Verify token / resend |
| `POST /auth/forgot-password` | public, rate-limited | Always 200 (no enumeration) |
| `POST /auth/reset-password` | public (token) | Set new password, revoke sessions |
| `POST /auth/logout` | session | Revoke current session |
| `GET /auth/sessions` · `DELETE /auth/sessions/:id` | session | List/revoke sessions |
| `POST /auth/2fa/setup` · `/enable` · `/verify` · `/disable` | session | TOTP lifecycle |
| `POST /auth/2fa/recovery` | session(partial) | Use recovery code |
| `POST /auth/2fa/recovery-codes/regenerate` | session+2FA | New codes |

### 3.2 Catalog & discovery
| Method & Path | Auth | Purpose |
|---|---|---|
| `GET /products` | public | List (filters: type, category, tag, author, format, price range, rating, sort) |
| `GET /products/:slug` | public | Detail (public fields only; includes `ownership` if signed in) |
| `GET /products/:slug/previews` | public | Preview page list (watermarked image URLs) |
| `GET /products/:slug/reviews` | public | Approved reviews |
| `GET /products/:slug/related` · `/frequently-bought` | public | Related sets |
| `GET /library/shelf` | public | Data for homepage shelf (limit, section/category) |
| `GET /categories` · `/categories/:slug` | public | Category data |
| `GET /collections` · `/collections/:slug` · `GET /bundles` · `/bundles/:slug` | public | |
| `GET /search?q=` | public, rate-limited | Ranked results + facets |
| `GET /search/suggest?q=` | public, rate-limited | Instant suggestions |
| `GET /search/popular` | public | Popular searches |
| `GET /content/articles` · `/articles/:slug` · `/learning-paths` · `/homepage` · `/navigation` · `/announcements` | public | Editorial & CMS content |
| `POST /newsletter/subscribe` · `/unsubscribe` | public, rate-limited | Double opt-in |

### 3.3 Cart & pricing
| Method & Path | Auth | Purpose |
|---|---|---|
| `GET /cart` | public (cookie/session) | Cart with **server-computed** totals |
| `POST /cart/items` `{ productId }` | public | Add (no quantity) |
| `DELETE /cart/items/:productId` | public | Remove |
| `POST /cart/items/:productId/save-for-later` | public | |
| `POST /cart/coupon` `{ code }` · `DELETE /cart/coupon` | public | Validate/apply server-side |
| `POST /cart/merge` | session | Merge guest → user (called on login) |
| `POST /pricing/quote` | public | Quote for checkout context (country, currency, coupon) |

### 3.4 Checkout & payments
| Method & Path | Auth | Purpose |
|---|---|---|
| `POST /checkout/orders` | public/session + `Idempotency-Key` | Recompute prices, create `Order(pending_payment)` + `Payment(created)` |
| `POST /checkout/orders/:id/payment` `{ provider }` | same | Create provider order/PaymentIntent; returns client params only |
| `POST /payments/razorpay/verify` | same | Verify `order_id\|payment_id` HMAC **and** fetch payment status from Razorpay |
| `POST /payments/stripe/confirm-status` | same | Server-side retrieve PaymentIntent; never trusts client claim |
| `GET /checkout/orders/:id/status` | owner/guest-token | Poll status (processing/verification/success/pending/failed/cancelled) |
| `POST /checkout/orders/:id/cancel` | owner | Cancel unpaid order |
| `POST /checkout/orders/:id/retry` | owner | New payment attempt on same order |
| `POST /webhooks/razorpay` | webhook | Verify `X-Razorpay-Signature` over raw body |
| `POST /webhooks/stripe` | webhook | Verify `Stripe-Signature` with raw body |
| `POST /internal/payments/reconcile` | internal/job | Poll providers for non-terminal payments |

Webhook rules: read **raw body**; verify signature first; persist `webhook_event` (unique `(provider,event_id)`); return 2xx quickly; process via job; idempotent handlers for `payment.captured/failed`, `refund.*`, `dispute.*` (Razorpay) and `payment_intent.succeeded/payment_failed/canceled`, `charge.refunded`, `charge.dispute.*` (Stripe).

### 3.5 Orders, invoices, refunds
| Method & Path | Auth | Purpose |
|---|---|---|
| `GET /account/orders` · `/account/orders/:id` | session | History / detail |
| `GET /account/orders/:id/invoice` | session | Signed link to invoice PDF |
| `POST /account/orders/:id/refund-requests` | verified | Request refund (policy checked server-side) |
| `GET /account/refunds` | session | Refund statuses |

### 3.6 Library, downloads, reader
| Method & Path | Auth | Purpose |
|---|---|---|
| `GET /account/library` | session | Sections: recent, reading, favorites, updates, archived |
| `POST/DELETE /account/library/:id/favorite` · `/archive` | session | |
| `GET /account/downloads` | session | History + per-product limits |
| `POST /downloads/:libraryItemId/issue` `{ versionId? }` | verified | **Entitlement check → short-lived signed URL** (TTL ~60 s) |
| `GET /downloads/file/:token` | token | Streams file (single-use/short TTL), logs completion |
| `GET /reader/:libraryItemId/manifest` | verified | Page count, ToC, last page, signed access for pdf.js |
| `GET /reader/:libraryItemId/file` | verified | Protected range-request stream |
| `PUT /reader/:libraryItemId/progress` `{ page, total }` | verified | Debounced progress |
| `GET/POST/DELETE /reader/:libraryItemId/bookmarks` | verified | |

### 3.7 Engagement
| Method & Path | Auth | Purpose |
|---|---|---|
| `GET/POST/DELETE /account/wishlist` | session | |
| `GET /account/recently-viewed` · `POST` (record) | session | |
| `GET /account/recommendations` | session | |
| `GET /account/reviews` · `POST /products/:id/reviews` · `PATCH /reviews/:id` · `DELETE /reviews/:id` | verified | Only owners can post verified reviews |
| `POST /reviews/:id/report` | session | |

### 3.8 Marketing
`POST /gifts` (create gift order) · `GET /gifts/claim/:token` · `POST /gifts/claim/:token` · `GET /account/referral` · `GET /referral/:code` (landing) · `GET /deals` · `GET /coupons/public` (only coupons flagged public)

### 3.9 Account & support
`GET/PATCH /account/profile` · `GET/PATCH /account/preferences` · `GET /account/connected-accounts` · `DELETE /account` (request deletion) · `GET/POST /account/addresses` · `GET /account/notifications` · `POST /account/notifications/:id/read` · `GET/POST /support/tickets` · `GET/POST /support/tickets/:id/messages` · `GET /help/articles` · `GET /help/articles/:slug`

### 3.10 Admin (all require session + admin_user + 2FA + permission; all mutations audit-logged)
| Area | Endpoints (representative) | Permission |
|---|---|---|
| Dashboard | `GET /admin/dashboard?from&to` | `analytics.read` |
| Products | `GET/POST /admin/products` · `GET/PATCH/DELETE(archive) /admin/products/:id` · `POST /:id/publish` · `/unpublish` · `/archive` | `products.read/create/update/delete` |
| Uploads | `POST /admin/uploads/sign` (cover, pdf, preview, asset) · `POST /admin/products/:id/previews/generate` | `products.update` |
| Versions | `GET/POST /admin/products/:id/versions` · `POST .../:vid/publish` | `products.update` |
| Catalog | `/admin/categories` `/collections` `/authors` `/tags` CRUD | `products.update` / `content.manage` |
| Orders | `GET /admin/orders` · `/:id` · `POST /:id/notes` | `orders.read` |
| Refunds | `POST /admin/orders/:id/refund` · `GET /admin/refunds` · `POST /admin/refunds/:id/approve|reject` | `orders.refund` |
| Customers | `GET /admin/customers` · `/:id` (orders, library, downloads, payments, sessions, tickets) · `POST /:id/block` · `/unblock` · `/revoke-sessions` | `customers.read` / `customers.manage` |
| Payments | `GET /admin/payments?provider&status` · `/disputes` · `/webhooks` · `/transactions` · `POST /admin/payments/:id/reconcile` | `payments.read` / `payments.manage` |
| Marketing | `/admin/coupons` · `/discount-rules` · `/bundles` · `/campaigns` · `/email-campaigns` · `/referrals` · `/affiliates` · `/banners` CRUD | `marketing.manage` |
| Content | `/admin/articles` · `/learning-paths` · `/homepage` · `/navigation` · `/footer` · `/announcements` | `content.manage` |
| Reviews | `GET /admin/reviews?status` · `POST /:id/approve|reject` | `reviews.moderate` |
| Support | `GET /admin/support/tickets` · `POST /:id/reply` · `PATCH /:id` | `support.manage` |
| Analytics | `GET /admin/analytics/{sales,revenue,products,customers,funnel,traffic,downloads,search,coupons,refunds,geo,devices}` | `analytics.read` |
| Security | `/admin/security/{overview,admins,roles,permissions,login-activity,events,audit-logs,blocked,rate-limits,webhook-security}` | `security.read` / `security.manage` |
| Settings | `GET/PATCH /admin/settings/:group` (general, brand, store, currency, tax, payment, razorpay, stripe, email, storage, downloads, seo, analytics, notifications, security, api, webhooks) | `settings.manage` (secrets write-only) |
| System | `/admin/system/{health,jobs,webhook-logs,email-logs,error-logs,api-logs,storage,database}` | `system.read` |

## 4. Permission keys (granular — never a single "admin")

```text
products.read  products.create  products.update  products.delete  products.publish
orders.read  orders.refund
customers.read  customers.manage
payments.read  payments.manage
marketing.manage
content.manage
reviews.moderate
support.manage
analytics.read
security.read  security.manage
settings.manage
system.read
creator.manage        (reserved)
```

**Default roles:** `super_admin` (all) · `catalog_manager` (products.*, content.manage) · `finance` (orders.read/refund, payments.*, analytics.read) · `support` (orders.read, customers.read, support.manage, reviews.moderate) · `content_editor` (content.manage, products.read) · `analyst` (analytics.read, orders.read).

## 5. Error codes (stable, machine-readable)

| HTTP | Code | Meaning |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Input invalid (`fields` populated) |
| 400 | `INVALID_REQUEST` | Malformed request |
| 401 | `AUTH_REQUIRED` · `SESSION_EXPIRED` · `INVALID_CREDENTIALS` | |
| 401 | `TWO_FACTOR_REQUIRED` · `TWO_FACTOR_INVALID` | |
| 403 | `FORBIDDEN` · `EMAIL_NOT_VERIFIED` · `ACCOUNT_LOCKED` · `ACCOUNT_BLOCKED` | |
| 404 | `NOT_FOUND` · `PRODUCT_NOT_FOUND` · `ORDER_NOT_FOUND` | (use 404 for resources the user may not know exist) |
| 409 | `ALREADY_OWNED` · `DUPLICATE_PURCHASE` · `SLUG_TAKEN` · `IDEMPOTENCY_CONFLICT` | |
| 409 | `PRODUCT_UNAVAILABLE` · `PRODUCT_INCOMPLETE` (publish blocked) | |
| 422 | `COUPON_INVALID` · `COUPON_EXPIRED` · `COUPON_NOT_APPLICABLE` · `COUPON_LIMIT_REACHED` · `COUPON_MIN_ORDER` | |
| 402/409 | `PAYMENT_FAILED` · `PAYMENT_CANCELLED` · `PAYMENT_PENDING_VERIFICATION` · `PAYMENT_VERIFICATION_FAILED` | |
| 403/410 | `DOWNLOAD_LIMIT_REACHED` · `DOWNLOAD_EXPIRED` · `DOWNLOAD_UNAUTHORIZED` | |
| 404/503 | `FILE_UNAVAILABLE` | |
| 429 | `RATE_LIMITED` (+ `Retry-After`) | |
| 500 | `INTERNAL_ERROR` | Generic; details only in logs |
| 503 | `SERVICE_UNAVAILABLE` · `MAINTENANCE` | |

## 6. API Rules
1. Validate **every** input with shared Zod schemas (body, query, params).
2. Authenticate protected endpoints; authorize **resource-level** access (ownership) and **permission-level** access (RBAC) server-side.
3. Never accept price, role, ownership, payment status, or download permission from the client.
4. Consistent envelope and error codes; map internal errors → user-safe messages; log originals with `requestId`.
5. Rate-limit auth, search, coupon, download-issue, review, newsletter and webhook-adjacent endpoints.
6. CSRF protection for cookie-authenticated state-changing requests (SameSite + token/Origin check); webhooks exempt but signature-verified.
7. Use transactions for order/payment/library state changes.
8. Idempotency for order/payment creation and webhook handling.
9. Do not expose internal IDs, storage keys, provider raw errors, or other users' data.

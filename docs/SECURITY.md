# Security Guidelines — KRM.lib

KRM.lib handles accounts, payments, private digital products, personal data and admin access. Security is a design input, not a final polish step.

## 1. Authentication

| Requirement | Rule |
|---|---|
| Methods | Email + password; Google OAuth (state + PKCE; verify `email_verified`); phone login **not** in v1 unless confirmed |
| Password storage | **Argon2id** (tuned) — never reversible; no plaintext logs |
| Password policy | ≥ 8 chars, letter + number minimum (UI shows live checklist); check against breached-password list where feasible; no max-length below 128 |
| Email verification | Required before purchase delivery/library access; tokens hashed, single-use, 24 h expiry |
| Password reset | Hashed single-use token, 1 h expiry; response identical whether or not the email exists; revokes all sessions on success |
| Sessions | Server-side sessions; random 256-bit token, **stored hashed**; cookie `HttpOnly; Secure; SameSite=Lax; Path=/`; idle + absolute expiry; rotate on login/privilege change; "Keep me signed in" extends within a bounded max |
| Lockout | After N failed logins (configurable, default 5) per account+IP window → temporary lock (default 30 min) with "Account Locked" UX; log `login_attempt`/`security_event`; no user enumeration |
| 2FA | TOTP (RFC 6238), secret encrypted at rest, 6-digit, ±1 step window, anti-replay; 10 single-use hashed recovery codes; "remember device 30 days" via hashed trusted-device token; recovery via code → email link → support |
| Admin | **2FA mandatory** for all admin roles (OQ-13); shorter session lifetime; re-auth for sensitive actions (refund, role change, settings secrets) |

## 2. Authorization

- **Server-side only.** Client role flags are display hints, never authority.
- **Customer:** may access only their own orders, library, downloads, reviews, tickets, wishlist, addresses.
- **Admin RBAC:** granular permissions (`API.md` §4). Every admin route and mutation checks permission; UI hides what the user can't use *and* the server denies it.
- **Resource checks:** ownership verified per request (IDOR protection). Return 404 instead of 403 when existence should not leak.
- **Principle of least privilege** for DB roles, storage credentials, and provider API keys.
- Security-sensitive admin actions require confirmation dialog + audit log.

## 3. Secrets

- Never hard-code credentials. Never commit secrets (pre-commit secret scan + CI scan).
- Never expose private values to the client; use `server-only` modules; only `NEXT_PUBLIC_*` values are public (and only publishable keys / non-secret ids).
- Provider secrets stored in env/secret manager; if editable in Admin Settings, they are **write-only** (never returned), encrypted at rest.
- Rotate on suspicion; document rotation steps. Separate keys per environment (test vs live).

## 4. Environment Variables
See `ENVIRONMENT.md`. Validate at boot with a Zod env schema; the app fails fast if required vars are missing or if test keys are used in production.

## 5. API Security

- **Input validation:** Zod on all inputs; reject unknown fields where sensitive; limit body size.
- **Rate limiting (examples, tune later):** login 5/min/IP+identifier · register 5/hour/IP · forgot-password 3/hour/identifier · search/suggest 60/min/IP · coupon apply 10/min/session · download issue 20/hour/user · review create 5/day/user · webhooks per-provider IP/volume anomaly alerts.
- **CORS:** same-origin by default; explicit allow-list only if a public API is later exposed.
- **CSRF:** SameSite cookies + Origin/token checks on state-changing requests.
- **Security headers:** strict CSP (nonces; allow only required Razorpay/Stripe/Google/CDN origins), HSTS, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, `frame-ancestors 'none'` (except where payment SDK requires), COOP/CORP as feasible.
- **Output encoding:** React default escaping; sanitize rich text (admin articles, product descriptions, reviews) with an allow-list sanitizer; never `dangerouslySetInnerHTML` unsanitized.
- **SSRF/redirects:** validate redirect targets (`next=` param allow-list); no server fetch of user-supplied URLs.

## 6. Payment Security (critical)

1. **Never trust client-side payment success.** Fulfillment only after server verification.
2. **Server computes all amounts** from DB (price, discount, tax, currency). Client-sent amounts are ignored.
3. **Razorpay:** create Order server-side; verify `razorpay_signature = HMAC_SHA256(order_id + "|" + payment_id, key_secret)` using constant-time compare; additionally fetch payment status via API; verify webhooks with `X-Razorpay-Signature` over the **raw body** using the webhook secret.
4. **Stripe:** create PaymentIntent/Checkout Session server-side; verify webhooks with `Stripe-Signature` and the endpoint secret on the raw body; confirm status via API when needed.
5. **Idempotency** for order/payment creation and webhook processing (`webhook_event` unique index). Replayed events are no-ops.
6. **Amount/currency match check** between order and provider payment before marking paid.
7. **Never store** card numbers/CVV; KRM never touches raw card data (provider-hosted fields/checkout only, keeping PCI scope minimal).
8. **Refunds/disputes** handled via provider APIs/webhooks with audit trail; refund permission `orders.refund`.
9. **Reconciliation job** compares provider vs DB and flags mismatches to admin.
10. Logs redact payment identifiers where sensitive; raw payloads stored redacted.

## 7. Digital File Security

- Paid PDFs live in a **private bucket**; keys are random (non-guessable) and **never exposed** to clients or public APIs.
- Delivery only via `POST /downloads/.../issue` → **short-lived signed URL** (TTL ~60 s, bound to user/IP optional) or a protected streaming endpoint with range support.
- Entitlement checked **server-side every time**: active library item, not refunded/revoked, version allowed, download limit not exceeded, email verified.
- Preview endpoints serve **only pre-rendered watermarked page images**; the preview pipeline never accesses the full PDF output path from client routes.
- Reader uses protected range-request endpoint; responses `Cache-Control: private, no-store`; no directory listing; disable `Content-Disposition: inline` abuse as appropriate.
- External-link products (e.g., Notion templates) delivered via protected redirect after entitlement check; URL stored encrypted.
- **Honesty note:** determined users can copy content they legitimately accessed. Mitigations are deterrents, logging and (later) per-buyer watermarking (OQ-6).

## 8. File Uploads (admin)

| Item | Rule |
|---|---|
| Allowed types | Cover/preview/OG: JPEG, PNG, WebP (SVG disallowed unless sanitized). Product files: PDF (and ZIP only if explicitly enabled) |
| Max size | Images 10 MB; PDF configurable (e.g., 200 MB) — set in settings |
| Validation | Sniff real MIME (magic bytes) not just extension; reject executables/scripts; PDF structural sanity check; strip EXIF; image re-encode; malware scan hook |
| Upload mechanism | Direct-to-storage via admin-authorized pre-signed upload with size/type constraints; finalize step verifies checksum & registers `asset/product_file` |
| Storage | Images → public/CDN bucket (optimized derivatives). Product files → private bucket |
| Naming | Random keys; never trust user filenames |

## 9. Data Protection
- **Sensitive data:** credentials, 2FA secrets, tokens, billing details, IP/device data, provider payloads, payout/affiliate info.
- **Encryption:** TLS everywhere; DB & storage encrypted at rest (provider); app-level encryption for secrets listed in `DATABASE.md` §10.
- **Retention:** define in policy (OQ-2/legal): logs 30–90 days; security/audit logs ≥ 1 year; financial records per tax law; analytics events aggregated.
- **Deletion:** account deletion request → anonymize PII, retain legally required order/invoice records.
- **Admin visibility:** admins see only what their permission requires; mask partial emails/IPs where full value isn't needed.
- Privacy: cookie consent & preferences; analytics respects consent.

## 10. Logging
**Never log:** passwords, password hashes, session tokens, reset/verification tokens, 2FA secrets/codes, API keys, full card data, full provider payloads with PII, signed URLs.
**Log (structured, with `requestId`):** auth events (login success/fail, lockout, 2FA, password reset), authorization denials, admin mutations (→ `audit_log`), payment lifecycle, webhook receipt/failure, download issuance/denials, rate-limit hits, errors (stack traces **internal only**).

## 11. Abuse & Fraud Considerations
Coupon abuse (per-customer limits, rate limiting), referral fraud (self-referral checks, delayed rewards), review spam (verified-purchase gating, moderation), download scraping (limits + anomaly alerts), account takeover (2FA, lockout, new-device email), card testing (rate limits on order creation, provider radar/risk settings).

## 12. Dependency & Supply Chain
Lockfile committed; automated dependency audit in CI; review new dependencies (CODE_STYLE: no unnecessary deps); pin critical packages; Renovate/Dependabot for updates; SBOM optional.

## 13. Security Checklist (release gate)

- [ ] Authentication implemented (email, Google, verification, reset, 2FA, lockout)
- [ ] Sessions secure (hashed tokens, secure cookies, expiry, revocation)
- [ ] Authorization enforced server-side; IDOR tests pass
- [ ] RBAC granular; admin 2FA enforced; negative tests per permission
- [ ] All inputs validated server-side (Zod)
- [ ] Prices/roles/payment status/download rights never trusted from client
- [ ] Razorpay & Stripe verification + webhook signature checks + idempotency tested
- [ ] Paid files private; signed/short-lived delivery; previews watermarked & isolated
- [ ] File upload validation in place
- [ ] Secrets not in repo/client bundle; env validated at boot
- [ ] Security headers + CSP configured
- [ ] Rate limiting on auth/search/coupon/download/review/webhook-adjacent routes
- [ ] Errors don't leak internals; logs redact sensitive data
- [ ] Audit logging for admin actions
- [ ] Dependencies reviewed/audited
- [ ] Backups & restore tested

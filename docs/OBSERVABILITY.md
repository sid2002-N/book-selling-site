# Observability — KRM.lib

## Logging
Structured JSON with `requestId`, `userId?`, `module`, `event`, `level`. **Log:** auth events, admin actions, payment lifecycle, webhook receipt/outcome, download issuance/denials, job runs, errors, rate-limit hits. **Never log:** passwords, tokens, 2FA data, API keys, signed URLs, full payment payloads/PII.

## Metrics (golden signals + business)
| Area | Metrics |
|---|---|
| Web | p50/p95 latency, error rate, Core Web Vitals (LCP, CLS, INP) |
| Payments | Payment success rate per provider, time-to-verify, % `payment_pending` > 10 min, webhook success/latency, reconciliation mismatches |
| Delivery | Download success/failure rate, `FILE_UNAVAILABLE` count, signed-URL denials |
| Auth | Login success/fail, lockouts, 2FA failures, password resets |
| Search | Zero-result rate, latency |
| Jobs | Queue depth, failure/retry counts, oldest job age |
| Business events | Product viewed/previewed, added to cart, checkout started, payment started/completed/failed, download started/completed, book opened, reading progress, search, wishlist added, review submitted, coupon applied |

## Analytics abstraction
`AnalyticsPort.track(name, props)` with adapters (provider TBD). Event names are constants in one file. No PII in props; respect cookie consent. Server-side events for payment/download outcomes (never trust client for revenue events).

## Monitoring & Alerts
| Alert | Condition (tune) | Severity |
|---|---|---|
| Webhook failures | > N failures / 10 min or invalid-signature spike | High |
| Payments stuck | any `payment_pending` older than threshold | High |
| Payment success drop | success rate < baseline − X% | High |
| Error rate | 5xx > threshold | High |
| DB health | connections/latency/storage | High |
| Storage errors | file fetch failures | Medium |
| Email failures | bounce/failure spike | Medium |
| Auth anomaly | login-failure or lockout spike | Medium |
| Rate-limit spikes | unusual 429 patterns | Medium |
| Job backlog | queue age > threshold | Medium |
| Availability | health endpoint, synthetic checkout-page and product-page checks | High |

## Admin visibility (System module)
Health, background jobs, webhook logs, email logs, error logs, API logs, storage usage, database status, system notifications — each searchable and permission-gated (`system.read`).

## Health endpoints
`GET /api/health` (liveness) · `GET /api/health/ready` (DB, storage, cache, provider reachability, migrations current) — no sensitive detail publicly.

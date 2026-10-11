# Deployment — KRM.lib

> Hosting/provider not yet chosen (OQ-11). Fill the bracketed items when decided.

## Environments
| Env | URL | Data | Payments |
|---|---|---|---|
| Development | `http://localhost:3000` | Demo seed | Razorpay/Stripe **test** |
| Preview (per PR) | [auto URL] | Demo seed / ephemeral DB | Test |
| Staging | [URL] | Anonymized/demo | Test |
| Production | [URL] | Real | **Live** |

## Deployment Process
1. CI: install → lint → typecheck → unit/integration tests → build → e2e (smoke) → a11y → dependency audit → secret scan
2. Database: apply migrations (backward-compatible, expand→migrate→contract)
3. Deploy app (immutable build)
4. Register/verify **webhook endpoints** for Razorpay & Stripe (per environment secrets)
5. Run **smoke tests** (home, product, search, cart, checkout in test/live-safe mode, login, download, admin login)
6. Verify monitoring, error tracking, and alerts are receiving data
7. Announce/record in `CHANGELOG.md`

## Rollback
- App: redeploy previous build (keep last N).
- DB: forward-fix preferred; down-migrations only if tested; never drop columns in the same release that stops using them.
- Payments: rollbacks must not orphan paid-but-unfulfilled orders — run reconciliation after any rollback.
- Maintenance mode: `setting.maintenance_mode=true` shows the branded Maintenance page.

## Production Checklist
- [ ] Build succeeds; all tests green
- [ ] Env vars set & validated; **live** keys only in production; secrets in manager
- [ ] Migrations applied; backup taken before release
- [ ] Webhooks registered & test event received (both providers)
- [ ] Private/public buckets configured; private bucket **not** public; CORS minimal; CDN set
- [ ] Domain, TLS, HSTS, security headers/CSP verified
- [ ] Email domain verified (SPF/DKIM/DMARC); transactional templates tested
- [ ] Sitemap, robots, canonical URLs, OG images verified
- [ ] Legal pages populated (not placeholders) — or consciously marked
- [ ] Tax settings & invoice legal details configured (OQ-2)
- [ ] Admin: 2FA enforced; initial super-admin created; roles reviewed
- [ ] Monitoring/alerts on; error tracking on; log retention set
- [ ] Backups + restore tested
- [ ] Smoke tests pass

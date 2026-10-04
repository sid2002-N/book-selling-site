# Environment Configuration — KRM.lib

Validated at boot by `src/lib/env.ts` (Zod). Missing/invalid required vars ⇒ app refuses to start. Test keys in production ⇒ startup error. Mirror every variable in `.env.example` (placeholders only).

## Public variables (safe for browser)
```text
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_DEFAULT_CURRENCY=INR
NEXT_PUBLIC_RAZORPAY_KEY_ID=            # publishable key id only
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
NEXT_PUBLIC_ANALYTICS_ID=               # if provider needs it
NEXT_PUBLIC_GOOGLE_CLIENT_ID=           # if using client-side button
```

## Private variables (server only)
```text
# Core
NODE_ENV=
APP_ENV=development|staging|production
DATABASE_URL=
DIRECT_DATABASE_URL=                    # migrations
REDIS_URL=

# Auth & crypto
AUTH_SECRET=
AUTH_URL=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
ENCRYPTION_KEY=                         # app-level encryption (2FA secrets, protected links)
DOWNLOAD_SIGNING_SECRET=
CRON_SECRET=                            # protects /internal job endpoints

# Payments
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Storage
STORAGE_ENDPOINT=
STORAGE_REGION=
STORAGE_ACCESS_KEY_ID=
STORAGE_SECRET_ACCESS_KEY=
STORAGE_BUCKET_PRIVATE=
STORAGE_BUCKET_PUBLIC=
CDN_BASE_URL=

# Email
EMAIL_PROVIDER=
EMAIL_API_KEY=
EMAIL_FROM=
EMAIL_REPLY_TO=

# Observability
ERROR_TRACKING_DSN=
LOG_LEVEL=info

# Feature flags (defaults; runtime flags live in `setting`)
FEATURE_CREATOR_SYSTEM=false
```

## Rules
- Never commit real secrets; commit `.env.example` only.
- Never expose private variables to client code (`server-only`).
- Separate **development / staging / production** values and provider keys (test vs live).
- Document any new variable here and in `.env.example` in the same PR.
- Webhook secrets differ per environment/endpoint.
- Provider keys editable in Admin Settings are write-only and encrypted; env values are the fallback.

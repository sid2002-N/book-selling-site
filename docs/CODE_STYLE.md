# Code Style & Conventions — KRM.lib

> Tooling names assume the proposed stack. If an existing codebase uses different conventions, **match the existing code** and record the delta in `DECISIONS.md`.

## 1. General Principles
- Prefer readable code; keep functions focused; avoid unnecessary abstractions.
- **Reuse before creating** — components, utilities, schemas, hooks.
- Prefer consistency over novelty. Build **fewer, better, reusable systems** (master §80).
- Server components by default; add `"use client"` only for real interactivity.
- No dead code, no commented-out code, no `TODO` without an issue reference.
- **No fake functionality** (master §76): a control either works or is clearly marked unavailable.

## 2. Naming

| Item | Convention | Example |
|---|---|---|
| React components | `PascalCase` | `ProductCard`, `BookSpine` |
| Hooks | `useCamelCase` | `useCart`, `useReaderProgress` |
| Functions/variables | `camelCase` | `computeQuote` |
| Constants | `UPPER_SNAKE_CASE` | `MAX_PREVIEW_PAGES` |
| Types/interfaces/enums | `PascalCase` (no `I` prefix) | `OrderStatus` |
| Files (components) | `PascalCase.tsx` | `ProductCard.tsx` |
| Files (other) | `kebab-case.ts` | `price-calculator.ts` |
| Route folders | `kebab-case`, Next conventions | `forgot-password/` |
| DB tables/columns | `snake_case`, singular tables | `order_item.unit_price_minor` |
| API routes | `kebab-case`, plural resources | `/api/v1/refund-requests` |
| Env vars | `UPPER_SNAKE_CASE` | `STRIPE_WEBHOOK_SECRET` |
| CSS tokens | `--kebab-case` | `--surface-elevated` |
| Test files | `*.test.ts(x)`, e2e `*.spec.ts` | `pricing.test.ts` |
| Permissions | `resource.action` | `orders.refund` |

## 3. Folder Structure

```text
src/
├── app/                         # Next.js routes (thin)
│   ├── (storefront)/ (account)/ (checkout)/ (auth)/ (content)/ (legal)/ (help)/
│   ├── admin/                   # admin app, own layout
│   ├── creator/                 # flagged
│   └── api/v1/ ...              # route handlers
├── components/
│   ├── ui/                      # primitives (Button, Input, Dialog…)
│   ├── commerce/ library/ content/ account/ system/
│   ├── templates/               # ProductDetailTemplate, PaymentStatusTemplate, SystemStateTemplate…
│   └── admin/                   # DataTable, MetricCard, Wizard…
├── modules/                     # business logic (service layer)
│   ├── auth/ catalog/ pricing/ cart/ checkout/ payments/{razorpay,stripe}/ orders/
│   ├── entitlements/ delivery/ reader/ engagement/ marketing/ content/ support/
│   ├── notifications/ analytics/ admin/ settings/ system/ creator/
│   │   └── each: service.ts · schemas.ts (Zod) · repo.ts · types.ts · index.ts (public API)
├── lib/                         # cross-cutting: db, env, errors, logger, http, ids, money, dates
├── styles/                      # tokens.css, globals.css
├── config/                      # site config, feature flags, nav definitions
├── emails/                      # React Email templates
├── jobs/                        # background job handlers
└── types/
prisma/ (schema, migrations, seed/)   tests/ (unit, integration, e2e)   docs/   scripts/
```
Rules: modules export only through `index.ts`; no cross-module deep imports; `components/` never import `lib/db`.

## 4. Imports
- Absolute alias `@/…`; order: node/react → third-party → `@/modules` → `@/components` → `@/lib` → relative → styles.
- No circular imports (lint-enforced). `server-only` for server modules; `client-only` where needed.

## 5. Components
- One responsibility; props typed; accessible by default (labels, roles, keyboard).
- Variants via a variant helper (e.g., `cva`) mapped to **design tokens only** — no raw hex, no arbitrary Tailwind values (`w-[37px]` forbidden).
- Every component handles loading / empty / error where data-driven.
- Compose templates for state variations (`<PaymentStatusTemplate state="pending" />`) rather than duplicating pages.
- Animations through shared motion tokens; respect `prefers-reduced-motion`.
- No business logic (pricing, entitlement, permissions) in components.

## 6. Functions & Modules
- Do one logical thing; pure where possible; explicit return types on exported functions.
- Money helpers only via `lib/money` (minor units, currency-aware formatting via `Intl.NumberFormat`) — **never hardcode `₹`/`$`**.
- Dates via `lib/dates` (UTC storage, locale display).
- IDs via `lib/ids`.

## 7. Error Handling
**Use:** typed `AppError` (`code`, `httpStatus`, `userMessage`, `cause`, `meta`); services throw `AppError`; route handlers convert via one `handleError()` to the API envelope; React error boundaries render `SystemState`; `Result` types for expected business outcomes (e.g., coupon validation).
**Do not:** swallow errors silently, `catch {}` empty, return raw provider/DB messages to clients, `console.log` in production code, throw strings.

## 8. Validation
Zod schemas live in the module (`schemas.ts`), are reused by forms and API. Parse at boundaries (`schema.parse`), trust types afterward. Env parsed once in `lib/env.ts`.

## 9. Comments
Explain **why**, trade-offs, non-obvious behavior, security-relevant reasoning (e.g., "constant-time compare to avoid timing leak"). No comments restating code. Public module functions get short TSDoc.

## 10. Logging
Use the `lib/logger` (structured JSON, levels, `requestId`, redaction). Never log secrets/PII (SECURITY §10). Log at boundaries (request in/out summary, payment lifecycle, jobs), not inside tight loops.

## 11. Formatting & Tooling
- **Formatter:** Prettier. **Linter:** ESLint (typescript-eslint strict, react-hooks, jsx-a11y, import/no-cycle, no-restricted-imports for layer rules). **Types:** `tsc --noEmit` with `strict`, `noUncheckedIndexedAccess`.
- Commits: Conventional Commits (`feat:`, `fix:`, `docs:`…); small focused PRs; one concern per PR.
- Pre-commit: lint-staged (format + lint + type-check changed), secret scan.

## 12. Database Access
Only in `modules/*/repo.ts`. Transactions for multi-write operations. Select only needed columns. No raw SQL except reviewed, parameterized cases (FTS, reporting).

## 13. Do
- Reuse existing patterns/components/utilities.
- Keep changes focused; follow the design system and architecture.
- Add/adjust tests with behavior changes.
- Update docs in the same PR when behavior/architecture/schema/API changes.
- Remove dead code you create.

## 14. Don't
- Create duplicate utilities or one-off styles.
- Introduce dependencies without justification (size, maintenance, license, security) recorded in `DECISIONS.md`.
- Put prices, roles, or entitlement logic on the client.
- Hardcode catalog data, homepage content, currency symbols, or tax rates.
- Touch unrelated files or "improve" things outside the task.
- Use screenshots as UI assets (master §71) — **recreate** the interface.
- Generate hundreds of near-duplicate page files.

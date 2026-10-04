# Testing Strategy — KRM.lib

"The code looks correct" is not validation. Payments, entitlements and security get the most coverage.

## 1. Testing Goals — critical functionality
1. Pricing, discount and coupon calculation (server-authoritative)
2. Checkout → payment → verification → fulfillment (both providers)
3. Webhook handling (signature, idempotency, ordering, replay)
4. Entitlements, downloads, reader access (no leaks)
5. Authentication, sessions, lockout, 2FA, password reset
6. RBAC and admin mutations (+ audit logging)
7. Product publish rules and versioning/updates
8. Library data-driven rendering and interactions
9. Accessibility and responsive behavior

## 2. Test Types

### Unit (Vitest)
- `pricing` (quote, discounts, bundles, tax, rounding, multi-currency)
- coupon validation rules (each error code)
- money/date helpers; slug/ID utilities
- entitlement decision function (table-driven)
- permission checks; Zod schemas
- state-transition guards (order/payment/refund state machines)
- spine width/height deterministic function; contrast helper

### Component (Testing Library)
- Button/Input/Dialog/Tabs/Accordion a11y behavior
- ProductCard states; Price/Discount display (hides absent data)
- Shelf/BookSpine: hover, focus, Enter/Space, ESC, reduced-motion path, list-view fallback
- PaymentStatusTemplate (all states show the four required answers)
- DataTable (sort/filter/bulk), Wizard validation

### Integration (Vitest + test DB + MSW/provider fixtures)
- API route contracts (envelope, error codes, auth levels)
- Cart merge (guest→user, dedupe, owned items)
- Order creation idempotency; double submit
- Razorpay: signature verify (valid/invalid), webhook `captured/failed/refund`
- Stripe: PaymentIntent flow, webhook `succeeded/failed/canceled/refunded/dispute`
- Webhook replay and out-of-order events
- Reconciliation job fixes stuck `payment_pending`
- Download issuance: owner/non-owner/refunded/limit/expired/missing file
- Publish blocked when incomplete; version update notices
- Search ranking/suggestions/empty
- RBAC: every permission has allow + deny test

### End-to-end (Playwright; desktop + mobile viewports)
| Flow | Expected |
|---|---|
| Browse → product → preview | Preview pages load, watermarked, no full-PDF request |
| Add to cart → guest checkout → pay (Razorpay test) → success | Order PAID, email queued, library item/claim works |
| Logged-in checkout (Stripe test) | Same + appears in My Library |
| Payment failed / cancelled / pending | Correct copy: charged? next step? order status |
| Coupon valid/invalid/expired | Correct totals & messages |
| Register → verify email → login → 2FA → sign out | Works; lockout after N failures |
| Forgot/reset password | Old sessions revoked |
| Library → continue reading → progress persisted | Resumes at last page |
| Download (owner) vs direct URL guess (non-owner) | Owner OK; others 403/404 |
| Wishlist, review write/edit (+moderation) | Persisted server-side |
| Admin: login(2FA) → create product (11 steps) → publish | Appears on shelf/catalog/search without code changes |
| Admin: refund | Provider API called (test), status updates, audit log |
| Admin: RBAC | Support role cannot reach settings/payments |
| System states | 404/401/403/500/maintenance/offline/network render branded pages |
| Mobile: bottom nav, filter sheet, sticky purchase bar, reader controls | Usable at iPhone/Android sizes |

### Non-functional
- **Accessibility:** axe in CI on key pages; manual keyboard & screen-reader pass for checkout, reader, dialogs.
- **Performance:** Lighthouse CI budgets (LCP, CLS, INP) on Home, Product, Category, Cart.
- **Security:** dependency audit; header check; authorization negative tests; webhook tampering tests; file-upload fuzz cases.
- **Visual regression (optional):** key templates compared against baselines recreated from mockups (not the screenshots as assets).

## 3. Testing Tools
Unit/Integration: **Vitest** · Components: **@testing-library/react** · E2E: **Playwright** · API mocking: **MSW** · DB: ephemeral Postgres (container) with migrations + seed · A11y: **axe-core / @axe-core/playwright** · Perf: **Lighthouse CI** · Payments: Razorpay **test mode**, Stripe **test mode** + `stripe-cli` webhook forwarding.

## 4. Test File Structure
```text
tests/
├── unit/          # mirrors src/modules & src/lib
├── component/
├── integration/   # api, payments, entitlements, jobs
├── e2e/           # *.spec.ts (desktop + mobile projects)
├── fixtures/      # factories, provider payloads (redacted)
└── helpers/
```

## 5. Critical User Flows (acceptance)
See Section 2 E2E table and `UX_FLOWS.md`. Each Must-have feature in `PRD.md` maps to ≥ 1 automated test or a documented manual test.

## 6. Coverage
Targets (practical, risk-weighted): **pricing/payments/entitlements/auth/RBAC: ≥ 90% line & all branches of state machines**; shared UI primitives ≥ 80%; overall ≥ 70%. Coverage is a floor, not the goal — prioritize critical business logic, auth, payments, data mutations, and key journeys.

## 7. Commands (proposed — adjust to repo)
```text
Install:     pnpm install
Dev:         pnpm dev
Test (unit): pnpm test
Test (int):  pnpm test:integration
E2E:         pnpm test:e2e
Lint:        pnpm lint
Type check:  pnpm typecheck
Build:       pnpm build
A11y:        pnpm test:a11y
DB migrate:  pnpm db:migrate     Seed demo: pnpm db:seed:demo
```

## 8. Definition of Done (per change)
- [ ] Tests added/updated; all pass
- [ ] Lint, type check, build pass
- [ ] Critical flow verified (manually or e2e) incl. error paths
- [ ] Loading / empty / error states verified
- [ ] Mobile + desktop checked; keyboard/focus verified
- [ ] No unintended files changed
- [ ] Security rules respected; no secrets in diff
- [ ] Docs updated

## 9. Manual Payment Test Matrix (sandbox)
| Case | Razorpay | Stripe |
|---|---|---|
| Success | ✅ | ✅ |
| Card declined / failed | ✅ | ✅ |
| User closes popup (cancelled) | ✅ | ✅ |
| 3-D Secure / extra action | ✅ | ✅ |
| Network drop after pay (pending → webhook) | ✅ | ✅ |
| Webhook delayed / duplicated / out-of-order | ✅ | ✅ |
| Tampered client callback (bad signature) | ✅ | n/a |
| Amount/currency mismatch | ✅ | ✅ |
| Partial & full refund | ✅ | ✅ |
| Dispute opened | ✅ | ✅ |

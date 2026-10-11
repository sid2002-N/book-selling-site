# Product Requirements Document — KRM.lib

## 1. Product Overview

**Product name:** KRM.lib (Knowledge · Resource · Management)

**One-line description:** A premium digital knowledge marketplace — ebooks, guides, workbooks, collections and free resources — where every purchase becomes part of the customer's own growing digital library.

**Product type:** Digital-product ecommerce + personal reading library + editorial platform + admin back-office (with future multi-creator marketplace).

**Primary platform:** Responsive web (desktop, tablet, mobile web). No native apps in scope.

**Markets:** India (INR, Razorpay) and global (USD, Stripe). Architecture allows more currencies.

**Identity (non-negotiable):** It must feel like *"I am browsing a beautifully curated digital library"* — not *"a generic ecommerce template."* Avoid looking like Shopify, Gumroad, Amazon, Etsy, generic SaaS or generic AI dashboards.

**Experience arc:** Discover → Explore → Preview → Buy → Own → Library → Read → Learn → Return.

## 2. Problem

**What problem?** Digital knowledge products (ebooks, guides, workbooks) are usually sold through generic stores that treat them as downloads, not as a library. Buyers receive a file, lose it, and never return.

**Why it matters:** Ownership, discoverability, re-reading and updates are what create retention for knowledge products. Trust (secure payment, instant delivery, refund clarity, version updates) decides conversion.

**Current alternatives:** Generic ecommerce/download platforms; marketplaces; email-delivered PDFs.

## 3. Goals

**Primary:** Launch-quality platform where customers can discover, preview, buy, own, read and re-download digital knowledge products, and admins can publish and operate the catalog without code changes.

**Secondary:**
- Signature **library/bookshelf experience** that scales with the catalog (data-driven spines).
- Real, verified payments for India and global (Razorpay + Stripe).
- Secure digital delivery (no raw/guessable file URLs).
- Editorial layer (Journal, Learning Paths, Curated Collections) connected to products.
- Architecture ready for a future multi-creator system, not exposed yet.

## 4. Target Users

| Persona | Description | Needs | Pain points |
|---|---|---|---|
| **Reader (Customer)** | Student, professional, creator or curious learner; mostly India, also global | Find the right resource, preview it, pay easily (UPI/cards), read anywhere, keep access, get updates | Fear of fake/insecure downloads, unclear refund, losing files, clunky PDFs |
| **Guest buyer** | First-time visitor who doesn't want an account yet | Fast checkout, files delivered by email/claim link | Forced signup |
| **Gift recipient** | Receives a product as a gift | Simple claim flow | Confusing redemption |
| **Admin operator** | Staff who run the store (roles: Super Admin, Catalog Manager, Finance, Support, Content Editor, Analyst) | Fast tables, safe destructive actions, accurate payment/refund data | Hardcoded content, opaque payment states |
| **Creator (future)** | External publisher | Apply, verify, publish, see revenue, get paid | — (not exposed in v1) |

## 5. User Stories (representative)

- As a **reader**, I want to preview sample pages so that I can judge a book before buying.
- As a **reader**, I want to pay with UPI/cards via Razorpay (or Stripe abroad) so that checkout works for my country.
- As a **reader**, I want my purchases on a bookshelf with "continue reading" so that I return to where I stopped.
- As a **reader**, I want to be told when a new version of my product exists so that I get the latest content.
- As a **guest**, I want to check out without registering so that purchase is fast.
- As a **buyer**, I want to know whether I was charged when a payment fails or is pending so that I'm not anxious.
- As an **admin**, I want to publish a product and have it appear in the library, catalog, search and collections automatically.
- As an **admin**, I want granular permissions so that support staff can't change payment settings.
- As a **finance admin**, I want every payment traceable Customer → Order → Payment → Provider → Transaction → Product.

## 6. Core Features

Each feature lists purpose, key flow (see `UX_FLOWS.md`), and acceptance criteria (**AC**). All AC are testable.

### F1 — Public Storefront & Catalog
**Purpose:** Discovery. **Pages:** Home, Explore, Books, Guides, Workbooks, Collections, New, Popular, Free Resources, Categories, Category detail.
- AC: Catalog lists are **server-rendered**, paginated/infinite-loaded, never load the full catalog.
- AC: Filtering (sub-category, format, price range, rating) and sorting (relevance, popular, newest, price) work and are URL-addressable.
- AC: Unpublished/draft/archived products never appear publicly.
- AC: Every public page has unique SEO metadata, canonical URL, Open Graph.
- Edge: category with zero products → designed empty state with suggested navigation.

### F2 — Signature Library (Bookshelf)
**Purpose:** The brand's defining experience (public homepage shelf + customer My Library).
- AC: Shelf is **data-driven** from `Product` (id, title, slug, cover, spineColor, category, type, price, status, publishedAt). No hardcoded books.
- AC: Publishing a product in admin adds a spine without frontend code changes.
- AC: Hover = forward + slight rotate + elevation + metadata reveal; Click = book slides out, opens, shows preview, offers "View product".
- AC: Keyboard operable; `prefers-reduced-motion` replaces rotation/slide with fade/scale; a **list/grid toggle** exists as a non-motion fallback; hover is never the only way to reach information.
- AC: Handles 5 and 5,000 products (row wrapping, windowed rendering, section-by-category; homepage shows a curated/limited set).

### F3 — Search
- AC: Command-style search (desktop) and full-screen search (mobile) with recent searches, popular searches, instant suggestions (products, categories, authors/topics).
- AC: Searches title, subtitle, description, category, author, tags; ranked results; filters/sort; empty-state with suggestions.
- AC: Search terms recorded for Search Analytics (no PII beyond session/user id).

### F4 — Product Detail
- AC: Shows all fields in §12 of master prompt (cover, title, subtitle, description, price/original/discount, Buy Now, Add to Cart, Wishlist, Preview, TOC, What's Inside, pages, format, size, language, version, last updated, author, publisher, reviews, related, frequently-bought-together, FAQ).
- AC: Page states handled by one template: Normal · Discounted · Purchased · Unavailable · Updated.
- AC: Already-purchased users see "Open in Library" instead of "Buy".
- AC: Price/discount rendered from server; urgency/countdown only for a real campaign end date.
- AC: Anchor tab bar (Overview, Preview, Table of Contents, What's Inside, Reviews, FAQs).

### F5 — Product Preview
- AC: Cover + selected sample pages, next/prev, zoom, fullscreen, mobile gestures.
- AC: Previews are **pre-rendered, watermarked page images**; the full paid PDF is never reachable from preview endpoints.

### F6 — Cart
- AC: Add/remove; quantity fixed at 1 (C2); bundles; coupon; totals computed **server-side**.
- AC: Guest cart (cookie-bound) persists; **merges** into user cart on login without duplicates.
- AC: Already-owned product cannot be added silently (warning with "Open in Library"); duplicate purchase is blocked or explicitly confirmed (OQ-ish; default: blocked).
- AC: Empty cart state designed.

### F7 — Checkout
- AC: Guest and logged-in paths; steps Information → Payment → Review; coupon; billing country/address; terms acceptance.
- AC: Price shown at checkout equals price charged; recomputed server-side at order creation and verified at payment.
- AC: Payment states: Selection, Processing, Verification, Success, Pending, Failed, Cancelled, Retry — each states *what happened, whether money was charged, order status, and next action*.
- AC: Duplicate-click/double-submit does not create duplicate orders or charges (idempotency).

### F8 — Payments (Razorpay + Stripe)
- AC: Real backend flows only (no mocked success). Order/intent creation, verification, webhook handling, retry, cancellation, pending verification, refund, dispute, reconciliation.
- AC: **Client-reported success is never trusted**; fulfillment happens only after backend verification (signature and/or webhook + provider API status).
- AC: Webhooks verify signatures, are idempotent, and are logged (`WebhookEvent`).
- AC: Currency INR and USD supported; currency is configuration, not hardcoded symbol.

### F9 — Orders, Invoices, Refunds
- AC: Order IDs `KRM-######`. Order list/detail/history; invoice generation + download; refund request → processing → completed with status visible to the customer.
- AC: Refund revokes or flags library access per policy (configurable).

### F10 — Digital Delivery & Downloads
- AC: Download center with history, limits, expired/unauthorized/missing-file states, version updates.
- AC: Downloads use **short-lived signed URLs / protected endpoints**; ownership checked server-side on every request; raw storage URLs never exposed.

### F11 — My Library (Customer)
- AC: Sections: Recently added, Recently read, Continue reading, Favorites, Downloads, Available updates, Archived. Bookshelf view + list view.
- AC: Library items are created only by verified payment, gift claim, free-resource claim, or admin grant.

### F12 — PDF Reader
- AC: Page nav, prev/next, page number, zoom, fullscreen, ToC, in-document search, bookmark, last-read page, reading progress persisted server-side, keyboard nav, touch gestures, mobile focus mode (controls hidden until needed, tools in bottom sheets).
- AC: Reader loads progressively; shows loading state; works for large PDFs.
- AC: Notes/highlights: *where supported* (UI prompt) — Later unless confirmed.

### F13 — Authentication & Account
- AC: Email/password, Google, email verification, forgot/reset password, sessions with expiry, account lockout, sign-out confirmation, 2FA (TOTP) setup/verify/recovery.
- AC: `/account` with Dashboard, Library, Orders, Downloads, Wishlist, Reviews, Recommendations, Settings (Profile/Preferences/Connected accounts), Security.

### F14 — Engagement
- AC: Wishlist/Saved, Recently viewed, Recently purchased, Recommendations, Reviews (write/edit/submitted) persisted server-side for authenticated users.
- AC: Only verified purchasers can leave a "verified purchase" review; reviews go through moderation (Pending/Approved/Rejected/Reported).

### F15 — Marketing
- AC: Deals, Discounts, Bundles + detail, Gift products + Gift checkout, Coupons, Referral + dashboard, Newsletter.
- AC: **All pricing/discount logic is server-authoritative.** Coupons validated server-side with explicit errors (invalid, expired, not applicable, limit reached, min order).

### F16 — Editorial
- AC: Journal, Articles, Topics, Authors, Reading Lists, Knowledge Hub, Learning Paths, Curated Collections — content links directly to products (e.g., "Build Your Digital Life → 6 books → 1 collection").

### F17 — Brand, Legal, Support
- AC: Brand pages (About, Philosophy, How it Works, Why Digital Books, Our Library, Quality Standards, Contact, FAQ). Legal structure pages with **placeholders, no invented legal guarantees**. Help Center, articles, support tickets + detail, refund/payment/download/account help.

### F18 — System States
- AC: 404, 401, 403, 500, Maintenance, Offline, Network error, Generic error, Empty search/library/orders/wishlist/cart — all KRM-branded (never browser defaults).

### F19 — Admin Application (`/admin`)
- AC: Separate dense UI; dashboards, products (11-step creation wizard, versions), orders, customers, payments, refunds, marketing, analytics, content, reviews, support, security, settings, system monitoring.
- AC: **RBAC with granular permissions**; every admin action authorized server-side and audit-logged.
- AC: Cannot publish an incomplete product. Publishing propagates automatically to catalog, library surfaces, search and collections.

### F20 — Creator System (architecture only)
- AC: Data model and routes reserved behind a feature flag (`creator_system_enabled=false`); no public exposure; no UX complexity added to v1.

### F21 — Mobile Experience
- AC: Intentional mobile recomposition (bottom nav, bottom sheets, filter drawer, sticky CTAs, safe-area support) — never a squeezed desktop.

## 7. Non-Goals (this version)

- Physical goods, shipping, inventory.
- Subscriptions / memberships (not mentioned in sources — do not build unless confirmed).
- Native iOS/Android apps.
- Dark mode (tokens structured to allow later; reader may offer paper/sepia/night themes — Later).
- Multi-language UI (English only; products carry a `language` field).
- Public multi-creator marketplace and live payouts.
- DRM-grade copy protection (mitigate with signed URLs, preview watermarking; cannot fully prevent copying — state honestly).
- In-reader interactive filling of workbooks (Later).
- Real-time chat support (tickets only).

## 8. Release Scope (proposal — confirm OQ-16)

| Slice | Contents |
|---|---|
| **Must have (v1.0 core)** | Phases 1–5 of master prompt: foundation, data, storefront, commerce (Razorpay + Stripe), customer (account, library, downloads, reader, wishlist, reviews) + minimum admin to run the store (products, orders, customers, payments, refunds, coupons, reviews) |
| **Should have (v1.0 complete)** | Rest of admin (analytics, content, support, security, settings, system), editorial layer, brand/legal/help pages, referral, gifting, newsletter, mobile polish, SEO, accessibility audit |
| **Later** | Creator system, in-reader notes/highlights, interactive workbooks, per-buyer watermarking, push notifications, additional currencies, advanced search engine |

## 9. Success Metrics (targets to be set by owner — none invented)

**Primary:** visitor→purchase conversion; payment success rate; checkout abandonment; refund rate; repeat-visit rate to Library.
**Secondary:** preview→purchase rate; search→purchase rate; average reading progress; download failure rate; webhook processing success; Core Web Vitals; support ticket volume per 100 orders.

## 10. Constraints

- **Technical:** Server-authoritative prices, roles, payment status, download rights. Provider-agnostic abstractions (analytics, email, storage, search).
- **Business:** India + global payments; tax/legal content not yet supplied (OQ-2, OQ-5).
- **Design:** Must follow the 12 mockup sheets; no new visual language.
- **Timeline:** Not provided.

## 11. Assumptions

1. Greenfield build unless a codebase is found (OQ-1).
2. Single store operator in v1 (no multi-tenant).
3. English-language UI.
4. Products are delivered as PDF (or protected external link) in v1.
5. Mockup numbers/copy are illustrative, not data.

## 12. Open Questions
See **Source Register §5** (OQ-1 … OQ-16).

## 13. Definition of Done (product-level)
- [ ] All Must-have AC pass in automated or documented manual tests
- [ ] Payments verified end-to-end in provider test modes for both Razorpay and Stripe, incl. webhook replay and failure paths
- [ ] No paid file reachable without server-side entitlement
- [ ] RBAC verified (negative tests for every admin permission)
- [ ] Mobile viewports checked (iPhone-size, Android-size, tablet, desktop, large desktop)
- [ ] Accessibility checks (keyboard, focus, contrast, reduced motion) pass
- [ ] Build, lint, type-check, tests green; docs updated

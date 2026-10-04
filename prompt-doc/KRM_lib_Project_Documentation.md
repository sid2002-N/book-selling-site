# KRM.lib — Complete Project Documentation System

> **Knowledge · Resource · Management**
> The documentation set for building KRM.lib with an AI coding agent, following *The Vibe Coding Blueprint* structure (17 documents), written specifically from your two master prompts and 12 UI/UX mockup sheets.

**Generated:** 4 Oct 2026 · **Status:** v0.1 — ready for your review before handing to the agent

---

## HOW TO USE THIS FILE

This one file contains all 17 project documents plus appendices. Each document starts with a marker comment on its own line (format: `FILE: docs/<NAME>.md` wrapped in an HTML comment) so it can be split into a real `/docs` folder.

**Option A — split automatically (Python 3):**

```python
# save as split_docs.py, run: python split_docs.py KRM_lib_Project_Documentation.md
import re, sys, pathlib
text = pathlib.Path(sys.argv[1]).read_text(encoding="utf-8")
parts = re.split(r"^<!-- ===== FILE: (.+?) ===== -->$", text, flags=re.M)
for i in range(1, len(parts), 2):
    path = pathlib.Path(parts[i].strip())
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(parts[i + 1].strip() + "\n", encoding="utf-8")
    print("wrote", path)
```

**Option B — give the agent this single file** and tell it to treat each section as its own document.

**Recommended project layout:**

```text
krm-lib/
├── docs/
│   ├── source/                         ← keep your 2 original prompts + mockup PNGs here
│   │   ├── KRM_lib_Master_Implementation_Prompt_v2_1_.md
│   │   ├── KRM_lib_UI_UX_Design_System_Prompt.md
│   │   └── reference/*.png
│   ├── PRD.md          ├── UX_FLOWS.md      ├── DESIGN_SYSTEM.md
│   ├── ARCHITECTURE.md ├── DATABASE.md      ├── API.md
│   ├── SECURITY.md     ├── CODE_STYLE.md    ├── TESTING.md
│   ├── AGENTS.md       ├── ENVIRONMENT.md   ├── ERROR_HANDLING.md
│   ├── DEPLOYMENT.md   ├── OBSERVABILITY.md ├── DECISIONS.md
│   └── ROADMAP.md      └── CHANGELOG.md
├── AGENTS.md  (root pointer → docs/AGENTS.md; also CLAUDE.md / .cursorrules if your tool needs it)
└── .env.example
```

**First message to your agent:** use the *Bootstrap Prompt* in **Appendix B**.

---

## DOCUMENT INDEX

| # | Document | Question it answers |
|---|---|---|
| 0 | Source Register, Conflicts & Gaps | What do we know, where do sources disagree, what is missing? |
| 1 | PRD.md | What are we building? |
| 2 | UX_FLOWS.md | What does the user actually do? |
| 3 | DESIGN_SYSTEM.md | What should it look and feel like? |
| 4 | ARCHITECTURE.md | How should the system work? |
| 5 | DATABASE.md | What data exists and how does it relate? |
| 6 | API.md | How do the parts communicate? |
| 7 | SECURITY.md | What must be protected and how? |
| 8 | CODE_STYLE.md | How should code be written? |
| 9 | TESTING.md | How will we know it works? |
| 10 | AGENTS.md | How should the AI agent behave? |
| 11 | ENVIRONMENT.md | What configuration exists? |
| 12 | ERROR_HANDLING.md | What happens when things fail? |
| 13 | DEPLOYMENT.md | How does it ship? |
| 14 | OBSERVABILITY.md | How do we see what's happening? |
| 15 | DECISIONS.md | What did we decide and why? |
| 16 | ROADMAP.md | What is now / next / later? |
| 17 | CHANGELOG.md | What changed? |
| A | Appendix A | Reference-image → route → template map |
| B | Appendix B | Copy-paste prompts for the agent |
| C | Appendix C | Pre-code readiness checklist (status) |

---

<!-- ===== FILE: docs/SOURCES_CONFLICTS_GAPS.md ===== -->

# Source Register, Conflicts & Gaps

## 1. Sources received

| Source | Type | Role |
|---|---|---|
| `KRM_lib_Master_Implementation_Prompt_v2_1_.md` | Prompt (83 sections) | Product scope, architecture rules, security, phases |
| `KRM_lib_UI_UX_Design_System_Prompt.md` | Prompt (59 sections) | Visual language, component and screen rules |
| 12 mockup sheets (PNG) | Visual references | Visual source of truth (per both prompts) |
| *The Vibe Coding Blueprint* | Guide | Structure of this documentation set |

## 2. Source priority (carried from the master prompt, §1)

1. Existing working functionality (if a codebase exists)
2. KRM.lib UI/UX reference images
3. KRM.lib page architecture / product specification
4. Agent design judgment — only where nothing is defined

## 3. Gaps — things the prompts reference but were NOT provided

These matter. The agent must not silently invent them.

| ID | Missing item | Impact | Action |
|---|---|---|---|
| G1 | **Page architecture / product specification** (the "~330 surfaces" list; master prompt calls it "authoritative") | Route list in this doc is reconstructed from master prompt §51 + visible mockups | Provide it, or approve the reconstructed route map in `ARCHITECTURE.md` §6 |
| G2 | **Existing codebase** (master prompt §75, §82) | Tech stack in this doc is a **proposal**, not a fact | Agent must inspect the repo first; if a stack exists, it overrides `DEC-001..006` |
| G3 | **Admin marketing screenshots** (coupons, discount rules, bundles, campaigns, email campaigns, referrals, affiliates, banners — referenced in UI prompt §30–37, §58) | Not among the 12 sheets | Provide, or agent extrapolates from the Analytics/Content admin sheets |
| G4 | **Home page** mockup | Most important storefront page has no reference | Provide, or agent composes from Collections + Product page patterns |
| G5 | **Mobile mockups** (none provided) | Both prompts demand intentional mobile UX | Agent designs per `DESIGN_SYSTEM.md` §14 rules |
| G6 | Orders list/detail, invoice, refund request screens | Customer order management unmocked | Extrapolate from Account + Creator Orders table patterns |
| G7 | Journal/articles, brand pages, legal, help center, support tickets (customer side) | Editorial layer unmocked | Extrapolate; use Admin Content sheet for data shape |
| G8 | Admin: product creation wizard (11 steps), customers, payments, refunds, reviews, security, settings, system | Largest unmocked admin area | Extrapolate from admin sheets; follow `DESIGN_SYSTEM.md` §15 |
| G9 | Email template designs | Transactional emails unmocked | Reuse brand tokens; plain, readable layouts |
| G10 | Final art assets (covers, illustrations) | Screenshots **must not** be used as assets (master §71) | Decide asset pipeline — see OQ-12 |

## 4. Conflicts between sources — and the proposed resolution

| ID | Topic | What conflicts | Proposed resolution (needs your confirmation) |
|---|---|---|---|
| C1 | **Accent color** | Master: "deep plum/burgundy + warm amber". UI prompt: amber/honey/terracotta, **no purple**. Admin mockups: maroon active-nav, but blue/purple charts. | **Amber = storefront accent.** **Plum/burgundy = secondary** (admin active states, selected states, rare emphasis). **No blue/indigo/neon-purple brand colors.** Charts use a warm categorical palette (`DESIGN_SYSTEM.md` §3.5), *not* the blue/purple seen in the Analytics sheet. |
| C2 | **Cart quantity** | Cart mockup shows `− 1 +` steppers. Master §19: prevent nonsensical quantity. | Quantity is **always 1** per digital product. No stepper. Buying for someone else uses the **Gift flow**. |
| C3 | **Collection vs Bundle** | Master §10 lists both; mockups show both as discounted multi-product sets. | **Collection** = editorial, curated grouping (may be unpriced). **Bundle** = sellable product with a fixed price over a set of products. A Collection may *link to* a Bundle. See `DB` entities. |
| C4 | **Admin navigation** | Master §73 grouped tree; UI prompt §28 flat list incl. *Payouts*; mockups show flat list incl. *Reports*. | Use the master §73 grouped tree as the superset. Map: Reports→Analytics; Payouts→hidden until Creator system is enabled. |
| C5 | **Checkout step layout** | Mockup #25 shows contact + payment on one screen; others show 3 steps (Information → Payment → Review). Gift checkout has 4 steps. | Canonical: **Information → Payment → Review**. Gift: **Recipient → Message → Payment → Confirmation**. |
| C6 | **Fabricated-looking numbers** in mockups ("10K+ students", "4.8 (320 reviews)", countdown "Limited Time Offer", "38% OFF") | Master §77 / UI §53: never fabricate trust metrics. | All numbers are **server-derived**. If data doesn't exist, **hide the element**. Countdown only if a real campaign end-date exists. |
| C7 | **Illustration style** | UI prompt §12 says avoid "generic AI-looking illustrations"; mockups are illustrated in a consistent warm style. | Treat the warm illustrated style as the established house style. Asset sourcing is OQ-12. |
| C8 | **Header nav** | Product/Collections pages: Home · Explore · Books · Guides · Workbooks · Collections · Free Resources. Error/empty pages: Books · Guides · Collections · Journal. | Primary nav = the 7-item version. The 4-item version is the **compact variant** for system-state pages. Journal lives in footer + Explore menu. |
| C9 | **Order ID format** | Prompt: `KRM-102934`; mockups: `#KRM-102834`, `#KR-1032` (creator). | Single format `KRM-` + 6 digits (sequence-backed). Creator-side IDs use their own prefix only when the Creator system is enabled. |
| C10 | **Product formats** | Master: "Workbook = fillable/interactable". Search mockup filters show **PDF · Fillable PDF · Notion Template**. | `ProductFile.kind` supports `pdf`, `fillable_pdf`, `external_link` (e.g., Notion template — delivered as a protected link, not a file). Interactive in-reader workbook editing = Later (see ROADMAP). |
| C11 | **Referral reward** | Mockup: "₹200 rewards earned / store credit". | Requires a **store-credit ledger** entity. Reward amounts/rules are OQ-9. |
| C12 | **Mockup numbering** | Checkout sheet labels are inconsistently numbered (e.g., two "11"s, a garbled "32"). | Refer to screens **by name**, never by number. |

## 5. Open questions (owner decisions needed)

| ID | Question | Default the agent should assume until answered |
|---|---|---|
| OQ-1 | Is there an existing codebase? Which stack? | Assume greenfield, proposed stack in `DEC-001..006` |
| OQ-2 | Indian GST / international VAT on digital goods — rates, invoicing rules, legal entity name & GSTIN? | Build tax as configurable settings; **do not hardcode rates**; invoice template has placeholder legal fields |
| OQ-3 | Refund policy window and rules? (Mockup says "30-day money-back guarantee") | Configurable `refund_window_days`, default 30 in seed only; copy reads from settings |
| OQ-4 | Download limits and link expiry? | Configurable; seed default 5 downloads/product, signed URL TTL 60 s |
| OQ-5 | License terms (single-user? print allowed?) | Placeholder legal structure; no invented guarantees |
| OQ-6 | Per-buyer PDF watermarking at delivery? | Not in v1; preview pages are watermarked. Architecture keeps a hook |
| OQ-7 | Provider routing: INR→Razorpay, USD→Stripe, or user's free choice? (Mockup lets user pick; Razorpay "Recommended") | Default by billing country (IN→Razorpay/INR, else Stripe/USD), user may override where both support the currency |
| OQ-8 | Pricing per currency: explicit price per currency, or FX conversion? | Explicit `ProductPrice` per currency (no runtime FX) |
| OQ-9 | Referral/reward rules and amounts? Coupon stacking rules? | Configurable; no stacking by default |
| OQ-10 | Gifting: delivery by email link? Claim flow? | Recipient receives claim email; gift becomes a LibraryItem on claim |
| OQ-11 | Hosting/deploy target, DB host, object storage vendor? | Provider-agnostic; document in `DEPLOYMENT.md` once chosen |
| OQ-12 | Who produces illustration/cover/spine assets? | Dev uses neutral demo covers generated from product data (title + `spineColor`); never the screenshots |
| OQ-13 | Admin 2FA mandatory? | **Yes, required for all admin roles** (security default) |
| OQ-14 | Analytics & email providers? | Behind abstractions (`AnalyticsPort`, `EmailPort`) |
| OQ-15 | Is "Upgrade Your Library" (sidebar promo in Account Dashboard) a paid tier/subscription? | Treat as a **promo card linking to Collections**; no subscription logic |
| OQ-16 | Release slicing: ship everything as v1.0 or in slices? | Follow master-prompt phases (ROADMAP) |

---

<!-- ===== FILE: docs/PRD.md ===== -->

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

---

<!-- ===== FILE: docs/UX_FLOWS.md ===== -->

# UX Flows — KRM.lib

Every flow lists **Success**, **Failure**, and the states **Loading / Empty / Error** where relevant. Use the state-template approach (master §52): one template, many states.

## Flow 1 — Discover → Buy → Own → Read (golden path)

```text
Home (shelf) → Explore/Category/Search → Product page → Preview → Add to Cart / Buy Now
→ Checkout (Information → Payment → Review) → Payment verification → Order success
→ My Library (new spine appears) → Reader → Continue reading → Return
```

## Flow 2 — Registration & Verification
1. `/register` → full name, email, password (live checklist: ≥8 chars, number & letter) or **Continue with Google**.
2. Account created (unverified) → `/verify-email` ("Verify Your Email", resend, change email).
3. Link click → **Email Verified** → "Continue to Dashboard".
- **Failure:** link expired (24 h) / already used / corrupted → "Verification Link Invalid" with reasons + **Resend**.
- **Edge:** user logs in before verifying → allowed to browse; purchase/library access requires verification (OQ-level default: required before download).

## Flow 3 — Login, Lockout, Session
1. `/login` → Email/Phone tab (phone = **not confirmed** in sources; build Email, keep tab hidden until confirmed), password, "Keep me signed in".
2. Wrong credentials → generic error (no user enumeration).
3. N failed attempts → **Account Locked** screen with *"Try again after 30 minutes"* + Contact Support.
4. Session timeout → **Session Expired** (hourglass) → "Sign In Again".
5. Sign out → confirmation modal **Sign Out? / Cancel**.

## Flow 4 — Forgot / Reset Password
Forgot → email sent (always same response) → Reset page (new password + confirm, checklist) → **Password Reset Successfully** → Sign in.

## Flow 5 — 2FA
Setup (benefits → "Set Up 2FA" / "Maybe later") → scan QR + enter 6-digit code → store recovery codes. Login: **Enter Verification Code** (6 boxes, "Remember this device for 30 days", "Use a different method"). **Recovery:** recovery code · email link · contact support.

## Flow 6 — Cart
- Add from card/product page → toast + cart count. Cart page: items (cover, title, type, price, remove, save for later), summary (subtotal, discount, total), coupon, **Proceed to Checkout**, trust row (Secure checkout · Instant digital access · 30-day money-back *(from settings)*), "You may also like".
- **Empty:** "Your Cart is Empty" → Explore Collections / Browse Books.
- **Guest→login:** guest cart merges (dedupe; owned items removed with notice).
- **Coupon errors:** invalid · expired · not applicable · minimum not met · limit reached (each with distinct message).

## Flow 7 — Checkout & Payment State Machine

```text
CART ─▶ INFORMATION ─▶ PAYMENT SELECTION ─▶ REVIEW ─▶ [create Order (PENDING_PAYMENT) + provider order/intent]
   ─▶ PROCESSING (provider UI) ─▶ VERIFICATION (server confirms)
        ├─▶ SUCCESS  → Order PAID → LibraryItems granted → Confirmation + emails
        ├─▶ PENDING  → Order PAYMENT_PENDING → "We'll notify you" (webhook completes later)
        ├─▶ FAILED   → Order stays unpaid → Try Again / Choose different method (+ common reasons)
        └─▶ CANCELLED→ "No money has been deducted" → Try Again / Back to Cart
```

**Payment status copy contract** (every payment screen must answer all four):

| Question | Where shown |
|---|---|
| What is the current state? | Headline |
| What happened? | Sub-text |
| Was money charged? | Explicit line (e.g., "No money has been deducted") |
| What should I do next? | Primary + secondary actions |

- **Guest checkout:** email required; downloads via claim link + optional account creation after success.
- **Logged-in:** saved shipping/billing info preselected ("Use as billing address", "Add new address").
- **Duplicate purchase:** blocked with "Already in your library".
- **Double submit / refresh during processing:** idempotent; resumes same order.

## Flow 8 — Download
Account → Downloads (or Library) → **Download** → server checks entitlement + limit → issues short-lived URL → file streams.
States: ready · limit reached · expired · unauthorized · file missing/unavailable · update available (version badge + "Update").

## Flow 9 — Reading
Library → **Continue Reading** (overlay shows recent chapters + progress) → Reader → progress autosaves (debounced) → return resumes at last page. Mobile: tap to reveal controls; ToC/search/bookmarks in bottom sheets.

## Flow 10 — Review
Purchased product → **Write a Review** (stars, text ≤500, up to N photos) → Submit → *Review Submitted* → status Pending → moderated → Approved. Edit review re-enters moderation per policy.

## Flow 11 — Wishlist
Heart toggles optimistically; wishlist page supports sort, grid/list, Add to Cart, Remove, Share wishlist. Empty state "Your Wishlist is Empty".

## Flow 12 — Gift
Product → **Send a Gift** → Gift checkout: Recipient (name, email) → Message (≤300) → Payment → Confirmation. Live preview card on the right. Recipient gets claim email → claim → LibraryItem.

## Flow 13 — Referral
Account → Referral → copy unique link → friend signs up & purchases → reward credited (ledger) → dashboard shows Friends referred / Completed purchases / Rewards earned and a table (Pending/Completed).

## Flow 14 — Refund (customer)
Order detail → **Request refund** (reason) → status *Requested → Processing → Completed/Rejected* shown on order; email at each step.

## Flow 15 — Support
Help Center search → article; else **Contact Support** → ticket (category: Refund/Payment/Download/Account/Other) → ticket detail thread → status Open/In progress/Resolved.

## Flow 16 — Admin: Create & Publish Product (11 steps)
1 Basic info → 2 Cover → 3 PDF → 4 Preview → 5 Metadata → 6 Pricing (per currency) → 7 Categories → 8 SEO → 9 FAQ → 10 Review preview → 11 Publish.
- Each step validates; **Publish disabled until all required steps are valid**.
- Save Draft anytime. Publish writes status + `publishedAt`, invalidates caches, shelf/search update.
- **New version:** upload new file → changelog → publish version → customers on old versions see "Update available".

## Flow 17 — Admin: Review Moderation
Queue (Pending / Reported) → open review with product + customer context → Approve / Reject (reason) → audit log.

## Flow 18 — Admin: Refund
Order → Refund → choose full/partial + reason → permission `orders.refund` → provider refund API → status updates via webhook → customer notified → audit log.

## Flow 19 — Mobile navigation
Bottom nav (max 5): **Home · Explore · Library · Orders · Account** (adjust per auth state). Search, Wishlist, Cart in top bar. Filters → bottom-sheet drawer. Product page → sticky purchase bar.

## Global state matrix (apply to every data-driven screen)

| State | Required |
|---|---|
| Loading | Designed skeleton (never blank) |
| Empty | Illustration + headline + explanation + primary action (+ secondary) |
| Error | Friendly message + retry; technical detail logged, never shown |
| Offline / network | Dedicated states with Try Again |
| Unauthorized/Forbidden | 401/403 branded pages |

---

<!-- ===== FILE: docs/DESIGN_SYSTEM.md ===== -->

# Design System — KRM.lib

> **Source of truth for visuals:** the 12 mockup sheets + the two prompts. Where this document gives hex values or sizes, they are **starting values derived by eye from the mockups** — the agent must sample/calibrate them against the reference images and record the final values in `src/styles/tokens.css`. Do not introduce values outside this system.

## 1. Design Direction

**Style:** Editorial library + warm digital bookstore + modern ecommerce + *subtle* liquid glass.
**Mood:** Warm, calm, premium, intellectual, tactile, slightly handcrafted. Paper, plants, shelves, lamplight.
**Brand arc:** Knowledge → Curation → Craft → Practicality → Trust.

**Design principles**
1. **Library first.** The bookshelf/spine is the signature motif; use it selectively (home shelf, My Library, collections, discovery, empty library, recommendations) — never in admin tables.
2. **Warm neutrals, restrained accents.** Cream surfaces, espresso controls, amber/terracotta accents.
3. **Glass is a secondary material.** Only on floating/overlay surfaces.
4. **Cards only when grouping helps.** No nested cards, no borders everywhere.
5. **Storefront = emotion & discovery; Admin = efficiency & density.** Same DNA, different layout.
6. **Reuse before inventing.** New screen → find closest existing pattern (Design Consistency Rule).
7. **Never fabricate trust.** Real data or nothing.

**Anti-patterns (do NOT):** gradients everywhere, glass everywhere, floating blobs, neon/indigo/cyber palettes, giant type everywhere, every element as a card, excessive icons/animation, generic Tailwind-template look.

## 2. Brand

- **Wordmark:** `KRM.lib` in the serif display face; period is part of the mark. Dark espresso on light; cream on dark footer/admin sidebar.
- **Tagline/quotes seen in mockups:** *"A small library for a bigger tomorrow."* · *"Good Books, Better You."* · *"Learn. Explore. Build. Grow."* — usable as editorial microcopy; keep copy in CMS/settings, not hardcoded in components.
- **Voice:** warm, literate, clear, reassuring. Short sentences. Never hypey. Error copy is kind and specific ("Even the best plans hit a snag. Let's try again.").
- **Expansion:** *Knowledge · Resource · Management* (appears in About/footer where relevant).

## 3. Color

### 3.1 Semantic tokens (CSS variables; Tailwind maps to these)

| Token | Purpose | Starting value |
|---|---|---|
| `--bg` | Page background (warm ivory/parchment) | `#FBF3E8` |
| `--bg-subtle` | Alternating sections | `#F6EADB` |
| `--surface` | Cards, panels | `#FFF9F1` |
| `--surface-elevated` | Popovers, raised cards | `#FFFDF9` |
| `--surface-glass` | Liquid-glass tint | `rgba(255,249,240,0.72)` |
| `--border` | Fine borders | `#EBDCC8` |
| `--border-strong` | Inputs, dividers | `#D9C4A8` |
| `--text` | Primary text (near-black brown) | `#2A1D16` |
| `--text-secondary` | Body secondary | `#5E4A3C` |
| `--text-muted` | Metadata | `#8C7767` |
| `--text-on-dark` | On espresso | `#F8EEDF` |
| `--ink` / `--btn-primary-bg` | Primary buttons, footer, strong nav (espresso) | `#2B1E18` |
| `--accent` | Amber/honey (storefront accent: stars, badges, highlights, focus accents) | `#D98A2B` |
| `--accent-soft` | Amber tint backgrounds | `#FBE6C6` |
| `--accent-secondary` | Terracotta (discount, deals) | `#C4562F` |
| `--plum` | Deep plum/burgundy (admin active nav, selected, rare emphasis) | `#6B2A3A` |
| `--plum-soft` | Plum tint | `#F1DDE0` |
| `--success` / `--success-soft` | Muted green | `#4F7F4A` / `#E3EEDC` |
| `--warning` / `--warning-soft` | Honey/amber-dark | `#B7791F` / `#FBEBC8` |
| `--error` / `--error-soft` | Restrained red | `#B3392F` / `#F8DEDA` |
| `--info` / `--info-soft` | **Warm slate-brown** (not blue) | `#6B5B4E` / `#EFE6DA` |
| `--focus-ring` | Visible focus | `#D98A2B` @ 2px + 2px offset (must meet 3:1) |

**Rules:** never pure white as dominant page background · no blue/indigo/neon brand · status is never color-only (always icon + text) · verify WCAG AA for all text pairs.

### 3.2 Spine palette (library)
`spineColor` is stored per product (hex). UI derives text color automatically for AA contrast. Provide a curated palette (deep green, navy-teal, burgundy, ochre, espresso, olive, rust) as admin color-picker presets — covers resemble the dark teal/green/orange mockup covers. Custom hex allowed but contrast-checked.

### 3.3 Overlay/scrims
Modal scrim `rgba(42,29,22,0.45)`; reader overlay darker `rgba(20,13,10,0.6)`.

### 3.4 Texture
Optional paper grain overlay ≤ 4% opacity, `pointer-events:none`, never behind small text.

### 3.5 Chart palette (warm categorical — replaces blue/purple from Analytics sheet)
`#D98A2B` amber · `#C4562F` terracotta · `#6B2A3A` plum · `#4F7F4A` sage · `#B89B72` tan · `#7A6A5C` taupe · `#3F5E5A` deep teal-green (sparingly). Sequential ramps use amber tints. Always pair color with labels/patterns/legend text.

## 4. Typography

| Role | Family (proposal — confirm against mockups) | Notes |
|---|---|---|
| **Display / headings** | Editorial serif (candidates: *Fraunces*, *Newsreader*, *Libre Caslon*, *Cormorant*) loaded via `next/font` | Literary, not decorative. The mockups use a high-contrast bookish serif for titles/prices/section headings |
| **UI / body** | Clean humanist sans (candidate: *Inter* / *Instrument Sans*) | Nav, buttons, forms, tables, metadata, admin data |
| **Mono (admin only)** | System mono | IDs, codes, logs |

**Scale** (fluid with `clamp`, desktop reference):

| Token | Size / line-height / weight | Use |
|---|---|---|
| `display` | 56–72 / 1.05 / 500 serif | Hero ("Categories", "Collections") |
| `h1` | 40 / 1.1 / 500 serif | Page & product titles |
| `h2` | 30 / 1.2 / 500 serif | Section titles ("About this book") |
| `h3` | 22 / 1.3 / 600 serif or sans | Card/section sub-titles |
| `h4` | 18 / 1.35 / 600 sans | Panel titles |
| `body-lg` | 18 / 1.6 / 400 | Lead paragraphs |
| `body` | 16 / 1.6 / 400 | Default |
| `body-sm` | 14 / 1.5 / 400 | Secondary text, tables |
| `caption` | 12 / 1.4 / 400 | Meta |
| `label` | 13 / 1.2 / 500 | Form labels, chips |
| `micro` | 11 / 1.2 / 600 uppercase +4% tracking | Badges ("BESTSELLER") |
| `price` | serif 28–32 tabular-nums | Prices; original price struck-through muted |
| `nav` | 14 / 1 / 500 sans | Header links |

Admin uses `body-sm` base (14px) and tabular numerals for all figures. Reading column max-width 68ch. Minimum 16px for mobile form inputs (prevents iOS zoom).

## 5. Spacing

Base unit **4px**. Scale tokens: `1=4 · 2=8 · 3=12 · 4=16 · 5=24 · 6=32 · 7=48 · 8=64 · 9=96 · 10=128`. No arbitrary pixel values in components — only tokens. Section vertical rhythm on storefront: 64–96; admin: 16–24. Card padding: 16 (compact), 24 (default), 32 (feature).

## 6. Radius
`--r-sm 8` (chips, inputs) · `--r-md 12` (buttons, small cards) · `--r-lg 16` (cards, panels) · `--r-xl 24` (hero cards, modals, sheets) · `--r-pill 999` (tabs, filter chips, badges). Book covers: `--r-cover 4/8` (slight, like a real book). Limited system — do not add more.

## 7. Shadows (low-elevation, warm-tinted)
- `--sh-1`: `0 1px 2px rgba(60,40,20,.06)` — cards at rest
- `--sh-2`: `0 6px 18px rgba(60,40,20,.10)` — hover, dropdowns
- `--sh-3`: `0 18px 48px rgba(60,40,20,.16)` — modals, pulled-out book
- Book spine hover uses `--sh-3` plus a contact shadow on the shelf.

## 8. Liquid Glass (secondary material)

```text
background: var(--surface-glass);
backdrop-filter: blur(14px) saturate(1.1);
border: 1px solid rgba(255,255,255,.55) / var(--border);
box-shadow: var(--sh-2);
```
**Allowed on:** floating/sticky header (on scroll, compact), command search, filter bar (floating), bottom sheets & modals, account menu, library overlays, product-preview controls, sticky purchase panel, image controls.
**Not on:** regular cards, table rows, forms, admin surfaces.
**Fallbacks:** if `backdrop-filter` unsupported or `prefers-reduced-transparency`, use solid `--surface-elevated`. Text over glass must pass AA.

## 9. Buttons

| Variant | Spec |
|---|---|
| **Primary** | `--ink` bg, `--text-on-dark` text, radius `md`, height 44 (40 compact, 48 large), subtle arrow icon allowed ("Buy Now →"). Hover: slightly lighter + `sh-1`. |
| **Secondary** | `--surface` bg, `--text`, 1px `--border-strong`. |
| **Tertiary** | Text/icon only; underline on hover. |
| **Accent** | Amber — only for promotional/limited CTAs; sparingly. |
| **Destructive** | Restrained red; requires confirm dialog for irreversible actions. |
| **Icon button** | 40×40 min target (44 on touch). |

States for all: default · hover · pressed · focus-visible · disabled · loading (spinner, width preserved, `aria-busy`) · success · error. Touch target ≥ 44×44.

## 10. Inputs & Forms
Height 44, radius `sm/md`, `--surface` fill, 1px `--border-strong`. Focus: ring in `--focus-ring`. Error: `--error` border + icon + message below (`aria-describedby`, `role="alert"` for submit errors). Valid: subtle green check. Disabled: reduced contrast + cursor. Placeholder `--text-muted` (≥ 4.5:1 not required for placeholder but keep legible). Password: visibility toggle. OTP: 6 separate boxes with paste support & `autocomplete="one-time-code"`. Labels always visible (no placeholder-as-label). States: empty · focus · filled · invalid · valid · loading · submitted.

## 11. Cards
`--surface`, 1px `--border` (very subtle), radius `lg`, `sh-1`, padding 24. Interactive cards lift 2px + `sh-2` on hover (disabled for reduced motion). No card inside card — use dividers/sections instead.

## 12. Navigation

### 12.1 Storefront header
`KRM.lib` · **Home · Explore · Books · Guides · Workbooks · Collections · Free Resources** · search pill ("Search books, guides, topics…") · wishlist · cart (count) · notifications (signed-in) · **Sign In** (primary) / avatar. Active link: pill highlight. Light by default; on scroll → compact + glass + optional sticky. Compact variant for system-state pages (Books · Guides · Collections · Journal).

### 12.2 Footer
Dark espresso, 4 columns (brand blurb + socials · Explore · Company · Support), quote in serif italic, illustration at right, copyright from settings. Newsletter band above footer.

### 12.3 Customer account sidebar
Cream sidebar (Dashboard · My Library · Collections · Downloads · Favorites/Wishlist · Orders · Reviews · Settings) with active pill; calmer than admin.

### 12.4 Admin sidebar
Dark espresso, persistent; logo + "Admin" label; grouped nav per `ARCHITECTURE.md` §7; active item = plum-tinted rounded highlight; collapse to icons < 1280.

### 12.5 Mobile navigation
Bottom bar (≤5): Home · Explore · Library · Orders · Account (glass, safe-area padded). Secondary items in drawer. Top bar: logo, search, wishlist, cart.

### 12.6 Breadcrumbs
`Home › Books › Technology › Title` — shown on product/category/content pages, emitted as JSON-LD too.

## 13. System & feedback components

| Component | Spec |
|---|---|
| Toast | Bottom-right desktop / top on mobile; auto-dismiss 4–5 s; `role="status"`; actions (Undo, View Cart) |
| Modal / Dialog | Glass-tinted solid surface, focus trap, ESC, return focus, scroll lock |
| Drawer / Bottom sheet | Mobile filters, tools; drag handle; swipe to dismiss; `role="dialog"` |
| Skeleton | Matches final layout; shimmer disabled with reduced motion |
| Empty state | Illustration + headline + explanation + primary + optional secondary |
| Error state | Illustration + status code (optional) + message + Try Again / Go Home |
| Status badge | Icon + text + color (never color only): Published/Draft/Pending/Completed/Processing/Refunded/Failed/Active/Expired/Scheduled |

**Illustration language for states** (from Error sheet): a cozy library scene per state — sleeping cat (404, generic error), friendly robot with plant (500), wooden gate (403), stacked books with sign (401), ladder + lamp (maintenance), window with mountains (offline), Wi-Fi sign (network), magnifier (empty search), empty shelf (empty library), cardboard box (no orders), jar with heart (empty wishlist), shopping cart with books (empty cart). Each pairs with a short handwritten-sign microcopy. Create as reusable `<SystemState variant="…" />`.

## 14. Responsive Design

| Breakpoint | Range | Behavior |
|---|---|---|
| `xs` small mobile | < 375 | Single column, compact paddings |
| `sm` mobile | 375–639 | Bottom nav, sticky CTAs, horizontal rails, accordions |
| `md` tablet | 640–1023 | 2–3 columns, collapsible sidebar |
| `lg` laptop | 1024–1279 | Full layout, admin sidebar collapsible |
| `xl` desktop | 1280–1535 | Reference layout of mockups |
| `2xl` large | ≥ 1536 | Max content width 1440; extra whitespace, not stretched content |

**Recomposition rules (not shrinking):** side panels → bottom sheets · tables → cards/stacked rows · purchase card → sticky bottom bar · tab bar → horizontally scrollable pills · metadata → collapsible accordion · filters → drawer · multi-column product detail → cover → title/price → actions → sections. Safe-area insets honored. Inputs ≥ 16px.

## 15. Admin visual language
Dense, efficient, professional: 14px base, 36–40px table rows, persistent sidebar, top utility bar (search, date range, notifications, account), breadcrumbs, page header (title + description + primary action), tabs, filter bar, **metric cards → trend chart → breakdown → table** hierarchy ("Metric → trend → explanation → detail"). Status chips in tables. Bulk selection + bulk action bar. Destructive actions protected by confirm dialog and permission checks. Same fonts, icons, tokens, radius — **no** editorial heroes, illustrations or glass in admin (except modals).

## 16. Iconography
One outline icon family (proposal: Lucide), stroke 1.5–1.75, sizes 16/20/24. No mixing families. Decorative icons `aria-hidden`; meaningful icons labeled.

## 17. Motion

| Token | Duration | Use |
|---|---|---|
| `--motion-fast` | 120 ms | Hover, button press, toggles |
| `--motion-normal` | 200–240 ms | Dropdowns, tabs, toasts, drawers |
| `--motion-slow` | 360–480 ms | Book pull-out/open, page transitions |
| Easing | `cubic-bezier(.2,.8,.2,1)` (out) | Default |

Rules: purposeful, subtle, no bouncing; animate `transform`/`opacity` only; **respect `prefers-reduced-motion`** (replace with fades/instant); no motion-only information.

## 18. Signature Component — The Library (Shelf & Book Spine)

**Data (all from DB):** `id, title, slug, coverUrl, spineColor, category, type, price, status, publishedAt` (+ optional `spineTexture`, `spineFont`).

**Spine anatomy:** vertical rounded rectangle; width varies deterministically (hash of id, within 28–56 px) and height within a band so the shelf feels organic yet stable between renders; title set vertically in the spine type style; category tint/texture; subtle top/bottom bands; optional emboss.

**Shelf:** rows with a wooden/paper shelf line and soft contact shadow; plants/props are *decorative layers* controlled by the section (not per-book). Responsive: row capacity computed from container width; windowed rendering for large catalogs; sections by category with "View all".

**Interaction spec**

| State | Behavior |
|---|---|
| Rest | Books stand vertically together |
| Hover / focus-visible | Selected book: translateZ forward (~12 px), rotateY ≈ 8–12°, `sh-3`, tooltip/metadata (title, type, price/progress) |
| Click / Enter | Book slides out (`slow`), rotates open, reveals preview panel (cover, summary, rating, price/progress) with **View Product** / **Continue Reading**; ESC or outside-click returns it |
| Selected | Persisted highlight ring + elevated |
| Reduced motion / touch | No rotation; fade/scale; tap opens bottom sheet |
| Fallback | Grid/list toggle; each spine is a `<button>` with accessible name "Title, type, status" |

**Where used:** Home library section · My Library · Collections · Recommendations · Empty library (empty shelf). **Not** in admin tables.

## 19. Component Inventory (build once, reuse)

**Core:** Header, Footer, Sidebar, MobileNav, Breadcrumb, Button, IconButton, Input, Select, Checkbox, Radio, Switch, Textarea, OTPInput, FileUpload, DatePicker, RichTextEditor, FormSection, ValidationMessage, Tabs, Accordion, Modal, Drawer, BottomSheet, Toast, Tooltip, Dropdown/Menu, Badge, Avatar, Pagination, Skeleton, ProgressBar, Stepper.
**Commerce:** ProductCard (default/compact/horizontal), ProductGrid, ProductRail, ProductCover, Price, DiscountBadge, Rating, ProductMeta, ProductActions, WishlistButton, CartItem, CartSummary, CouponInput, CheckoutStepper, PaymentMethodSelector, OrderSummary, PaymentStatusView, TrustRow.
**Library:** Shelf, BookSpine, BookStack, BookHover/BookPullout, LibrarySection, ContinueReadingCard, ReadingProgress, ReaderControls, ReaderToolbar.
**Content:** ArticleCard, CollectionCard, CategoryCard, AuthorCard, ReadingListCard, ResourceCard, LearningPathCard, QuoteBlock, SplitSection.
**Admin:** DataTable (search, filters, sort, pagination, bulk), FilterBar, MetricCard, ChartCard, StatusBadge, ActivityFeed, DetailDrawer, Wizard, PermissionGate, ConfirmDialog.
**System:** SystemState (variants), EmptyState, ErrorBoundaryView, Offline banner.

Each component ships with: variants, all states, a11y notes, a story/test page.

## 20. Product Card spec
Cover first (aspect 3:4), type badge (Book/Guide/Workbook/Bundle/Free), optional status badge (Bestseller/New/Updated/Limited), title (serif, 2-line clamp), short descriptor/category, rating (only if ≥1 review), price + struck original + discount, wishlist heart (top-right on cover), add-to-cart icon button. Hover: cover lift + `sh-2`. Do not overcrowd.

## 21. Product Detail composition (reference: Product Page sheet)
**Above fold:** left = vertical thumbnail rail + large cover (with "View Inside"); center = badge, serif H1, subtitle, rating row, tag chips, summary, 3 spec icons (pages · practicality · level); right = **sticky purchase card** (limited-offer strip *if real*, price block, Buy Now (primary), Add to Cart (secondary) + wishlist, trust list: Instant Download · Lifetime Access · Regular Updates · Secure Payment (Razorpay/Stripe) · money-back line).
**Below:** pill tab bar (anchors) → About + hero illustration + checklist + **Book Details** panel (pages, format, size, language, version, last updated, author, publisher, category, tags) → **Preview** reader with page thumbnails (Cover / Sample Pages / Chapter Example / Checklist Example) → 3 quick links (ToC / What's Inside / Sample Reader) + **Frequently Bought Together** → **What's Inside** grid → Reviews → FAQ accordion → You May Also Like → newsletter band → footer.

## 22. Accessibility (WCAG 2.2 AA target)
Semantic landmarks/headings · keyboard everything · visible focus · AA contrast · labels on all controls · accessible dialogs/menus/tabs/accordions (use Radix/Headless primitives) · form errors announced · reduced motion & transparency · never hover-only · skip-to-content · color is never sole status indicator · reader fully keyboard operable · images have meaningful alt (covers: "Cover of {title}").

## 23. Do / Don't summary

| Do | Don't |
|---|---|
| Reuse tokens & components | Add one-off colors/sizes |
| Use serif for headlines, sans for UI | Use serif in dense tables |
| Show real, server data | Hardcode "10K+ students" |
| Provide loading/empty/error for every screen | Ship blank states |
| Use glass on overlays | Glass on every card |

---

<!-- ===== FILE: docs/ARCHITECTURE.md ===== -->

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
| Jobs/queue | pg-boss / Inngest / BullMQ (decide) | Webhook retries, previews, emails, reconciliation |
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

---

<!-- ===== FILE: docs/DATABASE.md ===== -->

# Database — KRM.lib

## 1. Database Engine
**PostgreSQL** (≥ 15 recommended). ORM migrations required. Hosting: TBD (OQ-11).

## 2. Naming Conventions
- Tables: `snake_case`, **singular** (`product`, `order_item`). Prisma models PascalCase mapped via `@@map`.
- Columns: `snake_case`. Booleans `is_*`/`has_*`. Timestamps `*_at` (UTC `timestamptz`).
- PK: `id` — **UUIDv7/ULID** (sortable) as `text`/`uuid`. Public-facing human IDs are separate columns (`order_number`, `slug`).
- FK: `<entity>_id`, indexed, explicit `ON DELETE` rule.
- Every table: `created_at`, `updated_at`; soft-deletable tables add `deleted_at`.
- **Money:** integer **minor units** (`amount_minor`) + `currency` (ISO 4217, 3 chars). Never floats.
- Enums as Postgres enums or `text + CHECK`; documented below.

## 3. Entities (grouped)

> Notation: `*` required · `U` unique · `FK→` relation · `IDX` index. Derived values are **not stored** unless noted.

### 3.1 Identity & access
**user** — `id*, email* U (citext), email_verified_at, name, avatar_url, phone?, country?, locale, status* (active|locked|blocked|deleted), locked_until?, failed_login_count, last_login_at, referral_code U, referred_by_user_id? FK→user, deleted_at`
**account** (OAuth/credentials) — `id*, user_id* FK, provider* (credentials|google), provider_account_id*, password_hash?`, U(provider, provider_account_id)
**session** — `id*, user_id* FK, token_hash* U, ip, user_agent, device_label, created_at, last_seen_at, expires_at*, revoked_at?` IDX(user_id), IDX(expires_at)
**verification_token** — `id*, user_id? , identifier*, token_hash* U, purpose* (email_verify|password_reset|email_change|gift_claim), expires_at*, used_at?`
**two_factor** — `user_id* U FK, secret_encrypted*, enabled_at?, last_used_at?`
**recovery_code** — `id*, user_id* FK, code_hash*, used_at?`
**trusted_device** — `id*, user_id* FK, token_hash*, expires_at*` (2FA "remember 30 days")
**login_attempt** — `id*, identifier, user_id?, ip, success, reason, created_at` IDX(identifier, created_at)
**address** — `id*, user_id* FK, full_name, line1, line2?, city, state, postal_code, country*, is_default_billing`

### 3.2 Admin & RBAC
**admin_user** — `user_id* U FK→user, status, require_2fa* default true, last_admin_login_at`
**admin_role** — `id*, key* U (super_admin|catalog_manager|finance|support|content_editor|analyst), name, description, is_system`
**permission** — `key* U` (e.g., `products.read`) , `description`
**role_permission** — `role_id* FK, permission_key* FK` PK(both)
**admin_user_role** — `admin_user_id* FK, role_id* FK` PK(both)
**audit_log** — `id*, actor_user_id? FK, actor_type (admin|system|customer), action* (e.g., product.publish), entity_type, entity_id, before jsonb?, after jsonb?, ip, user_agent, created_at` IDX(entity_type, entity_id), IDX(actor_user_id, created_at). **Append-only.**
**security_event** — `id*, type* (webhook_sig_fail|rate_limited|blocked_login|permission_denied|…), severity, user_id?, ip, meta jsonb, created_at`

### 3.3 Catalog
**product** — `id*, type* (book|guide|workbook|bundle|free_resource|collection_product?), title*, subtitle?, slug* U, short_description, description (rich), cover_asset_id* FK→asset, spine_color* , spine_texture?, status* (draft|in_review|published|unpublished|archived), published_at?, primary_category_id FK, author_id? FK→author (see product_author for many), publisher, language* default 'en', page_count?, license_id? , seo_title?, seo_description?, og_asset_id?, is_featured, owner_type* (house|creator) default 'house', owner_id?, search_vector tsvector, deleted_at` IDX(status, published_at desc), IDX(type), GIN(search_vector), trigram on title
**product_version** — `id*, product_id* FK, version* (semver-ish text), changelog, status* (draft|published|superseded), released_at?, is_current* , page_count, ` U(product_id, version); **exactly one current published version per product** (partial unique index)
**product_file** — `id*, product_version_id* FK, kind* (pdf|fillable_pdf|external_link|zip), storage_key? (private), external_url_encrypted?, size_bytes, checksum_sha256, mime, page_count?` — private key never serialized to clients
**product_preview** — `id*, product_id* FK, kind* (cover|sample_page|chapter_example|checklist_example), page_number?, asset_id* FK, position, watermark_applied* bool`
**product_price** — `id*, product_id* FK, currency*, amount_minor*, compare_at_minor?, starts_at?, ends_at?` U(product_id, currency, starts_at); **price list per currency (OQ-8)**
**asset** — `id*, kind (image|pdf|doc), storage_key*, bucket (public|private), width?, height?, alt?, blurhash?, size_bytes, created_by`
**category** — `id*, slug* U, name, description, parent_id? FK→category, cover_asset_id?, position, is_active, seo_*`
**product_category** — `product_id* FK, category_id* FK` PK(both)
**tag** / **product_tag** — `tag(id, slug U, name)`; `product_tag(product_id, tag_id)`
**author** — `id*, slug* U, name, bio, avatar_asset_id?, user_id? FK (optional link), is_active`
**product_author** — `product_id, author_id, role, position`
**toc_entry** — `id*, product_id* FK, position, title, page_number?, parent_id?`
**product_inside_item** — `id*, product_id* FK, position, title, description, icon` (what's inside blocks)
**product_faq** — `id*, product_id* FK, position, question, answer`
**product_spec** *(optional)* — free-form key/value highlights
**license** — `id*, key U, name, body_ref` (placeholder text, OQ-5)

### 3.4 Collections, bundles, learning paths
**collection** *(editorial, C3)* — `id*, slug* U, title, description, cover_asset_id, status, category_id?, linked_bundle_product_id? FK→product, position, published_at, seo_*`
**collection_item** — `collection_id, product_id, position, note?` PK(collection_id, product_id)
**bundle_item** — `bundle_product_id* FK→product(type=bundle), product_id* FK→product, position` — bundle price comes from its own `product_price`; **savings are derived** (sum of items − bundle price), not stored
**learning_path** — `id*, slug U, title, description, duration_label?, status, cover_asset_id, position`
**learning_path_step** — `id*, learning_path_id, position, product_id? , article_id?, title, note`
**reading_list** — `id*, slug U, title, description, status, curated_by?` + **reading_list_item**

### 3.5 Commerce
**cart** — `id*, user_id? FK, guest_token? U (hashed), currency*, coupon_id?, status (active|merged|converted|abandoned), expires_at?, updated_at` — **one active cart per user** (partial unique)
**cart_item** — `id*, cart_id* FK, product_id* FK, added_at, saved_for_later bool` U(cart_id, product_id) — **no quantity column** (C2)
**order** — `id*, order_number* U (KRM-######, from sequence), user_id? FK (null for guest), guest_email?, status* (pending_payment|payment_pending|paid|failed|cancelled|refunded|partially_refunded|disputed), currency*, subtotal_minor, discount_minor, tax_minor, total_minor, billing_country, billing_address jsonb (snapshot), coupon_code_snapshot?, referral_id?, placed_at, paid_at?, idempotency_key* U, ip` IDX(user_id, placed_at desc), IDX(status)
**order_item** — `id*, order_id* FK, product_id* FK, product_version_id FK (purchased version), title_snapshot, type_snapshot, unit_price_minor*, compare_at_minor?, discount_minor, tax_minor, is_gift bool`
**payment** — `id*, order_id* FK, provider* (razorpay|stripe), provider_order_ref? (rzp order_id / stripe pi), provider_payment_ref?, status* (created|processing|requires_action|pending_verification|succeeded|failed|cancelled|refunded|partially_refunded|disputed), amount_minor, currency, method?, failure_code?, failure_message? (internal), verified_at?, idempotency_key* U, metadata jsonb` U(provider, provider_order_ref)
**payment_transaction** — `id*, payment_id* FK, type* (charge|refund|dispute|adjustment|fee), provider_txn_ref* , amount_minor, currency, status, raw jsonb (redacted), occurred_at` U(provider, provider_txn_ref, type)
**webhook_event** — `id*, provider*, event_id* , type, signature_valid bool, payload jsonb, status* (received|processed|failed|ignored), attempts, processed_at?, error?, received_at` **U(provider, event_id)** — idempotency anchor
**refund** — `id*, order_id* FK, payment_id FK, requested_by_user_id?, status* (requested|approved|processing|completed|rejected|failed), reason, amount_minor, currency, provider_refund_ref?, decided_by_admin_id?, completed_at?`
**dispute** — `id*, payment_id FK, provider_dispute_ref U, status, reason, amount_minor, due_by?, evidence_submitted_at?`
**invoice** — `id*, order_id* U FK, invoice_number* U, issued_at, storage_key (private), legal_snapshot jsonb (seller & buyer details, tax breakdown)` — tax fields per OQ-2
**coupon** — `id*, code* U (citext), type* (percent|fixed), value, currency?, min_order_minor?, max_discount_minor?, usage_limit?, per_customer_limit?, starts_at?, ends_at?, is_active, is_stackable, applies_to jsonb (all|categories|products), campaign_id?`
**coupon_redemption** — `id*, coupon_id, order_id, user_id?, guest_email?, amount_minor, redeemed_at` (counts derived from here; no stored counters)
**discount_rule** — `id*, name, rule jsonb (conditions/effect), priority, starts_at?, ends_at?, is_active` (automatic deals)
**gift** — `id*, order_item_id* FK, sender_user_id?, recipient_name, recipient_email*, message?, claim_token_hash* U, status (pending|claimed|expired|revoked), claimed_by_user_id?, claimed_at?, expires_at`
**store_credit_ledger** — `id*, user_id* FK, delta_minor, currency, reason (referral_reward|refund_credit|admin_adjust|spend), ref_type, ref_id, created_at` (balance **derived** by SUM)
**tax_rate** — `id*, country, region?, rate_bps, applies_to, valid_from, valid_to` (configurable; OQ-2)

### 3.6 Ownership & reading
**library_item** — `id*, user_id* FK, product_id* FK, source* (purchase|gift|free|admin_grant), order_item_id? FK, granted_at*, revoked_at?, archived_at?, is_favorite, owned_version_id FK→product_version, last_opened_at?` **U(user_id, product_id)** — IDX(user_id, last_opened_at desc)
**reading_progress** — `id*, library_item_id* U FK, last_page, total_pages, percent (derived on read or cached w/ refresh), last_chapter_ref?, updated_at`
**bookmark** — `id*, library_item_id* FK, page, label?, created_at`
**reader_note** *(Later)* — `id, library_item_id, page, quote?, body, created_at`
**download_event** — `id*, user_id* FK, library_item_id* FK, product_version_id FK, status* (issued|completed|failed|denied), ip, user_agent, reason?, created_at` — **download count derived** from `issued/completed` rows
**product_update_notice** *(derivable)* — update availability computed: `library_item.owned_version_id != product.current_version_id`

### 3.7 Engagement
**wishlist_item** — `user_id, product_id, created_at` PK(user_id, product_id)
**recently_viewed** — `user_id, product_id, viewed_at` PK(user_id, product_id) (capped, pruned by job)
**review** — `id*, user_id* FK, product_id* FK, rating* (1–5 check), title?, body, status* (pending|approved|rejected|reported), is_verified_purchase (derived from library_item at write; stored snapshot ok), moderated_by?, moderated_at?, rejection_reason?` **U(user_id, product_id)**
**review_photo** — `review_id, asset_id, position`
**review_report** — `id, review_id, reported_by, reason, status`
**recommendation_cache** *(optional)* — `user_id, product_id, score, reason, computed_at`
**review aggregates** (`rating_avg`, `rating_count`) — **materialized/cached on product via job**, never trusted over source rows.

### 3.8 Marketing & growth
**referral** — `id*, referrer_user_id* FK, referred_user_id? FK, referred_email?, status (pending|signed_up|completed|rejected), order_id?, reward_ledger_id? FK, created_at`
**campaign** — `id*, name, type (promo|email|seasonal), starts_at, ends_at, status, banner_id?, metrics derived`
**email_campaign** — `id*, campaign_id?, subject, content_ref, audience jsonb, status (draft|scheduled|sending|sent), scheduled_at?, sent_at?` + **email_campaign_stat** (sent/open/click aggregates via job)
**affiliate** — `id*, user_id?, name, code* U, commission_bps, status, payout_info_encrypted?` ; **affiliate_click** `(id, affiliate_id, ip_hash, landed_at)`; **affiliate_conversion** `(id, affiliate_id, order_id U, commission_minor, status)`
**promo_banner** — `id*, title, asset_id, destination_url, placement*, starts_at?, ends_at?, status, campaign_id?`
**newsletter_subscriber** — `id*, email* U, status (pending|subscribed|unsubscribed), source, confirmed_at?, unsubscribed_at?`

### 3.9 Content / editorial
**article** — `id*, slug* U, title, excerpt, body (rich/MDX), cover_asset_id, author_id FK, status (draft|scheduled|published|archived), published_at?, seo_*, search_vector`
**article_category** + **article_category_link**; **topic** (tag-like) + **article_topic**; **article_product** *(links editorial to products)* `(article_id, product_id)`
**homepage_section** — `id*, key, type (hero|shelf|featured_collections|editorial|quote|newsletter|…), config jsonb, position, is_active, starts_at?, ends_at?`
**navigation_item** — `id*, menu (main|footer_company|footer_resources|footer_legal|…), label, href, position, parent_id?, is_active`
**site_social_link** — platform, url, position
**announcement** — `id*, type (promotion|news|system|general), title, body, starts_at, ends_at?, status`
**faq_entry** (site-level), **help_article** `(slug, title, body, category, status)`, **legal_page** `(slug, title, body, version, effective_at, status)`

### 3.10 Support
**support_ticket** — `id*, ticket_number U (CS-####), user_id? , email, category, subject, status (open|in_progress|waiting|resolved|closed), priority, assigned_admin_id?, order_id?, created_at, updated_at`
**support_message** — `id*, ticket_id FK, author_type (customer|admin|system), author_id?, body, attachments jsonb, created_at`

### 3.11 Platform
**notification** — `id*, user_id FK, type, title, body, href?, read_at?, created_at` IDX(user_id, read_at)
**email_log** — `id*, to_hash/to, template, provider_message_id, status, error?, created_at`
**setting** — `key* U, value jsonb, is_secret bool, updated_by, updated_at` (store, brand, currency, tax, downloads, refund window, SEO, feature flags incl. `creator_system_enabled`, `maintenance_mode`)
**job_run** — `id, name, status, attempts, last_error, started_at, finished_at`
**api_log / error_log** *(or external service)* — structured, retention-limited
**analytics_event** *(optional first-party sink)* — `id, name, user_id?, session_id, props jsonb, occurred_at` partitioned by month
**sequence** — `order_number_seq`, `invoice_number_seq`, `ticket_number_seq`

### 3.12 Creator (reserved, flagged)
`creator` (user_id U, display_name, bio, status pending|verified|rejected|suspended, payout_method_ref) · `creator_application` · `creator_verification_document` (storage_key private, type, status) · `creator_payout` (period, amount_minor, status, provider_ref) · `creator_earning_ledger` (order_item_id, share_bps, amount_minor). `product.owner_type='creator'`.

## 4. Key Relationships

```text
user 1─* account / session / address / order / library_item / wishlist_item / review / support_ticket
user 1─0..1 admin_user ─* admin_role ─* permission
product 1─* product_version 1─* product_file
product *─* category / tag / author
product 1─* product_price(currency) / product_preview / toc_entry / product_faq
product(bundle) 1─* bundle_item ─ product
collection *─* product (collection_item)
cart 1─* cart_item ─ product
order 1─* order_item ─ product(+version)
order 1─* payment 1─* payment_transaction        (Customer → Order → Payment → Provider → Transaction → Product)
order 1─* refund ; payment 1─* dispute ; order 1─0..1 invoice
order_item 1─0..1 gift ; order_item 1─0..1 library_item
library_item 1─1 reading_progress ; 1─* bookmark ; 1─* download_event
product 1─* review (U per user) ; article *─* product
```

## 5. Constraints (must be enforced in DB, not only code)

- **Unique:** `user.email`, `product.slug`, `category.slug`, `order.order_number`, `coupon.code`, `library_item(user_id, product_id)`, `review(user_id, product_id)`, `webhook_event(provider, event_id)`, `payment(provider, provider_order_ref)`, `cart_item(cart_id, product_id)`, one current version per product (partial unique), one active cart per user (partial unique), `idempotency_key` on order & payment.
- **Checks:** `rating BETWEEN 1 AND 5`; `amount_minor >= 0`; `currency` in allowed set; discount ≤ subtotal; `order.total = subtotal − discount + tax`.
- **FK rules:** orders/payments/invoices/audit_log are **never cascaded-deleted** (`RESTRICT`); cart/session/tokens cascade from user.
- **Publish integrity:** product can be `published` only if it has: current published version with a file, ≥1 price, cover, ≥1 category, ready previews (enforced in service + deferred trigger/CHECK where feasible).

## 6. Indexes (with reasons)

| Index | Reason |
|---|---|
| `product(status, published_at desc)` | Home/new/popular lists |
| `product(type, status)` | Books/Guides/Workbooks listings |
| GIN `product.search_vector`, trigram `product.title` | Search & suggestions |
| `product_category(category_id, product_id)` | Category pages |
| `product_price(product_id, currency)` | Pricing lookup |
| `order(user_id, placed_at desc)` | My Orders |
| `order(status, placed_at)` | Admin lists, reconciliation |
| `payment(status, updated_at)` | Reconciliation job |
| `library_item(user_id, last_opened_at desc)` | Continue reading |
| `download_event(user_id, library_item_id, created_at)` | Limits/history |
| `review(product_id, status, created_at desc)` | Product reviews |
| `session(user_id)`, `session(expires_at)` | Session mgmt/cleanup |
| `audit_log(entity_type, entity_id)` | Audit lookups |
| `notification(user_id, read_at)` | Unread badge |

## 7. Data Validation
Zod schemas are the single validation source (shared by forms and API). DB constraints are the last line of defense. Examples: slug `^[a-z0-9]+(?:-[a-z0-9]+)*$`; email normalized lowercase; password policy (≥ 8 chars, letter + number; reject known-breached when feasible); `spine_color` valid hex; review body ≤ 500; coupon code `^[A-Z0-9_-]{3,32}$`; file uploads per SECURITY §8.

## 8. Soft Delete
Yes for: `user` (anonymize on request, keep orders), `product` (archive ≠ delete; never delete products with orders), `review`, `article`, `collection`. **Never soft-delete** financial/audit records — they are immutable (corrections via adjusting records).

## 9. Auditing
Record `created_by/updated_by` on admin-managed content tables where useful. **All admin mutations** write `audit_log` (actor, action, entity, before/after). Payment/refund state changes also create `payment_transaction` rows. Activity history for customers derived from orders/downloads/sessions/tickets.

## 10. Sensitive Data

| Field | Protection |
|---|---|
| `password_hash` | Argon2id; never selected by default |
| `two_factor.secret` | Encrypted at rest (app-level key) |
| `recovery_code.code_hash`, `token_hash`, `session.token_hash` | Hashed only |
| `affiliate.payout_info`, `external_url` (protected links) | Encrypted at rest |
| Billing address, phone, IP | Minimize; redact in logs; retention policy |
| Provider raw payloads | Redact card/PII fields before storing |
| `product_file.storage_key` | Never returned to clients |

## 11. Migration Rules
1. Every schema change = migration file, reviewed, in VCS.
2. Backward-compatible by default (expand → migrate → contract) — no destructive change without a documented plan.
3. Tested on a copy with seed data; rollback path noted.
4. Never edit applied migrations.
5. Update this document in the same PR.
6. Financial tables: additive only.

## 12. Seed Data
Provide `seed:demo` (clearly labeled **DEMO DATA**, never production): sample categories (Productivity, Self Improvement, Career, Business, Finance, Student, Health, Lifestyle, Tech & Design — taken from the mockups), a handful of demo products of each type with generated covers (title + `spine_color`), demo collections/bundles, demo admin users per role, demo coupons, and demo orders. **No fake testimonials, reviews presented as real, or fake customer statistics** (master §77). `seed:minimal` creates only roles/permissions, settings defaults and legal placeholders — safe for production.

---

<!-- ===== FILE: docs/API.md ===== -->

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

---

<!-- ===== FILE: docs/SECURITY.md ===== -->

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

---

<!-- ===== FILE: docs/CODE_STYLE.md ===== -->

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

---

<!-- ===== FILE: docs/TESTING.md ===== -->

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

---

<!-- ===== FILE: docs/AGENTS.md ===== -->

# AI Coding Agent Instructions — KRM.lib

*(Mirror this file into the root `AGENTS.md`, and into `CLAUDE.md` / `.cursorrules` / tool-specific rule files if your tool requires one. Keep this document as the single source.)*

## 1. Project Context
**Project:** KRM.lib — *Knowledge · Resource · Management*.
**Purpose:** Premium digital publishing & knowledge-commerce platform: public storefront, customer library/reader, admin back-office, reserved creator system. It must feel like **a curated digital library that happens to have an exceptional ecommerce system underneath** — not a generic ecommerce template.
**Primary users:** Readers (India + global), guest buyers, admin operators; creators later.

## 2. Source of Truth (read before significant work)
Priority order:
1. Existing working functionality in the repo (don't break it — integrate new UI into it)
2. UI/UX reference images in `docs/source/reference/`
3. Page architecture (if provided) → else `ARCHITECTURE.md` §6
4. These docs
5. Your own judgment — only for undefined details, and record it

Read: `SOURCES_CONFLICTS_GAPS.md` → `PRD.md` → `UX_FLOWS.md` → `DESIGN_SYSTEM.md` → `ARCHITECTURE.md` → `DATABASE.md` → `API.md` → `SECURITY.md` → `CODE_STYLE.md` → `TESTING.md`.
Original prompts live in `docs/source/` (Master Implementation Prompt; UI/UX Design System Prompt).

**Do not contradict these documents without first identifying the conflict and asking.**

## 3. Hard Rules (never violate)

**Security & correctness**
1. **Never trust the client** for prices, roles, ownership, payment success, or download permission.
2. Pricing/discount logic is **server-authoritative**, in the `pricing` module only.
3. **No fake payments, fake downloads, fake publish, fake checkout.** Real provider flows (Razorpay + Stripe) with signature verification and webhooks.
4. Paid files are **never** reachable by raw/guessable URL. All delivery through entitlement-checked signed/protected routes.
5. Never expose secrets to the client; never log secrets/PII.
6. Every admin mutation is permission-checked server-side **and** audit-logged.
7. Money is integer minor units + currency; **never hardcode ₹/$ or tax rates**.

**Product & design**
8. Preserve the KRM.lib identity (warm editorial library). **No generic SaaS/Shopify/Gumroad look. No blue/indigo/neon palettes.**
9. Use the design tokens and component inventory. **No arbitrary values, no one-off styles.**
10. Library is **data-driven** — never hardcode books. A published product must appear automatically.
11. Build **templates with states**, not hundreds of duplicate pages ("FEWER, BETTER, REUSABLE SYSTEMS").
12. If a page isn't in the references: find the closest KRM pattern, reuse and extend — don't invent a new visual language.
13. **Do not place the screenshots in the UI.** Recreate the interface.
14. Glass only on floating/overlay surfaces. Respect reduced motion/transparency.
15. **No fabricated data:** no lorem ipsum, fake testimonials, fake stats, fake "limited offer" countdowns. Demo data must be labeled as demo seed.
16. Quantity is always 1 for digital products (C2).

**Process**
17. Don't invent business requirements, database fields, APIs, components or patterns that are already defined — and don't guess where undefined: **ask or log an assumption**.
18. Don't rewrite working systems unnecessarily. Don't change unrelated files.
19. Avoid new dependencies unless justified (record in `DECISIONS.md`).

## 4. First Task Protocol (before large code changes) — master §82
1. Inspect the entire existing project (structure, routes, components, DB, APIs, auth, payments, storage, env vars).
2. Inspect all reference images (`docs/source/reference/`).
3. Read these docs end to end, especially the Conflicts & Gaps register.
4. Map the existing codebase against the required architecture.
5. Produce a **concise implementation plan** listing: existing functionality · components · routes · DB · APIs · auth · payments · storage · **missing functionality** · UI areas requiring redesign · architecture/security/performance risks · assumptions · questions.
6. **Stop and wait for approval.** Do not start rewriting everything.

## 5. Planning (non-trivial tasks)
1. Inspect relevant docs → relevant code
2. Identify affected files, modules, routes, components
3. Identify DB/API changes and migrations
4. Identify security implications
5. Identify tests needed (unit/integration/e2e/a11y)
6. Identify states needed (loading/empty/error/success/offline)
7. Write a short plan; **wait for approval** when the change is large, touches payments/auth/entitlements/schema, or conflicts with docs

## 6. Implementation Order (master §74)
Phase 1 Foundation → 2 Data → 3 Storefront → 4 Commerce → 5 Customer → 6 Admin → 7 Polish. Don't skip ahead; each phase leaves the app working and tested.

During implementation: smallest correct change · reuse patterns · preserve behavior · server components by default · lazy-load heavy parts · typed, validated boundaries · accessible by default · mobile recomposed intentionally.

## 7. Validation (after every task)
1. Run tests · 2. Lint · 3. Type check · 4. Build · 5. Review the full diff for unintended changes · 6. Look for regressions & security issues · 7. Verify loading/empty/error states, keyboard, mobile viewport · 8. For UI work, compare against the relevant reference image and note deliberate deviations.
Report: what changed · files · tests run + results · remaining issues · docs needing updates.

## 8. Documentation Upkeep

| If you change… | Update |
|---|---|
| Product behavior | `PRD.md`, `UX_FLOWS.md` |
| Visual tokens/components | `DESIGN_SYSTEM.md` |
| Structure/boundaries/routes | `ARCHITECTURE.md` |
| Schema | `DATABASE.md` (+ migration) |
| Endpoints/errors | `API.md` |
| Auth/payments/files/permissions | `SECURITY.md` |
| Conventions/tooling | `CODE_STYLE.md` |
| Test strategy/commands | `TESTING.md` |
| Env vars | `ENVIRONMENT.md` + `.env.example` |
| Technical decision | `DECISIONS.md` |
| Priorities | `ROADMAP.md` · Releases → `CHANGELOG.md` |

## 9. Conflict Handling
If requirements conflict (including between the two original prompts and the mockups): **do not guess.** Check `SOURCES_CONFLICTS_GAPS.md` for an existing proposed resolution; if absent, state the conflict, propose options with trade-offs, and ask. Log the outcome in `DECISIONS.md`.

## 10. Completion Criteria
A task is complete only when: requirements satisfied · tests pass · build/lint/types pass · states handled · a11y/mobile checked · security rules respected · no unintended changes · docs updated.

## 11. Communication Style
Be concise and specific. Surface risks early. Never claim something works without having run it. Distinguish **verified** from **assumed**. When something is a stub or unavailable, label it in the UI and in your report.

---

<!-- ===== FILE: docs/ENVIRONMENT.md ===== -->

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

---

<!-- ===== FILE: docs/ERROR_HANDLING.md ===== -->

# Error Handling — KRM.lib

Principles: **map technical errors to kind, specific user messages; log the technical detail internally; never leak stack traces, SQL, provider payloads or IDs.** Every error state belongs to the KRM design system.

## 1. API errors (see `API.md` §5)
| HTTP | Meaning | UI behavior |
|---|---|---|
| 400 | Validation | Inline field errors (`aria-describedby`) + summary if needed |
| 401 | Authentication required / session expired | Redirect to login or **Session Expired** page, preserve return URL & cart |
| 403 | Permission denied | **403 Access Forbidden** page (account/admin) |
| 404 | Not found | **404** page; resource-existence hiding for private resources |
| 409 | Conflict (already owned, duplicate, slug taken) | Contextual message with next action |
| 422 | Business rule (coupon etc.) | Specific message under the control |
| 429 | Rate limited | "Too many attempts" with retry time |
| 500 | Unexpected | **500 Server Error** page / toast with Try Again |
| 503 | Maintenance / unavailable | **Maintenance** page |

## 2. Branded system states
404 · 401 · 403 · 500 · Maintenance (with estimated time from settings) · Offline · Network Error · Something Went Wrong · Empty Search/Library/Orders/Wishlist/Cart — all through `SystemStateTemplate(variant)` with copy from the mockups' voice.

## 3. Payment errors (always say: state · what happened · charged? · next step · order status)
| Situation | User-facing message pattern | Order status | Next action |
|---|---|---|---|
| Payment failed | "We couldn't process your payment." + common reasons (insufficient balance, bank cancelled, network issue) | unpaid | Try Again / Choose different method |
| Cancelled by user | "You cancelled the payment. **No money has been deducted.**" | unpaid | Try Again / Back to Cart |
| Pending verification | "We're confirming your payment with your bank. This may take a few seconds." | `payment_pending` | Wait / "We'll email you" |
| Verification failed (signature/amount mismatch) | "We couldn't verify this payment. If money was deducted it will be refunded or confirmed shortly." + support link | flagged | Contact Support; auto-escalated |
| Success | "Order placed successfully" | paid | View My Library / Download |
| Order failed | "We couldn't complete your order. **No money has been deducted.**" (only if truly not charged) | failed | Try Again / Contact Support |

Never state "no money charged" unless the backend knows the payment is not captured.

## 4. Domain errors
| Case | Behavior |
|---|---|
| Coupon invalid / expired / not applicable / limit / min order | Distinct message per code |
| Product unavailable | Card shows "Unavailable"; cart item flagged with remove prompt |
| Already purchased | "Open in Library" CTA |
| Download limit / expired / unauthorized / missing file | Download center states with next action; missing file auto-creates an admin signal |
| Product updated | "Update available" badge → download new version |
| Refund requested / processing / completed | Status chips on order + notifications |

## 5. Network & loading
- Skeletons for data loads; button loading states; optimistic updates (wishlist, favorites) with rollback + toast on failure.
- Retry with backoff for idempotent GETs; explicit "Try Again" for others.
- **Offline:** detect `navigator.onLine`/fetch failures → Offline page/banner; queue-free (no offline purchases).

## 6. Third-party failures
| Dependency | Behavior |
|---|---|
| Razorpay/Stripe API | Graceful message, no duplicate order, retry; admin alert on elevated failures |
| Webhook delivery failure | Provider retries; our idempotent handlers + reconciliation job |
| Email provider | Queue with retry; never block purchase |
| Object storage | "File unavailable"; alert; no raw error |
| Google OAuth | Friendly fallback to email login |

## 7. Retry behavior
Jobs: exponential backoff (e.g., 1m, 5m, 30m, 2h, 12h) with dead-letter + admin visibility in System → Jobs. User retries: payment retry creates a new payment attempt on the same order.

## 8. Logging errors
Include `requestId`, user id (if any), module, error code, sanitized context. Stack traces → error tracker only. Show users the `requestId` on 500 pages ("Reference: req_…") to help support.

---

<!-- ===== FILE: docs/DEPLOYMENT.md ===== -->

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

---

<!-- ===== FILE: docs/OBSERVABILITY.md ===== -->

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

---

<!-- ===== FILE: docs/DECISIONS.md ===== -->

# Architecture Decisions — KRM.lib

Status legend: **Accepted** (stated in your source prompts) · **Proposed** (agent/author recommendation — needs your approval).

| ID | Title | Status | Decision | Reason / Trade-off |
|---|---|---|---|---|
| DEC-001 | Framework | **Proposed** | Next.js App Router + TypeScript strict | Master prompt implies server rendering, server/client components, metadata, sitemap. *Overridden if existing stack found (OQ-1).* |
| DEC-002 | Architecture style | **Proposed** | Modular monolith, service layer, ports/adapters | Transactional consistency; extractable modules |
| DEC-003 | Database | **Proposed** | PostgreSQL + Prisma | Relational integrity, FTS, strong constraints |
| DEC-004 | Authentication | **Proposed (open)** | Evaluate Better Auth vs Auth.js vs custom; must satisfy SECURITY §1 (esp. DB sessions, TOTP, lockout) | Don't commit until a short spike confirms 2FA + lockout + admin 2FA support |
| DEC-005 | Storage | **Proposed** | S3-compatible; private bucket for paid files, public/CDN for images | Signed URLs; portability |
| DEC-006 | Styling | **Proposed** | Tailwind + CSS-variable tokens + Radix primitives | Token-driven consistency + accessibility |
| DEC-007 | Search | **Proposed** | Postgres FTS + trigram behind `SearchPort` | Zero extra infra; swap later |
| DEC-008 | Jobs | **Proposed (open)** | pg-boss / Inngest / BullMQ — choose based on hosting | Webhook processing, previews, email, reconciliation |
| DEC-009 | PDF reading | **Proposed** | `pdfjs-dist` custom reader UI | Not a generic browser viewer |
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

*Template for new decisions:*
```text
## DEC-0XX — Title
Date: · Status: Proposed|Accepted|Superseded
Context: · Decision: · Alternatives: · Reason: · Consequences (positive / trade-off):
```

---

<!-- ===== FILE: docs/ROADMAP.md ===== -->

# Roadmap — KRM.lib

## NOW — Phase 0: Alignment (before code)
- Answer open questions OQ-1…OQ-16 (esp. OQ-1 codebase, OQ-2 tax, OQ-7 provider routing)
- Provide missing references (G1 page architecture, G3 admin marketing screens, G4 Home, G5 mobile)
- Approve proposed decisions DEC-001…017
- Agent produces the **First Task Protocol** implementation plan (AGENTS §4)

## NEXT (in master-prompt order)
1. **Phase 1 — Foundation:** project structure, tokens, typography, layout, navigation, core components, SystemState template
2. **Phase 2 — Data:** schema + migrations, auth (email/Google/verify/reset/2FA/lockout), catalog models, orders, RBAC base, settings, seed
3. **Phase 3 — Storefront:** Home (shelf), Explore, catalog lists, Product page template (+ preview), Search (command), Categories, Collections/Bundles, SEO
4. **Phase 4 — Commerce:** cart (guest/merge), pricing engine, coupons, checkout, **Razorpay + Stripe** (verify, webhooks, retry, refund architecture), orders, invoices
5. **Phase 5 — Customer:** account, My Library (shelf), downloads (signed), PDF reader, wishlist, reviews, recommendations, notifications

## LATER
6. **Phase 6 — Admin:** dashboard, products (11-step wizard, versions), orders/refunds, customers, payments/disputes/reconciliation, marketing, content/editorial, analytics, reviews, support, security, settings, system
7. **Phase 7 — Polish:** mobile recomposition, micro-interactions, loading/empty/error completeness, accessibility audit, performance budgets, SEO verification
8. Marketing extras: gifts, referral + store credit, affiliates, email campaigns, banners, newsletter
9. Editorial: Journal, learning paths, reading lists, brand pages, help center, support tickets

## DEFERRED
- Creator system (applications, verification, payouts)
- In-reader notes/highlights; interactive/fillable workbooks in-reader
- Per-buyer PDF watermarking
- Push notifications; additional currencies; external search engine
- Reader themes (paper/sepia/night)

## NOT PLANNED (this version)
Physical goods · subscriptions/memberships · native mobile apps · dark mode · multi-language UI · live chat support · DRM-grade protection

---

<!-- ===== FILE: docs/CHANGELOG.md ===== -->

# Changelog — KRM.lib

All notable changes are recorded here. Format: [Keep a Changelog](https://keepachangelog.com), semantic versioning.

## [Unreleased]

### Added
- Initial documentation system (17 documents) derived from Master Implementation Prompt v2.1, UI/UX Design System Prompt, and 12 UI mockup sheets.
- Source register with conflicts (C1–C12), gaps (G1–G10) and open questions (OQ-1–OQ-16).

### Changed
—

### Fixed
—

### Removed
—

---

<!-- ===== FILE: docs/APPENDIX_A_SCREEN_MAP.md ===== -->

# Appendix A — Reference Image → Screen → Route → Template Map

Use **screen names**, not numbers (C12). "Template" = the reusable implementation target (never one file per screen).

## A.1 `Cozy_Digital_Bookstore_Product_Page.png`
| Screen | Route | Template / components |
|---|---|---|
| Product detail (full page) | `/books/[slug]` (also guides/workbooks) | `ProductDetailTemplate` · PurchaseCard · PreviewReader · BookDetailsPanel · FrequentlyBoughtTogether · WhatsInside · ReviewsSection · FAQAccordion · ProductRail · NewsletterBand · Footer |

## A.2 `Cozy_Ecommerce_Checkout_UI_Moodboard.png`
| Screen | Route | Template |
|---|---|---|
| Cart · Cart Empty | `/cart` | `CartPage` · `EmptyState(cart)` |
| Wishlist · Wishlist Empty | `/account/wishlist` | `WishlistPage` · `EmptyState(wishlist)` |
| Checkout (Information) · Guest · Logged-in · Address/Billing | `/checkout` | `CheckoutTemplate(step=information, mode)` |
| Payment Selection | `/checkout` (step 2) | `PaymentMethodSelector` (Razorpay *Recommended*, Stripe) |
| Processing · Verification | `/checkout/processing` | `PaymentStatusTemplate(processing | verifying)` |
| Failed · Cancelled · Pending | `/checkout/failed|cancelled|pending` | `PaymentStatusTemplate(failed | cancelled | pending)` |
| Order Success · Order Pending · Order Failed · Order Confirmation ("Thank You") | `/checkout/success` etc. | `OrderResultTemplate(state)` |
| ⚠ one tile has a garbled label (looks like a duplicate payment-state) | — | Ignore/clarify; covered by Payment states |

## A.3 `Cozy_KRM_lib_Digital_Library_UI_Mockup.png`
| Screen | Route | Template |
|---|---|---|
| Categories overview | `/categories` | `CategoryIndex` · CategoryCard |
| Category (e.g., Productivity) with filters (sub-categories, format PDF/Fillable PDF/Notion, price, sort) | `/categories/[slug]` | `CatalogListTemplate` + FilterSidebar |
| Search results (tabs: All/Books/Workbooks/Guides/Collections; facets; rating) | `/search` | `CatalogListTemplate(search)` |
| Search empty state (suggested terms) | `/search` | `EmptyState(search)` |
| Search suggestions / Command Search (recent, popular) | overlay | `CommandSearch` (glass modal) |

## A.4 `Cozy_KRM_lib_Error_State_Showcase.png`
404 · 500 · 403 · 401 · Maintenance · Offline · Network Error · Something Went Wrong · Empty Search · Empty Library · Empty Orders · Empty Wishlist · Empty Cart → `SystemStateTemplate(variant)` / `EmptyState(variant)` (compact header variant).

## A.5 `KRM_lib_Cozy_Authentication_Storyboard.png`
| Screen | Route | Template |
|---|---|---|
| Login · Register · Continue with Google | `/login` `/register` | `AuthCardTemplate` (illustrated side panel) |
| Email Verification · Success · Failed | `/verify-email` | `AuthStatusTemplate(state)` |
| Forgot · Reset · Reset Success | `/forgot-password` `/reset-password` | `AuthCardTemplate` |
| Account Locked · Session Expired · Sign-out confirmation | `/login?state=locked|expired` · modal | `AuthStatusTemplate` · `ConfirmDialog` |
| 2FA Setup · 2FA Verification · 2FA Recovery | `/account/security` · `/2fa` · `/2fa/recovery` | `TwoFactorSetup` · `OTPInput` · `RecoveryMethods` |

## A.6 `KRM_lib_Cozy_Bookstore_Dashboard_Collection.png` (customer account)
Wishlist · Saved Products · Recently Viewed · Recently Purchased · Recommendations · My Reviews · Write Review (modal) · Edit Review (modal) · Review Submitted (modal) → `/account/wishlist`, `/account/saved`, `/account/recently-viewed`, `/account/purchases`, `/account/recommendations`, `/account/reviews` using `AccountListTemplate` (grid/list) + `ReviewDialog`.

## A.7 `KRM_lib_Cozy_Digital_Library_Dashboard.png` (signature library)
| Screen | Route | Template |
|---|---|---|
| Account Dashboard (greeting, stats, Continue Reading, Recent Additions, promo card) | `/account` | `AccountDashboard` · ContinueReadingCard |
| **My Library — Bookshelf view** | `/account/library` | **`Shelf` + `BookSpine`** (+ list toggle) |
| Book Detail in Library (progress, ToC/Notes/Highlights/Bookmarks tabs) | `/account/library/[id]` | `LibraryBookDetail` |
| **PDF Reader** (ToC panel, page toolbar) | `/read/[productId]` | `Reader` |
| Continue Reading overlay (recent chapters) | overlay | `ContinueReadingOverlay` (glass) |
| Recently Added · Recently Read · Favorites · Downloaded · Available Updates · Archived | `/account/library?view=…` | `LibrarySection` variants |

## A.8 `KRM_lib_Cozy_Bookstore_UI_Kit.png` (marketing)
Deals · Discounts · Bundles · Bundle Detail · Gift Products · Gift Checkout · Coupon · Referral · Referral Dashboard · Newsletter Signup → `/deals` `/discounts` `/bundles` `/bundles/[slug]` `/gift` `/checkout/gift` `/coupons` `/referral` `/account/referral` `/newsletter` (+ 2 ambient illustrations for banners/footers).

## A.9 `KRM_lib_Curated_Collections_Library.png`
Collections landing (hero + stats, category pills, Featured Collections, Browse by Category carousel, All Collections grid, "Build Your Own Collection" CTA) → `/collections` · `CollectionsTemplate` · CollectionCard.

## A.10 `KRM_lib_Analytics_Dashboard_Collage.png` (admin)
Analytics Dashboard · Sales · Revenue · Product · Customer · Conversion Funnel · Traffic · Download · Search · Coupon · Refund · Geographic · Device → `/admin/analytics/*` using `AdminDashboardTemplate` (Metric → trend → breakdown → table). **Recolor charts to the warm chart palette (C1).**

## A.11 `KRM_lib_Content_Management_Dashboard.png` (admin)
Content Dashboard · Blog Posts · Create/Edit Article · Categories · Authors · Collections · Learning Paths · Homepage Content · Navigation Management · Footer Management · Announcements → `/admin/content/*` using `AdminListTemplate` / `AdminFormTemplate`.

## A.12 `Creator_Dashboard_UI_Showcase.png` (future)
Creator Application · Dashboard · Products · Create Product · Orders · Revenue · Analytics · Payouts · Profile · Settings · Verification · Documents · Support → `/creator/*` **flag-gated; do not expose in v1.** Reuse admin templates.

## A.13 Surfaces required by the prompts but **not covered by any mockup** (see Gaps G1–G9)
Home · Explore · Books/Guides/Workbooks/New/Popular/Free Resources lists · Orders list/detail/invoice/refund request · Downloads center (full) · Notifications · Journal/Article/Topic/Author/Learning Path pages · Brand pages · Legal pages + Cookie preferences · Help Center/Article/Support tickets · Admin product wizard, orders, customers, payments, refunds, reviews, support, security, settings, system, marketing sub-pages · Mobile versions of everything · Email templates → extrapolate via the Design Consistency Rule.

---

<!-- ===== FILE: docs/APPENDIX_B_PROMPTS.md ===== -->

# Appendix B — Copy-Paste Prompts for the Agent

## B.1 Bootstrap prompt (use first)

```text
You are working on KRM.lib. Do NOT write application code yet.

Read everything in /docs (start with SOURCES_CONFLICTS_GAPS.md, then PRD, UX_FLOWS,
DESIGN_SYSTEM, ARCHITECTURE, DATABASE, API, SECURITY, CODE_STYLE, TESTING, AGENTS),
the two original prompts in /docs/source, and all reference images in
/docs/source/reference.

Then:
1. Inspect the existing repository completely (structure, routes, components, DB,
   APIs, auth, payments, storage, env vars). If it is empty, say so.
2. Summarize your understanding of the product in under 300 words.
3. List conflicts, gaps and missing information you found beyond the register.
4. Map the existing code against the required architecture.
5. Produce a concise implementation plan: existing vs missing functionality, UI areas
   needing work, architecture/security/performance risks, assumptions, and the exact
   questions you need answered.
6. Propose the Phase 1 scope and the file/folder structure you will create.

Do not modify anything. Wait for my approval.
```

## B.2 Phase kickoff prompt

```text
Begin PHASE [N — NAME] from ROADMAP.md.

Before changing code:
1. Re-read the relevant docs and reference images for this phase.
2. Inspect the current code that this phase touches.
3. List affected files/modules/routes/components, DB and API changes, security
   considerations, tests required, and states (loading/empty/error) needed.
4. Present a short plan and wait for approval.

After approval: implement the smallest correct change per step, reuse components
and tokens, follow the design system, keep server logic authoritative, and add tests.

When done: run tests, lint, typecheck, build; review the diff; verify mobile/keyboard;
report what changed, tests run, results, remaining issues, and docs to update.
```

## B.3 Feature prompt

```text
I want to add this feature: [FEATURE]

Before changing code:
1. Read the relevant docs; say which documents are affected.
2. Inspect the existing implementation and explain the current architecture for it.
3. Identify frontend files, backend/API files, DB changes, security considerations,
   tests required, and which reference image/pattern it should inherit from.
4. Create an implementation plan. Do not modify unrelated parts.

After approval, implement, then run tests/lint/typecheck/build, review the diff,
and update docs.
```

## B.4 UI screen prompt (design-consistency)

```text
Implement the screen: [SCREEN NAME] at route [ROUTE].

1. Identify the matching reference image and the closest existing KRM component/pattern.
2. Reuse tokens, components, spacing, typography, radius, shadows, interaction patterns.
3. Build it as a template/state, not a one-off page.
4. Provide loading, empty, error, and (if relevant) success/offline states.
5. Recompose for mobile (not a shrunken desktop): bottom sheets, sticky CTAs, rails.
6. Use real data from the service layer — no hardcoded content, no fake numbers.
7. Verify keyboard, focus, contrast, reduced-motion.
Do not embed the screenshot. Report deliberate deviations from the reference.
```

## B.5 Payment work prompt

```text
Implement/modify the payment flow for [Razorpay | Stripe].

Requirements: server computes amounts; idempotency keys; create provider order/intent
on the server; verify signature AND provider status; webhook with raw-body signature
verification and unique-event idempotency; handle success/failed/cancelled/pending/
retry/refund/dispute/reconciliation; never mark paid from client callback alone;
amount+currency match check; redacted logs; tests for each state and replay.

First show the plan and the state-transition table. Do not use mocked success.
```

## B.6 Code review prompt

```text
Review the changes you just made as a senior engineer. Do not modify anything yet.

Check: requirement mismatches, architecture/layer violations, duplicate logic,
unnecessary abstractions, security (authz/IDOR, price/role trust, file exposure,
secrets, logging), database issues, API inconsistencies, accessibility, responsive
issues, missing loading/empty/error states, missing tests, regressions, unnecessary
dependencies, unintended file changes, deviations from the reference images.

Compare against /docs. Output: 1) Findings 2) Severity 3) Recommended fixes
4) Docs to update.
```

## B.7 Docs-update prompt

```text
Review whether your last implementation changed any documented requirements,
architecture, schema, API contracts, security rules, conventions, env vars, or
decisions. If yes, update the matching /docs files (and .env.example, CHANGELOG),
and list exactly what you changed.
```

---

<!-- ===== FILE: docs/APPENDIX_C_READINESS.md ===== -->

# Appendix C — "Before You Write the First Line of Code" Checklist (Current Status)

✅ done in this documentation · 🟡 proposed — needs your approval · ❌ needs your input

### PRODUCT
- ✅ Product idea defined · ✅ Problem defined · ✅ Target users defined · ✅ User stories · ✅ Core features · ✅ Non-goals
- 🟡 MVP/release slicing (OQ-16)

### UX
- ✅ Major flows mapped · ✅ Loading/empty/error/success states defined (matrix)
- ❌ Home, mobile, orders, editorial, most admin screens unmocked (G4–G8)

### DESIGN
- 🟡 Colors (calibrate against images) · 🟡 Typography (font choice) · ✅ Spacing · ✅ Radius/shadows/motion · ✅ Components inventory · ✅ Responsive rules · ✅ Accessibility
- ❌ Asset pipeline for covers/illustrations (OQ-12)

### TECHNICAL
- 🟡 Tech stack (DEC-001…009) · ✅ Architecture · ✅ Project structure · ✅ Data flow · ✅ Database schema (v0.1) · ✅ API contracts (v0.1)
- ❌ Existing codebase check (OQ-1) · ❌ Page architecture list (G1) · ❌ Hosting (OQ-11)

### SECURITY
- ✅ Authentication/authorization requirements · ✅ Secrets strategy · ✅ Sensitive data identified · ✅ API & file security · ✅ Payment security
- ❌ Tax/legal/retention specifics (OQ-2, OQ-5)

### CODE
- ✅ Naming · ✅ Folder conventions · ✅ Formatting/linting · ✅ Error handling · ✅ Logging

### TESTING
- ✅ Critical flows · ✅ Strategy · ✅ Tools (proposed) · ✅ Definition of done · ✅ Payment test matrix

### AI
- ✅ AGENTS.md · ✅ Workflow & prompts · ✅ Source of truth & conflict handling · ✅ Validation process · ✅ Documentation update process

---

**Next step for you:** answer the ❌ items (at minimum OQ-1, OQ-2, OQ-7, OQ-11 and the missing mockups G1/G3/G4), approve or change the 🟡 proposals in `DECISIONS.md`, then send the **Bootstrap Prompt (B.1)** to your agent.

*Build faster. Guess less.*

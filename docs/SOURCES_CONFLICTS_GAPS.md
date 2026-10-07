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

### 3.1 Gap status update — 33 sheets received (4 Oct 2026)

This register was first written against 12 sheets. The repository now holds **33 sheets in `UIUX/`** (~330 numbered screens). Updated status:

| Gap | Status | Now covered by |
|---|---|---|
| G1 page architecture | Partially covered | The screen numbering across all 33 sheets (1–330) acts as the page architecture; route map in `ARCHITECTURE.md` §6 stays authoritative for URLs |
| G2 existing codebase | Resolved | Greenfield — no application code existed |
| G3 admin marketing | **Covered** | `KRM.lib Marketing Dashboard UI Collage.png` (Coupons, Create/Edit Coupon, Discount Rules, Bundles, Campaigns, Email Campaigns, Referral Program, Affiliates, Promotional Banners) |
| G4 home | **Covered** | `KRM.lib_ A Cozy Digital Knowledge Library.png` (full home), `KRM.lib Digital Library UI Showcase.png` (Home, Explore, Books, Guides, Workbooks, Collections, New Releases, Popular, Free Resources) |
| G5 mobile | **Covered** | `Mobile Marketplace UI_UX Showcase.png` (Mobile Home … Filter Drawer, Product Preview). Its purple CTAs are overridden by C1 (amber/espresso) |
| G6 orders/invoice/refund (customer) | Partially covered | Order states in `Cozy Ecommerce Checkout UI Moodboard.png`; admin-side order/invoice/refund in `KRM.lib Order Management Dashboard.png` — customer views extrapolate from these |
| G7 editorial, brand, legal, help, tickets | **Covered** | `KRM.lib Editorial Dashboard Collection.png`, `KRM.lib_ A Cozy Digital Library Website.png` (brand pages), `KRM.lib Legal Policy UI Collection.png`, `KRM.lib Help Center UI Kit.png` |
| G8 admin areas | **Covered** | `Store Analytics Dashboard` (admin home), `Products Admin Dashboard Collage` (incl. create/edit/versions/uploads/SEO/pricing), `Order Management`, `Customer Dashboard Collection`, `Payments Admin Dashboard Montage`, `Review Management`, `Support Admin Dashboard Composite`, `Settings Dashboard Grid`, `System Monitoring Dashboard` |
| Customer account extras | **Covered** | `KRM.lib Download Center UI Mockup.png`, `KRM.lib Warm Account Settings UI Kit.png`, `KRM.lib Workbooks Collection.png`, `KRM.lib Curated Collections Library.png` |
| G9 email templates | Open | Reuse brand tokens |
| G10 art assets | Open (OQ-12) | Generated covers from title + `spineColor` in dev |

Additional conflicts found in the new sheets:
- **C13 Brand Settings colours** — the Brand Settings mockup shows primary `#7C3AED` (purple). Overridden by C1; tokens in `DESIGN_SYSTEM.md` §3 win.
- **C14 Language/Currency settings** — Account Settings shows English/Malayalam/Hindi and INR/USD/EUR/GBP. v1 ships English UI only (PRD non-goal) and INR + USD; extra options are hidden until supported rather than shown non-functional.
- **C15 Database Status screen** names MongoDB — illustrative only; DEC-003 (PostgreSQL) applies.

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

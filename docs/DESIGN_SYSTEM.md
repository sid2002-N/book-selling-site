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

## 24. Implementation notes (M1, 4 Oct 2026)

- **Tokens:** `src/styles/tokens.css` (CSS variables) → Tailwind theme in `src/app/globals.css` (`@theme inline`). Default Tailwind colours, radii, shadows and breakpoints are reset, so only KRM tokens exist.
- **Utility names:** `bg-canvas`/`bg-canvas-subtle`/`bg-surface`/`bg-surface-raised`, `border-line`/`border-line-strong`, `text-fg`/`text-fg-secondary`/`text-fg-muted`/`text-fg-on-ink`, `bg-ink`, `accent`, `terracotta`, `plum`, status colours, `chart-1…7`. Type: `text-display|h1|h2|h3|h4|body-lg|body|body-sm|caption|label|micro|price`. Radius: `rounded-cover|sm|md|lg|xl|full`. Shadow: `shadow-1|2|3`. Motion: `duration-fast|normal|slow`, `ease-out-soft`, `animate-fade-in|rise-in|sheet-up|shimmer`.
- **Spacing:** Tailwind's 4px base unit (`p-1` = 4px … `p-32` = 128px) implements §5; the §5 named steps map to `1, 2, 3, 4, 6, 8, 12, 16, 24, 32`.
- **Breakpoints:** `sm` ≥375 · `md` ≥640 · `lg` ≥1024 · `xl` ≥1280 · `2xl` ≥1536 (min-width, matching §14 names). `touch:` variant = `(pointer: coarse)`.
- **Fonts:** Fraunces (display/headings, `opsz` + `SOFT` axes) and Inter (UI), via `next/font`.
- **Glass:** `glass` utility with solid fallbacks for no `backdrop-filter` and `prefers-reduced-transparency`.
- **Library:** `src/components/library/` — `Shelf` (greedy row packing from deterministic spine widths, `content-visibility` rows, list-view fallback, pull-out dialog/sheet), `BookSpine`, `BookCover` (generated typographic cover until real cover assets exist). Geometry/contrast helpers in `src/lib/spine.ts`.
- **System states:** `SystemState` (`src/components/system/`) covers every §13 variant; illustration slots are calm motif compositions until final scene art is commissioned (OQ-12).
- **Dev gallery:** `/dev/components` (not available in production).

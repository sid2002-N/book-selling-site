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

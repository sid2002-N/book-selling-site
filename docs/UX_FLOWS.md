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

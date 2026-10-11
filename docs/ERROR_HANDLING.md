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

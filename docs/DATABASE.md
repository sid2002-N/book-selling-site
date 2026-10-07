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

## 13. Implementation notes (M2, 4 Oct 2026)

Schema: `prisma/schema.prisma`. Hand-written SQL: `prisma/migrations/*_init` (extensions `citext`, `pg_trgm`; sequences `order_number_seq`, `refund_number_seq`, `invoice_number_seq`) and `*_integrity_and_search` (CHECK constraints, append-only `audit_log` trigger, `product.search_vector` trigger + GIN index). Prisma does not manage CHECKs/triggers, so later migrations never drop them; `prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma` must stay empty.

Deliberate simplifications of §3 that keep the same guarantees without partial indexes:
- **One current version per product** → `product.current_version_id` (unique FK) instead of `product_version.is_current` + partial unique index.
- **One active cart per user** → `cart.user_id` unique; carts are emptied on checkout instead of being marked `converted`; guest carts are merged and deleted on login.
- **Order total** → tax-inclusive pricing (DEC-028): `total_minor = subtotal_minor − discount_minor`.
- **Session** adds `two_factor_passed` and `absolute_expires_at` (idle + absolute expiry, SECURITY §1).
- **Refund numbers** use `RFD-####` from `refund_number_seq`; invoices `INV-######`.
- `product.rating_avg` / `rating_count` are cached aggregates refreshed by the reviews service.

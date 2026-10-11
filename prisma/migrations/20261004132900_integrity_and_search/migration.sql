-- Integrity rules enforced in the database, not only in code (docs/DATABASE.md §5).
-- Prisma does not manage CHECK constraints or triggers, so they live here.

-- Money is never negative.
ALTER TABLE "product_price" ADD CONSTRAINT product_price_amount_nonneg CHECK (amount_minor >= 0 AND (compare_at_minor IS NULL OR compare_at_minor >= 0));
ALTER TABLE "order" ADD CONSTRAINT order_amounts_nonneg CHECK (subtotal_minor >= 0 AND discount_minor >= 0 AND tax_minor >= 0 AND total_minor >= 0);
ALTER TABLE "order" ADD CONSTRAINT order_discount_le_subtotal CHECK (discount_minor <= subtotal_minor);
-- Tax-inclusive pricing: total = subtotal − discount; tax is reported inside the total.
ALTER TABLE "order" ADD CONSTRAINT order_total_equation CHECK (total_minor = subtotal_minor - discount_minor);
ALTER TABLE "order_item" ADD CONSTRAINT order_item_amounts_nonneg CHECK (unit_price_minor >= 0 AND discount_minor >= 0 AND tax_minor >= 0);
ALTER TABLE "payment" ADD CONSTRAINT payment_amount_nonneg CHECK (amount_minor >= 0);
ALTER TABLE "refund" ADD CONSTRAINT refund_amount_positive CHECK (amount_minor > 0);
ALTER TABLE "coupon_redemption" ADD CONSTRAINT coupon_redemption_amount_nonneg CHECK (amount_minor >= 0);

-- Coupons.
ALTER TABLE "coupon" ADD CONSTRAINT coupon_value_valid CHECK (
  (type = 'percent' AND value BETWEEN 1 AND 100) OR (type = 'fixed' AND value > 0 AND currency IS NOT NULL)
);
ALTER TABLE "coupon" ADD CONSTRAINT coupon_code_format CHECK (code ~ '^[A-Za-z0-9_-]{3,32}$');
ALTER TABLE "coupon" ADD CONSTRAINT coupon_window_valid CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at);

-- Reviews.
ALTER TABLE "review" ADD CONSTRAINT review_rating_range CHECK (rating BETWEEN 1 AND 5);
ALTER TABLE "review" ADD CONSTRAINT review_body_length CHECK (char_length(body) <= 500);

-- Catalog.
ALTER TABLE "product" ADD CONSTRAINT product_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
ALTER TABLE "product" ADD CONSTRAINT product_spine_color_hex CHECK (spine_color ~ '^#[0-9A-Fa-f]{6}$');
ALTER TABLE "category" ADD CONSTRAINT category_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
ALTER TABLE "collection" ADD CONSTRAINT collection_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
ALTER TABLE "tax_rate" ADD CONSTRAINT tax_rate_range CHECK (rate_bps BETWEEN 0 AND 10000);

-- Reading progress.
ALTER TABLE "reading_progress" ADD CONSTRAINT reading_progress_pages_valid CHECK (last_page >= 1 AND total_pages >= 1 AND last_page <= total_pages);

-- A bundle cannot contain itself.
ALTER TABLE "bundle_item" ADD CONSTRAINT bundle_item_not_self CHECK (bundle_product_id <> product_id);

-- Audit log is append-only.
CREATE OR REPLACE FUNCTION audit_log_immutable() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only';
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER audit_log_no_update BEFORE UPDATE OR DELETE ON "audit_log"
  FOR EACH ROW EXECUTE FUNCTION audit_log_immutable();

-- Full-text search vector for products (title > subtitle > descriptions).
CREATE OR REPLACE FUNCTION product_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.subtitle, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.short_description, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER product_search_vector_trg BEFORE INSERT OR UPDATE OF title, subtitle, short_description, description
  ON "product" FOR EACH ROW EXECUTE FUNCTION product_search_vector_update();
CREATE INDEX product_search_vector_idx ON "product" USING GIN (search_vector);

-- Rename discount_codes table to coach_coupons
ALTER TABLE IF EXISTS discount_codes RENAME TO coach_coupons;

-- Rename index
ALTER INDEX IF EXISTS idx_discount_codes_coach_id RENAME TO idx_coach_coupons_coach_id;

-- Update RLS policy names
ALTER POLICY IF EXISTS "Coaches can manage own discount codes" ON coach_coupons RENAME TO "Coaches can manage own coupons";

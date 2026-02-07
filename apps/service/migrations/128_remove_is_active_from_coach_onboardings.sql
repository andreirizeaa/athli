-- Onboardings are always active, so remove the is_active column
ALTER TABLE "public"."coach_onboardings" DROP COLUMN IF EXISTS "is_active";

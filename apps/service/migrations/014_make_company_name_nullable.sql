-- ================================================
-- Make company_name nullable in coach_company_information
-- ================================================

ALTER TABLE public.coach_company_information ALTER COLUMN company_name DROP NOT NULL;

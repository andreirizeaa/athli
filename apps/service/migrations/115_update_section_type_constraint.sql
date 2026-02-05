-- ================================================
-- Migration 115: Update Section Type Constraint
-- ================================================
-- Purpose: Replace 'timed' with 'tabata', 'hiit', 'emom' and keep 'circuits'
-- New allowed types: regular, amrap, tabata, hiit, emom, circuits

-- ================================================
-- STEP 1: Delete all existing rows
-- ================================================

DELETE FROM public.coach_sections;

-- ================================================
-- STEP 2: Drop existing check constraint
-- ================================================

ALTER TABLE public.coach_sections
DROP CONSTRAINT IF EXISTS coach_sections_section_type_check;

-- ================================================
-- STEP 3: Add new check constraint with updated types
-- ================================================

ALTER TABLE public.coach_sections
ADD CONSTRAINT coach_sections_section_type_check
CHECK (section_type IN ('regular', 'amrap', 'tabata', 'hiit', 'emom', 'circuits'));

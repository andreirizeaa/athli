-- ================================================
-- Migration 069: Create Coach Sections Table
-- ================================================
-- Purpose: Create a new table for reusable workout sections
-- - Coaches can create pre-built sections (AMRAP, Timed, Circuits, etc.)
-- - Each section contains exactly one section type with exercises
-- - Sections can be reused across multiple workouts

-- ================================================
-- STEP 1: Create coach_sections table
-- ================================================

CREATE TABLE public.coach_sections (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL,

  name TEXT NOT NULL,
  description TEXT,

  -- Section Type: regular, amrap, timed, circuits
  section_type TEXT NOT NULL CHECK (section_type IN ('regular', 'amrap', 'timed', 'circuits')),

  -- Flexible Section Structure (Single section with exercises)
  -- This follows the same WorkoutData structure but contains exactly one section
  section_data JSONB NOT NULL DEFAULT '{"items": []}'::jsonb,

  number_of_exercises INTEGER NOT NULL DEFAULT 0,

  is_favourite BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT fk_coach_sections_owner
    FOREIGN KEY (coach_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- ================================================
-- STEP 2: Create indexes
-- ================================================

-- Unique constraint: coach cannot have duplicate section names (case-insensitive)
CREATE UNIQUE INDEX uq_coach_sections_name_ci ON public.coach_sections(coach_id, lower(name));

-- Index for filtering sections by coach
CREATE INDEX idx_sections_coach ON public.coach_sections(coach_id);

-- Index for filtering sections by type
CREATE INDEX idx_sections_type ON public.coach_sections(section_type);

-- Composite index for coach + type filtering
CREATE INDEX idx_sections_coach_type ON public.coach_sections(coach_id, section_type);

-- ================================================
-- STEP 3: Enable Row Level Security
-- ================================================

ALTER TABLE public.coach_sections ENABLE ROW LEVEL SECURITY;

-- Policy: Coaches can only view their own sections
CREATE POLICY coach_sections_select ON public.coach_sections
  FOR SELECT
  USING (auth.uid() = coach_id);

-- Policy: Coaches can only insert their own sections
CREATE POLICY coach_sections_insert ON public.coach_sections
  FOR INSERT
  WITH CHECK (auth.uid() = coach_id);

-- Policy: Coaches can only update their own sections
CREATE POLICY coach_sections_update ON public.coach_sections
  FOR UPDATE
  USING (auth.uid() = coach_id)
  WITH CHECK (auth.uid() = coach_id);

-- Policy: Coaches can only delete their own sections
CREATE POLICY coach_sections_delete ON public.coach_sections
  FOR DELETE
  USING (auth.uid() = coach_id);
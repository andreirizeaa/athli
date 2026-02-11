-- Migration: Add folders support for coach metrics, habits, and files
-- This allows coaches to organize their library items into folders
-- When assigned to clients, folder contents are spread (flat structure on client side)

-- ============================================================================
-- 1. CREATE FOLDERS TABLES
-- ============================================================================

-- 1.1 coach_metric_folders
CREATE TABLE IF NOT EXISTS public.coach_metric_folders (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT fk_coach_metric_folders_owner
    FOREIGN KEY (coach_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Case-insensitive uniqueness per coach
CREATE UNIQUE INDEX IF NOT EXISTS uq_coach_metric_folders_name_ci
  ON public.coach_metric_folders (coach_id, lower(name));

CREATE INDEX IF NOT EXISTS idx_coach_metric_folders_coach
  ON public.coach_metric_folders(coach_id);

-- 1.2 coach_habit_folders
CREATE TABLE IF NOT EXISTS public.coach_habit_folders (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT fk_coach_habit_folders_owner
    FOREIGN KEY (coach_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Case-insensitive uniqueness per coach
CREATE UNIQUE INDEX IF NOT EXISTS uq_coach_habit_folders_name_ci
  ON public.coach_habit_folders (coach_id, lower(name));

CREATE INDEX IF NOT EXISTS idx_coach_habit_folders_coach
  ON public.coach_habit_folders(coach_id);

-- 1.3 coach_file_folders
CREATE TABLE IF NOT EXISTS public.coach_file_folders (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT fk_coach_file_folders_owner
    FOREIGN KEY (coach_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Case-insensitive uniqueness per coach
CREATE UNIQUE INDEX IF NOT EXISTS uq_coach_file_folders_name_ci
  ON public.coach_file_folders (coach_id, lower(name));

CREATE INDEX IF NOT EXISTS idx_coach_file_folders_coach
  ON public.coach_file_folders(coach_id);

-- ============================================================================
-- 2. ADD folder_id TO EXISTING TABLES
-- ============================================================================

-- 2.1 Add folder_id to coach_metrics
ALTER TABLE public.coach_metrics
  ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES public.coach_metric_folders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_coach_metrics_folder
  ON public.coach_metrics(folder_id);

-- 2.2 Add folder_id to coach_habits
ALTER TABLE public.coach_habits
  ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES public.coach_habit_folders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_coach_habits_folder
  ON public.coach_habits(folder_id);

-- 2.3 Add folder_id to coach_files
ALTER TABLE public.coach_files
  ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES public.coach_file_folders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_coach_files_folder
  ON public.coach_files(folder_id);

-- ============================================================================
-- 3. RLS POLICIES FOR FOLDERS TABLES
-- ============================================================================

-- Enable RLS on all folders tables
ALTER TABLE public.coach_metric_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_habit_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_file_folders ENABLE ROW LEVEL SECURITY;

-- 3.1 coach_metric_folders policies
CREATE POLICY "coach_metric_folders_select_own"
  ON public.coach_metric_folders FOR SELECT
  TO authenticated
  USING (coach_id = (SELECT auth.uid()));

CREATE POLICY "coach_metric_folders_insert_own"
  ON public.coach_metric_folders FOR INSERT
  TO authenticated
  WITH CHECK (coach_id = (SELECT auth.uid()));

CREATE POLICY "coach_metric_folders_update_own"
  ON public.coach_metric_folders FOR UPDATE
  TO authenticated
  USING (coach_id = (SELECT auth.uid()))
  WITH CHECK (coach_id = (SELECT auth.uid()));

CREATE POLICY "coach_metric_folders_delete_own"
  ON public.coach_metric_folders FOR DELETE
  TO authenticated
  USING (coach_id = (SELECT auth.uid()));

-- 3.2 coach_habit_folders policies
CREATE POLICY "coach_habit_folders_select_own"
  ON public.coach_habit_folders FOR SELECT
  TO authenticated
  USING (coach_id = (SELECT auth.uid()));

CREATE POLICY "coach_habit_folders_insert_own"
  ON public.coach_habit_folders FOR INSERT
  TO authenticated
  WITH CHECK (coach_id = (SELECT auth.uid()));

CREATE POLICY "coach_habit_folders_update_own"
  ON public.coach_habit_folders FOR UPDATE
  TO authenticated
  USING (coach_id = (SELECT auth.uid()))
  WITH CHECK (coach_id = (SELECT auth.uid()));

CREATE POLICY "coach_habit_folders_delete_own"
  ON public.coach_habit_folders FOR DELETE
  TO authenticated
  USING (coach_id = (SELECT auth.uid()));

-- 3.3 coach_file_folders policies
CREATE POLICY "coach_file_folders_select_own"
  ON public.coach_file_folders FOR SELECT
  TO authenticated
  USING (coach_id = (SELECT auth.uid()));

CREATE POLICY "coach_file_folders_insert_own"
  ON public.coach_file_folders FOR INSERT
  TO authenticated
  WITH CHECK (coach_id = (SELECT auth.uid()));

CREATE POLICY "coach_file_folders_update_own"
  ON public.coach_file_folders FOR UPDATE
  TO authenticated
  USING (coach_id = (SELECT auth.uid()))
  WITH CHECK (coach_id = (SELECT auth.uid()));

CREATE POLICY "coach_file_folders_delete_own"
  ON public.coach_file_folders FOR DELETE
  TO authenticated
  USING (coach_id = (SELECT auth.uid()));

-- ============================================================================
-- 4. TRIGGERS FOR updated_at
-- ============================================================================

-- Apply existing update_updated_at_column trigger to folders tables
CREATE TRIGGER update_coach_metric_folders_updated_at
  BEFORE UPDATE ON public.coach_metric_folders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_coach_habit_folders_updated_at
  BEFORE UPDATE ON public.coach_habit_folders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_coach_file_folders_updated_at
  BEFORE UPDATE ON public.coach_file_folders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

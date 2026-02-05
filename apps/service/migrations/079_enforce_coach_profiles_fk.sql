-- ================================================
-- Enforce Foreign Keys to coach_profiles
-- ================================================
-- Updates all coach-owned tables to reference public.coach_profiles(id) 
-- instead of auth.users(id) or missing constraints.

-- 1. coach_client_assignments (Replaces client_profiles references)
ALTER TABLE public.coach_client_assignments DROP CONSTRAINT IF EXISTS fk_cca_coach;
ALTER TABLE public.coach_client_assignments 
  ADD CONSTRAINT fk_cca_coach 
  FOREIGN KEY (coach_id) REFERENCES public.coach_profiles(id) ON DELETE CASCADE;

-- 2. Coach Libraries
ALTER TABLE public.coach_metrics DROP CONSTRAINT IF EXISTS fk_coach_metrics_owner;
ALTER TABLE public.coach_metrics 
  ADD CONSTRAINT fk_coach_metrics_owner 
  FOREIGN KEY (coach_id) REFERENCES public.coach_profiles(id) ON DELETE CASCADE;

ALTER TABLE public.coach_habits DROP CONSTRAINT IF EXISTS fk_coach_habits_owner;
ALTER TABLE public.coach_habits 
  ADD CONSTRAINT fk_coach_habits_owner 
  FOREIGN KEY (coach_id) REFERENCES public.coach_profiles(id) ON DELETE CASCADE;

ALTER TABLE public.coach_files DROP CONSTRAINT IF EXISTS fk_coach_files_owner;
ALTER TABLE public.coach_files 
  ADD CONSTRAINT fk_coach_files_owner 
  FOREIGN KEY (coach_id) REFERENCES public.coach_profiles(id) ON DELETE CASCADE;

ALTER TABLE public.coach_checkins DROP CONSTRAINT IF EXISTS fk_coach_checkins_owner;
ALTER TABLE public.coach_checkins 
  ADD CONSTRAINT fk_coach_checkins_owner 
  FOREIGN KEY (coach_id) REFERENCES public.coach_profiles(id) ON DELETE CASCADE;

ALTER TABLE public.coach_questionnaires DROP CONSTRAINT IF EXISTS fk_coach_quest_owner;
ALTER TABLE public.coach_questionnaires 
  ADD CONSTRAINT fk_coach_quest_owner 
  FOREIGN KEY (coach_id) REFERENCES public.coach_profiles(id) ON DELETE CASCADE;

ALTER TABLE public.coach_exercises DROP CONSTRAINT IF EXISTS fk_coach_exercises_owner;
ALTER TABLE public.coach_exercises 
  ADD CONSTRAINT fk_coach_exercises_owner 
  FOREIGN KEY (coach_id) REFERENCES public.coach_profiles(id) ON DELETE CASCADE;

ALTER TABLE public.coach_workouts DROP CONSTRAINT IF EXISTS fk_coach_workouts_owner;
ALTER TABLE public.coach_workouts 
  ADD CONSTRAINT fk_coach_workouts_owner 
  FOREIGN KEY (coach_id) REFERENCES public.coach_profiles(id) ON DELETE CASCADE;

ALTER TABLE public.coach_programs DROP CONSTRAINT IF EXISTS fk_coach_programs_owner;
ALTER TABLE public.coach_programs 
  ADD CONSTRAINT fk_coach_programs_owner 
  FOREIGN KEY (coach_id) REFERENCES public.coach_profiles(id) ON DELETE CASCADE;

-- 3. Todo Lists
ALTER TABLE public.coach_own_todolist DROP CONSTRAINT IF EXISTS fk_cot_coach;
ALTER TABLE public.coach_own_todolist 
  ADD CONSTRAINT fk_cot_coach 
  FOREIGN KEY (coach_id) REFERENCES public.coach_profiles(id) ON DELETE CASCADE;

ALTER TABLE public.coach_auto_todolist DROP CONSTRAINT IF EXISTS fk_cat_coach;
ALTER TABLE public.coach_auto_todolist 
  ADD CONSTRAINT fk_cat_coach 
  FOREIGN KEY (coach_id) REFERENCES public.coach_profiles(id) ON DELETE CASCADE;

-- 4. client_training (New table)
-- Constraint might not exist yet from 076/073 mess, ensuring it exists now.
ALTER TABLE public.client_training DROP CONSTRAINT IF EXISTS fk_ct_coach;
ALTER TABLE public.client_training 
  ADD CONSTRAINT fk_ct_coach 
  FOREIGN KEY (coach_id) REFERENCES public.coach_profiles(id) ON DELETE CASCADE;

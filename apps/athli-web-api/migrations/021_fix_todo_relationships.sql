-- ================================================
-- Fix PostgREST Relationship Ambiguity for Todo Tables
-- ================================================

-- This migration adds explicit foreign key constraints from the todo tables
-- directly to public.user_profiles. This allows PostgREST to resolve
-- relationships cleanly without needing multiple join hops or complex hinting.

-- 1. Add user_type column to todo tables to support composite FK to user_profiles
ALTER TABLE public.coach_own_todolist ADD COLUMN IF NOT EXISTS client_user_type VARCHAR(20) DEFAULT 'client' CHECK (client_user_type = 'client');
ALTER TABLE public.coach_auto_todolist ADD COLUMN IF NOT EXISTS client_user_type VARCHAR(20) DEFAULT 'client' CHECK (client_user_type = 'client');

-- 2. Add direct FK from coach_own_todolist to user_profiles using composite key
ALTER TABLE public.coach_own_todolist
  ADD CONSTRAINT fk_own_todo_client_user
  FOREIGN KEY (client_id, client_user_type)
  REFERENCES public.user_profiles(id, user_type)
  ON DELETE SET NULL;

-- 3. Add direct FK from coach_auto_todolist to user_profiles using composite key
ALTER TABLE public.coach_auto_todolist
  ADD CONSTRAINT fk_auto_todo_client_user
  FOREIGN KEY (client_id, client_user_type)
  REFERENCES public.user_profiles(id, user_type)
  ON DELETE SET NULL;

-- 4. Add indexes for these new constraints
CREATE INDEX IF NOT EXISTS idx_cot_client_user_composite ON public.coach_own_todolist(client_id, client_user_type) WHERE client_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cat_client_user_composite ON public.coach_auto_todolist(client_id, client_user_type) WHERE client_id IS NOT NULL;

-- Rename benefits column to features in coach_packages
ALTER TABLE public.coach_packages
  RENAME COLUMN benefits TO features;

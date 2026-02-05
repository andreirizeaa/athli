-- ================================================
-- 032: Split client_notes into title and body
-- ================================================

-- 1. Add new columns
ALTER TABLE public.client_notes ADD COLUMN title TEXT;
ALTER TABLE public.client_notes ADD COLUMN body TEXT;

-- 2. Migrate existing data
UPDATE public.client_notes 
SET 
  title = COALESCE(split_part(note, E'\n\n', 1), ''),
  body = CASE 
    WHEN position(E'\n\n' in note) > 0 THEN substring(note from position(E'\n\n' in note) + 2)
    ELSE ''
  END;

-- Handle cases where note was empty or title is empty after split
UPDATE public.client_notes SET title = 'Untitled' WHERE title = '' OR title IS NULL;
UPDATE public.client_notes SET body = '' WHERE body IS NULL;

-- 3. Make title NOT NULL and drop legacy column
ALTER TABLE public.client_notes ALTER COLUMN title SET NOT NULL;
ALTER TABLE public.client_notes DROP COLUMN note;

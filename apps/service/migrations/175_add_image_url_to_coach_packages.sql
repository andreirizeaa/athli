-- Add image_url column to coach_packages for custom package images
ALTER TABLE public.coach_packages
ADD COLUMN IF NOT EXISTS image_url TEXT;

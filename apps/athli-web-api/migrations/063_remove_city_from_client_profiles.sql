-- Migration: Remove city column from client_profiles
ALTER TABLE IF EXISTS public.client_profiles DROP COLUMN IF EXISTS city;

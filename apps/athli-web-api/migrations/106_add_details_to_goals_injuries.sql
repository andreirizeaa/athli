-- Migration: Add details field to client_goals and client_injuries tables
-- This allows coaches to add additional notes/details to goals and injuries

ALTER TABLE public.client_goals ADD COLUMN details TEXT;
ALTER TABLE public.client_injuries ADD COLUMN details TEXT;

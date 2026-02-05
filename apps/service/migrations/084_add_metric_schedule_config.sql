-- Migration: Add schedule configuration to metrics tables
-- This migration adds cron_expression and schedule_config fields to support
-- log frequency scheduling for metrics, similar to check-in forms.

-- Add schedule columns to coach_metrics table (library metrics - optional default schedule)
ALTER TABLE public.coach_metrics 
ADD COLUMN IF NOT EXISTS cron_expression TEXT,
ADD COLUMN IF NOT EXISTS schedule_config JSONB DEFAULT '{}'::jsonb;

-- Add schedule columns to client_metrics table (client-specific schedules)
ALTER TABLE public.client_metrics 
ADD COLUMN IF NOT EXISTS cron_expression TEXT,
ADD COLUMN IF NOT EXISTS schedule_config JSONB DEFAULT '{}'::jsonb;

-- Add comments for documentation
COMMENT ON COLUMN public.coach_metrics.cron_expression IS 'Cron expression for metric logging schedule (default for new assignments)';
COMMENT ON COLUMN public.coach_metrics.schedule_config IS 'JSON configuration for schedule UI state (frequency, selectedDays, monthlyOption, etc.)';
COMMENT ON COLUMN public.client_metrics.cron_expression IS 'Cron expression for metric logging schedule';
COMMENT ON COLUMN public.client_metrics.schedule_config IS 'JSON configuration for schedule UI state (frequency, selectedDays, monthlyOption, etc.)';

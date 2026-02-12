-- Track AI assistant usage per coach per day
-- Used to enforce daily prompt limits during free trial (5 prompts/day)

-- Table to track daily AI assistant prompt usage
CREATE TABLE public.ai_assistant_daily_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES public.coach_profiles(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  prompt_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(coach_id, usage_date)
);

-- Index for efficient lookups by coach and date
CREATE INDEX idx_ai_assistant_daily_usage_coach_date
  ON public.ai_assistant_daily_usage (coach_id, usage_date);

-- Enable RLS
ALTER TABLE public.ai_assistant_daily_usage ENABLE ROW LEVEL SECURITY;

-- Coaches can view their own usage
CREATE POLICY ai_assistant_daily_usage_select_policy ON public.ai_assistant_daily_usage
  FOR SELECT USING (coach_id = auth.uid());

-- Service role can manage all usage records
CREATE POLICY ai_assistant_daily_usage_service_policy ON public.ai_assistant_daily_usage
  FOR ALL USING (true) WITH CHECK (true);

-- Function to check and increment prompt count
-- Returns: { allowed: boolean, current_count: number, daily_limit: number }
CREATE OR REPLACE FUNCTION public.check_and_increment_ai_prompt(
  p_coach_id UUID,
  p_daily_limit INTEGER DEFAULT 5
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_count INTEGER;
  v_result JSONB;
BEGIN
  -- Get or create today's usage record
  INSERT INTO ai_assistant_daily_usage (coach_id, usage_date, prompt_count)
  VALUES (p_coach_id, CURRENT_DATE, 0)
  ON CONFLICT (coach_id, usage_date) DO NOTHING;

  -- Get current count
  SELECT prompt_count INTO v_current_count
  FROM ai_assistant_daily_usage
  WHERE coach_id = p_coach_id AND usage_date = CURRENT_DATE;

  -- Check if within limit
  IF v_current_count >= p_daily_limit THEN
    -- Return not allowed
    RETURN jsonb_build_object(
      'allowed', false,
      'current_count', v_current_count,
      'daily_limit', p_daily_limit,
      'remaining', 0
    );
  END IF;

  -- Increment and return
  UPDATE ai_assistant_daily_usage
  SET prompt_count = prompt_count + 1,
      updated_at = NOW()
  WHERE coach_id = p_coach_id AND usage_date = CURRENT_DATE
  RETURNING prompt_count INTO v_current_count;

  RETURN jsonb_build_object(
    'allowed', true,
    'current_count', v_current_count,
    'daily_limit', p_daily_limit,
    'remaining', p_daily_limit - v_current_count
  );
END;
$$;

-- Function to get current usage without incrementing
CREATE OR REPLACE FUNCTION public.get_ai_prompt_usage(
  p_coach_id UUID,
  p_daily_limit INTEGER DEFAULT 5
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_count INTEGER;
BEGIN
  -- Get current count (or 0 if no record exists)
  SELECT COALESCE(prompt_count, 0) INTO v_current_count
  FROM ai_assistant_daily_usage
  WHERE coach_id = p_coach_id AND usage_date = CURRENT_DATE;

  IF v_current_count IS NULL THEN
    v_current_count := 0;
  END IF;

  RETURN jsonb_build_object(
    'current_count', v_current_count,
    'daily_limit', p_daily_limit,
    'remaining', GREATEST(0, p_daily_limit - v_current_count),
    'is_limited', true
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.check_and_increment_ai_prompt(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_ai_prompt_usage(UUID, INTEGER) TO authenticated;

-- Updated at trigger
CREATE TRIGGER update_ai_assistant_daily_usage_updated_at
  BEFORE UPDATE ON public.ai_assistant_daily_usage
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

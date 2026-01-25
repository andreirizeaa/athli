-- Migration: Create feature requests tables
-- Users can submit feature requests, upvote them, and reply to them

-- ============================================================================
-- FEATURE REQUESTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.feature_requests (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  upvote_count INTEGER NOT NULL DEFAULT 0,
  user_id UUID NOT NULL,
  user_name TEXT NOT NULL,
  user_type TEXT NOT NULL CHECK (user_type IN ('coach', 'client')),
  profile_picture_url TEXT,
  status TEXT CHECK (status IN (NULL, 'in_progress', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT fk_fr_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Indexes for feature_requests
CREATE INDEX idx_fr_created_at ON public.feature_requests(created_at DESC);
CREATE INDEX idx_fr_upvote_count ON public.feature_requests(upvote_count DESC);
CREATE INDEX idx_fr_user_id ON public.feature_requests(user_id);
CREATE INDEX idx_fr_status ON public.feature_requests(status);

-- ============================================================================
-- FEATURE REQUEST UPVOTES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.feature_request_upvotes (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_request_id UUID NOT NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT fk_fru_feature_request FOREIGN KEY (feature_request_id) REFERENCES public.feature_requests(id) ON DELETE CASCADE,
  CONSTRAINT fk_fru_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT uq_fru_feature_request_user UNIQUE (feature_request_id, user_id)
);

-- Indexes for feature_request_upvotes
CREATE INDEX idx_fru_feature_request ON public.feature_request_upvotes(feature_request_id);
CREATE INDEX idx_fru_user ON public.feature_request_upvotes(user_id);

-- ============================================================================
-- FEATURE REQUEST REPLIES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.feature_request_replies (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_request_id UUID NOT NULL,
  user_id UUID NOT NULL,
  user_name TEXT NOT NULL,
  user_type TEXT NOT NULL CHECK (user_type IN ('coach', 'client')),
  profile_picture_url TEXT,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT fk_frr_feature_request FOREIGN KEY (feature_request_id) REFERENCES public.feature_requests(id) ON DELETE CASCADE,
  CONSTRAINT fk_frr_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Indexes for feature_request_replies
CREATE INDEX idx_frr_feature_request_created ON public.feature_request_replies(feature_request_id, created_at ASC);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Updated_at trigger for feature_requests
CREATE TRIGGER trg_fr_updated_at
  BEFORE UPDATE ON public.feature_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Upvote count sync trigger - increment on insert
CREATE OR REPLACE FUNCTION public.increment_upvote_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.feature_requests
  SET upvote_count = upvote_count + 1
  WHERE id = NEW.feature_request_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_fru_increment_count
  AFTER INSERT ON public.feature_request_upvotes
  FOR EACH ROW EXECUTE FUNCTION public.increment_upvote_count();

-- Upvote count sync trigger - decrement on delete
CREATE OR REPLACE FUNCTION public.decrement_upvote_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.feature_requests
  SET upvote_count = GREATEST(0, upvote_count - 1)
  WHERE id = OLD.feature_request_id;
  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_fru_decrement_count
  AFTER DELETE ON public.feature_request_upvotes
  FOR EACH ROW EXECUTE FUNCTION public.decrement_upvote_count();

-- ============================================================================
-- RLS POLICIES - FEATURE REQUESTS
-- ============================================================================
ALTER TABLE public.feature_requests ENABLE ROW LEVEL SECURITY;

-- Public read access (anyone can see feature requests)
CREATE POLICY feature_requests_select ON public.feature_requests
  FOR SELECT
  USING (true);

-- Insert: only if user_id matches auth.uid()
CREATE POLICY feature_requests_insert ON public.feature_requests
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Update: only owner can update
CREATE POLICY feature_requests_update ON public.feature_requests
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Delete: only owner and only if status IS NULL (not in progress or completed)
CREATE POLICY feature_requests_delete ON public.feature_requests
  FOR DELETE
  USING (user_id = auth.uid() AND status IS NULL);

-- ============================================================================
-- RLS POLICIES - UPVOTES
-- ============================================================================
ALTER TABLE public.feature_request_upvotes ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY feature_request_upvotes_select ON public.feature_request_upvotes
  FOR SELECT
  USING (true);

-- Insert: user can only create upvotes for themselves
CREATE POLICY feature_request_upvotes_insert ON public.feature_request_upvotes
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Delete: user can only delete their own upvotes
CREATE POLICY feature_request_upvotes_delete ON public.feature_request_upvotes
  FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================================
-- RLS POLICIES - REPLIES
-- ============================================================================
ALTER TABLE public.feature_request_replies ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY feature_request_replies_select ON public.feature_request_replies
  FOR SELECT
  USING (true);

-- Insert: user can only create replies for themselves
CREATE POLICY feature_request_replies_insert ON public.feature_request_replies
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Delete: user can only delete their own replies
CREATE POLICY feature_request_replies_delete ON public.feature_request_replies
  FOR DELETE
  USING (user_id = auth.uid());

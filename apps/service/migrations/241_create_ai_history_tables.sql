-- ================================================
-- 241: Create AI Chat History
-- ================================================
-- Single row per chat with a JSONB data column that stores
-- the full message array and any metadata / component usage.
-- ================================================

CREATE TABLE IF NOT EXISTS public.ai_chats (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id    UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    title       TEXT NOT NULL DEFAULT 'New Chat',
    data        JSONB NOT NULL DEFAULT '{"messages":[]}'::jsonb,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_ai_chats_coach    ON public.ai_chats(coach_id);
CREATE INDEX idx_ai_chats_updated  ON public.ai_chats(coach_id, updated_at DESC);

-- RLS
ALTER TABLE public.ai_chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_chats_select ON public.ai_chats
    FOR SELECT USING (coach_id = auth.uid());

CREATE POLICY ai_chats_insert ON public.ai_chats
    FOR INSERT WITH CHECK (coach_id = auth.uid());

CREATE POLICY ai_chats_update ON public.ai_chats
    FOR UPDATE USING (coach_id = auth.uid());

CREATE POLICY ai_chats_delete ON public.ai_chats
    FOR DELETE USING (coach_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_chats TO authenticated;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_ai_chats_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_ai_chats_updated_at
    BEFORE UPDATE ON public.ai_chats
    FOR EACH ROW
    EXECUTE FUNCTION public.update_ai_chats_updated_at();

COMMENT ON TABLE public.ai_chats IS 'One row per AI assistant conversation; messages live in the JSONB data column';
COMMENT ON COLUMN public.ai_chats.data IS '{"messages":[{role,content,timestamp,...}], ...} — flexible store for the full conversation';
-- ================================================
-- Migration: Update Name Conflict Resolution & Add to Sections
-- ================================================

-- 1. Update the conflict resolution function to use " Copy" suffix
CREATE OR REPLACE FUNCTION public.resolve_coach_item_name_conflict()
RETURNS TRIGGER AS $$
DECLARE
    base_name TEXT;
    target_name TEXT;
    counter INTEGER := 2;
    exists_already BOOLEAN;
BEGIN
    base_name := NEW.name;
    target_name := base_name;

    -- Look for conflicts within the same coach's library
    LOOP
        EXECUTE format(
            'SELECT EXISTS (SELECT 1 FROM public.%I WHERE coach_id = $1 AND lower(name) = lower($2) AND id IS DISTINCT FROM $3)',
            TG_TABLE_NAME
        )
        INTO exists_already
        USING NEW.coach_id, target_name, NEW.id;

        IF NOT exists_already THEN
            EXIT;
        END IF;

        -- Conflict found.
        -- First attempt: Append " Copy"
        -- Subsequent attempts: Append " Copy 2", " Copy 3", etc.
        
        -- If we are at the first conflict with the original name, try " (Copy)"
        IF target_name = base_name THEN
            target_name := base_name || ' (Copy)';
        ELSE
            -- We already tried " (Copy)" or " (Copy N)", try the next one
            -- Note: To keep it simple and robust, we just restart loop with " (Copy N)" logic
            -- but since we are inside a loop, we can just track state or try next candidate.
            -- This simple logic below works for "Name" -> "Name (Copy)" -> "Name (Copy 2)"
            
            target_name := base_name || ' (Copy ' || counter || ')';
            counter := counter + 1;
        END IF;
    END LOOP;

    NEW.name := target_name;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Add trigger to coach_sections
DROP TRIGGER IF EXISTS trg_resolve_section_name_conflict ON public.coach_sections;
CREATE TRIGGER trg_resolve_section_name_conflict
    BEFORE INSERT OR UPDATE OF name ON public.coach_sections
    FOR EACH ROW
    EXECUTE FUNCTION public.resolve_coach_item_name_conflict();

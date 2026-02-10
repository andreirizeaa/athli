-- Add sequence_id column to coach_unique_codes
ALTER TABLE public.coach_unique_codes
  ADD COLUMN IF NOT EXISTS sequence_id UUID REFERENCES public.coach_sequences(id) ON DELETE SET NULL;

-- Create index for sequence_id lookups
CREATE INDEX IF NOT EXISTS idx_coach_unique_codes_sequence_id
  ON public.coach_unique_codes(sequence_id) WHERE sequence_id IS NOT NULL;

-- Function to generate a 12-character alphanumeric code
CREATE OR REPLACE FUNCTION public.generate_unique_code(length INT DEFAULT 12)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  chars TEXT := '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  result TEXT := '';
  i INT;
BEGIN
  FOR i IN 1..length LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::INT, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Trigger function to auto-generate code when sequence is created
CREATE OR REPLACE FUNCTION public.create_sequence_invite_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code TEXT;
  max_attempts INT := 10;
  attempt INT := 0;
BEGIN
  -- Generate a unique code with retry logic
  LOOP
    attempt := attempt + 1;
    new_code := generate_unique_code(12);

    BEGIN
      INSERT INTO public.coach_unique_codes (coach_id, code, sequence_id)
      VALUES (NEW.coach_id, new_code, NEW.id);
      EXIT; -- Success, exit loop
    EXCEPTION WHEN unique_violation THEN
      IF attempt >= max_attempts THEN
        RAISE EXCEPTION 'Could not generate unique code after % attempts', max_attempts;
      END IF;
      -- Continue loop to try again
    END;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Create trigger on coach_sequences
DROP TRIGGER IF EXISTS trg_create_sequence_invite_code ON public.coach_sequences;
CREATE TRIGGER trg_create_sequence_invite_code
  AFTER INSERT ON public.coach_sequences
  FOR EACH ROW
  EXECUTE FUNCTION public.create_sequence_invite_code();

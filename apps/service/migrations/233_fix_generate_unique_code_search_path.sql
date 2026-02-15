-- Fix security linter warning: function_search_path_mutable
-- Drop the unused parameterized overload of generate_unique_code(length INT).
-- It was originally created in migration 177 for create_sequence_invite_code(),
-- which was dropped in migration 185. The parameter-less version from migration 232
-- already has SET search_path = public.

DROP FUNCTION IF EXISTS public.generate_unique_code(INT);

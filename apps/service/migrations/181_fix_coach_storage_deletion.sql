-- Fix coach account deletion trigger to use edge function for storage cleanup
-- Supabase no longer allows direct deletion from storage tables
-- This calls an edge function that uses the Storage API
-- Secrets are stored in Supabase Vault

-- Enable pg_net extension if not already enabled (for HTTP calls from triggers)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- After running this migration, store your secrets in Vault:
-- SELECT vault.create_secret('https://YOUR_PROJECT_REF.supabase.co', 'supabase_url');
-- SELECT vault.create_secret('YOUR_SERVICE_ROLE_KEY', 'service_role_key');

CREATE OR REPLACE FUNCTION public.handle_coach_account_deletion()
RETURNS TRIGGER AS $$
DECLARE
  v_conversation_ids UUID[];
  v_supabase_url TEXT;
  v_service_key TEXT;
  v_request_id BIGINT;
BEGIN
  -- Get conversation IDs for this coach (for message attachment cleanup)
  SELECT ARRAY_AGG(id) INTO v_conversation_ids
  FROM public.conversations
  WHERE coach_id = OLD.id;

  -- Get secrets from Vault
  SELECT decrypted_secret INTO v_supabase_url
  FROM vault.decrypted_secrets
  WHERE name = 'supabase_url';

  SELECT decrypted_secret INTO v_service_key
  FROM vault.decrypted_secrets
  WHERE name = 'service_role_key';

  -- Call the edge function asynchronously via pg_net
  IF v_supabase_url IS NOT NULL AND v_service_key IS NOT NULL THEN
    SELECT net.http_post(
      url := v_supabase_url || '/functions/v1/cleanup-coach-storage',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_service_key
      ),
      body := jsonb_build_object(
        'coach_id', OLD.id,
        'conversation_ids', COALESCE(v_conversation_ids, ARRAY[]::UUID[])
      )
    ) INTO v_request_id;
  END IF;

  RETURN OLD;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error initiating storage cleanup for coach %: %', OLD.id, SQLERRM;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net, extensions, vault;


CREATE OR REPLACE FUNCTION public.handle_client_account_deletion()
RETURNS TRIGGER AS $$
DECLARE
  v_supabase_url TEXT;
  v_service_key TEXT;
  v_request_id BIGINT;
BEGIN
  -- Get secrets from Vault
  SELECT decrypted_secret INTO v_supabase_url
  FROM vault.decrypted_secrets
  WHERE name = 'supabase_url';

  SELECT decrypted_secret INTO v_service_key
  FROM vault.decrypted_secrets
  WHERE name = 'service_role_key';

  -- Call the edge function asynchronously via pg_net
  IF v_supabase_url IS NOT NULL AND v_service_key IS NOT NULL THEN
    SELECT net.http_post(
      url := v_supabase_url || '/functions/v1/cleanup-client-storage',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_service_key
      ),
      body := jsonb_build_object(
        'client_id', OLD.client_id
      )
    ) INTO v_request_id;
  END IF;

  RETURN OLD;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error initiating storage cleanup for client %: %', OLD.client_id, SQLERRM;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net, extensions, vault;

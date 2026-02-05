-- ================================================
-- ATHLI Partition RLS Policies Patch
-- ================================================
-- This patch applies RLS policies to all client_training partitions.
-- Partitions inherit RLS enablement but NOT the policies themselves.
-- We need to explicitly create policies on each partition.
-- ================================================

-- Run this AFTER 003_rls_optimization_patch.sql

-- ================================================
-- Apply policies to all existing partitions
-- ================================================
DO $$
DECLARE
  r record;
  partition_name text;
BEGIN
  -- Loop through all partitions of client_training
  FOR r IN
    SELECT n.nspname AS schemaname, c.relname AS tablename
    FROM pg_inherits i
    JOIN pg_class c      ON c.oid = i.inhrelid
    JOIN pg_namespace n  ON n.oid = c.relnamespace
    WHERE i.inhparent = 'public.client_training'::regclass
  LOOP
    partition_name := format('%I.%I', r.schemaname, r.tablename);
    
    -- Drop existing policies if any (idempotent)
    EXECUTE format('DROP POLICY IF EXISTS ct_select ON %s', partition_name);
    EXECUTE format('DROP POLICY IF EXISTS ct_insert_coach ON %s', partition_name);
    EXECUTE format('DROP POLICY IF EXISTS ct_update_shared ON %s', partition_name);
    EXECUTE format('DROP POLICY IF EXISTS ct_delete_coach ON %s', partition_name);
    
    -- SELECT: client or coach
    EXECUTE format('
      CREATE POLICY ct_select
      ON %s
      FOR SELECT
      TO authenticated
      USING (
        (select auth.uid()) = client_id
        OR (select auth.uid()) = coach_id
      )', partition_name);
    
    -- INSERT: coach only
    EXECUTE format('
      CREATE POLICY ct_insert_coach
      ON %s
      FOR INSERT
      TO authenticated
      WITH CHECK ((select auth.uid()) = coach_id)', partition_name);
    
    -- UPDATE: client or coach
    EXECUTE format('
      CREATE POLICY ct_update_shared
      ON %s
      FOR UPDATE
      TO authenticated
      USING (
        (select auth.uid()) = client_id
        OR (select auth.uid()) = coach_id
      )
      WITH CHECK (
        (select auth.uid()) = client_id
        OR (select auth.uid()) = coach_id
      )', partition_name);
    
    -- DELETE: coach only
    EXECUTE format('
      CREATE POLICY ct_delete_coach
      ON %s
      FOR DELETE
      TO authenticated
      USING ((select auth.uid()) = coach_id)', partition_name);
    
    RAISE NOTICE 'Applied RLS policies to partition: %', partition_name;
  END LOOP;
END $$;

-- ================================================
-- Migration Complete
-- ================================================
-- All client_training partitions now have proper RLS policies
-- This script is idempotent and can be run multiple times
-- ================================================

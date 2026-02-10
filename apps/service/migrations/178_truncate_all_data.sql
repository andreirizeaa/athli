-- Migration: Truncate all data from all tables
-- WARNING: This will delete ALL data from the database. Use with caution.

-- Disable triggers temporarily to avoid cascading issues
SET session_replication_role = 'replica';

-- Truncate all public tables (CASCADE handles foreign key dependencies)
-- Excludes musclewiki tables to preserve exercise data
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename NOT LIKE 'pg_%'
        AND tablename NOT LIKE '_prisma%'
        AND tablename NOT LIKE 'musclewiki_%'
        AND tablename != 'schema_migrations'
    ) LOOP
        EXECUTE 'TRUNCATE TABLE public.' || quote_ident(r.tablename) || ' CASCADE';
        RAISE NOTICE 'Truncated table: %', r.tablename;
    END LOOP;
END $$;

-- Clear auth.users (requires special handling)
-- This deletes all users from Supabase auth
DELETE FROM auth.users;

-- Re-enable triggers
SET session_replication_role = 'origin';

-- Reset sequences (optional - resets auto-increment counters)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT sequence_name
        FROM information_schema.sequences
        WHERE sequence_schema = 'public'
    ) LOOP
        EXECUTE 'ALTER SEQUENCE public.' || quote_ident(r.sequence_name) || ' RESTART WITH 1';
    END LOOP;
END $$;

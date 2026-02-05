-- Migration: Remove user_profiles business logic columns
-- Description: Simplify user_profiles to be purely for developer/auth information.
-- All business logic (is_active, is_archived, status, category) now lives in 
-- coach_profiles and coach_client_assignments tables.

-- Drop columns that are now redundant or moved to other tables
ALTER TABLE user_profiles
DROP COLUMN IF EXISTS is_active,
DROP COLUMN IF EXISTS is_archived,
DROP COLUMN IF EXISTS status,
DROP COLUMN IF EXISTS category;

-- user_profiles now only contains:
-- - id (references auth.users)
-- - user_type (coach or client - for developer/auth purposes)
-- - email
-- - name
-- - profile_picture_url
-- - signin_method
-- - created_at
-- - updated_at

-- All client business logic is in:
-- - client_profiles (client-specific data)
-- - coach_client_assignments (relationship data: is_active, is_archived, category, status)

-- All coach business logic is in:
-- - coach_profiles (coach-specific data)

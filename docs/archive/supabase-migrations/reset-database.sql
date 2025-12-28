-- =====================================================
-- Supabase Database Reset Script
-- =====================================================
-- ⚠️  WARNING: This script will DROP ALL TABLES and DATA
-- ⚠️  Only use in DEVELOPMENT environment
-- ⚠️  Create a BACKUP before running this script
--
-- Purpose: Clean slate for applying fresh migrations
-- Date: 2025-11-02
-- =====================================================

-- =====================================================
-- Step 1: Drop all existing tables (CASCADE)
-- =====================================================

-- Drop all public schema tables
DROP SCHEMA IF EXISTS public CASCADE;

-- Recreate public schema
CREATE SCHEMA public;

-- Grant permissions to default Supabase roles
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, service_role;

-- Enable default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres, service_role;

-- =====================================================
-- Step 2: Reinstall required extensions
-- =====================================================

-- pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

-- pg_stat_statements for performance monitoring (optional)
CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA extensions;

-- =====================================================
-- Step 3: Verification
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '=== Database Reset Complete ===';
  RAISE NOTICE 'All tables dropped and schema recreated';
  RAISE NOTICE 'Extensions installed: pgcrypto';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Run migrations in order (see MIGRATION_GUIDE.md)';
  RAISE NOTICE '2. Verify table creation with: SELECT tablename FROM pg_tables WHERE schemaname = ''public'';';
  RAISE NOTICE '3. Insert sample data if needed';
END $$;

-- ============================================================
-- ROLLBACK: User Value Fields Migration
-- ============================================================
-- Migration to rollback: 20251116120000_add_user_value_fields.sql
-- Use this script ONLY if you need to revert the migration
-- WARNING: This will permanently delete data in user_benefits,
--          stability_score, problem, solution, and impact columns
-- ============================================================

-- STEP 1: Backup data before dropping columns (IMPORTANT!)
-- ============================================================

-- Create backup tables
CREATE TABLE IF NOT EXISTS roadmap_backup_20251116 AS
  SELECT id, user_benefits, stability_score, updated_at
  FROM roadmap
  WHERE user_benefits IS NOT NULL OR stability_score != 99;

CREATE TABLE IF NOT EXISTS projects_backup_20251116 AS
  SELECT id, problem, solution, impact, updated_at
  FROM projects
  WHERE problem IS NOT NULL OR solution IS NOT NULL OR impact != '{}'::jsonb;

-- Verify backup
DO $$
BEGIN
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Backup created:';
  RAISE NOTICE '  roadmap_backup_20251116: % rows',
    (SELECT COUNT(*) FROM roadmap_backup_20251116);
  RAISE NOTICE '  projects_backup_20251116: % rows',
    (SELECT COUNT(*) FROM projects_backup_20251116);
  RAISE NOTICE '=================================================================';
END $$;

-- STEP 2: Drop indexes
-- ============================================================

DROP INDEX IF EXISTS idx_roadmap_user_benefits;
DROP INDEX IF EXISTS idx_projects_impact;

RAISE NOTICE 'Indexes dropped ✓';

-- STEP 3: Drop constraints
-- ============================================================

ALTER TABLE roadmap DROP CONSTRAINT IF EXISTS chk_roadmap_stability_score;

RAISE NOTICE 'Constraints dropped ✓';

-- STEP 4: Drop columns
-- ============================================================

ALTER TABLE roadmap DROP COLUMN IF EXISTS user_benefits;
ALTER TABLE roadmap DROP COLUMN IF EXISTS stability_score;

ALTER TABLE projects DROP COLUMN IF EXISTS problem;
ALTER TABLE projects DROP COLUMN IF EXISTS solution;
ALTER TABLE projects DROP COLUMN IF EXISTS impact;

RAISE NOTICE 'Columns dropped ✓';

-- STEP 5: Verify rollback
-- ============================================================

DO $$
BEGIN
  -- Check roadmap columns removed
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'roadmap'
      AND column_name IN ('user_benefits', 'stability_score')
  ) THEN
    RAISE EXCEPTION 'Rollback failed: roadmap columns still exist';
  END IF;

  -- Check projects columns removed
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'projects'
      AND column_name IN ('problem', 'solution', 'impact')
  ) THEN
    RAISE EXCEPTION 'Rollback failed: projects columns still exist';
  END IF;

  RAISE NOTICE 'Rollback verification passed ✓';
END $$;

-- STEP 6: Summary
-- ============================================================

DO $$
BEGIN
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Rollback completed successfully';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Dropped columns:';
  RAISE NOTICE '  ROADMAP: user_benefits, stability_score';
  RAISE NOTICE '  PROJECTS: problem, solution, impact';
  RAISE NOTICE '';
  RAISE NOTICE 'Backup tables created:';
  RAISE NOTICE '  roadmap_backup_20251116';
  RAISE NOTICE '  projects_backup_20251116';
  RAISE NOTICE '';
  RAISE NOTICE 'To restore data, re-run the original migration and restore from backup:';
  RAISE NOTICE '  \\i supabase/migrations/20251116120000_add_user_value_fields.sql';
  RAISE NOTICE '  UPDATE roadmap r SET user_benefits = rb.user_benefits';
  RAISE NOTICE '    FROM roadmap_backup_20251116 rb WHERE r.id = rb.id;';
  RAISE NOTICE '=================================================================';
END $$;

-- CLEANUP (Optional, run manually if you no longer need backups)
-- ============================================================
-- DROP TABLE IF EXISTS roadmap_backup_20251116;
-- DROP TABLE IF EXISTS projects_backup_20251116;

-- Migration: Add user-facing value fields to roadmap and projects tables
-- Created: 2025-11-16
-- Purpose: Enable storytelling and user benefit tracking for Roadmap/Portfolio pages

-- ==============================================================================
-- ROADMAP TABLE: Add user benefits and stability tracking
-- ==============================================================================

-- Add user-facing benefit fields
ALTER TABLE public.roadmap
ADD COLUMN IF NOT EXISTS user_benefits JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS stability_score INTEGER DEFAULT 99;

-- Add column comments for documentation
COMMENT ON COLUMN public.roadmap.user_benefits IS
  'Array of user-facing benefits (e.g., ["버그 없는 서비스", "빠른 로딩", "24/7 지원"])';

COMMENT ON COLUMN public.roadmap.stability_score IS
  'Stability score (0-100, default 99 means 99.9% uptime). Used to show service reliability.';

-- Create GIN index for efficient JSON array queries
CREATE INDEX IF NOT EXISTS idx_roadmap_user_benefits
  ON public.roadmap USING GIN (user_benefits);

-- Add check constraint for stability_score range
ALTER TABLE public.roadmap
ADD CONSTRAINT IF NOT EXISTS chk_roadmap_stability_score
  CHECK (stability_score >= 0 AND stability_score <= 100);

-- ==============================================================================
-- PROJECTS TABLE: Add storytelling fields
-- ==============================================================================

-- Add problem-solution-impact storytelling fields
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS problem TEXT,
ADD COLUMN IF NOT EXISTS solution TEXT,
ADD COLUMN IF NOT EXISTS impact JSONB DEFAULT '{}'::jsonb;

-- Add column comments for documentation
COMMENT ON COLUMN public.projects.problem IS
  'User problem statement for storytelling (e.g., "포트폴리오 웹사이트가 없었어요")';

COMMENT ON COLUMN public.projects.solution IS
  'How the project solves the problem (e.g., "React + Supabase 기반 풀스택 웹사이트 구축")';

COMMENT ON COLUMN public.projects.impact IS
  'JSON object with metrics: {users, timeSaved, satisfaction, revenue, engagement}. Example: {"users": "월 1,200명", "timeSaved": "80% 절감", "satisfaction": "4.9/5.0"}';

-- Create GIN index for efficient JSON queries
CREATE INDEX IF NOT EXISTS idx_projects_impact
  ON public.projects USING GIN (impact);

-- ==============================================================================
-- EXAMPLE DATA (Optional - can be run separately)
-- ==============================================================================

-- Example 1: Update IDEA on Action homepage project
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.projects
    WHERE slug = 'homepage-2025' OR title ILIKE '%IDEA on Action%' OR title ILIKE '%Homepage%'
  ) THEN
    UPDATE public.projects
    SET
      problem = '프리랜서 개발자가 포트폴리오를 보여줄 웹사이트가 없었어요',
      solution = 'React + Supabase + Vite 기반 풀스택 웹사이트를 3주 만에 구축했습니다',
      impact = jsonb_build_object(
        'users', '월 1,200명 방문',
        'timeSaved', '수작업 대비 80% 시간 절감',
        'satisfaction', '4.9/5.0',
        'engagement', '평균 체류 시간 3분 12초'
      )
    WHERE slug = 'homepage-2025' OR title ILIKE '%IDEA on Action%' OR title ILIKE '%Homepage%';
  END IF;
END $$;

-- Example 2: Update a roadmap item with user benefits
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.roadmap
    WHERE title ILIKE '%CMS%' OR title ILIKE '%Admin%'
  ) THEN
    UPDATE public.roadmap
    SET
      user_benefits = jsonb_build_array(
        '관리자 페이지로 블로그 글 직접 작성 가능',
        '이미지 업로드 자동화',
        '실시간 미리보기 지원'
      ),
      stability_score = 99
    WHERE title ILIKE '%CMS%' OR title ILIKE '%Admin%'
    LIMIT 1;
  END IF;
END $$;

-- ==============================================================================
-- VERIFICATION QUERIES
-- ==============================================================================

-- Verify roadmap columns exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'roadmap'
    AND column_name = 'user_benefits'
  ) THEN
    RAISE EXCEPTION 'roadmap.user_benefits column not created';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'roadmap'
    AND column_name = 'stability_score'
  ) THEN
    RAISE EXCEPTION 'roadmap.stability_score column not created';
  END IF;

  RAISE NOTICE 'roadmap table migration verified ✓';
END $$;

-- Verify projects columns exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'projects'
    AND column_name = 'problem'
  ) THEN
    RAISE EXCEPTION 'projects.problem column not created';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'projects'
    AND column_name = 'solution'
  ) THEN
    RAISE EXCEPTION 'projects.solution column not created';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'projects'
    AND column_name = 'impact'
  ) THEN
    RAISE EXCEPTION 'projects.impact column not created';
  END IF;

  RAISE NOTICE 'projects table migration verified ✓';
END $$;

-- Display migration summary
DO $$
BEGIN
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Migration 20251116120000_add_user_value_fields.sql completed';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'ROADMAP table changes:';
  RAISE NOTICE '  + user_benefits (JSONB, default [])';
  RAISE NOTICE '  + stability_score (INTEGER, default 99, range 0-100)';
  RAISE NOTICE '  + GIN index on user_benefits';
  RAISE NOTICE '  + Check constraint on stability_score';
  RAISE NOTICE '';
  RAISE NOTICE 'PROJECTS table changes:';
  RAISE NOTICE '  + problem (TEXT)';
  RAISE NOTICE '  + solution (TEXT)';
  RAISE NOTICE '  + impact (JSONB, default {})';
  RAISE NOTICE '  + GIN index on impact';
  RAISE NOTICE '';
  RAISE NOTICE 'All columns are optional with default values (backward compatible)';
  RAISE NOTICE '=================================================================';
END $$;

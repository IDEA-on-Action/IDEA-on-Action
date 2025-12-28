-- =============================================================================
-- TASK-030: projects 테이블에 milestones 컬럼 추가
-- 마일스톤 기반 진척률 자동 계산
-- =============================================================================

-- milestones 컬럼 추가
-- JSONB 배열 형태로 마일스톤 정보를 저장합니다.
-- 형식: [{name: '기획', completed: true, due_date: '2025-01-15'}, ...]
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS milestones JSONB DEFAULT '[]'::jsonb;

-- 코멘트 추가
COMMENT ON COLUMN public.projects.milestones IS '프로젝트 마일스톤 배열 [{name, completed, due_date}]';

-- =============================================================================
-- 진척률 계산 함수
-- =============================================================================

/**
 * 프로젝트 진척률 계산
 *
 * 완료된 마일스톤 비율을 백분율로 계산합니다.
 * 마일스톤이 없으면 0을 반환합니다.
 *
 * @param p_project_id - 프로젝트 ID (TEXT 타입)
 * @returns 진척률 (0-100)
 */
CREATE OR REPLACE FUNCTION public.calculate_project_progress(p_project_id TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_count INTEGER;
  completed_count INTEGER;
BEGIN
  -- 마일스톤 총 개수
  SELECT jsonb_array_length(COALESCE(milestones, '[]'::jsonb))
  INTO total_count
  FROM public.projects
  WHERE id = p_project_id;

  -- 마일스톤이 없으면 0 반환
  IF total_count IS NULL OR total_count = 0 THEN
    RETURN 0;
  END IF;

  -- 완료된 마일스톤 개수
  SELECT COUNT(*)
  INTO completed_count
  FROM public.projects p,
       jsonb_array_elements(p.milestones) AS m
  WHERE p.id = p_project_id
    AND (m->>'completed')::boolean = true;

  -- 백분율 계산
  RETURN (completed_count * 100 / total_count);
END;
$$;

COMMENT ON FUNCTION public.calculate_project_progress IS '프로젝트 마일스톤 기반 진척률 계산 (0-100)';

-- =============================================================================
-- 진척률 자동 업데이트 트리거
-- =============================================================================

/**
 * 마일스톤 변경 시 진척률 자동 업데이트
 */
CREATE OR REPLACE FUNCTION public.update_project_progress_on_milestone_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_progress INTEGER;
BEGIN
  -- 마일스톤이 변경된 경우에만 진척률 재계산
  IF OLD.milestones IS DISTINCT FROM NEW.milestones THEN
    new_progress := public.calculate_project_progress(NEW.id);

    -- metrics JSONB에 progress 업데이트
    NEW.metrics := COALESCE(NEW.metrics, '{}'::jsonb) ||
                   jsonb_build_object('progress', new_progress);
  END IF;

  RETURN NEW;
END;
$$;

-- 기존 트리거 삭제 후 재생성
DROP TRIGGER IF EXISTS trigger_update_project_progress ON public.projects;

CREATE TRIGGER trigger_update_project_progress
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_project_progress_on_milestone_change();

-- =============================================================================
-- 샘플 데이터 업데이트 (테스트용)
-- =============================================================================

-- IDEA on Action 홈페이지 프로젝트에 샘플 마일스톤 추가
UPDATE public.projects
SET milestones = '[
  {"name": "기획 및 설계", "completed": true, "due_date": "2025-01-15"},
  {"name": "UI/UX 디자인", "completed": true, "due_date": "2025-02-01"},
  {"name": "프론트엔드 개발", "completed": true, "due_date": "2025-03-15"},
  {"name": "백엔드 연동", "completed": true, "due_date": "2025-04-01"},
  {"name": "결제 시스템 통합", "completed": true, "due_date": "2025-04-15"},
  {"name": "베타 테스트", "completed": false, "due_date": "2025-05-01"},
  {"name": "정식 출시", "completed": false, "due_date": "2025-05-15"}
]'::jsonb
WHERE slug = 'idea-on-action-homepage'
   OR title ILIKE '%IDEA on Action%';

-- =============================================================================
-- 마이그레이션 완료 로그
-- =============================================================================
DO $$
BEGIN
  RAISE NOTICE 'TASK-030: projects.milestones 컬럼 추가 완료';
  RAISE NOTICE '- 컬럼: public.projects.milestones (JSONB)';
  RAISE NOTICE '- 함수: calculate_project_progress(project_id)';
  RAISE NOTICE '- 트리거: trigger_update_project_progress';
END $$;

-- ============================================================================
-- 프롬프트 템플릿 테이블 마이그레이션
--
-- 파일: 20251125100000_create_prompt_templates.sql
-- 작성일: 2025-11-25
-- 버전: 1.0.0
--
-- 테이블:
-- 1. prompt_templates - 프롬프트 템플릿 저장소
--
-- 기능:
-- - 사용자 정의 프롬프트 템플릿 관리
-- - 시스템 기본 템플릿 제공
-- - 서비스별 특화 템플릿
-- - 템플릿 버전 관리 및 포크
-- ============================================================================

-- 트랜잭션 시작
BEGIN;

-- ============================================================================
-- 1. prompt_templates 테이블
-- 프롬프트 템플릿 저장소
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.prompt_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 템플릿 기본 정보
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'custom',

  -- 프롬프트 내용
  system_prompt TEXT,
  user_prompt_template TEXT NOT NULL,

  -- 변수 정의 (JSON array)
  variables JSONB DEFAULT '[]',

  -- 출력 스키마 (JSON Schema 형식)
  output_schema JSONB,

  -- 공개/시스템 템플릿 플래그
  is_public BOOLEAN DEFAULT false,
  is_system BOOLEAN DEFAULT false,

  -- 서비스 연결 (Minu 시리즈)
  service_id TEXT,

  -- 버전 관리
  version TEXT DEFAULT '1.0.0',
  parent_id UUID REFERENCES public.prompt_templates(id) ON DELETE SET NULL,

  -- 작성자 (필수)
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 사용 통계
  usage_count INTEGER DEFAULT 0,

  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 제약조건
  CONSTRAINT valid_category CHECK (
    category IN ('rfp', 'requirements', 'plan', 'report', 'chat', 'custom')
  ),
  CONSTRAINT valid_service_id CHECK (
    service_id IS NULL OR
    service_id IN ('minu-find', 'minu-frame', 'minu-build', 'minu-keep')
  ),
  CONSTRAINT valid_version CHECK (
    version ~ '^\d+\.\d+\.\d+$'
  )
);

-- ============================================================================
-- 2. 인덱스 생성
-- ============================================================================

-- 카테고리별 검색
CREATE INDEX IF NOT EXISTS idx_prompt_templates_category
  ON public.prompt_templates(category);

-- 서비스별 검색
CREATE INDEX IF NOT EXISTS idx_prompt_templates_service
  ON public.prompt_templates(service_id)
  WHERE service_id IS NOT NULL;

-- 공개/시스템 템플릿 검색
CREATE INDEX IF NOT EXISTS idx_prompt_templates_public
  ON public.prompt_templates(is_public, is_system)
  WHERE is_public = true OR is_system = true;

-- 작성자별 검색
CREATE INDEX IF NOT EXISTS idx_prompt_templates_created_by
  ON public.prompt_templates(created_by);

-- 최신순 정렬
CREATE INDEX IF NOT EXISTS idx_prompt_templates_updated_at
  ON public.prompt_templates(updated_at DESC);

-- 인기순 정렬
CREATE INDEX IF NOT EXISTS idx_prompt_templates_usage_count
  ON public.prompt_templates(usage_count DESC);

-- 복합 인덱스 (카테고리 + 공개여부)
CREATE INDEX IF NOT EXISTS idx_prompt_templates_category_public
  ON public.prompt_templates(category, is_public, is_system);

-- 버전 추적 (parent_id 기반 포크 관계)
CREATE INDEX IF NOT EXISTS idx_prompt_templates_parent
  ON public.prompt_templates(parent_id)
  WHERE parent_id IS NOT NULL;

-- ============================================================================
-- 3. RLS (Row Level Security) 정책
-- ============================================================================

-- RLS 활성화
ALTER TABLE public.prompt_templates ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 템플릿 조회 가능
CREATE POLICY "Users can view own templates"
  ON public.prompt_templates
  FOR SELECT
  TO authenticated
  USING (auth.uid() = created_by);

-- 모든 사용자는 공개 템플릿 조회 가능
CREATE POLICY "Users can view public templates"
  ON public.prompt_templates
  FOR SELECT
  TO authenticated
  USING (is_public = true);

-- 모든 사용자는 시스템 템플릿 조회 가능
CREATE POLICY "Users can view system templates"
  ON public.prompt_templates
  FOR SELECT
  TO authenticated
  USING (is_system = true);

-- 익명 사용자는 공개/시스템 템플릿만 조회 가능
CREATE POLICY "Anonymous users can view public and system templates"
  ON public.prompt_templates
  FOR SELECT
  TO anon
  USING (is_public = true OR is_system = true);

-- 사용자는 자신의 템플릿 생성 가능
CREATE POLICY "Users can insert own templates"
  ON public.prompt_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    AND is_system = false  -- 일반 사용자는 시스템 템플릿 생성 불가
  );

-- 사용자는 자신의 템플릿 수정 가능 (시스템 템플릿 제외)
CREATE POLICY "Users can update own templates"
  ON public.prompt_templates
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by AND is_system = false);

-- 사용자는 자신의 템플릿 삭제 가능 (시스템 템플릿 제외)
CREATE POLICY "Users can delete own templates"
  ON public.prompt_templates
  FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by AND is_system = false);

-- 관리자 전체 접근 정책
CREATE POLICY "Admins can manage all templates"
  ON public.prompt_templates
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin')
    )
  );

-- 서비스 역할 전체 접근 정책 (Edge Function용)
CREATE POLICY "Service role can manage templates"
  ON public.prompt_templates
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 4. updated_at 자동 업데이트 트리거
-- ============================================================================

CREATE OR REPLACE FUNCTION update_prompt_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

DROP TRIGGER IF EXISTS trigger_prompt_templates_updated_at
  ON public.prompt_templates;

CREATE TRIGGER trigger_prompt_templates_updated_at
  BEFORE UPDATE ON public.prompt_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_prompt_templates_updated_at();

-- ============================================================================
-- 5. 유틸리티 함수
-- ============================================================================

-- 템플릿 사용 횟수 증가 함수
CREATE OR REPLACE FUNCTION increment_template_usage(p_template_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.prompt_templates
  SET usage_count = usage_count + 1
  WHERE id = p_template_id;

  RETURN FOUND;
END;
$$;

COMMENT ON FUNCTION increment_template_usage IS '템플릿 사용 횟수 증가';

-- 템플릿 포크 (버전 생성) 함수
CREATE OR REPLACE FUNCTION fork_prompt_template(
  p_parent_id UUID,
  p_user_id UUID,
  p_name TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_id UUID;
  v_parent_version TEXT;
BEGIN
  -- 부모 템플릿 버전 조회
  SELECT version INTO v_parent_version
  FROM public.prompt_templates
  WHERE id = p_parent_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION '부모 템플릿을 찾을 수 없습니다: %', p_parent_id;
  END IF;

  -- 새 템플릿 생성 (부모 내용 복사)
  INSERT INTO public.prompt_templates (
    name,
    description,
    category,
    system_prompt,
    user_prompt_template,
    variables,
    output_schema,
    is_public,
    is_system,
    service_id,
    version,
    parent_id,
    created_by
  )
  SELECT
    COALESCE(p_name, name || ' (Fork)'),
    COALESCE(p_description, description),
    category,
    system_prompt,
    user_prompt_template,
    variables,
    output_schema,
    false,  -- 포크된 템플릿은 기본적으로 비공개
    false,  -- 시스템 템플릿 아님
    service_id,
    '1.0.0',  -- 새 버전 시작
    p_parent_id,
    p_user_id
  FROM public.prompt_templates
  WHERE id = p_parent_id
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$;

COMMENT ON FUNCTION fork_prompt_template IS '템플릿 포크하여 새 버전 생성';

-- 인기 템플릿 조회 함수
CREATE OR REPLACE FUNCTION get_popular_templates(
  p_category TEXT DEFAULT NULL,
  p_service_id TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  category TEXT,
  service_id TEXT,
  usage_count INTEGER,
  created_by UUID,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    t.id,
    t.name,
    t.description,
    t.category,
    t.service_id,
    t.usage_count,
    t.created_by,
    t.created_at
  FROM public.prompt_templates t
  WHERE
    (t.is_public = true OR t.is_system = true)
    AND (p_category IS NULL OR t.category = p_category)
    AND (p_service_id IS NULL OR t.service_id = p_service_id)
  ORDER BY t.usage_count DESC, t.created_at DESC
  LIMIT p_limit;
$$;

COMMENT ON FUNCTION get_popular_templates IS '인기 템플릿 조회 (사용 횟수 기준)';

-- ============================================================================
-- 6. 테이블 코멘트
-- ============================================================================

COMMENT ON TABLE public.prompt_templates IS '프롬프트 템플릿 저장소 - 사용자 정의, 시스템, 서비스별 템플릿 관리';
COMMENT ON COLUMN public.prompt_templates.name IS '템플릿명';
COMMENT ON COLUMN public.prompt_templates.description IS '템플릿 설명';
COMMENT ON COLUMN public.prompt_templates.category IS 'rfp, requirements, plan, report, chat, custom';
COMMENT ON COLUMN public.prompt_templates.system_prompt IS '시스템 프롬프트 (역할 정의)';
COMMENT ON COLUMN public.prompt_templates.user_prompt_template IS '사용자 프롬프트 템플릿 (변수 포함)';
COMMENT ON COLUMN public.prompt_templates.variables IS 'JSON array of {name, type, required, default, description}';
COMMENT ON COLUMN public.prompt_templates.output_schema IS 'JSON Schema 형식의 출력 스키마';
COMMENT ON COLUMN public.prompt_templates.is_public IS '공개 템플릿 여부 (다른 사용자 조회 가능)';
COMMENT ON COLUMN public.prompt_templates.is_system IS '시스템 기본 템플릿 여부 (수정 불가)';
COMMENT ON COLUMN public.prompt_templates.service_id IS 'minu-find, minu-frame, minu-build, minu-keep, or null for global';
COMMENT ON COLUMN public.prompt_templates.version IS 'Semantic Versioning 형식 (예: 1.0.0)';
COMMENT ON COLUMN public.prompt_templates.parent_id IS '부모 템플릿 ID (포크 관계 추적)';
COMMENT ON COLUMN public.prompt_templates.created_by IS '작성자 사용자 ID';
COMMENT ON COLUMN public.prompt_templates.usage_count IS '사용 횟수 (increment_template_usage 함수로 증가)';

-- ============================================================================
-- 7. 초기 시스템 템플릿 삽입 (샘플)
-- ============================================================================

-- 서비스 역할로 실행하여 시스템 템플릿 생성
DO $$
DECLARE
  v_system_user_id UUID;
BEGIN
  -- 시스템 사용자 ID 가져오기 (첫 번째 관리자)
  SELECT user_id INTO v_system_user_id
  FROM public.admins
  WHERE role = 'super_admin'
  LIMIT 1;

  -- 시스템 사용자가 없으면 건너뛰기
  IF v_system_user_id IS NULL THEN
    RAISE NOTICE '시스템 사용자를 찾을 수 없어 시스템 템플릿을 건너뜁니다';
    RETURN;
  END IF;

  -- RFP 생성기 기본 템플릿
  INSERT INTO public.prompt_templates (
    name,
    description,
    category,
    system_prompt,
    user_prompt_template,
    variables,
    is_public,
    is_system,
    service_id,
    created_by
  ) VALUES (
    'RFP 생성기 기본 템플릿',
    '정부 SI 프로젝트용 RFP 생성 기본 템플릿',
    'rfp',
    '당신은 정부 SI 프로젝트의 RFP(제안요청서)를 작성하는 전문가입니다. 사용자가 제공한 프로젝트 정보를 바탕으로 체계적이고 전문적인 RFP를 생성하세요.',
    '다음 프로젝트의 RFP를 작성해주세요:

프로젝트명: {{projectName}}
고객/기관명: {{clientName}}
배경 및 목적: {{background}}
주요 목표: {{objectives}}
예상 예산: {{budget}}원
예상 기간: {{duration}}

요구사항:
{{requirements}}',
    '[
      {"name": "projectName", "type": "string", "required": true, "description": "프로젝트명"},
      {"name": "clientName", "type": "string", "required": true, "description": "고객/기관명"},
      {"name": "background", "type": "string", "required": true, "description": "프로젝트 배경 및 목적"},
      {"name": "objectives", "type": "string", "required": true, "description": "주요 목표 (줄바꿈 구분)"},
      {"name": "budget", "type": "number", "required": false, "description": "예상 예산 (원)"},
      {"name": "duration", "type": "string", "required": false, "description": "예상 기간 (예: 6개월)"},
      {"name": "requirements", "type": "string", "required": false, "description": "추가 요구사항"}
    ]'::JSONB,
    true,
    true,
    'minu-frame',
    v_system_user_id
  )
  ON CONFLICT DO NOTHING;

  -- 요구사항 분석 기본 템플릿
  INSERT INTO public.prompt_templates (
    name,
    description,
    category,
    system_prompt,
    user_prompt_template,
    variables,
    is_public,
    is_system,
    created_by
  ) VALUES (
    '요구사항 분석 기본 템플릿',
    '원시 요구사항을 구조화하고 분석하는 기본 템플릿',
    'requirements',
    '당신은 소프트웨어 요구사항 분석 전문가입니다. 사용자가 제공한 원시 요구사항을 명확하게 구조화하고, 누락되거나 모호한 부분을 파악하여 개선 방안을 제시하세요.',
    '다음 요구사항을 분석하고 구조화해주세요:

프로젝트명: {{projectName}}
원시 요구사항:
{{rawRequirements}}

추가 컨텍스트: {{context}}',
    '[
      {"name": "projectName", "type": "string", "required": true, "description": "프로젝트명"},
      {"name": "rawRequirements", "type": "string", "required": true, "description": "원시 요구사항 텍스트"},
      {"name": "context", "type": "string", "required": false, "description": "추가 컨텍스트"}
    ]'::JSONB,
    true,
    true,
    v_system_user_id
  )
  ON CONFLICT DO NOTHING;

  RAISE NOTICE '시스템 템플릿 2개 생성 완료';
END $$;

-- ============================================================================
-- 마이그레이션 완료
-- ============================================================================

COMMIT;

-- 마이그레이션 확인
DO $$
BEGIN
  RAISE NOTICE '프롬프트 템플릿 마이그레이션 완료';
  RAISE NOTICE '- prompt_templates 테이블 생성됨';
  RAISE NOTICE '- RLS 정책 9개 적용됨';
  RAISE NOTICE '- 유틸리티 함수 3개 생성됨';
  RAISE NOTICE '- 시스템 템플릿 2개 생성됨 (관리자 존재 시)';
END $$;

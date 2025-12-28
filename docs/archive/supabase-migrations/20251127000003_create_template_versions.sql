-- Template Version Management
-- Migration: 20251127000003_create_template_versions.sql
-- Author: Claude AI
-- Date: 2025-11-27
-- Description: 템플릿 버전 관리 시스템 구현

-- =====================================================
-- 1. TEMPLATE_VERSIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.template_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.document_templates(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  content JSONB NOT NULL,
  change_summary TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (template_id, version)
);

-- =====================================================
-- 2. ADD CURRENT_VERSION TO DOCUMENT_TEMPLATES
-- =====================================================
-- document_templates에 current_version 컬럼 추가 (없으면)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'document_templates'
    AND column_name = 'current_version'
  ) THEN
    ALTER TABLE public.document_templates ADD COLUMN current_version INTEGER DEFAULT 1;
  END IF;
END
$$;

-- =====================================================
-- 3. INDEXES
-- =====================================================
-- 템플릿별 버전 조회 최적화
CREATE INDEX idx_template_versions_template ON public.template_versions(template_id);

-- 날짜별 정렬 최적화
CREATE INDEX idx_template_versions_date ON public.template_versions(created_at DESC);

-- 템플릿+버전 복합 조회 최적화
CREATE INDEX idx_template_versions_template_version ON public.template_versions(template_id, version DESC);

-- =====================================================
-- 4. RLS POLICIES
-- =====================================================
ALTER TABLE public.template_versions ENABLE ROW LEVEL SECURITY;

-- 인증된 사용자는 버전 조회 가능
CREATE POLICY "인증된 사용자는 버전 조회 가능"
  ON public.template_versions FOR SELECT
  TO authenticated
  USING (true);

-- 관리자만 버전 생성 가능
CREATE POLICY "관리자만 버전 생성 가능"
  ON public.template_versions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'admin'
    )
  );

-- 관리자만 버전 삭제 가능
CREATE POLICY "관리자만 버전 삭제 가능"
  ON public.template_versions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'admin'
    )
  );

-- =====================================================
-- 5. AUTO VERSION TRIGGER
-- =====================================================
-- 버전 자동 생성 트리거 함수
CREATE OR REPLACE FUNCTION public.auto_create_template_version()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 콘텐츠가 실제로 변경된 경우에만 새 버전 생성
  IF OLD.content IS DISTINCT FROM NEW.content THEN
    -- current_version 증가
    NEW.current_version := COALESCE(NEW.current_version, OLD.current_version, 1) + 1;

    -- 새 버전 레코드 삽입
    INSERT INTO public.template_versions (
      template_id,
      version,
      content,
      change_summary,
      created_by
    )
    VALUES (
      NEW.id,
      NEW.current_version,
      NEW.content,
      COALESCE(
        TG_ARGV[0],
        'Auto-saved version on update at ' || NOW()::TEXT
      ),
      auth.uid()
    );
  END IF;

  RETURN NEW;
END;
$$;

-- 트리거 생성 (기존 트리거 삭제 후 재생성)
DROP TRIGGER IF EXISTS template_version_trigger ON public.document_templates;
CREATE TRIGGER template_version_trigger
  BEFORE UPDATE OF content ON public.document_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_template_version();

-- =====================================================
-- 6. HELPER FUNCTIONS
-- =====================================================

-- 특정 템플릿의 버전 목록 조회
CREATE OR REPLACE FUNCTION public.get_template_versions(p_template_id UUID)
RETURNS TABLE (
  id UUID,
  version INTEGER,
  content JSONB,
  change_summary TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ,
  creator_email TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    tv.id,
    tv.version,
    tv.content,
    tv.change_summary,
    tv.created_by,
    tv.created_at,
    au.email as creator_email
  FROM public.template_versions tv
  LEFT JOIN auth.users au ON tv.created_by = au.id
  WHERE tv.template_id = p_template_id
  ORDER BY tv.version DESC;
END;
$$;

-- 특정 버전으로 복원
CREATE OR REPLACE FUNCTION public.restore_template_version(
  p_template_id UUID,
  p_version_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_version_content JSONB;
  v_result JSONB;
BEGIN
  -- 관리자 권한 확인
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
    AND r.name = 'admin'
  ) THEN
    RAISE EXCEPTION '관리자 권한이 필요합니다';
  END IF;

  -- 버전 콘텐츠 조회
  SELECT content INTO v_version_content
  FROM public.template_versions
  WHERE id = p_version_id
  AND template_id = p_template_id;

  IF v_version_content IS NULL THEN
    RAISE EXCEPTION '해당 버전을 찾을 수 없습니다';
  END IF;

  -- 템플릿 업데이트 (트리거가 자동으로 새 버전 생성)
  UPDATE public.document_templates
  SET
    content = v_version_content,
    updated_at = NOW()
  WHERE id = p_template_id
  RETURNING jsonb_build_object(
    'id', id,
    'name', name,
    'current_version', current_version,
    'updated_at', updated_at
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- 버전 통계 조회
CREATE OR REPLACE FUNCTION public.get_template_version_stats(p_template_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stats JSONB;
BEGIN
  SELECT jsonb_build_object(
    'template_id', p_template_id,
    'total_versions', COUNT(*),
    'current_version', MAX(version),
    'first_version_date', MIN(created_at),
    'last_version_date', MAX(created_at),
    'unique_contributors', COUNT(DISTINCT created_by)
  )
  INTO v_stats
  FROM public.template_versions
  WHERE template_id = p_template_id;

  RETURN v_stats;
END;
$$;

-- =====================================================
-- 7. COMMENTS
-- =====================================================
COMMENT ON TABLE public.template_versions IS '템플릿 버전 히스토리 테이블';
COMMENT ON COLUMN public.template_versions.id IS '버전 고유 ID';
COMMENT ON COLUMN public.template_versions.template_id IS '템플릿 ID (외래키)';
COMMENT ON COLUMN public.template_versions.version IS '버전 번호';
COMMENT ON COLUMN public.template_versions.content IS '해당 버전의 템플릿 콘텐츠 (JSONB)';
COMMENT ON COLUMN public.template_versions.change_summary IS '변경 요약';
COMMENT ON COLUMN public.template_versions.created_by IS '버전 생성자 ID';
COMMENT ON COLUMN public.template_versions.created_at IS '버전 생성 시간';

COMMENT ON FUNCTION public.auto_create_template_version() IS '템플릿 콘텐츠 변경 시 자동으로 새 버전 생성';
COMMENT ON FUNCTION public.get_template_versions(UUID) IS '특정 템플릿의 버전 목록 조회';
COMMENT ON FUNCTION public.restore_template_version(UUID, UUID) IS '특정 버전으로 템플릿 복원';
COMMENT ON FUNCTION public.get_template_version_stats(UUID) IS '템플릿 버전 통계 조회';

-- =====================================================
-- 8. INITIAL VERSION SEEDING
-- =====================================================
-- 기존 템플릿에 대한 초기 버전 생성 (current_version = 1)
DO $$
DECLARE
  template_record RECORD;
BEGIN
  FOR template_record IN
    SELECT id, content, created_by, current_version
    FROM public.document_templates
    WHERE NOT EXISTS (
      SELECT 1 FROM public.template_versions tv
      WHERE tv.template_id = document_templates.id
    )
  LOOP
    INSERT INTO public.template_versions (
      template_id,
      version,
      content,
      change_summary,
      created_by
    )
    VALUES (
      template_record.id,
      COALESCE(template_record.current_version, 1),
      template_record.content,
      'Initial version',
      template_record.created_by
    );
  END LOOP;
END
$$;

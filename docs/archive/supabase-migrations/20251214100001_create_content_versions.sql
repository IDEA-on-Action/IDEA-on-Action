-- =====================================================
-- Content Versions Table
-- CMS Phase 1: 콘텐츠 버전 관리
-- Created: 2025-12-14
-- Author: Claude AI (Agent 1)
-- =====================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. Create content_versions table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.content_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 엔티티 참조
  entity_type VARCHAR(50) NOT NULL, -- 'blog_post', 'portfolio_item', 'roadmap_item', 'lab_item' 등
  entity_id UUID NOT NULL,

  -- 버전 정보
  version_number INTEGER NOT NULL DEFAULT 1,

  -- 전체 콘텐츠 스냅샷 (JSONB for flexibility)
  content JSONB NOT NULL,

  -- 변경 요약
  change_summary TEXT,

  -- 감사 필드
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- 엔티티당 고유한 버전 번호 보장
  CONSTRAINT unique_version UNIQUE(entity_type, entity_id, version_number)
);

-- =====================================================
-- 2. Create indexes for performance
-- =====================================================

-- 엔티티별 버전 조회용 인덱스
CREATE INDEX IF NOT EXISTS idx_content_versions_entity
  ON public.content_versions(entity_type, entity_id, version_number DESC);

-- 생성 일시별 조회용 인덱스
CREATE INDEX IF NOT EXISTS idx_content_versions_created
  ON public.content_versions(created_at DESC);

-- 생성자별 조회용 인덱스
CREATE INDEX IF NOT EXISTS idx_content_versions_created_by
  ON public.content_versions(created_by);

-- 엔티티 타입별 조회용 인덱스
CREATE INDEX IF NOT EXISTS idx_content_versions_entity_type
  ON public.content_versions(entity_type);

-- =====================================================
-- 3. Enable Row Level Security
-- =====================================================
ALTER TABLE public.content_versions ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 4. RLS Policies
-- =====================================================

-- SELECT: 인증된 사용자 (admin 역할)
CREATE POLICY "Admin users can read content versions"
  ON public.content_versions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin', 'manager')
    )
  );

-- INSERT: admin 역할만
CREATE POLICY "Admin users can create content versions"
  ON public.content_versions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin', 'manager')
    )
    AND auth.uid() = created_by
  );

-- UPDATE: 없음 (버전은 불변)
-- 버전 레코드는 생성 후 수정할 수 없음

-- DELETE: super_admin만
CREATE POLICY "Super admin can delete content versions"
  ON public.content_versions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE user_id = auth.uid()
      AND role = 'super_admin'
    )
  );

-- =====================================================
-- 5. Helper Functions
-- =====================================================

-- 다음 버전 번호 조회 함수
CREATE OR REPLACE FUNCTION public.get_next_version_number_v2(
  p_entity_type VARCHAR(50),
  p_entity_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max_version INTEGER;
BEGIN
  SELECT COALESCE(MAX(version_number), 0) INTO v_max_version
  FROM public.content_versions
  WHERE entity_type = p_entity_type
    AND entity_id = p_entity_id;

  RETURN v_max_version + 1;
END;
$$;

-- 새 버전 생성 함수
CREATE OR REPLACE FUNCTION public.create_new_content_version(
  p_entity_type VARCHAR(50),
  p_entity_id UUID,
  p_content JSONB,
  p_change_summary TEXT DEFAULT NULL
)
RETURNS public.content_versions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next_version INTEGER;
  v_result public.content_versions;
BEGIN
  -- 다음 버전 번호 가져오기
  v_next_version := public.get_next_version_number_v2(p_entity_type, p_entity_id);

  -- 새 버전 삽입
  INSERT INTO public.content_versions (
    entity_type,
    entity_id,
    version_number,
    content,
    change_summary,
    created_by
  )
  VALUES (
    p_entity_type,
    p_entity_id,
    v_next_version,
    p_content,
    p_change_summary,
    auth.uid()
  )
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

-- 버전 히스토리 조회 함수 (페이지네이션 지원)
CREATE OR REPLACE FUNCTION public.get_entity_version_history(
  p_entity_type VARCHAR(50),
  p_entity_id UUID,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  entity_type VARCHAR(50),
  entity_id UUID,
  version_number INTEGER,
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
    cv.id,
    cv.entity_type,
    cv.entity_id,
    cv.version_number,
    cv.content,
    cv.change_summary,
    cv.created_by,
    cv.created_at,
    u.email as creator_email
  FROM public.content_versions cv
  LEFT JOIN auth.users u ON cv.created_by = u.id
  WHERE cv.entity_type = p_entity_type
    AND cv.entity_id = p_entity_id
  ORDER BY cv.version_number DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- 특정 버전 조회 함수
CREATE OR REPLACE FUNCTION public.get_specific_version(
  p_entity_type VARCHAR(50),
  p_entity_id UUID,
  p_version_number INTEGER
)
RETURNS public.content_versions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result public.content_versions;
BEGIN
  SELECT * INTO v_result
  FROM public.content_versions
  WHERE entity_type = p_entity_type
    AND entity_id = p_entity_id
    AND version_number = p_version_number;

  RETURN v_result;
END;
$$;

-- 최신 버전 조회 함수
CREATE OR REPLACE FUNCTION public.get_latest_version(
  p_entity_type VARCHAR(50),
  p_entity_id UUID
)
RETURNS public.content_versions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result public.content_versions;
BEGIN
  SELECT * INTO v_result
  FROM public.content_versions
  WHERE entity_type = p_entity_type
    AND entity_id = p_entity_id
  ORDER BY version_number DESC
  LIMIT 1;

  RETURN v_result;
END;
$$;

-- 버전 개수 조회 함수
CREATE OR REPLACE FUNCTION public.count_entity_versions(
  p_entity_type VARCHAR(50),
  p_entity_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.content_versions
  WHERE entity_type = p_entity_type
    AND entity_id = p_entity_id;

  RETURN v_count;
END;
$$;

-- =====================================================
-- 6. 선택사항: 버전 자동 생성 트리거
-- =====================================================

-- blog_posts 업데이트 시 자동 버전 생성 트리거 함수
CREATE OR REPLACE FUNCTION public.auto_version_blog_posts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- UPDATE 시에만 실행 (INSERT는 제외)
  IF (TG_OP = 'UPDATE') THEN
    -- 중요 필드가 변경된 경우에만 버전 생성
    IF (OLD.title IS DISTINCT FROM NEW.title
        OR OLD.content IS DISTINCT FROM NEW.content
        OR OLD.slug IS DISTINCT FROM NEW.slug
        OR OLD.status IS DISTINCT FROM NEW.status) THEN

      -- 새 버전 생성
      PERFORM public.create_new_content_version(
        'blog_post',
        NEW.id,
        row_to_json(NEW)::JSONB,
        'Auto-generated on update'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- blog_posts 테이블에 트리거 연결 (선택사항 - 주석 처리됨)
-- 필요 시 아래 주석을 해제하여 활성화
/*
DROP TRIGGER IF EXISTS trg_auto_version_blog_posts ON public.blog_posts;
CREATE TRIGGER trg_auto_version_blog_posts
  AFTER UPDATE ON public.blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_version_blog_posts();
*/

-- portfolio_items 업데이트 시 자동 버전 생성 트리거 함수
CREATE OR REPLACE FUNCTION public.auto_version_portfolio_items()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'UPDATE') THEN
    IF (OLD.title IS DISTINCT FROM NEW.title
        OR OLD.description IS DISTINCT FROM NEW.description
        OR OLD.status IS DISTINCT FROM NEW.status) THEN

      PERFORM public.create_new_content_version(
        'portfolio_item',
        NEW.id,
        row_to_json(NEW)::JSONB,
        'Auto-generated on update'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- portfolio_items 테이블에 트리거 연결 (선택사항 - 주석 처리됨)
/*
DROP TRIGGER IF EXISTS trg_auto_version_portfolio_items ON public.portfolio_items;
CREATE TRIGGER trg_auto_version_portfolio_items
  AFTER UPDATE ON public.portfolio_items
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_version_portfolio_items();
*/

-- =====================================================
-- 7. Grant permissions
-- =====================================================
GRANT SELECT, INSERT, DELETE ON public.content_versions TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_next_version_number_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_new_content_version TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_entity_version_history TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_specific_version TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_latest_version TO authenticated;
GRANT EXECUTE ON FUNCTION public.count_entity_versions TO authenticated;

-- =====================================================
-- 8. Comments
-- =====================================================
COMMENT ON TABLE public.content_versions IS 'CMS 콘텐츠의 버전 히스토리 저장 (blog_posts, portfolio_items, roadmap_items 등)';
COMMENT ON COLUMN public.content_versions.entity_type IS '콘텐츠 엔티티 타입 (예: blog_post, portfolio_item, roadmap_item)';
COMMENT ON COLUMN public.content_versions.entity_id IS '원본 콘텐츠 ID 참조';
COMMENT ON COLUMN public.content_versions.version_number IS '1부터 시작하는 순차적 버전 번호';
COMMENT ON COLUMN public.content_versions.content IS '해당 버전의 전체 콘텐츠 스냅샷';
COMMENT ON COLUMN public.content_versions.change_summary IS '이 버전의 변경 사항 설명 (선택사항)';
COMMENT ON COLUMN public.content_versions.created_by IS '버전을 생성한 사용자';
COMMENT ON COLUMN public.content_versions.created_at IS '버전 생성 일시';

COMMENT ON FUNCTION public.get_next_version_number_v2 IS '특정 엔티티의 다음 버전 번호 조회';
COMMENT ON FUNCTION public.create_new_content_version IS '자동 증가 버전 번호로 새 버전 생성';
COMMENT ON FUNCTION public.get_entity_version_history IS '엔티티의 페이지네이션된 버전 히스토리 조회';
COMMENT ON FUNCTION public.get_specific_version IS '특정 버전 번호의 버전 조회';
COMMENT ON FUNCTION public.get_latest_version IS '엔티티의 최신 버전 조회';
COMMENT ON FUNCTION public.count_entity_versions IS '엔티티의 총 버전 수 조회';
COMMENT ON FUNCTION public.auto_version_blog_posts IS 'blog_posts 업데이트 시 자동으로 버전 생성';
COMMENT ON FUNCTION public.auto_version_portfolio_items IS 'portfolio_items 업데이트 시 자동으로 버전 생성';

-- =====================================================
-- Migration Complete
-- =====================================================

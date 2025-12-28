-- 컨텐츠 버전 관리 시스템
-- 블로그, 공지사항, 서비스 등의 변경 이력 추적

-- ============================================
-- 1. content_versions 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS public.content_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 컨텐츠 참조
  content_type TEXT NOT NULL CHECK (content_type IN ('blog_post', 'notice', 'service', 'portfolio', 'page')),
  content_id UUID NOT NULL,

  -- 버전 정보
  version_number INTEGER NOT NULL DEFAULT 1,

  -- 스냅샷 데이터
  title TEXT,
  content TEXT,
  metadata JSONB DEFAULT '{}',

  -- 변경 정보
  change_summary TEXT,
  changed_fields TEXT[], -- 변경된 필드 목록

  -- 작성자 및 시간
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- 복원 정보
  is_current BOOLEAN DEFAULT false,
  restored_from UUID REFERENCES public.content_versions(id),

  UNIQUE (content_type, content_id, version_number)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_content_versions_content ON public.content_versions(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_content_versions_created_at ON public.content_versions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_versions_current ON public.content_versions(content_type, content_id) WHERE is_current = true;

-- ============================================
-- 2. RLS 정책
-- ============================================
ALTER TABLE public.content_versions ENABLE ROW LEVEL SECURITY;

-- 관리자만 조회 가능
CREATE POLICY "content_versions_admin_read" ON public.content_versions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE admins.user_id = auth.uid()
    )
  );

-- Service Role만 삽입/수정 가능
CREATE POLICY "content_versions_service_insert" ON public.content_versions
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "content_versions_service_update" ON public.content_versions
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 3. 버전 생성 함수
-- ============================================

-- 새 버전 생성
CREATE OR REPLACE FUNCTION create_content_version(
  p_content_type TEXT,
  p_content_id UUID,
  p_title TEXT,
  p_content TEXT,
  p_metadata JSONB DEFAULT '{}',
  p_change_summary TEXT DEFAULT NULL,
  p_changed_fields TEXT[] DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_version_number INTEGER;
  v_version_id UUID;
BEGIN
  -- 현재 버전 번호 조회
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_version_number
  FROM public.content_versions
  WHERE content_type = p_content_type AND content_id = p_content_id;

  -- 이전 버전의 is_current 해제
  UPDATE public.content_versions
  SET is_current = false
  WHERE content_type = p_content_type
    AND content_id = p_content_id
    AND is_current = true;

  -- 새 버전 삽입
  INSERT INTO public.content_versions (
    content_type,
    content_id,
    version_number,
    title,
    content,
    metadata,
    change_summary,
    changed_fields,
    created_by,
    is_current
  ) VALUES (
    p_content_type,
    p_content_id,
    v_version_number,
    p_title,
    p_content,
    p_metadata,
    p_change_summary,
    p_changed_fields,
    p_user_id,
    true
  )
  RETURNING id INTO v_version_id;

  RETURN v_version_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. 버전 조회 함수
-- ============================================

-- 특정 컨텐츠의 버전 히스토리
CREATE OR REPLACE FUNCTION get_content_versions(
  p_content_type TEXT,
  p_content_id UUID,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  version_number INTEGER,
  title TEXT,
  change_summary TEXT,
  changed_fields TEXT[],
  created_by UUID,
  created_at TIMESTAMPTZ,
  is_current BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cv.id,
    cv.version_number,
    cv.title,
    cv.change_summary,
    cv.changed_fields,
    cv.created_by,
    cv.created_at,
    cv.is_current
  FROM public.content_versions cv
  WHERE cv.content_type = p_content_type
    AND cv.content_id = p_content_id
  ORDER BY cv.version_number DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 특정 버전 상세 조회
CREATE OR REPLACE FUNCTION get_content_version_detail(
  p_version_id UUID
)
RETURNS TABLE (
  id UUID,
  content_type TEXT,
  content_id UUID,
  version_number INTEGER,
  title TEXT,
  content TEXT,
  metadata JSONB,
  change_summary TEXT,
  changed_fields TEXT[],
  created_by UUID,
  created_at TIMESTAMPTZ,
  is_current BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cv.id,
    cv.content_type,
    cv.content_id,
    cv.version_number,
    cv.title,
    cv.content,
    cv.metadata,
    cv.change_summary,
    cv.changed_fields,
    cv.created_by,
    cv.created_at,
    cv.is_current
  FROM public.content_versions cv
  WHERE cv.id = p_version_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. 버전 복원 함수
-- ============================================

CREATE OR REPLACE FUNCTION restore_content_version(
  p_version_id UUID,
  p_user_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_source RECORD;
  v_new_version_id UUID;
BEGIN
  -- 복원할 버전 조회
  SELECT * INTO v_source
  FROM public.content_versions
  WHERE id = p_version_id;

  IF v_source IS NULL THEN
    RAISE EXCEPTION 'Version not found: %', p_version_id;
  END IF;

  -- 새 버전으로 복원 (버전 번호 증가)
  SELECT create_content_version(
    v_source.content_type,
    v_source.content_id,
    v_source.title,
    v_source.content,
    v_source.metadata,
    FORMAT('버전 %s에서 복원', v_source.version_number),
    NULL,
    p_user_id
  ) INTO v_new_version_id;

  -- 복원 출처 기록
  UPDATE public.content_versions
  SET restored_from = p_version_id
  WHERE id = v_new_version_id;

  RETURN v_new_version_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. 두 버전 비교 함수
-- ============================================

CREATE OR REPLACE FUNCTION compare_content_versions(
  p_version_id_1 UUID,
  p_version_id_2 UUID
)
RETURNS TABLE (
  field_name TEXT,
  old_value TEXT,
  new_value TEXT
) AS $$
DECLARE
  v1 RECORD;
  v2 RECORD;
BEGIN
  SELECT * INTO v1 FROM public.content_versions WHERE id = p_version_id_1;
  SELECT * INTO v2 FROM public.content_versions WHERE id = p_version_id_2;

  -- 제목 비교
  IF v1.title IS DISTINCT FROM v2.title THEN
    RETURN QUERY SELECT 'title'::TEXT, v1.title, v2.title;
  END IF;

  -- 내용 비교 (길이만 표시)
  IF v1.content IS DISTINCT FROM v2.content THEN
    RETURN QUERY SELECT
      'content'::TEXT,
      FORMAT('(%s자)', LENGTH(COALESCE(v1.content, ''))),
      FORMAT('(%s자)', LENGTH(COALESCE(v2.content, '')));
  END IF;

  -- 메타데이터 비교
  IF v1.metadata IS DISTINCT FROM v2.metadata THEN
    RETURN QUERY SELECT
      'metadata'::TEXT,
      v1.metadata::TEXT,
      v2.metadata::TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. 자동 버전 생성 트리거 (blog_posts용)
-- ============================================

CREATE OR REPLACE FUNCTION auto_version_blog_post()
RETURNS TRIGGER AS $$
DECLARE
  v_changed_fields TEXT[] := '{}';
BEGIN
  -- 변경된 필드 감지
  IF OLD.title IS DISTINCT FROM NEW.title THEN
    v_changed_fields := array_append(v_changed_fields, 'title');
  END IF;
  IF OLD.content IS DISTINCT FROM NEW.content THEN
    v_changed_fields := array_append(v_changed_fields, 'content');
  END IF;
  IF OLD.excerpt IS DISTINCT FROM NEW.excerpt THEN
    v_changed_fields := array_append(v_changed_fields, 'excerpt');
  END IF;
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    v_changed_fields := array_append(v_changed_fields, 'status');
  END IF;

  -- 변경이 있는 경우에만 버전 생성
  IF array_length(v_changed_fields, 1) > 0 THEN
    PERFORM create_content_version(
      'blog_post',
      NEW.id,
      NEW.title,
      NEW.content,
      jsonb_build_object(
        'excerpt', NEW.excerpt,
        'status', NEW.status,
        'slug', NEW.slug,
        'category_id', NEW.category_id
      ),
      NULL,
      v_changed_fields,
      auth.uid()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- blog_posts 트리거 (테이블 존재 시에만 생성)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'blog_posts') THEN
    DROP TRIGGER IF EXISTS trigger_auto_version_blog_post ON public.blog_posts;
    CREATE TRIGGER trigger_auto_version_blog_post
      AFTER UPDATE ON public.blog_posts
      FOR EACH ROW
      EXECUTE FUNCTION auto_version_blog_post();
  END IF;
END $$;

-- ============================================
-- 8. 통계 뷰
-- ============================================

CREATE OR REPLACE VIEW public.content_version_stats AS
SELECT
  content_type,
  COUNT(DISTINCT content_id) AS content_count,
  COUNT(*) AS total_versions,
  ROUND(AVG(version_number), 1) AS avg_versions_per_content,
  MAX(created_at) AS last_version_at
FROM public.content_versions
GROUP BY content_type;

-- ============================================
-- 9. 코멘트
-- ============================================

COMMENT ON TABLE public.content_versions IS '컨텐츠 버전 관리 (변경 이력 추적)';
COMMENT ON FUNCTION create_content_version IS '새 컨텐츠 버전 생성';
COMMENT ON FUNCTION get_content_versions IS '컨텐츠의 버전 히스토리 조회';
COMMENT ON FUNCTION restore_content_version IS '이전 버전으로 복원';
COMMENT ON FUNCTION compare_content_versions IS '두 버전 간 차이 비교';

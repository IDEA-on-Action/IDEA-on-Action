-- ============================================================================
-- RAG (Retrieval-Augmented Generation) 문서 관리 시스템
--
-- 파일: 20251125200000_create_rag_documents.sql
-- 작성일: 2025-11-25
-- 버전: 2.18.0
--
-- 테이블:
-- 1. rag_documents - RAG 소스 문서 관리
--
-- 기능:
-- - 다양한 소스의 문서 저장 (파일, URL, 서비스 데이터)
-- - 프로젝트 및 서비스별 문서 관리
-- - 문서 카테고리 및 태그 지원
-- - 임베딩 처리 상태 추적
-- - 공개/비공개 문서 지원
-- ============================================================================

-- 트랜잭션 시작
BEGIN;

-- ============================================================================
-- 1. pgvector 확장 활성화
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS vector;

COMMENT ON EXTENSION vector IS 'pgvector extension for vector similarity search';

-- ============================================================================
-- 2. rag_documents 테이블
-- RAG 소스 문서 관리
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.rag_documents (
  -- 기본 식별자
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 소유권
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 문서 메타데이터
  title TEXT NOT NULL,
  content TEXT NOT NULL,

  -- 소스 정보
  source_type TEXT NOT NULL,
  source_url TEXT,

  -- 서비스 및 프로젝트 연결
  service_id TEXT,
  project_id TEXT REFERENCES public.projects(id) ON DELETE SET NULL,

  -- 카테고리 및 태그
  category TEXT,
  tags TEXT[] DEFAULT '{}',

  -- 문서 상태
  status TEXT NOT NULL DEFAULT 'active',

  -- 공개 여부
  is_public BOOLEAN DEFAULT false,

  -- 임베딩 처리 상태
  embedding_status TEXT NOT NULL DEFAULT 'pending',
  chunk_count INTEGER DEFAULT 0,

  -- 추가 메타데이터
  metadata JSONB DEFAULT '{}',

  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 제약조건
  CONSTRAINT rag_documents_source_type_check
    CHECK (source_type IN ('file', 'url', 'manual', 'service_data')),
  CONSTRAINT rag_documents_service_id_check
    CHECK (
      service_id IS NULL OR
      service_id IN ('minu-find', 'minu-frame', 'minu-build', 'minu-keep')
    ),
  CONSTRAINT rag_documents_status_check
    CHECK (status IN ('active', 'archived', 'processing')),
  CONSTRAINT rag_documents_embedding_status_check
    CHECK (embedding_status IN ('pending', 'processing', 'completed', 'failed')),
  CONSTRAINT rag_documents_chunk_count_check
    CHECK (chunk_count >= 0)
);

-- ============================================================================
-- 3. 인덱스 생성
-- ============================================================================

-- 사용자별 문서 조회
CREATE INDEX IF NOT EXISTS idx_rag_documents_user_id
  ON public.rag_documents(user_id);

-- 서비스별 문서 조회
CREATE INDEX IF NOT EXISTS idx_rag_documents_service_id
  ON public.rag_documents(service_id)
  WHERE service_id IS NOT NULL;

-- 프로젝트별 문서 조회
CREATE INDEX IF NOT EXISTS idx_rag_documents_project_id
  ON public.rag_documents(project_id)
  WHERE project_id IS NOT NULL;

-- 문서 상태별 조회
CREATE INDEX IF NOT EXISTS idx_rag_documents_status
  ON public.rag_documents(status);

-- 임베딩 상태별 조회 (처리 대기 문서 찾기)
CREATE INDEX IF NOT EXISTS idx_rag_documents_embedding_status
  ON public.rag_documents(embedding_status);

-- 공개 문서 조회
CREATE INDEX IF NOT EXISTS idx_rag_documents_is_public
  ON public.rag_documents(is_public)
  WHERE is_public = true;

-- 소스 타입별 조회
CREATE INDEX IF NOT EXISTS idx_rag_documents_source_type
  ON public.rag_documents(source_type);

-- 카테고리별 조회
CREATE INDEX IF NOT EXISTS idx_rag_documents_category
  ON public.rag_documents(category)
  WHERE category IS NOT NULL;

-- 태그 검색용 GIN 인덱스
CREATE INDEX IF NOT EXISTS idx_rag_documents_tags
  ON public.rag_documents USING GIN(tags);

-- 메타데이터 검색용 GIN 인덱스
CREATE INDEX IF NOT EXISTS idx_rag_documents_metadata
  ON public.rag_documents USING GIN(metadata);

-- 생성일 기준 정렬
CREATE INDEX IF NOT EXISTS idx_rag_documents_created_at
  ON public.rag_documents(created_at DESC);

-- 수정일 기준 정렬
CREATE INDEX IF NOT EXISTS idx_rag_documents_updated_at
  ON public.rag_documents(updated_at DESC);

-- Full-Text Search 인덱스 (제목 + 내용) - simple 설정 사용
CREATE INDEX IF NOT EXISTS idx_rag_documents_title_fts
  ON public.rag_documents
  USING GIN (to_tsvector('simple', title));

CREATE INDEX IF NOT EXISTS idx_rag_documents_content_fts
  ON public.rag_documents
  USING GIN (to_tsvector('simple', content));

-- 복합 인덱스: 사용자 + 상태
CREATE INDEX IF NOT EXISTS idx_rag_documents_user_status
  ON public.rag_documents(user_id, status);

-- 복합 인덱스: 서비스 + 상태
CREATE INDEX IF NOT EXISTS idx_rag_documents_service_status
  ON public.rag_documents(service_id, status)
  WHERE service_id IS NOT NULL;

-- ============================================================================
-- 4. RLS (Row Level Security) 정책
-- ============================================================================

-- RLS 활성화
ALTER TABLE public.rag_documents ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 문서와 공개 문서 조회 가능
CREATE POLICY "Users can view own and public documents"
  ON public.rag_documents
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR
    is_public = true
  );

-- 익명 사용자는 공개 문서만 조회 가능
CREATE POLICY "Anonymous users can view public documents"
  ON public.rag_documents
  FOR SELECT
  TO anon
  USING (is_public = true);

-- 사용자는 자신의 문서만 생성 가능
CREATE POLICY "Users can insert own documents"
  ON public.rag_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 사용자는 자신의 문서만 수정 가능
CREATE POLICY "Users can update own documents"
  ON public.rag_documents
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- 사용자는 자신의 문서만 삭제 가능
CREATE POLICY "Users can delete own documents"
  ON public.rag_documents
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 관리자는 모든 문서 조회 가능
CREATE POLICY "Admins can view all documents"
  ON public.rag_documents
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin')
    )
  );

-- 관리자는 모든 문서 수정 가능
CREATE POLICY "Admins can update all documents"
  ON public.rag_documents
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin')
    )
  );

-- 관리자는 모든 문서 삭제 가능
CREATE POLICY "Admins can delete all documents"
  ON public.rag_documents
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin')
    )
  );

-- 서비스 역할은 모든 작업 가능 (Edge Function용)
CREATE POLICY "Service role full access documents"
  ON public.rag_documents
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 5. 트리거
-- ============================================================================

-- updated_at 자동 업데이트 함수
CREATE OR REPLACE FUNCTION update_rag_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

-- updated_at 트리거
DROP TRIGGER IF EXISTS trigger_rag_documents_updated_at
  ON public.rag_documents;

CREATE TRIGGER trigger_rag_documents_updated_at
  BEFORE UPDATE ON public.rag_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_rag_documents_updated_at();

-- ============================================================================
-- 6. 유틸리티 함수
-- ============================================================================

-- 문서 검색 함수
CREATE OR REPLACE FUNCTION search_rag_documents(
  p_user_id UUID,
  p_query TEXT,
  p_service_id TEXT DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_status TEXT DEFAULT 'active',
  p_include_public BOOLEAN DEFAULT true,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  content TEXT,
  source_type TEXT,
  service_id TEXT,
  category TEXT,
  tags TEXT[],
  chunk_count INTEGER,
  created_at TIMESTAMPTZ,
  rank REAL
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    d.id,
    d.title,
    d.content,
    d.source_type,
    d.service_id,
    d.category,
    d.tags,
    d.chunk_count,
    d.created_at,
    ts_rank(
      to_tsvector('simple', d.title || ' ' || d.content),
      plainto_tsquery('simple', p_query)
    ) AS rank
  FROM public.rag_documents d
  WHERE
    (d.user_id = p_user_id OR (p_include_public AND d.is_public = true))
    AND (p_service_id IS NULL OR d.service_id = p_service_id)
    AND (p_category IS NULL OR d.category = p_category)
    AND d.status = p_status
    AND (
      to_tsvector('simple', d.title) @@ plainto_tsquery('simple', p_query)
      OR to_tsvector('simple', d.content) @@ plainto_tsquery('simple', p_query)
    )
  ORDER BY rank DESC, d.created_at DESC
  LIMIT p_limit;
$$;

COMMENT ON FUNCTION search_rag_documents IS 'RAG 문서 전체 텍스트 검색';

-- 임베딩 대기 중인 문서 조회 함수
CREATE OR REPLACE FUNCTION get_pending_documents(
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  content TEXT,
  user_id UUID,
  service_id TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    id,
    title,
    content,
    user_id,
    service_id,
    created_at
  FROM public.rag_documents
  WHERE embedding_status = 'pending'
  AND status = 'active'
  ORDER BY created_at ASC
  LIMIT p_limit;
$$;

COMMENT ON FUNCTION get_pending_documents IS '임베딩 처리 대기 중인 문서 조회';

-- 문서 통계 함수
CREATE OR REPLACE FUNCTION get_document_stats(
  p_user_id UUID
)
RETURNS TABLE (
  total_documents BIGINT,
  pending_documents BIGINT,
  completed_documents BIGINT,
  failed_documents BIGINT,
  total_chunks BIGINT,
  public_documents BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COUNT(*) as total_documents,
    COUNT(*) FILTER (WHERE embedding_status = 'pending') as pending_documents,
    COUNT(*) FILTER (WHERE embedding_status = 'completed') as completed_documents,
    COUNT(*) FILTER (WHERE embedding_status = 'failed') as failed_documents,
    COALESCE(SUM(chunk_count), 0) as total_chunks,
    COUNT(*) FILTER (WHERE is_public = true) as public_documents
  FROM public.rag_documents
  WHERE user_id = p_user_id
  AND status = 'active';
$$;

COMMENT ON FUNCTION get_document_stats IS '사용자별 문서 통계 조회';

-- ============================================================================
-- 7. 테이블 코멘트
-- ============================================================================

COMMENT ON TABLE public.rag_documents IS 'RAG 소스 문서 관리 - 검색 증강 생성을 위한 문서 저장';
COMMENT ON COLUMN public.rag_documents.id IS '문서 UUID';
COMMENT ON COLUMN public.rag_documents.user_id IS '문서 소유자 ID';
COMMENT ON COLUMN public.rag_documents.title IS '문서 제목';
COMMENT ON COLUMN public.rag_documents.content IS '문서 전체 내용';
COMMENT ON COLUMN public.rag_documents.source_type IS '소스 타입: file, url, manual, service_data';
COMMENT ON COLUMN public.rag_documents.source_url IS '원본 URL (source_type이 url인 경우)';
COMMENT ON COLUMN public.rag_documents.service_id IS '관련 서비스 ID (minu-find, minu-frame, minu-build, minu-keep)';
COMMENT ON COLUMN public.rag_documents.project_id IS '관련 프로젝트 ID (외래키)';
COMMENT ON COLUMN public.rag_documents.category IS '문서 카테고리';
COMMENT ON COLUMN public.rag_documents.tags IS '문서 태그 배열';
COMMENT ON COLUMN public.rag_documents.status IS '문서 상태: active, archived, processing';
COMMENT ON COLUMN public.rag_documents.is_public IS '공개 문서 여부';
COMMENT ON COLUMN public.rag_documents.embedding_status IS '임베딩 처리 상태: pending, processing, completed, failed';
COMMENT ON COLUMN public.rag_documents.chunk_count IS '생성된 청크 수 (자동 계산)';
COMMENT ON COLUMN public.rag_documents.metadata IS 'JSON 메타데이터 (파일 정보, 처리 로그 등)';
COMMENT ON COLUMN public.rag_documents.created_at IS '생성 일시';
COMMENT ON COLUMN public.rag_documents.updated_at IS '수정 일시 (자동 업데이트)';

-- ============================================================================
-- 마이그레이션 완료
-- ============================================================================

COMMIT;

-- 마이그레이션 확인
DO $$
BEGIN
  RAISE NOTICE 'RAG 문서 관리 시스템 마이그레이션 완료 (1/3)';
  RAISE NOTICE '- pgvector 확장 활성화됨';
  RAISE NOTICE '- rag_documents 테이블 생성됨';
  RAISE NOTICE '- 인덱스 19개 생성됨';
  RAISE NOTICE '- RLS 정책 10개 적용됨';
  RAISE NOTICE '- 트리거 1개 생성됨';
  RAISE NOTICE '- 유틸리티 함수 3개 생성됨';
END $$;

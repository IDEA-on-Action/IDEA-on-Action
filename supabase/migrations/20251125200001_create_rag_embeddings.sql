-- ============================================================================
-- RAG (Retrieval-Augmented Generation) 임베딩 관리 시스템
--
-- 파일: 20251125200001_create_rag_embeddings.sql
-- 작성일: 2025-11-25
-- 버전: 2.18.0
--
-- 테이블:
-- 1. rag_embeddings - 문서 청크 임베딩 벡터 저장
--
-- 기능:
-- - 문서를 청크로 분할하여 임베딩 저장
-- - pgvector를 사용한 벡터 유사도 검색
-- - IVFFlat 인덱스로 빠른 검색 성능
-- - 청크별 메타데이터 지원
-- ============================================================================

-- 트랜잭션 시작
BEGIN;

-- ============================================================================
-- 1. rag_embeddings 테이블
-- 문서 청크 임베딩 벡터 저장
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.rag_embeddings (
  -- 기본 식별자
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 문서 연결 (CASCADE DELETE: 문서 삭제 시 모든 청크 삭제)
  document_id UUID NOT NULL REFERENCES public.rag_documents(id) ON DELETE CASCADE,

  -- 청크 정보
  chunk_index INTEGER NOT NULL,
  chunk_text TEXT NOT NULL,

  -- 임베딩 벡터 (OpenAI text-embedding-3-small: 1536 차원)
  embedding vector(1536) NOT NULL,

  -- 토큰 정보
  token_count INTEGER,

  -- 추가 메타데이터
  metadata JSONB DEFAULT '{}',

  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- 제약조건: 문서별 청크 인덱스는 고유해야 함
  CONSTRAINT rag_embeddings_document_chunk_unique
    UNIQUE(document_id, chunk_index),

  -- 제약조건: 청크 인덱스는 0 이상
  CONSTRAINT rag_embeddings_chunk_index_check
    CHECK (chunk_index >= 0),

  -- 제약조건: 토큰 수는 양수
  CONSTRAINT rag_embeddings_token_count_check
    CHECK (token_count IS NULL OR token_count > 0)
);

-- ============================================================================
-- 2. 인덱스 생성
-- ============================================================================

-- 문서별 청크 조회 (정렬 포함)
CREATE INDEX IF NOT EXISTS idx_rag_embeddings_document_id
  ON public.rag_embeddings(document_id, chunk_index);

-- 청크 인덱스 조회
CREATE INDEX IF NOT EXISTS idx_rag_embeddings_chunk_index
  ON public.rag_embeddings(chunk_index);

-- 생성일 기준 정렬
CREATE INDEX IF NOT EXISTS idx_rag_embeddings_created_at
  ON public.rag_embeddings(created_at DESC);

-- 메타데이터 검색용 GIN 인덱스
CREATE INDEX IF NOT EXISTS idx_rag_embeddings_metadata
  ON public.rag_embeddings USING GIN(metadata);

-- Full-Text Search 인덱스 (청크 텍스트)
-- 'simple' 설정 사용 (한국어 FTS 설정이 없는 경우)
CREATE INDEX IF NOT EXISTS idx_rag_embeddings_chunk_text_fts
  ON public.rag_embeddings
  USING GIN (to_tsvector('simple', chunk_text));

-- ============================================================================
-- 3. 벡터 유사도 검색 인덱스 (IVFFlat)
-- ============================================================================

-- IVFFlat 인덱스 생성
-- lists 파라미터: 벡터 수의 제곱근 추천 (예: 100,000개 벡터 → lists=316)
-- 초기에는 작은 값(100)으로 시작, 데이터 증가 시 재생성 필요
CREATE INDEX IF NOT EXISTS idx_rag_embeddings_vector
  ON public.rag_embeddings
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

COMMENT ON INDEX idx_rag_embeddings_vector IS 'IVFFlat 인덱스 for 코사인 유사도 검색 (lists=100, 데이터 증가 시 재생성 필요)';

-- ============================================================================
-- 4. RLS (Row Level Security) 정책
-- ============================================================================

-- RLS 활성화
ALTER TABLE public.rag_embeddings ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 문서에 속한 임베딩과 공개 문서의 임베딩 조회 가능
CREATE POLICY "Users can view embeddings of own and public documents"
  ON public.rag_embeddings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.rag_documents
      WHERE id = rag_embeddings.document_id
      AND (user_id = auth.uid() OR is_public = true)
    )
  );

-- 익명 사용자는 공개 문서의 임베딩만 조회 가능
CREATE POLICY "Anonymous users can view embeddings of public documents"
  ON public.rag_embeddings
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.rag_documents
      WHERE id = rag_embeddings.document_id
      AND is_public = true
    )
  );

-- 사용자는 자신의 문서에만 임베딩 생성 가능
CREATE POLICY "Users can insert embeddings for own documents"
  ON public.rag_embeddings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.rag_documents
      WHERE id = rag_embeddings.document_id
      AND user_id = auth.uid()
    )
  );

-- 사용자는 자신의 문서에 속한 임베딩만 수정 가능
CREATE POLICY "Users can update embeddings of own documents"
  ON public.rag_embeddings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.rag_documents
      WHERE id = rag_embeddings.document_id
      AND user_id = auth.uid()
    )
  );

-- 사용자는 자신의 문서에 속한 임베딩만 삭제 가능
CREATE POLICY "Users can delete embeddings of own documents"
  ON public.rag_embeddings
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.rag_documents
      WHERE id = rag_embeddings.document_id
      AND user_id = auth.uid()
    )
  );

-- 관리자는 모든 임베딩 조회 가능
CREATE POLICY "Admins can view all embeddings"
  ON public.rag_embeddings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin')
    )
  );

-- 관리자는 모든 임베딩 삭제 가능
CREATE POLICY "Admins can delete all embeddings"
  ON public.rag_embeddings
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
CREATE POLICY "Service role full access embeddings"
  ON public.rag_embeddings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 5. 트리거: chunk_count 자동 업데이트
-- ============================================================================

-- 임베딩 삽입 시 문서의 chunk_count 증가
CREATE OR REPLACE FUNCTION update_document_chunk_count_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.rag_documents
  SET
    chunk_count = chunk_count + 1,
    updated_at = NOW()
  WHERE id = NEW.document_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

-- 임베딩 삭제 시 문서의 chunk_count 감소
CREATE OR REPLACE FUNCTION update_document_chunk_count_on_delete()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.rag_documents
  SET
    chunk_count = GREATEST(chunk_count - 1, 0),
    updated_at = NOW()
  WHERE id = OLD.document_id;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

-- 트리거 생성
DROP TRIGGER IF EXISTS trigger_update_chunk_count_on_insert
  ON public.rag_embeddings;

CREATE TRIGGER trigger_update_chunk_count_on_insert
  AFTER INSERT ON public.rag_embeddings
  FOR EACH ROW
  EXECUTE FUNCTION update_document_chunk_count_on_insert();

DROP TRIGGER IF EXISTS trigger_update_chunk_count_on_delete
  ON public.rag_embeddings;

CREATE TRIGGER trigger_update_chunk_count_on_delete
  AFTER DELETE ON public.rag_embeddings
  FOR EACH ROW
  EXECUTE FUNCTION update_document_chunk_count_on_delete();

-- ============================================================================
-- 6. 유틸리티 함수
-- ============================================================================

-- 문서의 모든 청크 조회
CREATE OR REPLACE FUNCTION get_document_chunks(
  p_document_id UUID
)
RETURNS TABLE (
  id UUID,
  chunk_index INTEGER,
  chunk_text TEXT,
  token_count INTEGER,
  metadata JSONB,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    id,
    chunk_index,
    chunk_text,
    token_count,
    metadata,
    created_at
  FROM public.rag_embeddings
  WHERE document_id = p_document_id
  ORDER BY chunk_index ASC;
$$;

COMMENT ON FUNCTION get_document_chunks IS '특정 문서의 모든 청크 조회 (인덱스 순서)';

-- 임베딩 통계 함수
CREATE OR REPLACE FUNCTION get_embedding_stats(
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  total_embeddings BIGINT,
  total_tokens BIGINT,
  avg_tokens_per_chunk NUMERIC,
  documents_with_embeddings BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COUNT(*) as total_embeddings,
    COALESCE(SUM(e.token_count), 0) as total_tokens,
    ROUND(AVG(e.token_count), 2) as avg_tokens_per_chunk,
    COUNT(DISTINCT e.document_id) as documents_with_embeddings
  FROM public.rag_embeddings e
  INNER JOIN public.rag_documents d ON e.document_id = d.id
  WHERE p_user_id IS NULL OR d.user_id = p_user_id;
$$;

COMMENT ON FUNCTION get_embedding_stats IS '임베딩 통계 조회 (전체 또는 사용자별)';

-- ============================================================================
-- 7. 테이블 코멘트
-- ============================================================================

COMMENT ON TABLE public.rag_embeddings IS 'RAG 문서 청크 임베딩 벡터 저장 - pgvector 기반 유사도 검색';
COMMENT ON COLUMN public.rag_embeddings.id IS '임베딩 UUID';
COMMENT ON COLUMN public.rag_embeddings.document_id IS '문서 ID (외래키, CASCADE DELETE)';
COMMENT ON COLUMN public.rag_embeddings.chunk_index IS '청크 순서 (0부터 시작)';
COMMENT ON COLUMN public.rag_embeddings.chunk_text IS '청크 텍스트 내용';
COMMENT ON COLUMN public.rag_embeddings.embedding IS '임베딩 벡터 (1536차원, OpenAI text-embedding-3-small)';
COMMENT ON COLUMN public.rag_embeddings.token_count IS '청크 토큰 수';
COMMENT ON COLUMN public.rag_embeddings.metadata IS 'JSON 메타데이터 (청크별 추가 정보)';
COMMENT ON COLUMN public.rag_embeddings.created_at IS '생성 일시';

-- ============================================================================
-- 마이그레이션 완료
-- ============================================================================

COMMIT;

-- 마이그레이션 확인
DO $$
BEGIN
  RAISE NOTICE 'RAG 임베딩 관리 시스템 마이그레이션 완료 (2/3)';
  RAISE NOTICE '- rag_embeddings 테이블 생성됨';
  RAISE NOTICE '- 인덱스 6개 생성됨 (IVFFlat 포함)';
  RAISE NOTICE '- RLS 정책 8개 적용됨';
  RAISE NOTICE '- 트리거 2개 생성됨 (chunk_count 자동 업데이트)';
  RAISE NOTICE '- 유틸리티 함수 2개 생성됨';
END $$;

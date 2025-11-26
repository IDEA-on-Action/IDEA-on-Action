-- ============================================================================
-- RAG 하이브리드 검색 개선
--
-- 파일: 20251126200000_hybrid_search.sql
-- 작성일: 2025-11-26
-- 버전: 2.19.0
--
-- 함수:
-- 1. hybrid_search_documents - 개선된 하이브리드 검색 (가중치 조절)
--
-- 기능:
-- - 키워드 검색 + 벡터 검색 결합
-- - 사용자 정의 가중치 지원
-- - 프로젝트 필터링
-- - 중복 결과 제거
-- - 점수 투명성 (keyword_score, vector_score, combined_score 반환)
-- ============================================================================

-- 트랜잭션 시작
BEGIN;

-- ============================================================================
-- 1. hybrid_search_documents 함수
-- 개선된 하이브리드 검색 (가중치 조절 가능)
-- ============================================================================

CREATE OR REPLACE FUNCTION hybrid_search_documents(
  query_text TEXT,
  query_embedding vector(1536),
  keyword_weight FLOAT DEFAULT 0.3,
  vector_weight FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 10,
  p_project_id TEXT DEFAULT NULL,
  p_service_id TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  include_public BOOLEAN DEFAULT true,
  min_keyword_score FLOAT DEFAULT 0.0,
  min_vector_score FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  title TEXT,
  content TEXT,
  chunk_index INTEGER,
  chunk_content TEXT,
  metadata JSONB,
  keyword_score FLOAT,
  vector_score FLOAT,
  combined_score FLOAT,
  service_id TEXT,
  project_id TEXT,
  source_type TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH keyword_results AS (
    -- 키워드 검색 (Full-Text Search)
    SELECT
      d.id AS doc_id,
      e.id AS embedding_id,
      e.chunk_index,
      e.chunk_text AS chunk_content,
      ts_rank(
        to_tsvector('simple', COALESCE(d.title, '') || ' ' || COALESCE(e.chunk_text, '')),
        plainto_tsquery('simple', query_text)
      ) AS k_score,
      0::FLOAT AS v_score
    FROM public.rag_documents d
    INNER JOIN public.rag_embeddings e ON d.id = e.document_id
    WHERE
      -- 문서 상태 필터
      d.status = 'active'
      AND d.embedding_status = 'completed'
      -- 키워드 매칭
      AND to_tsvector('simple', COALESCE(d.title, '') || ' ' || COALESCE(e.chunk_text, ''))
          @@ plainto_tsquery('simple', query_text)
      -- 프로젝트 필터
      AND (p_project_id IS NULL OR d.project_id = p_project_id)
      -- 서비스 필터
      AND (p_service_id IS NULL OR d.service_id = p_service_id)
      -- 사용자/공개 문서 필터
      AND (
        p_user_id IS NULL OR
        d.user_id = p_user_id OR
        (include_public AND d.is_public = true)
      )
  ),
  vector_results AS (
    -- 벡터 검색 (Semantic Search)
    SELECT
      d.id AS doc_id,
      e.id AS embedding_id,
      e.chunk_index,
      e.chunk_text AS chunk_content,
      0::FLOAT AS k_score,
      1 - (e.embedding <=> query_embedding) AS v_score
    FROM public.rag_documents d
    INNER JOIN public.rag_embeddings e ON d.id = e.document_id
    WHERE
      -- 문서 상태 필터
      d.status = 'active'
      AND d.embedding_status = 'completed'
      -- 유사도 임계값
      AND (1 - (e.embedding <=> query_embedding)) >= min_vector_score
      -- 프로젝트 필터
      AND (p_project_id IS NULL OR d.project_id = p_project_id)
      -- 서비스 필터
      AND (p_service_id IS NULL OR d.service_id = p_service_id)
      -- 사용자/공개 문서 필터
      AND (
        p_user_id IS NULL OR
        d.user_id = p_user_id OR
        (include_public AND d.is_public = true)
      )
    ORDER BY v_score DESC
    LIMIT match_count * 2  -- 충분한 후보 확보
  ),
  combined_results AS (
    -- 결과 합치기 (FULL OUTER JOIN으로 중복 제거)
    SELECT
      COALESCE(kr.doc_id, vr.doc_id) AS doc_id,
      COALESCE(kr.embedding_id, vr.embedding_id) AS embedding_id,
      COALESCE(kr.chunk_index, vr.chunk_index) AS chunk_index,
      COALESCE(kr.chunk_content, vr.chunk_content) AS chunk_content,
      COALESCE(kr.k_score, 0)::FLOAT AS keyword_score,
      COALESCE(vr.v_score, 0)::FLOAT AS vector_score
    FROM keyword_results kr
    FULL OUTER JOIN vector_results vr
      ON kr.doc_id = vr.doc_id AND kr.embedding_id = vr.embedding_id
    WHERE
      -- 최소 점수 필터
      (COALESCE(kr.k_score, 0) >= min_keyword_score)
      OR (COALESCE(vr.v_score, 0) >= min_vector_score)
  )
  SELECT
    cr.embedding_id AS id,
    cr.doc_id AS document_id,
    d.title,
    d.content,
    cr.chunk_index,
    cr.chunk_content,
    jsonb_build_object(
      'document_metadata', d.metadata,
      'source_type', d.source_type,
      'source_url', d.source_url,
      'category', d.category,
      'tags', d.tags,
      'is_public', d.is_public
    ) AS metadata,
    cr.keyword_score,
    cr.vector_score,
    -- 가중치 적용 통합 점수
    (cr.keyword_score * keyword_weight + cr.vector_score * vector_weight)::FLOAT AS combined_score,
    d.service_id,
    d.project_id,
    d.source_type,
    d.created_at
  FROM combined_results cr
  INNER JOIN public.rag_documents d ON cr.doc_id = d.id
  ORDER BY combined_score DESC, d.created_at DESC
  LIMIT match_count;
END;
$$;

COMMENT ON FUNCTION hybrid_search_documents IS 'RAG 하이브리드 검색 - 키워드 + 벡터 검색 결합 (가중치 조절 가능)';

-- ============================================================================
-- 2. 인덱스 확인 및 최적화
-- ============================================================================

-- 이미 존재하는 인덱스 확인 (20251125200000_create_rag_documents.sql에서 생성됨)
-- - idx_rag_documents_title_fts (Full-Text Search)
-- - idx_rag_documents_content_fts (Full-Text Search)
-- - idx_rag_documents_project_id
-- - idx_rag_documents_service_id
-- - idx_rag_documents_status

-- 추가 복합 인덱스 (하이브리드 검색 최적화)
CREATE INDEX IF NOT EXISTS idx_rag_documents_hybrid_search
  ON public.rag_documents(status, embedding_status, project_id, service_id)
  WHERE status = 'active' AND embedding_status = 'completed';

COMMENT ON INDEX idx_rag_documents_hybrid_search IS '하이브리드 검색 최적화 복합 인덱스';

-- ============================================================================
-- 3. 검색 성능 테스트 함수
-- ============================================================================

CREATE OR REPLACE FUNCTION test_hybrid_search_performance(
  test_query_text TEXT DEFAULT 'AI 프로젝트',
  test_iterations INT DEFAULT 10
)
RETURNS TABLE (
  iteration INT,
  execution_time_ms NUMERIC,
  result_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  start_time TIMESTAMPTZ;
  end_time TIMESTAMPTZ;
  duration NUMERIC;
  result_count BIGINT;
  test_embedding vector(1536);
  i INT;
BEGIN
  -- 테스트용 임베딩 생성 (랜덤)
  test_embedding := array_fill(0.001, ARRAY[1536])::vector(1536);

  -- 여러 번 반복 실행
  FOR i IN 1..test_iterations LOOP
    start_time := clock_timestamp();

    -- 하이브리드 검색 실행
    SELECT COUNT(*) INTO result_count
    FROM hybrid_search_documents(
      query_text := test_query_text,
      query_embedding := test_embedding,
      keyword_weight := 0.3,
      vector_weight := 0.7,
      match_count := 10
    );

    end_time := clock_timestamp();
    duration := EXTRACT(MILLISECONDS FROM (end_time - start_time));

    RETURN QUERY SELECT i, duration, result_count;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION test_hybrid_search_performance IS '하이브리드 검색 성능 테스트 (반복 실행 및 시간 측정)';

-- ============================================================================
-- 4. 검색 통계 함수
-- ============================================================================

CREATE OR REPLACE FUNCTION get_hybrid_search_stats()
RETURNS TABLE (
  total_documents BIGINT,
  total_embeddings BIGINT,
  active_documents BIGINT,
  completed_embeddings BIGINT,
  avg_chunks_per_document NUMERIC,
  fts_index_size TEXT,
  vector_index_size TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT COUNT(*) FROM public.rag_documents) AS total_documents,
    (SELECT COUNT(*) FROM public.rag_embeddings) AS total_embeddings,
    (SELECT COUNT(*) FROM public.rag_documents WHERE status = 'active' AND embedding_status = 'completed') AS active_documents,
    (SELECT COUNT(*) FROM public.rag_embeddings WHERE status = 'completed') AS completed_embeddings,
    (SELECT ROUND(AVG(chunk_count), 2) FROM public.rag_documents WHERE chunk_count > 0) AS avg_chunks_per_document,
    (SELECT pg_size_pretty(pg_relation_size('idx_rag_documents_content_fts'::regclass))) AS fts_index_size,
    (SELECT pg_size_pretty(pg_relation_size('idx_rag_embeddings_embedding'::regclass))) AS vector_index_size;
$$;

COMMENT ON FUNCTION get_hybrid_search_stats IS '하이브리드 검색 관련 통계 조회';

-- ============================================================================
-- 마이그레이션 완료
-- ============================================================================

COMMIT;

-- 마이그레이션 확인
DO $$
BEGIN
  RAISE NOTICE '=== RAG 하이브리드 검색 마이그레이션 완료 ===';
  RAISE NOTICE '- hybrid_search_documents 함수 생성/업데이트됨';
  RAISE NOTICE '- 복합 인덱스 1개 추가됨 (idx_rag_documents_hybrid_search)';
  RAISE NOTICE '- 성능 테스트 함수 추가됨 (test_hybrid_search_performance)';
  RAISE NOTICE '- 통계 함수 추가됨 (get_hybrid_search_stats)';
  RAISE NOTICE '';
  RAISE NOTICE '주요 기능:';
  RAISE NOTICE '  - 키워드 가중치 조절 (기본 0.3)';
  RAISE NOTICE '  - 벡터 가중치 조절 (기본 0.7)';
  RAISE NOTICE '  - 프로젝트 필터링';
  RAISE NOTICE '  - 서비스 필터링';
  RAISE NOTICE '  - 중복 결과 제거';
  RAISE NOTICE '  - 점수 투명성 (keyword_score, vector_score, combined_score)';
END $$;

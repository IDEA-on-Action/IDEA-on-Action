-- ============================================================================
-- RAG (Retrieval-Augmented Generation) 검색 함수
--
-- 파일: 20251125200002_create_rag_search_function.sql
-- 작성일: 2025-11-25
-- 버전: 2.18.0
--
-- 함수:
-- 1. search_rag_embeddings - 벡터 유사도 기반 RAG 검색
-- 2. hybrid_search_rag - 벡터 + 전체 텍스트 하이브리드 검색
-- 3. get_context_for_prompt - 프롬프트용 컨텍스트 생성
--
-- 기능:
-- - 벡터 유사도 검색 (코사인 유사도)
-- - 서비스/사용자/프로젝트별 필터링
-- - 하이브리드 검색 (벡터 + FTS)
-- - 컨텍스트 자동 포매팅
-- ============================================================================

-- 트랜잭션 시작
BEGIN;

-- ============================================================================
-- 1. search_rag_embeddings 함수
-- 벡터 유사도 기반 RAG 검색
-- ============================================================================

CREATE OR REPLACE FUNCTION search_rag_embeddings(
  query_embedding vector(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5,
  filter_service_id TEXT DEFAULT NULL,
  filter_user_id UUID DEFAULT NULL,
  filter_project_id UUID DEFAULT NULL,
  include_public BOOLEAN DEFAULT true
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  document_title TEXT,
  chunk_index INTEGER,
  chunk_text TEXT,
  service_id TEXT,
  project_id UUID,
  similarity FLOAT,
  metadata JSONB
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.document_id,
    d.title AS document_title,
    e.chunk_index,
    e.chunk_text,
    d.service_id,
    d.project_id,
    -- 코사인 유사도 계산 (1 - 코사인 거리)
    1 - (e.embedding <=> query_embedding) AS similarity,
    jsonb_build_object(
      'document_metadata', d.metadata,
      'chunk_metadata', e.metadata,
      'source_type', d.source_type,
      'source_url', d.source_url,
      'category', d.category,
      'tags', d.tags,
      'created_at', d.created_at
    ) AS metadata
  FROM public.rag_embeddings e
  INNER JOIN public.rag_documents d ON e.document_id = d.id
  WHERE
    -- 문서 상태 필터
    d.status = 'active'
    -- 임베딩 완료 필터
    AND d.embedding_status = 'completed'
    -- 유사도 임계값 필터
    AND (1 - (e.embedding <=> query_embedding)) >= match_threshold
    -- 서비스 ID 필터
    AND (filter_service_id IS NULL OR d.service_id = filter_service_id)
    -- 프로젝트 ID 필터
    AND (filter_project_id IS NULL OR d.project_id = filter_project_id)
    -- 사용자/공개 문서 필터
    AND (
      filter_user_id IS NULL OR
      d.user_id = filter_user_id OR
      (include_public AND d.is_public = true)
    )
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

COMMENT ON FUNCTION search_rag_embeddings IS 'RAG 벡터 유사도 검색 - 쿼리 임베딩과 가장 유사한 청크 반환';

-- ============================================================================
-- 2. hybrid_search_rag 함수
-- 벡터 유사도 + 전체 텍스트 검색 하이브리드
-- ============================================================================

CREATE OR REPLACE FUNCTION hybrid_search_rag(
  query_embedding vector(1536),
  query_text TEXT,
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 10,
  filter_service_id TEXT DEFAULT NULL,
  filter_user_id UUID DEFAULT NULL,
  filter_project_id UUID DEFAULT NULL,
  include_public BOOLEAN DEFAULT true,
  vector_weight FLOAT DEFAULT 0.7,
  text_weight FLOAT DEFAULT 0.3
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  document_title TEXT,
  chunk_index INTEGER,
  chunk_text TEXT,
  service_id TEXT,
  project_id UUID,
  similarity FLOAT,
  text_rank FLOAT,
  combined_score FLOAT,
  metadata JSONB
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH vector_results AS (
    -- 벡터 유사도 검색
    SELECT
      e.id,
      e.document_id,
      d.title AS document_title,
      e.chunk_index,
      e.chunk_text,
      d.service_id,
      d.project_id,
      1 - (e.embedding <=> query_embedding) AS similarity,
      0::FLOAT AS text_rank,
      d.metadata AS document_metadata,
      e.metadata AS chunk_metadata,
      d.source_type,
      d.source_url,
      d.category,
      d.tags,
      d.created_at
    FROM public.rag_embeddings e
    INNER JOIN public.rag_documents d ON e.document_id = d.id
    WHERE
      d.status = 'active'
      AND d.embedding_status = 'completed'
      AND (1 - (e.embedding <=> query_embedding)) >= match_threshold
      AND (filter_service_id IS NULL OR d.service_id = filter_service_id)
      AND (filter_project_id IS NULL OR d.project_id = filter_project_id)
      AND (
        filter_user_id IS NULL OR
        d.user_id = filter_user_id OR
        (include_public AND d.is_public = true)
      )
  ),
  text_results AS (
    -- 전체 텍스트 검색
    SELECT
      e.id,
      e.document_id,
      d.title AS document_title,
      e.chunk_index,
      e.chunk_text,
      d.service_id,
      d.project_id,
      0::FLOAT AS similarity,
      ts_rank(
        to_tsvector('korean', e.chunk_text),
        plainto_tsquery('korean', query_text)
      ) AS text_rank,
      d.metadata AS document_metadata,
      e.metadata AS chunk_metadata,
      d.source_type,
      d.source_url,
      d.category,
      d.tags,
      d.created_at
    FROM public.rag_embeddings e
    INNER JOIN public.rag_documents d ON e.document_id = d.id
    WHERE
      d.status = 'active'
      AND d.embedding_status = 'completed'
      AND to_tsvector('korean', e.chunk_text) @@ plainto_tsquery('korean', query_text)
      AND (filter_service_id IS NULL OR d.service_id = filter_service_id)
      AND (filter_project_id IS NULL OR d.project_id = filter_project_id)
      AND (
        filter_user_id IS NULL OR
        d.user_id = filter_user_id OR
        (include_public AND d.is_public = true)
      )
  ),
  combined_results AS (
    -- 결과 합치기
    SELECT
      COALESCE(v.id, t.id) AS id,
      COALESCE(v.document_id, t.document_id) AS document_id,
      COALESCE(v.document_title, t.document_title) AS document_title,
      COALESCE(v.chunk_index, t.chunk_index) AS chunk_index,
      COALESCE(v.chunk_text, t.chunk_text) AS chunk_text,
      COALESCE(v.service_id, t.service_id) AS service_id,
      COALESCE(v.project_id, t.project_id) AS project_id,
      COALESCE(v.similarity, 0) AS similarity,
      COALESCE(t.text_rank, 0) AS text_rank,
      COALESCE(v.document_metadata, t.document_metadata) AS document_metadata,
      COALESCE(v.chunk_metadata, t.chunk_metadata) AS chunk_metadata,
      COALESCE(v.source_type, t.source_type) AS source_type,
      COALESCE(v.source_url, t.source_url) AS source_url,
      COALESCE(v.category, t.category) AS category,
      COALESCE(v.tags, t.tags) AS tags,
      COALESCE(v.created_at, t.created_at) AS created_at
    FROM vector_results v
    FULL OUTER JOIN text_results t ON v.id = t.id
  )
  SELECT
    cr.id,
    cr.document_id,
    cr.document_title,
    cr.chunk_index,
    cr.chunk_text,
    cr.service_id,
    cr.project_id,
    cr.similarity,
    cr.text_rank,
    -- 가중치 적용 결합 점수
    (cr.similarity * vector_weight + cr.text_rank * text_weight) AS combined_score,
    jsonb_build_object(
      'document_metadata', cr.document_metadata,
      'chunk_metadata', cr.chunk_metadata,
      'source_type', cr.source_type,
      'source_url', cr.source_url,
      'category', cr.category,
      'tags', cr.tags,
      'created_at', cr.created_at
    ) AS metadata
  FROM combined_results cr
  ORDER BY combined_score DESC
  LIMIT match_count;
END;
$$;

COMMENT ON FUNCTION hybrid_search_rag IS 'RAG 하이브리드 검색 - 벡터 유사도 + 전체 텍스트 검색 결합';

-- ============================================================================
-- 3. get_context_for_prompt 함수
-- 프롬프트용 컨텍스트 생성
-- ============================================================================

CREATE OR REPLACE FUNCTION get_context_for_prompt(
  query_embedding vector(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 3,
  filter_service_id TEXT DEFAULT NULL,
  filter_user_id UUID DEFAULT NULL,
  filter_project_id UUID DEFAULT NULL,
  include_public BOOLEAN DEFAULT true,
  max_tokens INT DEFAULT 3000
)
RETURNS TABLE (
  context TEXT,
  sources JSONB,
  total_chunks INT,
  total_tokens INT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_context TEXT := '';
  v_sources JSONB := '[]'::JSONB;
  v_total_chunks INT := 0;
  v_total_tokens INT := 0;
  v_current_tokens INT := 0;
  chunk_record RECORD;
BEGIN
  -- 검색 결과 순회
  FOR chunk_record IN
    SELECT
      e.chunk_text,
      e.token_count,
      d.title,
      d.source_type,
      d.source_url,
      1 - (e.embedding <=> query_embedding) AS similarity
    FROM public.rag_embeddings e
    INNER JOIN public.rag_documents d ON e.document_id = d.id
    WHERE
      d.status = 'active'
      AND d.embedding_status = 'completed'
      AND (1 - (e.embedding <=> query_embedding)) >= match_threshold
      AND (filter_service_id IS NULL OR d.service_id = filter_service_id)
      AND (filter_project_id IS NULL OR d.project_id = filter_project_id)
      AND (
        filter_user_id IS NULL OR
        d.user_id = filter_user_id OR
        (include_public AND d.is_public = true)
      )
    ORDER BY similarity DESC
    LIMIT match_count
  LOOP
    -- 토큰 수 확인 (초과 시 중단)
    v_current_tokens := COALESCE(chunk_record.token_count, LENGTH(chunk_record.chunk_text) / 4);

    IF v_total_tokens + v_current_tokens > max_tokens THEN
      EXIT;
    END IF;

    -- 컨텍스트 추가
    v_context := v_context || E'\n\n--- 참고 문서 ' || (v_total_chunks + 1)::TEXT || ' ---\n';
    v_context := v_context || chunk_record.chunk_text;

    -- 소스 정보 추가
    v_sources := v_sources || jsonb_build_object(
      'title', chunk_record.title,
      'source_type', chunk_record.source_type,
      'source_url', chunk_record.source_url,
      'similarity', ROUND(chunk_record.similarity::NUMERIC, 4)
    );

    -- 통계 업데이트
    v_total_chunks := v_total_chunks + 1;
    v_total_tokens := v_total_tokens + v_current_tokens;
  END LOOP;

  -- 컨텍스트 헤더 추가
  IF v_total_chunks > 0 THEN
    v_context := '다음은 검색된 관련 문서입니다:' || v_context;
  ELSE
    v_context := '관련 문서를 찾을 수 없습니다.';
  END IF;

  RETURN QUERY
  SELECT
    v_context,
    v_sources,
    v_total_chunks,
    v_total_tokens;
END;
$$;

COMMENT ON FUNCTION get_context_for_prompt IS 'RAG 프롬프트용 컨텍스트 생성 - 검색 결과를 포매팅하여 프롬프트에 삽입';

-- ============================================================================
-- 4. 문서별 유사 문서 찾기
-- ============================================================================

CREATE OR REPLACE FUNCTION find_similar_documents(
  p_document_id UUID,
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5,
  filter_user_id UUID DEFAULT NULL,
  include_public BOOLEAN DEFAULT true
)
RETURNS TABLE (
  document_id UUID,
  document_title TEXT,
  service_id TEXT,
  category TEXT,
  avg_similarity FLOAT,
  matching_chunks INT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH source_embeddings AS (
    -- 원본 문서의 임베딩들
    SELECT embedding
    FROM public.rag_embeddings
    WHERE document_id = p_document_id
  ),
  similarity_scores AS (
    -- 다른 문서들과의 유사도 계산
    SELECT
      d.id AS document_id,
      d.title AS document_title,
      d.service_id,
      d.category,
      d.created_at,
      AVG(1 - (e.embedding <=> se.embedding)) AS avg_similarity,
      COUNT(*) AS matching_chunks
    FROM public.rag_embeddings e
    INNER JOIN public.rag_documents d ON e.document_id = d.id
    CROSS JOIN source_embeddings se
    WHERE
      d.id != p_document_id
      AND d.status = 'active'
      AND d.embedding_status = 'completed'
      AND (1 - (e.embedding <=> se.embedding)) >= match_threshold
      AND (
        filter_user_id IS NULL OR
        d.user_id = filter_user_id OR
        (include_public AND d.is_public = true)
      )
    GROUP BY d.id, d.title, d.service_id, d.category, d.created_at
  )
  SELECT
    ss.document_id,
    ss.document_title,
    ss.service_id,
    ss.category,
    ss.avg_similarity,
    ss.matching_chunks::INT,
    ss.created_at
  FROM similarity_scores ss
  ORDER BY ss.avg_similarity DESC, ss.matching_chunks DESC
  LIMIT match_count;
END;
$$;

COMMENT ON FUNCTION find_similar_documents IS '특정 문서와 유사한 다른 문서 찾기';

-- ============================================================================
-- 5. 인덱스 사용 통계 뷰
-- ============================================================================

CREATE OR REPLACE VIEW rag_index_stats AS
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan AS index_scans,
  idx_tup_read AS tuples_read,
  idx_tup_fetch AS tuples_fetched
FROM pg_stat_user_indexes
WHERE tablename IN ('rag_documents', 'rag_embeddings')
ORDER BY idx_scan DESC;

COMMENT ON VIEW rag_index_stats IS 'RAG 테이블 인덱스 사용 통계 모니터링';

-- ============================================================================
-- 6. 검색 성능 통계 함수
-- ============================================================================

CREATE OR REPLACE FUNCTION get_search_performance_stats()
RETURNS TABLE (
  table_name TEXT,
  index_name TEXT,
  index_size TEXT,
  index_scans BIGINT,
  cache_hit_ratio NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    i.tablename::TEXT,
    i.indexname::TEXT,
    pg_size_pretty(pg_relation_size(i.indexrelid)) AS index_size,
    i.idx_scan AS index_scans,
    ROUND(
      CASE
        WHEN (i.idx_scan + COALESCE(s.seq_scan, 0)) = 0 THEN 0
        ELSE (i.idx_scan::NUMERIC / (i.idx_scan + COALESCE(s.seq_scan, 0))) * 100
      END,
      2
    ) AS cache_hit_ratio
  FROM pg_stat_user_indexes i
  LEFT JOIN pg_stat_user_tables s ON i.relid = s.relid
  WHERE i.schemaname = 'public'
  AND i.tablename IN ('rag_documents', 'rag_embeddings')
  ORDER BY i.idx_scan DESC;
$$;

COMMENT ON FUNCTION get_search_performance_stats IS 'RAG 검색 성능 통계 조회';

-- ============================================================================
-- 마이그레이션 완료
-- ============================================================================

COMMIT;

-- 마이그레이션 확인
DO $$
BEGIN
  RAISE NOTICE 'RAG 검색 함수 마이그레이션 완료 (3/3)';
  RAISE NOTICE '- search_rag_embeddings 함수 생성됨';
  RAISE NOTICE '- hybrid_search_rag 함수 생성됨';
  RAISE NOTICE '- get_context_for_prompt 함수 생성됨';
  RAISE NOTICE '- find_similar_documents 함수 생성됨';
  RAISE NOTICE '- rag_index_stats 뷰 생성됨';
  RAISE NOTICE '- get_search_performance_stats 함수 생성됨';
  RAISE NOTICE '';
  RAISE NOTICE '=== RAG 시스템 마이그레이션 완료 ===';
  RAISE NOTICE '- 테이블 2개: rag_documents, rag_embeddings';
  RAISE NOTICE '- RLS 정책 18개';
  RAISE NOTICE '- 트리거 3개';
  RAISE NOTICE '- 검색 함수 4개';
  RAISE NOTICE '- 유틸리티 함수 6개';
  RAISE NOTICE '- 통계 뷰 1개';
END $$;

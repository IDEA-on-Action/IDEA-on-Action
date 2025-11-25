-- ============================================================================
-- RAG 마이그레이션 검증 스크립트
--
-- 파일: validate-rag-migrations.sql
-- 작성일: 2025-11-25
-- 용도: RAG 시스템 마이그레이션 후 검증
--
-- 실행 방법:
--   psql -d your_database -f validate-rag-migrations.sql
-- ============================================================================

\echo ''
\echo '=== RAG 시스템 마이그레이션 검증 시작 ==='
\echo ''

-- ============================================================================
-- 1. 확장 검증
-- ============================================================================
\echo '1. pgvector 확장 확인...'
SELECT
  CASE
    WHEN COUNT(*) > 0 THEN '✅ pgvector 확장 설치됨'
    ELSE '❌ pgvector 확장 없음 - CREATE EXTENSION vector 실행 필요'
  END AS status
FROM pg_extension
WHERE extname = 'vector';

\echo ''

-- ============================================================================
-- 2. 테이블 검증
-- ============================================================================
\echo '2. RAG 테이블 확인...'
SELECT
  table_name,
  CASE
    WHEN table_name IS NOT NULL THEN '✅ 생성됨'
    ELSE '❌ 없음'
  END AS status
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('rag_documents', 'rag_embeddings')
ORDER BY table_name;

\echo ''

-- ============================================================================
-- 3. 컬럼 검증
-- ============================================================================
\echo '3. rag_documents 컬럼 확인...'
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'rag_documents'
ORDER BY ordinal_position;

\echo ''
\echo '4. rag_embeddings 컬럼 확인...'
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'rag_embeddings'
ORDER BY ordinal_position;

\echo ''

-- ============================================================================
-- 5. 인덱스 검증
-- ============================================================================
\echo '5. RAG 인덱스 확인...'
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('rag_documents', 'rag_embeddings')
ORDER BY tablename, indexname;

\echo ''

-- ============================================================================
-- 6. RLS 정책 검증
-- ============================================================================
\echo '6. RLS 정책 확인...'
SELECT
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('rag_documents', 'rag_embeddings')
ORDER BY tablename, policyname;

\echo ''

-- ============================================================================
-- 7. 함수 검증
-- ============================================================================
\echo '7. RAG 검색 함수 확인...'
SELECT
  routine_name,
  routine_type,
  CASE
    WHEN security_type = 'DEFINER' THEN '✅ SECURITY DEFINER'
    ELSE '⚠️ ' || security_type
  END AS security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND (
  routine_name LIKE '%rag%'
  OR routine_name IN (
    'search_rag_embeddings',
    'hybrid_search_rag',
    'get_context_for_prompt',
    'find_similar_documents',
    'get_search_performance_stats',
    'get_document_chunks',
    'get_embedding_stats',
    'search_rag_documents',
    'get_pending_documents',
    'get_document_stats'
  )
)
ORDER BY routine_name;

\echo ''

-- ============================================================================
-- 8. 트리거 검증
-- ============================================================================
\echo '8. RAG 트리거 확인...'
SELECT
  event_object_table AS table_name,
  trigger_name,
  event_manipulation AS event,
  action_timing AS timing
FROM information_schema.triggers
WHERE event_object_schema = 'public'
AND event_object_table IN ('rag_documents', 'rag_embeddings')
ORDER BY event_object_table, trigger_name;

\echo ''

-- ============================================================================
-- 9. 제약조건 검증
-- ============================================================================
\echo '9. RAG 제약조건 확인...'
SELECT
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
WHERE tc.table_schema = 'public'
AND tc.table_name IN ('rag_documents', 'rag_embeddings')
ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name;

\echo ''

-- ============================================================================
-- 10. 외래키 관계 검증
-- ============================================================================
\echo '10. 외래키 관계 확인...'
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
  AND rc.constraint_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name IN ('rag_documents', 'rag_embeddings')
ORDER BY tc.table_name, kcu.column_name;

\echo ''

-- ============================================================================
-- 11. 뷰 검증
-- ============================================================================
\echo '11. RAG 뷰 확인...'
SELECT
  table_name,
  view_definition
FROM information_schema.views
WHERE table_schema = 'public'
AND table_name LIKE '%rag%'
ORDER BY table_name;

\echo ''

-- ============================================================================
-- 12. 통계 정보
-- ============================================================================
\echo '12. RAG 테이블 통계...'
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
  n_live_tup AS row_count,
  last_vacuum,
  last_analyze
FROM pg_stat_user_tables
WHERE schemaname = 'public'
AND tablename IN ('rag_documents', 'rag_embeddings')
ORDER BY tablename;

\echo ''

-- ============================================================================
-- 13. 샘플 데이터 테스트 (선택)
-- ============================================================================
\echo '13. 샘플 데이터 삽입 테스트...'
\echo '(실제 데이터 삽입은 하지 않음 - 스키마만 검증)'

-- 샘플 쿼리 (주석 처리)
-- INSERT INTO public.rag_documents (user_id, title, content, source_type, service_id)
-- VALUES (
--   auth.uid(),
--   '테스트 문서',
--   '이것은 테스트 문서입니다.',
--   'manual',
--   'minu-find'
-- );

\echo '✅ 스키마 검증 완료'

\echo ''

-- ============================================================================
-- 14. 권장 사항
-- ============================================================================
\echo '=== 권장 사항 ==='
\echo ''
\echo '1. IVFFlat 인덱스 최적화:'
\echo '   - 현재 lists=100 (< 10,000 벡터용)'
\echo '   - 데이터 증가 시 lists 재조정 필요'
\echo '   - 벡터 수 > 100,000: lists=sqrt(벡터 수)'
\echo ''
\echo '2. 정기적인 VACUUM ANALYZE 실행:'
\echo '   VACUUM ANALYZE rag_documents;'
\echo '   VACUUM ANALYZE rag_embeddings;'
\echo ''
\echo '3. 검색 성능 모니터링:'
\echo '   SELECT * FROM get_search_performance_stats();'
\echo ''
\echo '4. Edge Function 구현 필요:'
\echo '   - rag-embed: 문서 임베딩 생성'
\echo '   - rag-search: 벡터 검색'
\echo '   - rag-chat: RAG 기반 채팅'
\echo ''

\echo '=== RAG 시스템 마이그레이션 검증 완료 ==='
\echo ''

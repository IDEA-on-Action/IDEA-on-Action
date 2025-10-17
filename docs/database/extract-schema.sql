-- ===================================================================
-- Supabase Schema Extraction SQL
-- 이 SQL을 Supabase SQL Editor에서 실행하여 전체 스키마 정보를 추출하세요
-- ===================================================================

-- 1. 모든 테이블 목록 및 설명
SELECT
  schemaname,
  tablename,
  tableowner
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 2. 각 테이블의 컬럼 상세 정보
SELECT
  c.table_name,
  c.column_name,
  c.ordinal_position,
  c.data_type,
  c.character_maximum_length,
  c.is_nullable,
  c.column_default,
  pgd.description as column_comment
FROM information_schema.columns c
LEFT JOIN pg_catalog.pg_statio_all_tables st
  ON c.table_schema = st.schemaname
  AND c.table_name = st.relname
LEFT JOIN pg_catalog.pg_description pgd
  ON pgd.objoid = st.relid
  AND pgd.objsubid = c.ordinal_position
WHERE c.table_schema = 'public'
ORDER BY c.table_name, c.ordinal_position;

-- 3. Primary Keys
SELECT
  tc.table_name,
  kcu.column_name,
  tc.constraint_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'PRIMARY KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- 4. Foreign Keys (관계)
SELECT
  tc.table_name AS from_table,
  kcu.column_name AS from_column,
  ccu.table_name AS to_table,
  ccu.column_name AS to_column,
  tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- 5. 인덱스 정보
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- 6. 테이블 크기 및 행 개수
SELECT
  schemaname,
  relname AS table_name,
  n_live_tup AS estimated_rows,
  pg_size_pretty(pg_total_relation_size(relid)) AS total_size
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY relname;

-- 7. RLS (Row Level Security) 정책
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 8. 각 테이블별 샘플 데이터 (첫 1개 행)
-- services
SELECT 'services' as table_name, * FROM services LIMIT 1;

-- service_categories
SELECT 'service_categories' as table_name, * FROM service_categories LIMIT 1;

-- posts
SELECT 'posts' as table_name, * FROM posts LIMIT 1;

-- carts
SELECT 'carts' as table_name, * FROM carts LIMIT 1;

-- orders
SELECT 'orders' as table_name, * FROM orders LIMIT 1;

-- order_items
SELECT 'order_items' as table_name, * FROM order_items LIMIT 1;

-- payments
SELECT 'payments' as table_name, * FROM payments LIMIT 1;

-- user_profiles
SELECT 'user_profiles' as table_name, * FROM user_profiles LIMIT 1;

-- user_roles
SELECT 'user_roles' as table_name, * FROM user_roles LIMIT 1;

-- post_tags
SELECT 'post_tags' as table_name, * FROM post_tags LIMIT 1;

-- gallery
SELECT 'gallery' as table_name, * FROM gallery LIMIT 1;

-- metrics
SELECT 'metrics' as table_name, * FROM metrics LIMIT 1;

-- chat_messages
SELECT 'chat_messages' as table_name, * FROM chat_messages LIMIT 1;

-- analytics_events
SELECT 'analytics_events' as table_name, * FROM analytics_events LIMIT 1;

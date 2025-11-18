-- ============================================
-- Services 테이블 스키마 검증 스크립트
-- 목적: services 테이블의 모든 컬럼 확인
-- 사용법: psql -U postgres -d postgres -f scripts/check-services-schema.sql
-- ============================================

\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '📋 Services 테이블 스키마 검증'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

-- ============================================
-- 1. 테이블 존재 여부 확인
-- ============================================

\echo '1️⃣  테이블 존재 여부 확인'
\echo ''

SELECT
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = 'services'
    ) THEN '✅ services 테이블 존재'
    ELSE '❌ services 테이블 없음'
  END AS table_status;

\echo ''

-- ============================================
-- 2. 컬럼 목록 확인
-- ============================================

\echo '2️⃣  컬럼 목록 (총 개수 및 상세)'
\echo ''

SELECT
  column_name AS "컬럼명",
  data_type AS "데이터 타입",
  CASE
    WHEN is_nullable = 'YES' THEN 'NULL 허용'
    ELSE 'NOT NULL'
  END AS "NULL 여부",
  column_default AS "기본값"
FROM
  information_schema.columns
WHERE
  table_schema = 'public'
  AND table_name = 'services'
ORDER BY
  ordinal_position;

\echo ''

-- ============================================
-- 3. 필수 컬럼 존재 여부 확인
-- ============================================

\echo '3️⃣  필수 컬럼 존재 여부'
\echo ''

SELECT
  'id' AS "컬럼명",
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'services'
        AND column_name = 'id'
    ) THEN '✅ 존재'
    ELSE '❌ 없음'
  END AS "상태"
UNION ALL
SELECT
  'title',
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'services'
        AND column_name = 'title'
    ) THEN '✅ 존재'
    ELSE '❌ 없음'
  END
UNION ALL
SELECT
  'slug',
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'services'
        AND column_name = 'slug'
    ) THEN '✅ 존재'
    ELSE '❌ 없음'
  END
UNION ALL
SELECT
  'pricing_data',
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'services'
        AND column_name = 'pricing_data'
    ) THEN '✅ 존재'
    ELSE '❌ 없음'
  END
UNION ALL
SELECT
  'deliverables',
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'services'
        AND column_name = 'deliverables'
    ) THEN '✅ 존재'
    ELSE '❌ 없음'
  END
UNION ALL
SELECT
  'process_steps',
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'services'
        AND column_name = 'process_steps'
    ) THEN '✅ 존재'
    ELSE '❌ 없음'
  END
UNION ALL
SELECT
  'faq',
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'services'
        AND column_name = 'faq'
    ) THEN '✅ 존재'
    ELSE '❌ 없음'
  END;

\echo ''

-- ============================================
-- 4. 기존 서비스 데이터 확인
-- ============================================

\echo '4️⃣  기존 서비스 데이터'
\echo ''

SELECT
  COUNT(*) AS "총 서비스 수",
  COUNT(CASE WHEN status = 'active' THEN 1 END) AS "활성 서비스",
  COUNT(CASE WHEN pricing_data IS NOT NULL THEN 1 END) AS "pricing_data 있음",
  COUNT(CASE WHEN deliverables IS NOT NULL THEN 1 END) AS "deliverables 있음",
  COUNT(CASE WHEN process_steps IS NOT NULL THEN 1 END) AS "process_steps 있음",
  COUNT(CASE WHEN faq IS NOT NULL THEN 1 END) AS "faq 있음"
FROM
  public.services;

\echo ''

-- ============================================
-- 5. 토스페이먼츠 심사용 서비스 확인
-- ============================================

\echo '5️⃣  토스페이먼츠 심사용 서비스 (4개)'
\echo ''

SELECT
  slug AS "Slug",
  title AS "제목",
  price AS "가격 (원)",
  status AS "상태",
  CASE
    WHEN pricing_data IS NOT NULL THEN '✅'
    ELSE '⬜'
  END AS "가격정보",
  CASE
    WHEN deliverables IS NOT NULL THEN '✅'
    ELSE '⬜'
  END AS "결과물",
  CASE
    WHEN process_steps IS NOT NULL THEN '✅'
    ELSE '⬜'
  END AS "프로세스",
  CASE
    WHEN faq IS NOT NULL THEN '✅'
    ELSE '⬜'
  END AS "FAQ"
FROM
  public.services
WHERE
  slug IN ('mvp-development', 'fullstack-development', 'design-system', 'operations-management')
ORDER BY
  slug;

\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '✨ 스키마 검증 완료!'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

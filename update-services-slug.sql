-- ============================================
-- 프로덕션 DB services 테이블 slug 값을 짧게 변경
-- 일시: 2025-11-19
-- 목적: 더 짧고 깔끔한 URL 제공
-- ============================================

-- 변경 전: mvp-development → 변경 후: mvp
UPDATE public.services
SET slug = 'mvp'
WHERE slug = 'mvp-development';

-- 변경 전: fullstack-development → 변경 후: fullstack
UPDATE public.services
SET slug = 'fullstack'
WHERE slug = 'fullstack-development';

-- 변경 전: design-system → 변경 후: design
UPDATE public.services
SET slug = 'design'
WHERE slug = 'design-system';

-- 변경 전: operations-management → 변경 후: operations
UPDATE public.services
SET slug = 'operations'
WHERE slug = 'operations-management';

-- 검증
SELECT id, title, slug
FROM public.services
WHERE slug IN ('mvp', 'fullstack', 'design', 'operations')
ORDER BY slug;

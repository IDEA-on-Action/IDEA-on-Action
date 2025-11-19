-- ============================================
-- COMPASS Navigator slug 업데이트
-- 일시: 2025-11-19
-- 목적: 더 나은 URL (UUID → slug)
-- ============================================

-- Before: /services/fed76f94-b3a0-4c88-9540-cf3f98ef354c
-- After:  /services/compass-navigator

UPDATE public.services
SET slug = 'compass-navigator'
WHERE id = 'fed76f94-b3a0-4c88-9540-cf3f98ef354c';

-- 검증
SELECT id, slug, title, status
FROM public.services
WHERE id = 'fed76f94-b3a0-4c88-9540-cf3f98ef354c';

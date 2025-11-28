-- =====================================================
-- Compass → Minu 브랜드 전환 마이그레이션
-- 2025-11-22
-- =====================================================

-- 1. 서비스 데이터 업데이트 (services 테이블)
-- 주의: 실제 서비스 ID가 다를 수 있으므로 slug 기반으로 업데이트

-- Compass Navigator → Minu Find
UPDATE services
SET
  title = 'Minu Find',
  slug = 'find',
  description = '작은 신호에서 사업기회를 발견합니다. 시장·기술·정책·경쟁사 정보를 자동으로 모아 ''할 만한 기회''만 깔끔하게 보여줍니다.',
  updated_at = NOW()
WHERE slug = 'navigator' OR title LIKE '%Navigator%';

-- Compass Cartographer → Minu Frame
UPDATE services
SET
  title = 'Minu Frame',
  slug = 'frame',
  description = '올바른 문제 정의는 좋은 프로젝트의 절반입니다. Minu Frame은 생각을 구조화하고, 요구사항을 정리해 기획 초기 단계의 혼탁함을 단숨에 정리합니다.',
  updated_at = NOW()
WHERE slug = 'cartographer' OR title LIKE '%Cartographer%';

-- Compass Captain → Minu Build
UPDATE services
SET
  title = 'Minu Build',
  slug = 'build',
  description = '프로젝트는 복잡하기 쉽지만, 진행 상황을 이해하는 일까지 복잡할 필요는 없습니다. Minu Build는 일정·이슈·진척을 부드럽게 요약해 PM/PL이 관리 대신 본질에 집중할 수 있게 만듭니다.',
  updated_at = NOW()
WHERE slug = 'captain' OR title LIKE '%Captain%';

-- Compass Harbor → Minu Keep
UPDATE services
SET
  title = 'Minu Keep',
  slug = 'keep',
  description = '운영은 ''묵직하게''가 아니라 ''가볍고 지속 가능한 방식''이어야 합니다. Minu Keep은 버그, 업데이트, 리소스, 운영 기록을 단정하면서도 가벼운 방식으로 정리합니다.',
  updated_at = NOW()
WHERE slug = 'harbor' OR title LIKE '%Harbor%';

-- 2. 구독 플랜 이름 업데이트 (subscription_plans 테이블)
-- plan_name에 Compass가 포함된 경우 Minu로 변경
UPDATE subscription_plans
SET
  plan_name = REPLACE(plan_name, 'Compass Navigator', 'Minu Find'),
  updated_at = NOW()
WHERE plan_name LIKE '%Compass Navigator%';

UPDATE subscription_plans
SET
  plan_name = REPLACE(plan_name, 'COMPASS Navigator', 'Minu Find'),
  updated_at = NOW()
WHERE plan_name LIKE '%COMPASS Navigator%';

-- 3. compass_integration_view → minu_integration_view 뷰 생성
-- 기존 뷰 삭제 후 새로 생성 (컬럼명 변경 시 필요)
DROP VIEW IF EXISTS public.compass_integration_view;
DROP VIEW IF EXISTS public.minu_integration_view;

CREATE VIEW public.minu_integration_view AS
SELECT
  u.id as user_id,
  u.email,
  u.raw_user_meta_data->>'full_name' as full_name,
  u.raw_user_meta_data->>'avatar_url' as avatar_url,
  s.id as subscription_id,
  s.status as subscription_status,
  s.current_period_start,
  s.current_period_end,
  sp.plan_name,
  sp.price,
  sp.billing_cycle,
  sp.features,
  srv.title as service_title,
  srv.slug as service_slug
FROM auth.users u
LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
LEFT JOIN subscription_plans sp ON s.plan_id = sp.id
LEFT JOIN services srv ON sp.service_id = srv.id
WHERE srv.slug IN ('find', 'frame', 'build', 'keep') OR srv.slug IS NULL;

-- 기존 compass_integration_view 별칭 유지 (하위 호환성)
CREATE OR REPLACE VIEW public.compass_integration_view AS
SELECT * FROM public.minu_integration_view;

-- 4. 권한 설정 (RLS 유지)
-- 뷰에 대한 SELECT 권한 부여
GRANT SELECT ON public.minu_integration_view TO authenticated;
GRANT SELECT ON public.compass_integration_view TO authenticated;

-- 5. 코멘트 추가
COMMENT ON VIEW public.minu_integration_view IS 'Minu 플랫폼 통합 뷰 - 사용자, 구독, 플랜 정보 조회';
COMMENT ON VIEW public.compass_integration_view IS 'Deprecated: minu_integration_view를 사용하세요 (하위 호환성)';

-- =====================================================
-- 롤백 스크립트 (필요시 사용)
-- =====================================================
/*
-- 서비스 원복
UPDATE services SET title = 'COMPASS Navigator', slug = 'navigator' WHERE slug = 'find';
UPDATE services SET title = 'COMPASS Cartographer', slug = 'cartographer' WHERE slug = 'frame';
UPDATE services SET title = 'COMPASS Captain', slug = 'captain' WHERE slug = 'build';
UPDATE services SET title = 'COMPASS Harbor', slug = 'harbor' WHERE slug = 'keep';

-- 플랜 이름 원복
UPDATE subscription_plans SET plan_name = REPLACE(plan_name, 'Minu Find', 'COMPASS Navigator') WHERE plan_name LIKE '%Minu Find%';

-- 뷰 삭제
DROP VIEW IF EXISTS public.minu_integration_view;
DROP VIEW IF EXISTS public.compass_integration_view;
*/

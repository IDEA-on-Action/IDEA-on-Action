-- ============================================
-- Service Packages & Subscription Plans 데이터 INSERT (수정본)
-- 일시: 2025-11-19
-- 수정: is_active 컬럼 제거 (프로덕션 DB 호환)
-- ============================================

-- ============================================
-- Step 1: 기존 데이터 확인 (중복 방지)
-- ============================================
DO $$
DECLARE
  packages_count INTEGER;
  plans_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO packages_count FROM public.service_packages;
  SELECT COUNT(*) INTO plans_count FROM public.subscription_plans;

  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '현재 데이터 현황:';
  RAISE NOTICE '  service_packages: % rows', packages_count;
  RAISE NOTICE '  subscription_plans: % rows', plans_count;
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;

-- ============================================
-- Step 2: 서비스 ID 조회 및 임시 테이블 생성
-- ============================================
CREATE TEMP TABLE service_ids AS
SELECT id, slug, title
FROM public.services
WHERE slug IN ('mvp', 'fullstack', 'design', 'operations');

-- ============================================
-- Step 3: MVP 개발 서비스 - 3개 패키지
-- ============================================
INSERT INTO public.service_packages (service_id, name, price, features, is_popular, display_order)
SELECT
  s.id,
  '스탠다드',
  8000000,
  '[
    {"icon": "Check", "text": "핵심 기능 5-8개 개발"},
    {"icon": "Check", "text": "반응형 웹 디자인"},
    {"icon": "Check", "text": "기본 UI/UX 설계"},
    {"icon": "Check", "text": "소셜 로그인 (1개)"},
    {"icon": "Check", "text": "기본 관리자 페이지"},
    {"icon": "Check", "text": "2개월 무상 기술 지원"}
  ]'::jsonb,
  false,
  1
FROM service_ids s
WHERE s.slug = 'mvp';

INSERT INTO public.service_packages (service_id, name, price, features, is_popular, display_order)
SELECT
  s.id,
  '프로',
  12000000,
  '[
    {"icon": "Check", "text": "핵심 기능 8-12개 개발"},
    {"icon": "Check", "text": "고급 UI/UX 디자인"},
    {"icon": "Check", "text": "소셜 로그인 (3개)"},
    {"icon": "Check", "text": "결제 시스템 연동 (1개 PG사)"},
    {"icon": "Check", "text": "고급 관리자 대시보드"},
    {"icon": "Check", "text": "실시간 알림 기능"},
    {"icon": "Check", "text": "3개월 무상 기술 지원"}
  ]'::jsonb,
  true,
  2
FROM service_ids s
WHERE s.slug = 'mvp';

INSERT INTO public.service_packages (service_id, name, price, features, is_popular, display_order)
SELECT
  s.id,
  '엔터프라이즈',
  18000000,
  '[
    {"icon": "Check", "text": "핵심 기능 12-15개 개발"},
    {"icon": "Check", "text": "프리미엄 UI/UX 디자인"},
    {"icon": "Check", "text": "소셜 로그인 (5개)"},
    {"icon": "Check", "text": "복수 결제 시스템 연동"},
    {"icon": "Check", "text": "엔터프라이즈급 관리자 시스템"},
    {"icon": "Check", "text": "실시간 알림 + 이메일 자동화"},
    {"icon": "Check", "text": "Analytics & 리포팅 대시보드"},
    {"icon": "Check", "text": "6개월 무상 기술 지원"}
  ]'::jsonb,
  false,
  3
FROM service_ids s
WHERE s.slug = 'mvp';

-- ============================================
-- Step 4: 풀스택 개발 서비스 - 3개 플랜
-- ============================================
INSERT INTO public.subscription_plans (service_id, plan_name, billing_cycle, price, features, is_popular, display_order)
SELECT
  s.id,
  '스탠다드',
  'monthly',
  5500000,
  '[
    {"icon": "Check", "text": "주니어 개발자 1명 지원"},
    {"icon": "Check", "text": "월 80시간 개발"},
    {"icon": "Check", "text": "기본 유지보수"},
    {"icon": "Check", "text": "주간 진행상황 리포트"},
    {"icon": "Check", "text": "이메일 지원 (48시간 응답)"}
  ]'::jsonb,
  false,
  1
FROM service_ids s
WHERE s.slug = 'fullstack';

INSERT INTO public.subscription_plans (service_id, plan_name, billing_cycle, price, features, is_popular, display_order)
SELECT
  s.id,
  '프로',
  'monthly',
  15000000,
  '[
    {"icon": "Check", "text": "시니어 개발자 1명 + 주니어 개발자 1명"},
    {"icon": "Check", "text": "월 160시간 개발"},
    {"icon": "Check", "text": "우선 유지보수 및 긴급 대응"},
    {"icon": "Check", "text": "일간 진행상황 리포트"},
    {"icon": "Check", "text": "전화/슬랙 지원 (24시간 응답)"},
    {"icon": "Check", "text": "분기별 성능 최적화"}
  ]'::jsonb,
  true,
  2
FROM service_ids s
WHERE s.slug = 'fullstack';

INSERT INTO public.subscription_plans (service_id, plan_name, billing_cycle, price, features, is_popular, display_order)
SELECT
  s.id,
  '엔터프라이즈',
  'monthly',
  60000000,
  '[
    {"icon": "Check", "text": "전담 개발팀 (시니어 3명 + 주니어 3명)"},
    {"icon": "Check", "text": "월 320시간+ 개발"},
    {"icon": "Check", "text": "24/7 긴급 대응"},
    {"icon": "Check", "text": "실시간 진행상황 대시보드"},
    {"icon": "Check", "text": "전담 프로젝트 매니저"},
    {"icon": "Check", "text": "월간 성능 최적화 및 보안 점검"},
    {"icon": "Check", "text": "기술 자문 및 아키텍처 리뷰"}
  ]'::jsonb,
  false,
  3
FROM service_ids s
WHERE s.slug = 'fullstack';

-- ============================================
-- Step 5: 디자인 시스템 서비스 - 2개 패키지
-- ============================================
INSERT INTO public.service_packages (service_id, name, price, features, is_popular, display_order)
SELECT
  s.id,
  '베이직',
  800000,
  '[
    {"icon": "Check", "text": "컬러 팔레트 정의 (Primary, Secondary, Accent)"},
    {"icon": "Check", "text": "타이포그래피 시스템 (3-5개 폰트)"},
    {"icon": "Check", "text": "기본 UI 컴포넌트 10개 (버튼, 인풋, 카드 등)"},
    {"icon": "Check", "text": "아이콘 라이브러리 (30개)"},
    {"icon": "Check", "text": "Figma 디자인 파일"},
    {"icon": "Check", "text": "스타일 가이드 문서"}
  ]'::jsonb,
  false,
  1
FROM service_ids s
WHERE s.slug = 'design';

INSERT INTO public.service_packages (service_id, name, price, features, is_popular, display_order)
SELECT
  s.id,
  '프로',
  1500000,
  '[
    {"icon": "Check", "text": "컬러 팔레트 정의 (Primary, Secondary, Accent, Semantic)"},
    {"icon": "Check", "text": "타이포그래피 시스템 (5-8개 폰트)"},
    {"icon": "Check", "text": "고급 UI 컴포넌트 20개 (모달, 드롭다운, 네비게이션 등)"},
    {"icon": "Check", "text": "아이콘 라이브러리 (100개)"},
    {"icon": "Check", "text": "다크 모드 지원"},
    {"icon": "Check", "text": "Figma 디자인 파일 + 컴포넌트 라이브러리"},
    {"icon": "Check", "text": "브랜드 가이드라인 문서"},
    {"icon": "Check", "text": "접근성(WCAG 2.1 AA) 준수"}
  ]'::jsonb,
  true,
  2
FROM service_ids s
WHERE s.slug = 'design';

-- ============================================
-- Step 6: 운영 관리 서비스 - 3개 플랜
-- ============================================
INSERT INTO public.subscription_plans (service_id, plan_name, billing_cycle, price, features, is_popular, display_order)
SELECT
  s.id,
  '베이직',
  'monthly',
  1000000,
  '[
    {"icon": "Check", "text": "주간 서버 모니터링 (CPU, 메모리, 디스크)"},
    {"icon": "Check", "text": "월간 보안 패치"},
    {"icon": "Check", "text": "자동 백업 (주 1회)"},
    {"icon": "Check", "text": "이메일 알림"},
    {"icon": "Check", "text": "영업시간 내 긴급 대응 (평일 9-6시)"}
  ]'::jsonb,
  false,
  1
FROM service_ids s
WHERE s.slug = 'operations';

INSERT INTO public.subscription_plans (service_id, plan_name, billing_cycle, price, features, is_popular, display_order)
SELECT
  s.id,
  '스탠다드',
  'monthly',
  2000000,
  '[
    {"icon": "Check", "text": "실시간 서버 모니터링 (CPU, 메모리, 디스크, 네트워크)"},
    {"icon": "Check", "text": "주간 보안 패치"},
    {"icon": "Check", "text": "자동 백업 (일 1회)"},
    {"icon": "Check", "text": "Slack/SMS 알림"},
    {"icon": "Check", "text": "24/7 긴급 대응"},
    {"icon": "Check", "text": "월간 성능 리포트"}
  ]'::jsonb,
  true,
  2
FROM service_ids s
WHERE s.slug = 'operations';

INSERT INTO public.subscription_plans (service_id, plan_name, billing_cycle, price, features, is_popular, display_order)
SELECT
  s.id,
  '프로',
  'monthly',
  4000000,
  '[
    {"icon": "Check", "text": "실시간 서버 모니터링 + APM (Application Performance Monitoring)"},
    {"icon": "Check", "text": "일간 보안 패치 및 취약점 스캔"},
    {"icon": "Check", "text": "자동 백업 (일 3회) + 원격지 백업"},
    {"icon": "Check", "text": "멀티 채널 알림 (Slack, SMS, 전화)"},
    {"icon": "Check", "text": "24/7 긴급 대응 + 전담 DevOps 엔지니어"},
    {"icon": "Check", "text": "주간 성능 리포트 + 최적화 제안"},
    {"icon": "Check", "text": "Disaster Recovery 플랜"}
  ]'::jsonb,
  false,
  3
FROM service_ids s
WHERE s.slug = 'operations';

-- ============================================
-- Step 7: 검증
-- ============================================
DO $$
DECLARE
  packages_count INTEGER;
  plans_count INTEGER;
  mvp_packages INTEGER;
  fullstack_plans INTEGER;
  design_packages INTEGER;
  operations_plans INTEGER;
BEGIN
  -- 전체 개수
  SELECT COUNT(*) INTO packages_count FROM public.service_packages;
  SELECT COUNT(*) INTO plans_count FROM public.subscription_plans;

  -- 서비스별 개수
  SELECT COUNT(*) INTO mvp_packages FROM public.service_packages sp
  JOIN public.services s ON sp.service_id = s.id WHERE s.slug = 'mvp';

  SELECT COUNT(*) INTO fullstack_plans FROM public.subscription_plans sp
  JOIN public.services s ON sp.service_id = s.id WHERE s.slug = 'fullstack';

  SELECT COUNT(*) INTO design_packages FROM public.service_packages sp
  JOIN public.services s ON sp.service_id = s.id WHERE s.slug = 'design';

  SELECT COUNT(*) INTO operations_plans FROM public.subscription_plans sp
  JOIN public.services s ON sp.service_id = s.id WHERE s.slug = 'operations';

  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ 데이터 INSERT 완료!';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '전체 통계:';
  RAISE NOTICE '  service_packages: % rows', packages_count;
  RAISE NOTICE '  subscription_plans: % rows', plans_count;
  RAISE NOTICE '';
  RAISE NOTICE '서비스별:';
  RAISE NOTICE '  MVP 개발 패키지: % (예상: 3)', mvp_packages;
  RAISE NOTICE '  풀스택 개발 플랜: % (예상: 3)', fullstack_plans;
  RAISE NOTICE '  디자인 시스템 패키지: % (예상: 2)', design_packages;
  RAISE NOTICE '  운영 관리 플랜: % (예상: 3)', operations_plans;
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  RAISE NOTICE '📋 다음 단계:';
  RAISE NOTICE '1. 브라우저: https://www.ideaonaction.ai/services/mvp';
  RAISE NOTICE '2. 브라우저: https://www.ideaonaction.ai/services/fullstack';
  RAISE NOTICE '3. 브라우저: https://www.ideaonaction.ai/services/design';
  RAISE NOTICE '4. 브라우저: https://www.ideaonaction.ai/services/operations';
  RAISE NOTICE '5. 장바구니 버튼 클릭 테스트';
END $$;

-- Cleanup
DROP TABLE service_ids;

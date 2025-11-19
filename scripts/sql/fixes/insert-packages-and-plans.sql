-- ============================================================================
-- Insert Service Packages and Subscription Plans
-- 날짜: 2025-11-19
-- 설명: service_packages와 subscription_plans 테이블에 실제 데이터 INSERT
--
-- 실행 조건:
-- - services 테이블에 pricing_data가 이미 채워져 있어야 함
-- - service_packages, subscription_plans 테이블이 생성되어 있어야 함
--
-- 실행 방법:
-- 1. Supabase SQL Editor에서 New Query
-- 2. 이 파일 전체 내용 복사/붙여넣기
-- 3. RUN 버튼 클릭
-- ============================================================================

-- ============================================================================
-- 1. MVP 개발 서비스 - 패키지 3개
-- ============================================================================

INSERT INTO public.service_packages (service_id, name, price, features, is_popular, display_order)
SELECT
  s.id,
  '스탠다드',
  8000000,
  '[
    {"text": "핵심 기능 5-8개 개발"},
    {"text": "반응형 웹 디자인"},
    {"text": "기본 UI/UX 설계"},
    {"text": "소셜 로그인 (1개)"},
    {"text": "기본 관리자 페이지"},
    {"text": "2개월 무상 기술 지원"}
  ]'::jsonb,
  false,
  1
FROM public.services s
WHERE s.slug = 'mvp-development'
ON CONFLICT DO NOTHING;

INSERT INTO public.service_packages (service_id, name, price, features, is_popular, display_order)
SELECT
  s.id,
  '프로',
  12000000,
  '[
    {"text": "핵심 기능 8-12개 개발"},
    {"text": "고급 UI/UX 디자인"},
    {"text": "소셜 로그인 (3개)"},
    {"text": "결제 시스템 연동 (1개 PG사)"},
    {"text": "고급 관리자 대시보드"},
    {"text": "실시간 알림 기능"},
    {"text": "3개월 무상 기술 지원"}
  ]'::jsonb,
  true,  -- 인기 패키지
  2
FROM public.services s
WHERE s.slug = 'mvp-development'
ON CONFLICT DO NOTHING;

INSERT INTO public.service_packages (service_id, name, price, features, is_popular, display_order)
SELECT
  s.id,
  '엔터프라이즈',
  18000000,
  '[
    {"text": "핵심 기능 12-15개 개발"},
    {"text": "프리미엄 UI/UX 디자인"},
    {"text": "소셜 로그인 (5개)"},
    {"text": "복수 결제 시스템 연동"},
    {"text": "엔터프라이즈급 관리자 시스템"},
    {"text": "실시간 알림 + 이메일 자동화"},
    {"text": "Analytics & 리포팅 대시보드"},
    {"text": "6개월 무상 기술 지원"}
  ]'::jsonb,
  false,
  3
FROM public.services s
WHERE s.slug = 'mvp-development'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 2. 풀스택 개발 서비스 - 플랜 3개
-- ============================================================================

INSERT INTO public.subscription_plans (service_id, plan_name, billing_cycle, price, features, is_popular, display_order)
SELECT
  s.id,
  '월간 플랜',
  'monthly',
  5500000,
  '[
    {"text": "풀타임 전담 개발팀"},
    {"text": "2주 단위 스프린트"},
    {"text": "주 2회 진행 상황 미팅"},
    {"text": "월 4회 배포"},
    {"text": "코드 리뷰 & QA"},
    {"text": "기술 문서 작성"}
  ]'::jsonb,
  true,  -- 인기 플랜
  1
FROM public.services s
WHERE s.slug = 'fullstack-development'
ON CONFLICT DO NOTHING;

INSERT INTO public.subscription_plans (service_id, plan_name, billing_cycle, price, features, is_popular, display_order)
SELECT
  s.id,
  '분기 플랜',
  'quarterly',
  15000000,
  '[
    {"text": "월간 플랜의 모든 혜택"},
    {"text": "분기별 기술 전략 미팅"},
    {"text": "성능 최적화 리포트"},
    {"text": "보안 감사"},
    {"text": "우선 기술 지원"}
  ]'::jsonb,
  false,
  2
FROM public.services s
WHERE s.slug = 'fullstack-development'
ON CONFLICT DO NOTHING;

INSERT INTO public.subscription_plans (service_id, plan_name, billing_cycle, price, features, is_popular, display_order)
SELECT
  s.id,
  '연간 플랜',
  'yearly',
  60000000,
  '[
    {"text": "분기 플랜의 모든 혜택"},
    {"text": "전담 프로젝트 매니저"},
    {"text": "월간 기술 리포트"},
    {"text": "연 4회 아키텍처 리뷰"},
    {"text": "24시간 긴급 지원"},
    {"text": "무제한 기술 상담"}
  ]'::jsonb,
  false,
  3
FROM public.services s
WHERE s.slug = 'fullstack-development'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 3. 디자인 시스템 서비스 - 패키지 2개
-- ============================================================================

INSERT INTO public.service_packages (service_id, name, price, features, is_popular, display_order)
SELECT
  s.id,
  '스탠다드',
  800000,
  '[
    {"text": "컬러 시스템 (5-8색)"},
    {"text": "타이포그래피 (3-4 스타일)"},
    {"text": "기본 컴포넌트 20개"},
    {"text": "복합 컴포넌트 10개"},
    {"text": "Figma 디자인 파일"},
    {"text": "React 컴포넌트 라이브러리"},
    {"text": "기본 Storybook 문서"}
  ]'::jsonb,
  true,  -- 인기 패키지
  1
FROM public.services s
WHERE s.slug = 'design-system'
ON CONFLICT DO NOTHING;

INSERT INTO public.service_packages (service_id, name, price, features, is_popular, display_order)
SELECT
  s.id,
  '프로',
  1500000,
  '[
    {"text": "스탠다드의 모든 기능"},
    {"text": "확장 컬러 시스템 (10-15색)"},
    {"text": "타이포그래피 (5-6 스타일)"},
    {"text": "기본 컴포넌트 30개"},
    {"text": "복합 컴포넌트 20개"},
    {"text": "다크 모드 지원"},
    {"text": "애니메이션 & 인터랙션"},
    {"text": "고급 Storybook 문서"},
    {"text": "접근성(A11y) 가이드"}
  ]'::jsonb,
  false,
  2
FROM public.services s
WHERE s.slug = 'design-system'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 4. 운영 관리 서비스 - 플랜 3개
-- ============================================================================

INSERT INTO public.subscription_plans (service_id, plan_name, billing_cycle, price, features, is_popular, display_order)
SELECT
  s.id,
  'Standard 플랜',
  'monthly',
  1000000,
  '[
    {"text": "24/7 시스템 모니터링"},
    {"text": "긴급 장애 대응 (업무시간 24H)"},
    {"text": "월 10시간 기술 지원"},
    {"text": "월간 성능 분석 리포트"},
    {"text": "보안 패치 자동 적용"},
    {"text": "백업 관리 (일 1회)"},
    {"text": "Slack 지원 채널"}
  ]'::jsonb,
  true,  -- 인기 플랜
  1
FROM public.services s
WHERE s.slug = 'operations-management'
ON CONFLICT DO NOTHING;

INSERT INTO public.subscription_plans (service_id, plan_name, billing_cycle, price, features, is_popular, display_order)
SELECT
  s.id,
  'Pro 플랜',
  'monthly',
  2500000,
  '[
    {"text": "Standard의 모든 기능"},
    {"text": "긴급 장애 대응 (업무시간 8H)"},
    {"text": "월 20시간 기술 지원"},
    {"text": "주간 성능 분석 리포트"},
    {"text": "성능 최적화 (월 1회)"},
    {"text": "보안 감사 (월 1회)"},
    {"text": "백업 관리 (일 3회)"},
    {"text": "전담 엔지니어 배정"},
    {"text": "우선 지원"}
  ]'::jsonb,
  false,
  2
FROM public.services s
WHERE s.slug = 'operations-management'
ON CONFLICT DO NOTHING;

INSERT INTO public.subscription_plans (service_id, plan_name, billing_cycle, price, features, is_popular, display_order)
SELECT
  s.id,
  'Enterprise 플랜',
  'monthly',
  4000000,
  '[
    {"text": "Pro의 모든 기능"},
    {"text": "긴급 장애 대응 (24/7 2시간)"},
    {"text": "월 40시간 기술 지원"},
    {"text": "일간 성능 분석 리포트"},
    {"text": "성능 최적화 (주 1회)"},
    {"text": "보안 감사 (주 1회)"},
    {"text": "백업 관리 (실시간)"},
    {"text": "전담 DevOps 팀"},
    {"text": "무제한 기술 상담"},
    {"text": "SLA 99.9% 보장"}
  ]'::jsonb,
  false,
  3
FROM public.services s
WHERE s.slug = 'operations-management'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 검증 메시지
-- ============================================================================

DO $$
DECLARE
  total_packages INTEGER;
  total_plans INTEGER;
  mvp_packages INTEGER;
  fullstack_plans INTEGER;
  design_packages INTEGER;
  operations_plans INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_packages FROM public.service_packages;
  SELECT COUNT(*) INTO total_plans FROM public.subscription_plans;

  SELECT COUNT(*) INTO mvp_packages
  FROM public.service_packages sp
  JOIN public.services s ON s.id = sp.service_id
  WHERE s.slug = 'mvp-development';

  SELECT COUNT(*) INTO fullstack_plans
  FROM public.subscription_plans spl
  JOIN public.services s ON s.id = spl.service_id
  WHERE s.slug = 'fullstack-development';

  SELECT COUNT(*) INTO design_packages
  FROM public.service_packages sp
  JOIN public.services s ON s.id = sp.service_id
  WHERE s.slug = 'design-system';

  SELECT COUNT(*) INTO operations_plans
  FROM public.subscription_plans spl
  JOIN public.services s ON s.id = spl.service_id
  WHERE s.slug = 'operations-management';

  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ 패키지 & 플랜 데이터 INSERT 완료!';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  RAISE NOTICE '📊 INSERT 결과:';
  RAISE NOTICE '  - MVP 개발: % 패키지', mvp_packages;
  RAISE NOTICE '  - 풀스택 개발: % 플랜', fullstack_plans;
  RAISE NOTICE '  - 디자인 시스템: % 패키지', design_packages;
  RAISE NOTICE '  - 운영 관리: % 플랜', operations_plans;
  RAISE NOTICE '';
  RAISE NOTICE '📦 총 데이터:';
  RAISE NOTICE '  - 총 패키지: %개 (예상: 5개)', total_packages;
  RAISE NOTICE '  - 총 플랜: %개 (예상: 6개)', total_plans;
  RAISE NOTICE '';

  IF total_packages = 5 AND total_plans = 6 THEN
    RAISE NOTICE '🎉 모든 데이터가 정상적으로 추가되었습니다!';
  ELSE
    RAISE WARNING '⚠️ 데이터 개수가 예상과 다릅니다. 확인이 필요합니다.';
  END IF;

  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;

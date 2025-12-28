-- ============================================
-- Services Platform 마이그레이션
-- 일시: 2025-11-15
-- 목적: services 테이블에 slug 추가 및 신규 서비스 4개 등록
-- ============================================

-- ============================================
-- Step 1: services 테이블에 slug 컬럼 추가
-- ============================================

-- slug 컬럼 추가 (TEXT, UNIQUE)
ALTER TABLE public.services
ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

COMMENT ON COLUMN public.services.slug IS 'URL-friendly identifier for services (e.g., "mvp-development")';

-- slug 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_services_slug ON public.services(slug);

-- ============================================
-- Step 2: 개발 서비스 카테고리 확인/추가
-- ============================================

-- 'development' 카테고리가 없으면 추가
INSERT INTO public.service_categories (name, slug, description, icon, display_order, is_active)
VALUES (
  '개발 서비스',
  'development',
  '웹/앱 개발 및 기술 서비스',
  'Code',
  5,
  true
)
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- Step 3: 신규 서비스 4개 등록
-- ============================================

DO $$
DECLARE
  development_category_id UUID;
BEGIN
  -- 개발 서비스 카테고리 ID 조회
  SELECT id INTO development_category_id
  FROM public.service_categories
  WHERE slug = 'development';

  -- 1. MVP 개발 서비스
  INSERT INTO public.services (
    title,
    slug,
    description,
    category_id,
    price,
    image_url,
    features,
    status
  ) VALUES (
    'MVP 개발 서비스 - 스탠다드 패키지',
    'mvp-development',
    '비즈니스 아이디어를 빠르게 검증할 수 있는 최소 기능 제품(MVP)을 개발합니다. 핵심 기능에 집중하여 4-8주 내에 시장 테스트 가능한 제품을 제공합니다.',
    development_category_id,
    8000000,
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f',
    '[
      {"icon": "CheckCircle", "title": "핵심 기능 5-8개", "description": "비즈니스에 필수적인 기능 개발"},
      {"icon": "Palette", "title": "고급 UI/UX 디자인", "description": "사용자 친화적인 인터페이스 설계"},
      {"icon": "Shield", "title": "소셜 로그인 통합", "description": "Google, GitHub, Kakao 로그인 지원"},
      {"icon": "CreditCard", "title": "결제 시스템 연동", "description": "PG사 1개 통합 (Toss Payments 등)"},
      {"icon": "Clock", "title": "2개월 무상 기술 지원", "description": "런칭 후 2개월간 기술 지원"}
    ]',
    'active'
  ) ON CONFLICT (slug) DO NOTHING;

  -- 2. 풀스택 개발 서비스
  INSERT INTO public.services (
    title,
    slug,
    description,
    category_id,
    price,
    image_url,
    features,
    status
  ) VALUES (
    '엔터프라이즈급 풀스택 개발 - 2인 팀',
    'fullstack-development',
    'React/Vue/Next.js 기반 프론트엔드, RESTful API/GraphQL 백엔드, CI/CD 파이프라인까지 포함한 엔터프라이즈급 웹 애플리케이션을 처음부터 끝까지 구축합니다.',
    development_category_id,
    5500000,
    'https://images.unsplash.com/photo-1551434678-e076c223a692',
    '[
      {"icon": "Users", "title": "2인 전문 개발팀", "description": "시니어 개발자 2명이 프로젝트 담당"},
      {"icon": "Clock", "title": "주 80시간 투입", "description": "풀타임 개발 (주 40시간 × 2명)"},
      {"icon": "Repeat", "title": "2주 스프린트", "description": "애자일 방식으로 빠른 피드백 반영"},
      {"icon": "Video", "title": "주 2회 미팅", "description": "정기 진행 상황 공유 및 논의"},
      {"icon": "Rocket", "title": "월 4회 배포", "description": "지속적 통합 및 배포 (CI/CD)"}
    ]',
    'active'
  ) ON CONFLICT (slug) DO NOTHING;

  -- 3. 디자인 시스템 구축 서비스
  INSERT INTO public.services (
    title,
    slug,
    description,
    category_id,
    price,
    image_url,
    features,
    status
  ) VALUES (
    '디자인 시스템 구축 - 스탠다드 패키지',
    'design-system',
    '일관된 브랜드 경험을 제공하는 재사용 가능한 디자인 시스템을 구축합니다. Figma 디자인 파일부터 React 컴포넌트 라이브러리까지 완전한 패키지를 제공합니다.',
    development_category_id,
    800000,
    'https://images.unsplash.com/photo-1561070791-2526d30994b5',
    '[
      {"icon": "Palette", "title": "컬러 시스템", "description": "브랜드에 맞는 5-8색 팔레트"},
      {"icon": "Type", "title": "타이포그래피", "description": "3-4가지 스타일의 글꼴 시스템"},
      {"icon": "Layout", "title": "컴포넌트 30종", "description": "기본 + 복합 컴포넌트"},
      {"icon": "Code", "title": "React 구현", "description": "즉시 사용 가능한 컴포넌트 라이브러리"},
      {"icon": "BookOpen", "title": "Storybook 문서", "description": "인터랙티브 컴포넌트 문서"}
    ]',
    'active'
  ) ON CONFLICT (slug) DO NOTHING;

  -- 4. 운영 관리 서비스
  INSERT INTO public.services (
    title,
    slug,
    description,
    category_id,
    price,
    image_url,
    features,
    status
  ) VALUES (
    '웹 애플리케이션 운영 관리 - Standard 플랜',
    'operations-management',
    '웹 애플리케이션의 안정적인 운영을 위한 24/7 모니터링, 보안 관리, 성능 최적화, 기술 지원을 제공합니다. 비즈니스 연속성을 보장합니다.',
    development_category_id,
    1000000,
    'https://images.unsplash.com/photo-1551288049-bebda4e38f71',
    '[
      {"icon": "Activity", "title": "24/7 모니터링", "description": "실시간 서버 상태 및 성능 모니터링"},
      {"icon": "Zap", "title": "긴급 대응 24시간", "description": "장애 발생 시 24시간 이내 대응"},
      {"icon": "Headphones", "title": "월 10시간 기술 지원", "description": "기술 문의 및 이슈 해결 지원"},
      {"icon": "FileText", "title": "성능 분석 리포트", "description": "월간 성능 분석 및 개선 제안"},
      {"icon": "Shield", "title": "보안 패치 자동 적용", "description": "보안 취약점 모니터링 및 패치"}
    ]',
    'active'
  ) ON CONFLICT (slug) DO NOTHING;

  RAISE NOTICE '✅ 서비스 4개 등록 완료!';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '1. MVP 개발 서비스 (slug: mvp-development) - ₩8,000,000';
  RAISE NOTICE '2. 풀스택 개발 (slug: fullstack-development) - ₩5,500,000';
  RAISE NOTICE '3. 디자인 시스템 (slug: design-system) - ₩800,000';
  RAISE NOTICE '4. 운영 관리 (slug: operations-management) - ₩1,000,000';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;

-- ============================================
-- Step 4: 검증 쿼리
-- ============================================

-- 등록된 서비스 확인
DO $$
DECLARE
  service_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO service_count
  FROM public.services
  WHERE slug IN ('mvp-development', 'fullstack-development', 'design-system', 'operations-management');

  IF service_count = 4 THEN
    RAISE NOTICE '';
    RAISE NOTICE '✨ 모든 서비스가 성공적으로 등록되었습니다!';
    RAISE NOTICE '총 서비스 수: %', service_count;
  ELSE
    RAISE WARNING '경고: 일부 서비스 등록 실패. 등록된 서비스 수: %', service_count;
  END IF;
END $$;

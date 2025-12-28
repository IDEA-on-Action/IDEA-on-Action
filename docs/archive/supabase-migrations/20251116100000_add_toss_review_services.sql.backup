-- Add services for Toss Payments review (토스페이먼츠 심사용 서비스 추가)
-- Required URLs:
-- - https://www.ideaonaction.ai/services/mvp
-- - https://www.ideaonaction.ai/services/fullstack
-- - https://www.ideaonaction.ai/services/design
-- - https://www.ideaonaction.ai/services/operations

-- Add slug column if not exists
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Insert/Update MVP Development Service
INSERT INTO public.services (
  id,
  slug,
  title,
  summary,
  description,
  category_id,
  pricing_type,
  base_price,
  max_price,
  status,
  featured,
  created_at,
  updated_at
) VALUES (
  'mvp-development-service',
  'mvp',
  'MVP 개발 서비스',
  '아이디어 검증을 위한 최소 기능 제품(MVP) 개발',
  '빠른 시장 검증을 위한 핵심 기능 중심의 MVP 개발 서비스입니다. 4-8주 내에 프로토타입을 완성하고, 실제 사용자 피드백을 받을 수 있습니다.

## 제공 내용
- 웹/앱 프로토타입 개발
- 핵심 기능 구현 (3-5개)
- 소스코드 및 배포
- 4주 유지보수 지원

## 개발 기간
- **Standard**: 4-6주 (₩2,000,000 ~ ₩5,000,000)
- **Premium**: 6-8주 (₩5,000,000 ~ ₩12,000,000)

## 환불 정책
- 계약 후 7일 이내: 전액 환불
- 개발 시작 전: 80% 환불
- 개발 진행 중: 진행률에 따라 차등 환불 (최소 30%)
- 서비스 제공 완료 후: 환불 불가

## 주요 기술 스택
- Frontend: React, Next.js, Tailwind CSS
- Backend: Node.js, Supabase, PostgreSQL
- Deployment: Vercel, AWS, GCP',
  (SELECT id FROM public.service_categories WHERE slug = 'development' LIMIT 1),
  'package',
  2000000,
  12000000,
  'active',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  title = EXCLUDED.title,
  summary = EXCLUDED.summary,
  description = EXCLUDED.description,
  pricing_type = EXCLUDED.pricing_type,
  base_price = EXCLUDED.base_price,
  max_price = EXCLUDED.max_price,
  status = EXCLUDED.status,
  featured = EXCLUDED.featured,
  updated_at = NOW();

-- Insert/Update Fullstack Development Service
INSERT INTO public.services (
  id,
  slug,
  title,
  summary,
  description,
  category_id,
  pricing_type,
  base_price,
  max_price,
  status,
  featured,
  created_at,
  updated_at
) VALUES (
  'fullstack-development-service',
  'fullstack',
  'Fullstack 개발 서비스',
  '확장 가능한 프로덕션 수준 웹/앱 서비스 개발',
  '장기적 성장을 고려한 확장 가능한 아키텍처와 프로덕션 수준의 코드 품질을 제공합니다.

## 제공 내용
- 완전한 웹/앱 서비스 개발
- 관리자 대시보드
- CI/CD 파이프라인 구축
- 12주 유지보수 지원
- 성능 최적화 및 모니터링

## 개발 기간
- **Standard**: 12-16주 (₩10,000,000 ~ ₩15,000,000)
- **Enterprise**: 16-24주 (₩15,000,000 ~ ₩20,000,000)

## 환불 정책
- 계약 후 7일 이내: 전액 환불
- 개발 시작 전: 80% 환불
- 개발 진행 중 (50% 미만): 50% 환불
- 개발 진행 중 (50% 이상): 30% 환불
- 서비스 제공 완료 후: 환불 불가

## 주요 기술 스택
- Frontend: React, Next.js, TypeScript
- Backend: Node.js, PostgreSQL, Redis
- DevOps: Docker, Kubernetes, GitHub Actions
- Monitoring: Sentry, Google Analytics',
  (SELECT id FROM public.service_categories WHERE slug = 'development' LIMIT 1),
  'package',
  10000000,
  20000000,
  'active',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  title = EXCLUDED.title,
  summary = EXCLUDED.summary,
  description = EXCLUDED.description,
  pricing_type = EXCLUDED.pricing_type,
  base_price = EXCLUDED.base_price,
  max_price = EXCLUDED.max_price,
  status = EXCLUDED.status,
  featured = EXCLUDED.featured,
  updated_at = NOW();

-- Insert/Update Design System Service
INSERT INTO public.services (
  id,
  slug,
  title,
  summary,
  description,
  category_id,
  pricing_type,
  base_price,
  max_price,
  status,
  featured,
  created_at,
  updated_at
) VALUES (
  'design-system-service',
  'design',
  'Design System 서비스',
  '일관된 브랜드 아이덴티티 및 디자인 시스템 구축',
  '재사용 가능한 디자인 컴포넌트와 일관된 사용자 경험을 제공하는 디자인 시스템을 구축합니다.

## 제공 내용
- 브랜드 아이덴티티 정의
- UI/UX 디자인
- 디자인 시스템 구축
- Figma/Storybook 제공
- 디자인 가이드 문서

## 개발 기간
- **Basic**: 4-6주 (₩3,000,000 ~ ₩5,000,000)
- **Premium**: 6-8주 (₩5,000,000 ~ ₩7,000,000)

## 환불 정책
- 계약 후 7일 이내: 전액 환불
- 디자인 시작 전: 80% 환불
- 디자인 진행 중 (50% 미만): 50% 환불
- 디자인 진행 중 (50% 이상): 30% 환불
- 서비스 제공 완료 후: 환불 불가

## 제공물
- 브랜드 가이드라인
- UI 컴포넌트 라이브러리
- Figma 디자인 파일
- Storybook 문서
- 아이콘 세트',
  (SELECT id FROM public.service_categories WHERE slug = 'design' LIMIT 1),
  'package',
  3000000,
  7000000,
  'active',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  title = EXCLUDED.title,
  summary = EXCLUDED.summary,
  description = EXCLUDED.description,
  pricing_type = EXCLUDED.pricing_type,
  base_price = EXCLUDED.base_price,
  max_price = EXCLUDED.max_price,
  status = EXCLUDED.status,
  featured = EXCLUDED.featured,
  updated_at = NOW();

-- Insert/Update Operations Management Service
INSERT INTO public.services (
  id,
  slug,
  title,
  summary,
  description,
  category_id,
  pricing_type,
  base_price,
  max_price,
  status,
  featured,
  created_at,
  updated_at
) VALUES (
  'operations-management-service',
  'operations',
  'Operations 관리 서비스',
  'DevOps, 모니터링, 성능 최적화 운영 관리',
  '안정적인 서비스 운영을 위한 인프라 구축, 모니터링, 성능 최적화를 제공합니다.

## 제공 내용
- 인프라 구축 및 관리
- CI/CD 파이프라인 구축
- 모니터링 대시보드
- 성능 최적화
- 보안 강화
- 백업 및 복구 시스템

## 개발 기간
- **Standard**: 4-8주 (₩5,000,000 ~ ₩10,000,000)
- **Enterprise**: 8-12주 (₩10,000,000 ~ ₩15,000,000)

## 환불 정책
- 계약 후 7일 이내: 전액 환불
- 작업 시작 전: 80% 환불
- 작업 진행 중 (50% 미만): 50% 환불
- 작업 진행 중 (50% 이상): 30% 환불
- 서비스 제공 완료 후: 환불 불가

## 주요 기술
- Cloud: AWS, GCP, Azure
- Container: Docker, Kubernetes
- CI/CD: GitHub Actions, Jenkins
- Monitoring: Prometheus, Grafana, Sentry
- Security: SSL/TLS, Firewall, WAF',
  (SELECT id FROM public.service_categories WHERE slug = 'operations' LIMIT 1),
  'package',
  5000000,
  15000000,
  'active',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  title = EXCLUDED.title,
  summary = EXCLUDED.summary,
  description = EXCLUDED.description,
  pricing_type = EXCLUDED.pricing_type,
  base_price = EXCLUDED.base_price,
  max_price = EXCLUDED.max_price,
  status = EXCLUDED.status,
  featured = EXCLUDED.featured,
  updated_at = NOW();

-- Create index on slug for faster lookups
CREATE INDEX IF NOT EXISTS idx_services_slug ON public.services(slug);

-- Verify services
DO $$
BEGIN
  RAISE NOTICE '=== Toss Payments Review Services Created ===';
  RAISE NOTICE 'MVP: https://www.ideaonaction.ai/services/mvp';
  RAISE NOTICE 'Fullstack: https://www.ideaonaction.ai/services/fullstack';
  RAISE NOTICE 'Design: https://www.ideaonaction.ai/services/design';
  RAISE NOTICE 'Operations: https://www.ideaonaction.ai/services/operations';
END $$;

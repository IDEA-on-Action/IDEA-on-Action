-- ===================================================================
-- Migration 002: Insert Sample Services Data
-- 작성일: 2025-10-17
-- 목적: Phase 8 개발을 위한 샘플 서비스 데이터 삽입
-- ===================================================================

-- ⚠️ 주의: 001 마이그레이션 완료 후 실행하세요

-- ===================================================================
-- PART 1: service_categories 확인 및 업데이트
-- ===================================================================

-- 1.1. 기존 카테고리 확인
SELECT * FROM service_categories ORDER BY display_order;

-- 1.2. 카테고리 아이콘 업데이트 (기존 데이터 보강)
UPDATE service_categories SET icon = 'Brain', is_active = true WHERE slug = 'ai-solutions';
UPDATE service_categories SET icon = 'Workflow', is_active = true WHERE slug = 'automation';
UPDATE service_categories SET icon = 'BarChart3', is_active = true WHERE slug = 'consulting';

-- 1.3. 추가 카테고리 삽입 (필요시)
INSERT INTO service_categories (id, name, slug, description, display_order, icon, is_active)
VALUES
  (gen_random_uuid(), '데이터 분석', 'data-analytics', '데이터 기반 인사이트 도출', 4, 'PieChart', true)
ON CONFLICT (slug) DO NOTHING;

-- ===================================================================
-- PART 2: 샘플 서비스 삽입 (3개)
-- ===================================================================

-- 2.1. 서비스 1: AI 워크플로우 자동화 도구
INSERT INTO services (
  id,
  title,
  description,
  category_id,
  price,
  image_url,
  images,
  features,
  metrics,
  status
)
VALUES (
  gen_random_uuid(),
  'AI 워크플로우 자동화 도구',
  'GPT-4 기반 업무 자동화 솔루션으로 반복 작업을 90% 단축합니다. 문서 작성, 이메일 응답, 데이터 분석 등을 자동화하여 생산성을 극대화하세요.',
  (SELECT id FROM service_categories WHERE slug = 'ai-solutions' LIMIT 1),
  299000,
  'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=600&fit=crop',
  '["https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=600&fit=crop", "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800&h=600&fit=crop", "https://images.unsplash.com/photo-1531746790731-6c087fecd65a?w=800&h=600&fit=crop"]'::jsonb,
  '[
    {"title": "GPT-4 통합", "description": "최신 AI 모델을 활용한 자연어 처리"},
    {"title": "자동화 워크플로우", "description": "드래그 앤 드롭으로 워크플로우 구성"},
    {"title": "다국어 지원", "description": "한국어, 영어, 일본어 등 20개 언어 지원"},
    {"title": "API 연동", "description": "Slack, Notion, Gmail 등 100+ 앱 연동"},
    {"title": "실시간 분석", "description": "작업 성과 및 시간 절감 통계 제공"}
  ]'::jsonb,
  '{"users": 1250, "satisfaction": 4.8, "time_saved_hours": 15000}'::jsonb,
  'active'
);

-- 2.2. 서비스 2: 스마트 데이터 분석 플랫폼
INSERT INTO services (
  id,
  title,
  description,
  category_id,
  price,
  image_url,
  images,
  features,
  metrics,
  status
)
VALUES (
  gen_random_uuid(),
  '스마트 데이터 분석 플랫폼',
  'AI 기반 데이터 시각화 및 인사이트 도출 플랫폼입니다. 복잡한 데이터를 클릭 몇 번으로 아름다운 대시보드로 변환하고, 자동 리포트를 생성하세요.',
  (SELECT id FROM service_categories WHERE slug = 'data-analytics' LIMIT 1),
  450000,
  'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=600&fit=crop',
  '["https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=600&fit=crop", "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop", "https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=800&h=600&fit=crop"]'::jsonb,
  '[
    {"title": "실시간 대시보드", "description": "라이브 데이터 시각화 및 모니터링"},
    {"title": "AI 인사이트", "description": "머신러닝 기반 트렌드 예측 및 이상 탐지"},
    {"title": "자동 리포트", "description": "일/주/월 단위 자동 리포트 생성"},
    {"title": "다중 데이터 소스", "description": "Excel, CSV, SQL, API 등 다양한 소스 연동"},
    {"title": "협업 기능", "description": "팀원과 대시보드 공유 및 댓글 기능"}
  ]'::jsonb,
  '{"users": 850, "satisfaction": 4.6, "reports_generated": 25000}'::jsonb,
  'active'
);

-- 2.3. 서비스 3: 비즈니스 컨설팅 패키지
INSERT INTO services (
  id,
  title,
  description,
  category_id,
  price,
  image_url,
  images,
  features,
  metrics,
  status
)
VALUES (
  gen_random_uuid(),
  '비즈니스 컨설팅 패키지',
  '전문 컨설턴트와 1:1 맞춤형 비즈니스 전략 수립 서비스입니다. AI 도입, 디지털 전환, 프로세스 혁신 등 귀사의 성장을 가속화하세요.',
  (SELECT id FROM service_categories WHERE slug = 'consulting' LIMIT 1),
  1200000,
  'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&h=600&fit=crop',
  '["https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&h=600&fit=crop", "https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=600&fit=crop", "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&h=600&fit=crop"]'::jsonb,
  '[
    {"title": "1:1 전문 컨설팅", "description": "15년 경력 시니어 컨설턴트 배정"},
    {"title": "맞춤형 전략 수립", "description": "기업 상황에 맞는 AI 도입 로드맵"},
    {"title": "실행 지원", "description": "전략 수립부터 실행까지 전 과정 지원"},
    {"title": "ROI 분석", "description": "투자 대비 효과 측정 및 개선안 제시"},
    {"title": "지속적 모니터링", "description": "3개월 사후 관리 및 성과 추적"}
  ]'::jsonb,
  '{"users": 120, "satisfaction": 4.9, "avg_roi_increase": 250}'::jsonb,
  'active'
);

-- ===================================================================
-- PART 3: 검증
-- ===================================================================

-- 3.1. 삽입된 서비스 확인
SELECT
  s.id,
  s.title,
  sc.name AS category_name,
  s.price,
  s.status,
  jsonb_array_length(s.features) AS feature_count,
  jsonb_array_length(s.images) AS image_count,
  s.metrics->>'users' AS users
FROM services s
LEFT JOIN service_categories sc ON s.category_id = sc.id
ORDER BY s.created_at DESC;

-- 3.2. 카테고리별 서비스 수
SELECT
  sc.name AS category_name,
  sc.icon,
  COUNT(s.id) AS service_count
FROM service_categories sc
LEFT JOIN services s ON s.category_id = sc.id
WHERE sc.is_active = true
GROUP BY sc.id, sc.name, sc.icon
ORDER BY sc.display_order;

-- 3.3. RLS 정책 테스트 (public 접근)
-- ⚠️ 이 쿼리는 anon key로 실행해야 합니다
-- Supabase Dashboard → SQL Editor → "Run as anon"
SELECT
  id,
  title,
  price,
  status
FROM services
WHERE status = 'active';

-- ===================================================================
-- 완료 체크리스트
-- ===================================================================
-- [ ] 샘플 서비스 3개 삽입 완료
-- [ ] 각 서비스에 features 5개씩 포함
-- [ ] 각 서비스에 images 3개씩 포함
-- [ ] metrics 데이터 포함 (users, satisfaction 등)
-- [ ] RLS 정책 동작 확인 (active 서비스만 조회)
-- [ ] 카테고리별 서비스 분포 확인

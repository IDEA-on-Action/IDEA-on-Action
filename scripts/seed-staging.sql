-- ============================================
-- Staging 환경 시드 데이터
-- ============================================
-- 용도: Closed Beta 테스트용 초기 데이터
-- 실행: supabase db execute -f scripts/seed-staging.sql
-- ============================================

-- 1. 서비스 카테고리
INSERT INTO service_categories (id, name, slug, description, display_order)
VALUES
  ('cat-staging-ai', 'AI 서비스', 'ai-services', 'AI 기반 서비스', 1),
  ('cat-staging-consulting', '컨설팅', 'consulting', '비즈니스 컨설팅', 2)
ON CONFLICT (id) DO NOTHING;

-- 2. Minu 서비스 (Staging)
INSERT INTO services (id, name, slug, description, category_id, is_active, price, currency)
VALUES
  ('svc-staging-minu-find', '[STAGING] Minu Find', 'minu-find-staging', 'AI 기반 기회 발굴', 'cat-staging-ai', true, 99000, 'KRW'),
  ('svc-staging-minu-frame', '[STAGING] Minu Frame', 'minu-frame-staging', 'AI 기반 프레임워크 설계', 'cat-staging-ai', true, 199000, 'KRW'),
  ('svc-staging-minu-build', '[STAGING] Minu Build', 'minu-build-staging', 'AI 기반 개발 지원', 'cat-staging-ai', true, 299000, 'KRW'),
  ('svc-staging-minu-keep', '[STAGING] Minu Keep', 'minu-keep-staging', 'AI 기반 유지보수', 'cat-staging-ai', true, 149000, 'KRW')
ON CONFLICT (id) DO NOTHING;

-- 3. 구독 플랜
INSERT INTO subscription_plans (id, name, slug, description, price, currency, billing_cycle, is_active)
VALUES
  ('plan-staging-starter', '[STAGING] Starter', 'starter-staging', '스타터 플랜', 9900, 'KRW', 'monthly', true),
  ('plan-staging-basic', '[STAGING] Basic', 'basic-staging', '베이직 플랜', 29900, 'KRW', 'monthly', true),
  ('plan-staging-pro', '[STAGING] Pro', 'pro-staging', '프로 플랜', 99000, 'KRW', 'monthly', true)
ON CONFLICT (id) DO NOTHING;

-- 4. 태그
INSERT INTO tags (id, name, slug)
VALUES
  ('tag-staging-beta', 'Beta', 'beta'),
  ('tag-staging-new', 'New', 'new'),
  ('tag-staging-ai', 'AI', 'ai')
ON CONFLICT (id) DO NOTHING;

-- 5. 공지사항
INSERT INTO notices (id, title, content, type, is_active, is_pinned, start_date)
VALUES
  ('notice-staging-beta', '[STAGING] Closed Beta 환경', '테스트 환경입니다. 실제 결제가 이루어지지 않습니다.', 'warning', true, true, NOW())
ON CONFLICT (id) DO NOTHING;

-- 완료 메시지
DO $$ BEGIN RAISE NOTICE '✅ Staging 시드 데이터 적용 완료'; END $$;

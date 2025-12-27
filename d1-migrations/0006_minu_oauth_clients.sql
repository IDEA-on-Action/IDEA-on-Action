-- ============================================
-- Minu OAuth 클라이언트 초기 데이터
-- Phase 3: Database 마이그레이션
-- ============================================

-- Minu Find 클라이언트
INSERT OR IGNORE INTO oauth_clients (
  id,
  client_id,
  client_secret_hash,
  client_name,
  description,
  redirect_uris,
  allowed_scopes,
  require_pkce,
  is_active
) VALUES (
  'minu-find-client-id',
  'minu_find_client',
  '$2b$10$placeholder_hash_for_minu_find',
  'Minu Find',
  'AI 기반 정보 검색 서비스',
  '["https://find.minu.best/auth/callback", "http://localhost:3001/auth/callback"]',
  '["profile", "subscription:read", "subscription:write"]',
  1,
  1
);

-- Minu Frame 클라이언트
INSERT OR IGNORE INTO oauth_clients (
  id,
  client_id,
  client_secret_hash,
  client_name,
  description,
  redirect_uris,
  allowed_scopes,
  require_pkce,
  is_active
) VALUES (
  'minu-frame-client-id',
  'minu_frame_client',
  '$2b$10$placeholder_hash_for_minu_frame',
  'Minu Frame',
  'AI 기반 콘텐츠 프레이밍 서비스',
  '["https://frame.minu.best/auth/callback", "http://localhost:3002/auth/callback"]',
  '["profile", "subscription:read", "subscription:write"]',
  1,
  1
);

-- Minu Build 클라이언트
INSERT OR IGNORE INTO oauth_clients (
  id,
  client_id,
  client_secret_hash,
  client_name,
  description,
  redirect_uris,
  allowed_scopes,
  require_pkce,
  is_active
) VALUES (
  'minu-build-client-id',
  'minu_build_client',
  '$2b$10$placeholder_hash_for_minu_build',
  'Minu Build',
  'AI 기반 빌드 자동화 서비스',
  '["https://build.minu.best/auth/callback", "http://localhost:3003/auth/callback"]',
  '["profile", "subscription:read", "subscription:write"]',
  1,
  1
);

-- Minu Keep 클라이언트
INSERT OR IGNORE INTO oauth_clients (
  id,
  client_id,
  client_secret_hash,
  client_name,
  description,
  redirect_uris,
  allowed_scopes,
  require_pkce,
  is_active
) VALUES (
  'minu-keep-client-id',
  'minu_keep_client',
  '$2b$10$placeholder_hash_for_minu_keep',
  'Minu Keep',
  'AI 기반 지식 관리 서비스',
  '["https://keep.minu.best/auth/callback", "http://localhost:3004/auth/callback"]',
  '["profile", "subscription:read", "subscription:write"]',
  1,
  1
);

-- 기본 구독 플랜
INSERT OR IGNORE INTO subscription_plans (
  id,
  name,
  slug,
  description,
  tier,
  price_monthly,
  price_yearly,
  features,
  limits,
  is_active,
  trial_days,
  display_order
) VALUES
(
  'plan-trial',
  '무료 체험',
  'trial',
  '14일 무료 체험',
  'trial',
  0,
  0,
  '["기본 기능 이용", "일일 10회 검색", "커뮤니티 지원"]',
  '{"api_calls": 100, "storage_mb": 100, "users": 1}',
  1,
  14,
  1
),
(
  'plan-basic',
  'Basic',
  'basic',
  '개인 사용자를 위한 기본 플랜',
  'basic',
  9900,
  99000,
  '["모든 기본 기능", "일일 100회 검색", "이메일 지원", "API 접근"]',
  '{"api_calls": 1000, "storage_mb": 1000, "users": 1}',
  1,
  0,
  2
),
(
  'plan-pro',
  'Pro',
  'pro',
  '전문가를 위한 프로 플랜',
  'pro',
  29900,
  299000,
  '["모든 Pro 기능", "무제한 검색", "우선 지원", "고급 분석", "팀 협업"]',
  '{"api_calls": 10000, "storage_mb": 10000, "users": 5}',
  1,
  0,
  3
),
(
  'plan-enterprise',
  'Enterprise',
  'enterprise',
  '기업을 위한 맞춤 플랜',
  'enterprise',
  0,
  0,
  '["모든 Enterprise 기능", "무제한 사용", "전담 지원", "SLA 보장", "커스텀 통합"]',
  '{"api_calls": -1, "storage_mb": -1, "users": -1}',
  1,
  0,
  4
);

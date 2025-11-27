-- Minu OAuth 클라이언트 다중 환경 시드
-- 생성일: 2025-11-28
-- 목적: 4개 Minu 서비스 × 3개 환경 (local, dev, staging) OAuth 클라이언트 등록

-- Minu Find 클라이언트
INSERT INTO public.oauth_clients (
  client_id,
  client_secret,
  client_name,
  redirect_uris,
  client_type,
  allowed_scopes,
  require_pkce,
  is_active,
  metadata
) VALUES
-- Minu Find - Local
(
  'minu-find-local',
  'dev_secret_find_local_' || gen_random_uuid()::text,
  'Minu Find (Local)',
  ARRAY['http://localhost:3001/auth/callback']::TEXT[],
  'confidential',
  ARRAY['openid', 'profile', 'email', 'offline_access']::TEXT[],
  true,
  true,
  jsonb_build_object(
    'environment', 'local',
    'service', 'find',
    'description', 'Minu Find 로컬 개발 환경',
    'created_at', NOW()
  )
),
-- Minu Find - Dev
(
  'minu-find-dev',
  'dev_secret_find_dev_' || gen_random_uuid()::text,
  'Minu Find (Dev)',
  ARRAY['https://dev.find.minu.best/auth/callback']::TEXT[],
  'confidential',
  ARRAY['openid', 'profile', 'email', 'offline_access']::TEXT[],
  true,
  true,
  jsonb_build_object(
    'environment', 'dev',
    'service', 'find',
    'description', 'Minu Find 개발 환경',
    'created_at', NOW()
  )
),
-- Minu Find - Staging
(
  'minu-find-staging',
  'staging_secret_find_' || gen_random_uuid()::text,
  'Minu Find (Staging)',
  ARRAY['https://staging.find.minu.best/auth/callback']::TEXT[],
  'confidential',
  ARRAY['openid', 'profile', 'email', 'offline_access']::TEXT[],
  true,
  true,
  jsonb_build_object(
    'environment', 'staging',
    'service', 'find',
    'description', 'Minu Find 스테이징 환경',
    'created_at', NOW()
  )
),

-- Minu Frame - Local
(
  'minu-frame-local',
  'dev_secret_frame_local_' || gen_random_uuid()::text,
  'Minu Frame (Local)',
  ARRAY['http://localhost:3002/auth/callback']::TEXT[],
  'confidential',
  ARRAY['openid', 'profile', 'email', 'offline_access']::TEXT[],
  true,
  true,
  jsonb_build_object(
    'environment', 'local',
    'service', 'frame',
    'description', 'Minu Frame 로컬 개발 환경',
    'created_at', NOW()
  )
),
-- Minu Frame - Dev
(
  'minu-frame-dev',
  'dev_secret_frame_dev_' || gen_random_uuid()::text,
  'Minu Frame (Dev)',
  ARRAY['https://dev.frame.minu.best/auth/callback']::TEXT[],
  'confidential',
  ARRAY['openid', 'profile', 'email', 'offline_access']::TEXT[],
  true,
  true,
  jsonb_build_object(
    'environment', 'dev',
    'service', 'frame',
    'description', 'Minu Frame 개발 환경',
    'created_at', NOW()
  )
),
-- Minu Frame - Staging
(
  'minu-frame-staging',
  'staging_secret_frame_' || gen_random_uuid()::text,
  'Minu Frame (Staging)',
  ARRAY['https://staging.frame.minu.best/auth/callback']::TEXT[],
  'confidential',
  ARRAY['openid', 'profile', 'email', 'offline_access']::TEXT[],
  true,
  true,
  jsonb_build_object(
    'environment', 'staging',
    'service', 'frame',
    'description', 'Minu Frame 스테이징 환경',
    'created_at', NOW()
  )
),

-- Minu Build - Local
(
  'minu-build-local',
  'dev_secret_build_local_' || gen_random_uuid()::text,
  'Minu Build (Local)',
  ARRAY['http://localhost:3003/auth/callback']::TEXT[],
  'confidential',
  ARRAY['openid', 'profile', 'email', 'offline_access']::TEXT[],
  true,
  true,
  jsonb_build_object(
    'environment', 'local',
    'service', 'build',
    'description', 'Minu Build 로컬 개발 환경',
    'created_at', NOW()
  )
),
-- Minu Build - Dev
(
  'minu-build-dev',
  'dev_secret_build_dev_' || gen_random_uuid()::text,
  'Minu Build (Dev)',
  ARRAY['https://dev.build.minu.best/auth/callback']::TEXT[],
  'confidential',
  ARRAY['openid', 'profile', 'email', 'offline_access']::TEXT[],
  true,
  true,
  jsonb_build_object(
    'environment', 'dev',
    'service', 'build',
    'description', 'Minu Build 개발 환경',
    'created_at', NOW()
  )
),
-- Minu Build - Staging
(
  'minu-build-staging',
  'staging_secret_build_' || gen_random_uuid()::text,
  'Minu Build (Staging)',
  ARRAY['https://staging.build.minu.best/auth/callback']::TEXT[],
  'confidential',
  ARRAY['openid', 'profile', 'email', 'offline_access']::TEXT[],
  true,
  true,
  jsonb_build_object(
    'environment', 'staging',
    'service', 'build',
    'description', 'Minu Build 스테이징 환경',
    'created_at', NOW()
  )
),

-- Minu Keep - Local
(
  'minu-keep-local',
  'dev_secret_keep_local_' || gen_random_uuid()::text,
  'Minu Keep (Local)',
  ARRAY['http://localhost:3004/auth/callback']::TEXT[],
  'confidential',
  ARRAY['openid', 'profile', 'email', 'offline_access']::TEXT[],
  true,
  true,
  jsonb_build_object(
    'environment', 'local',
    'service', 'keep',
    'description', 'Minu Keep 로컬 개발 환경',
    'created_at', NOW()
  )
),
-- Minu Keep - Dev
(
  'minu-keep-dev',
  'dev_secret_keep_dev_' || gen_random_uuid()::text,
  'Minu Keep (Dev)',
  ARRAY['https://dev.keep.minu.best/auth/callback']::TEXT[],
  'confidential',
  ARRAY['openid', 'profile', 'email', 'offline_access']::TEXT[],
  true,
  true,
  jsonb_build_object(
    'environment', 'dev',
    'service', 'keep',
    'description', 'Minu Keep 개발 환경',
    'created_at', NOW()
  )
),
-- Minu Keep - Staging
(
  'minu-keep-staging',
  'staging_secret_keep_' || gen_random_uuid()::text,
  'Minu Keep (Staging)',
  ARRAY['https://staging.keep.minu.best/auth/callback']::TEXT[],
  'confidential',
  ARRAY['openid', 'profile', 'email', 'offline_access']::TEXT[],
  true,
  true,
  jsonb_build_object(
    'environment', 'staging',
    'service', 'keep',
    'description', 'Minu Keep 스테이징 환경',
    'created_at', NOW()
  )
)

ON CONFLICT (client_id) DO UPDATE SET
  is_active = EXCLUDED.is_active,
  redirect_uris = EXCLUDED.redirect_uris,
  metadata = EXCLUDED.metadata;

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_oauth_clients_environment
  ON public.oauth_clients ((metadata->>'environment'));

CREATE INDEX IF NOT EXISTS idx_oauth_clients_service
  ON public.oauth_clients ((metadata->>'service'));

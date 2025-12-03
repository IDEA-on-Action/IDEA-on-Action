-- Minu OAuth 클라이언트 Sandbox 환경 시드
-- 생성일: 2025-12-03
-- 목적: 4개 Minu 서비스 Sandbox 환경 OAuth 클라이언트 등록
-- 참조: plan/minu-sandbox-setup.md

-- Minu Find - Sandbox
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
(
  'minu-find-sandbox',
  'sandbox_secret_find_' || gen_random_uuid()::text,
  'Minu Find (Sandbox)',
  ARRAY['https://sandbox.find.minu.best/auth/callback']::TEXT[],
  'confidential',
  ARRAY['openid', 'profile', 'email', 'offline_access', 'subscription:read']::TEXT[],
  true,
  true,
  jsonb_build_object(
    'environment', 'sandbox',
    'service', 'find',
    'description', 'Minu Find Sandbox 테스트 환경',
    'created_at', NOW()
  )
),

-- Minu Frame - Sandbox
(
  'minu-frame-sandbox',
  'sandbox_secret_frame_' || gen_random_uuid()::text,
  'Minu Frame (Sandbox)',
  ARRAY['https://sandbox.frame.minu.best/auth/callback']::TEXT[],
  'confidential',
  ARRAY['openid', 'profile', 'email', 'offline_access', 'subscription:read']::TEXT[],
  true,
  true,
  jsonb_build_object(
    'environment', 'sandbox',
    'service', 'frame',
    'description', 'Minu Frame Sandbox 테스트 환경',
    'created_at', NOW()
  )
),

-- Minu Build - Sandbox
(
  'minu-build-sandbox',
  'sandbox_secret_build_' || gen_random_uuid()::text,
  'Minu Build (Sandbox)',
  ARRAY['https://sandbox.build.minu.best/auth/callback']::TEXT[],
  'confidential',
  ARRAY['openid', 'profile', 'email', 'offline_access', 'subscription:read']::TEXT[],
  true,
  true,
  jsonb_build_object(
    'environment', 'sandbox',
    'service', 'build',
    'description', 'Minu Build Sandbox 테스트 환경',
    'created_at', NOW()
  )
),

-- Minu Keep - Sandbox
(
  'minu-keep-sandbox',
  'sandbox_secret_keep_' || gen_random_uuid()::text,
  'Minu Keep (Sandbox)',
  ARRAY['https://sandbox.keep.minu.best/auth/callback']::TEXT[],
  'confidential',
  ARRAY['openid', 'profile', 'email', 'offline_access', 'subscription:read']::TEXT[],
  true,
  true,
  jsonb_build_object(
    'environment', 'sandbox',
    'service', 'keep',
    'description', 'Minu Keep Sandbox 테스트 환경',
    'created_at', NOW()
  )
)

ON CONFLICT (client_id) DO UPDATE SET
  is_active = EXCLUDED.is_active,
  redirect_uris = EXCLUDED.redirect_uris,
  metadata = EXCLUDED.metadata;

-- 검증
DO $$
DECLARE
  sandbox_clients_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO sandbox_clients_count
  FROM public.oauth_clients
  WHERE metadata->>'environment' = 'sandbox';

  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ Sandbox OAuth 클라이언트 등록 완료!';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE 'Sandbox 클라이언트 개수: % (예상: 4개)', sandbox_clients_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Sandbox 클라이언트 목록:';
  RAISE NOTICE '  - minu-find-sandbox';
  RAISE NOTICE '  - minu-frame-sandbox';
  RAISE NOTICE '  - minu-build-sandbox';
  RAISE NOTICE '  - minu-keep-sandbox';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;

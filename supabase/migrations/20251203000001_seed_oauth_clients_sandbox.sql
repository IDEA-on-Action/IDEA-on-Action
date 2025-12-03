-- Minu OAuth 클라이언트 Sandbox 환경 시드
-- 생성일: 2025-12-03
-- 목적: 4개 Minu 서비스 Sandbox 환경 OAuth 클라이언트 등록
-- 참조: plan/minu-sandbox-setup.md

-- ⚠️ 주의: 실제 스키마와 매칭되도록 컬럼명 조정
-- - client_name → name
-- - allowed_scopes → scopes
-- - client_type, require_pkce 컬럼은 현재 스키마에 없음 (제거)
-- - metadata 컬럼은 없으므로 description으로 대체

-- Minu Find - Sandbox
INSERT INTO public.oauth_clients (
  client_id,
  client_secret,
  name,
  redirect_uris,
  scopes,
  is_active,
  description
) VALUES
(
  'minu-find-sandbox',
  'sandbox_secret_find_' || gen_random_uuid()::text,
  'Minu Find (Sandbox)',
  ARRAY['https://sandbox.find.minu.best/auth/callback']::TEXT[],
  ARRAY['openid', 'profile', 'email', 'offline_access', 'subscription:read']::TEXT[],
  true,
  'Minu Find Sandbox 테스트 환경 (environment: sandbox, service: find)'
),

-- Minu Frame - Sandbox
(
  'minu-frame-sandbox',
  'sandbox_secret_frame_' || gen_random_uuid()::text,
  'Minu Frame (Sandbox)',
  ARRAY['https://sandbox.frame.minu.best/auth/callback']::TEXT[],
  ARRAY['openid', 'profile', 'email', 'offline_access', 'subscription:read']::TEXT[],
  true,
  'Minu Frame Sandbox 테스트 환경 (environment: sandbox, service: frame)'
),

-- Minu Build - Sandbox
(
  'minu-build-sandbox',
  'sandbox_secret_build_' || gen_random_uuid()::text,
  'Minu Build (Sandbox)',
  ARRAY['https://sandbox.build.minu.best/auth/callback']::TEXT[],
  ARRAY['openid', 'profile', 'email', 'offline_access', 'subscription:read']::TEXT[],
  true,
  'Minu Build Sandbox 테스트 환경 (environment: sandbox, service: build)'
),

-- Minu Keep - Sandbox
(
  'minu-keep-sandbox',
  'sandbox_secret_keep_' || gen_random_uuid()::text,
  'Minu Keep (Sandbox)',
  ARRAY['https://sandbox.keep.minu.best/auth/callback']::TEXT[],
  ARRAY['openid', 'profile', 'email', 'offline_access', 'subscription:read']::TEXT[],
  true,
  'Minu Keep Sandbox 테스트 환경 (environment: sandbox, service: keep)'
)

ON CONFLICT (client_id) DO UPDATE SET
  is_active = EXCLUDED.is_active,
  redirect_uris = EXCLUDED.redirect_uris,
  description = EXCLUDED.description;

-- 검증
DO $$
DECLARE
  sandbox_clients_count INTEGER;
BEGIN
  -- description 필드에 'sandbox'가 포함된 클라이언트 카운트
  SELECT COUNT(*) INTO sandbox_clients_count
  FROM public.oauth_clients
  WHERE description ILIKE '%sandbox%'
    OR client_id LIKE '%-sandbox';

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

-- Sandbox 테스트 계정 시드
-- 생성일: 2025-12-03
-- 목적: 5개 테스트 계정 및 구독 데이터 생성
-- 참조: plan/minu-sandbox-setup.md

-- =====================================================
-- 1. 테스트 사용자 생성 (auth.users)
-- =====================================================
-- 비밀번호: Test1234! (모든 계정 동일)
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  aud,
  role,
  created_at,
  updated_at
) VALUES
  -- Free 플랜 사용자
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'test-free@ideaonaction.ai',
    crypt('Test1234!', gen_salt('bf')),
    NOW(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"full_name": "Test Free User"}'::jsonb,
    'authenticated',
    'authenticated',
    NOW(),
    NOW()
  ),
  -- Basic 플랜 사용자
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'test-basic@ideaonaction.ai',
    crypt('Test1234!', gen_salt('bf')),
    NOW(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"full_name": "Test Basic User"}'::jsonb,
    'authenticated',
    'authenticated',
    NOW(),
    NOW()
  ),
  -- Pro 플랜 사용자
  (
    'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'test-pro@ideaonaction.ai',
    crypt('Test1234!', gen_salt('bf')),
    NOW(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"full_name": "Test Pro User"}'::jsonb,
    'authenticated',
    'authenticated',
    NOW(),
    NOW()
  ),
  -- Expired 플랜 사용자
  (
    'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'test-expired@ideaonaction.ai',
    crypt('Test1234!', gen_salt('bf')),
    NOW(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"full_name": "Test Expired User"}'::jsonb,
    'authenticated',
    'authenticated',
    NOW(),
    NOW()
  ),
  -- Enterprise 플랜 사용자
  (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'test-enterprise@ideaonaction.ai',
    crypt('Test1234!', gen_salt('bf')),
    NOW(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"full_name": "Test Enterprise Admin"}'::jsonb,
    'authenticated',
    'authenticated',
    NOW(),
    NOW()
  )

ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 2. 프로필 생성 (public.user_profiles)
-- =====================================================
INSERT INTO public.user_profiles (
  user_id,
  display_name,
  avatar_url,
  created_at,
  updated_at
) VALUES
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
    'Test Free User',
    NULL,
    NOW(),
    NOW()
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
    'Test Basic User',
    NULL,
    NOW(),
    NOW()
  ),
  (
    'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid,
    'Test Pro User',
    NULL,
    NOW(),
    NOW()
  ),
  (
    'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid,
    'Test Expired User',
    NULL,
    NOW(),
    NOW()
  ),
  (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'::uuid,
    'Test Enterprise Admin',
    NULL,
    NOW(),
    NOW()
  )

ON CONFLICT (user_id) DO NOTHING;

-- =====================================================
-- 3. 구독 데이터 생성 (public.subscriptions)
-- =====================================================

-- 3.1 Basic 사용자 구독 (Minu Find Basic)
INSERT INTO public.subscriptions (
  user_id,
  service_id,
  plan_id,
  status,
  current_period_start,
  current_period_end,
  next_billing_date,
  created_at,
  updated_at
)
SELECT
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
  s.id,
  p.id,
  'active',
  NOW(),
  NOW() + INTERVAL '1 month',
  NOW() + INTERVAL '1 month',
  NOW(),
  NOW()
FROM public.services s
JOIN public.subscription_plans p ON p.service_id = s.id
WHERE s.name = 'Find'
  AND p.name ILIKE '%basic%'
LIMIT 1
ON CONFLICT DO NOTHING;

-- 3.2 Pro 사용자 구독 (Minu Find Pro, Minu Frame Pro)
INSERT INTO public.subscriptions (
  user_id,
  service_id,
  plan_id,
  status,
  current_period_start,
  current_period_end,
  next_billing_date,
  created_at,
  updated_at
)
SELECT
  'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid,
  s.id,
  p.id,
  'active',
  NOW(),
  NOW() + INTERVAL '1 year',
  NOW() + INTERVAL '1 year',
  NOW(),
  NOW()
FROM public.services s
JOIN public.subscription_plans p ON p.service_id = s.id
WHERE s.name IN ('Find', 'Frame')
  AND p.name ILIKE '%pro%'
ON CONFLICT DO NOTHING;

-- 3.3 Expired 사용자 구독 (Minu Find Basic - 만료됨)
INSERT INTO public.subscriptions (
  user_id,
  service_id,
  plan_id,
  status,
  current_period_start,
  current_period_end,
  cancelled_at,
  created_at,
  updated_at
)
SELECT
  'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid,
  s.id,
  p.id,
  'expired',
  NOW() - INTERVAL '1 year',
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '1 month',
  NOW() - INTERVAL '1 year',
  NOW()
FROM public.services s
JOIN public.subscription_plans p ON p.service_id = s.id
WHERE s.name = 'Find'
  AND p.name ILIKE '%basic%'
LIMIT 1
ON CONFLICT DO NOTHING;

-- 3.4 Enterprise 사용자 구독 (모든 서비스 Enterprise)
INSERT INTO public.subscriptions (
  user_id,
  service_id,
  plan_id,
  status,
  current_period_start,
  current_period_end,
  next_billing_date,
  created_at,
  updated_at
)
SELECT
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'::uuid,
  s.id,
  p.id,
  'active',
  NOW(),
  NOW() + INTERVAL '1 year',
  NOW() + INTERVAL '1 year',
  NOW(),
  NOW()
FROM public.services s
JOIN public.subscription_plans p ON p.service_id = s.id
WHERE s.name IN ('Find', 'Frame', 'Build', 'Keep')
  AND p.name ILIKE '%enterprise%'
ON CONFLICT DO NOTHING;

-- =====================================================
-- 4. 검증
-- =====================================================
DO $$
DECLARE
  users_count INTEGER;
  profiles_count INTEGER;
  subscriptions_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO users_count
  FROM auth.users
  WHERE email LIKE 'test-%@ideaonaction.ai';

  SELECT COUNT(*) INTO profiles_count
  FROM public.user_profiles
  WHERE user_id IN (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'
  );

  SELECT COUNT(*) INTO subscriptions_count
  FROM public.subscriptions
  WHERE user_id IN (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'
  );

  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ Sandbox 테스트 계정 생성 완료!';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '생성된 사용자: % (예상: 5개)', users_count;
  RAISE NOTICE '생성된 프로필: % (예상: 5개)', profiles_count;
  RAISE NOTICE '생성된 구독: % (예상: 7개)', subscriptions_count;
  RAISE NOTICE '';
  RAISE NOTICE '테스트 계정 목록:';
  RAISE NOTICE '  1. test-free@ideaonaction.ai (Free - 구독 없음)';
  RAISE NOTICE '  2. test-basic@ideaonaction.ai (Basic - Find Basic)';
  RAISE NOTICE '  3. test-pro@ideaonaction.ai (Pro - Find Pro, Frame Pro)';
  RAISE NOTICE '  4. test-expired@ideaonaction.ai (Expired - Find Basic 만료)';
  RAISE NOTICE '  5. test-enterprise@ideaonaction.ai (Enterprise - 모든 서비스)';
  RAISE NOTICE '';
  RAISE NOTICE '비밀번호 (모든 계정 동일): Test1234!';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;

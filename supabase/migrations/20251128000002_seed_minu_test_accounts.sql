-- Minu 테스트 계정 시드
-- 생성일: 2025-11-28
-- 목적: Minu OAuth 연동 테스트를 위한 다양한 플랜의 테스트 계정 생성

-- 테스트 사용자 프로필 생성
-- 참고: auth.users는 Supabase Auth가 관리하므로 profiles만 시드

-- 1. Free 플랜 테스트 계정
INSERT INTO public.profiles (
  id,
  email,
  full_name,
  created_at,
  updated_at
) VALUES (
  'a0000000-0000-0000-0000-000000000001'::uuid,
  'test-free@example.com',
  'Test User Free',
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name;

INSERT INTO public.subscriptions (
  user_id,
  plan_id,
  status,
  current_period_start,
  current_period_end,
  created_at,
  updated_at
) VALUES (
  'a0000000-0000-0000-0000-000000000001'::uuid,
  'free',
  'active',
  NOW(),
  NOW() + INTERVAL '1 year',
  NOW(),
  NOW()
) ON CONFLICT (user_id) DO UPDATE SET
  plan_id = EXCLUDED.plan_id,
  status = EXCLUDED.status,
  current_period_end = EXCLUDED.current_period_end;

-- 2. Basic 플랜 테스트 계정
INSERT INTO public.profiles (
  id,
  email,
  full_name,
  created_at,
  updated_at
) VALUES (
  'a0000000-0000-0000-0000-000000000002'::uuid,
  'test-basic@example.com',
  'Test User Basic',
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name;

INSERT INTO public.subscriptions (
  user_id,
  plan_id,
  status,
  current_period_start,
  current_period_end,
  created_at,
  updated_at
) VALUES (
  'a0000000-0000-0000-0000-000000000002'::uuid,
  'basic',
  'active',
  NOW(),
  NOW() + INTERVAL '1 month',
  NOW(),
  NOW()
) ON CONFLICT (user_id) DO UPDATE SET
  plan_id = EXCLUDED.plan_id,
  status = EXCLUDED.status,
  current_period_end = EXCLUDED.current_period_end;

-- 3. Pro 플랜 테스트 계정
INSERT INTO public.profiles (
  id,
  email,
  full_name,
  created_at,
  updated_at
) VALUES (
  'a0000000-0000-0000-0000-000000000003'::uuid,
  'test-pro@example.com',
  'Test User Pro',
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name;

INSERT INTO public.subscriptions (
  user_id,
  plan_id,
  status,
  current_period_start,
  current_period_end,
  created_at,
  updated_at
) VALUES (
  'a0000000-0000-0000-0000-000000000003'::uuid,
  'pro',
  'active',
  NOW(),
  NOW() + INTERVAL '1 month',
  NOW(),
  NOW()
) ON CONFLICT (user_id) DO UPDATE SET
  plan_id = EXCLUDED.plan_id,
  status = EXCLUDED.status,
  current_period_end = EXCLUDED.current_period_end;

-- 4. 만료된 Basic 플랜 테스트 계정
INSERT INTO public.profiles (
  id,
  email,
  full_name,
  created_at,
  updated_at
) VALUES (
  'a0000000-0000-0000-0000-000000000004'::uuid,
  'test-expired@example.com',
  'Test User Expired',
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name;

INSERT INTO public.subscriptions (
  user_id,
  plan_id,
  status,
  current_period_start,
  current_period_end,
  created_at,
  updated_at
) VALUES (
  'a0000000-0000-0000-0000-000000000004'::uuid,
  'basic',
  'expired',
  NOW() - INTERVAL '2 months',
  NOW() - INTERVAL '1 month',
  NOW(),
  NOW()
) ON CONFLICT (user_id) DO UPDATE SET
  plan_id = EXCLUDED.plan_id,
  status = EXCLUDED.status,
  current_period_end = EXCLUDED.current_period_end;

-- 5. Enterprise 플랜 테스트 계정 (관리자)
INSERT INTO public.profiles (
  id,
  email,
  full_name,
  created_at,
  updated_at
) VALUES (
  'a0000000-0000-0000-0000-000000000005'::uuid,
  'test-admin@example.com',
  'Test Admin Enterprise',
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name;

INSERT INTO public.subscriptions (
  user_id,
  plan_id,
  status,
  current_period_start,
  current_period_end,
  created_at,
  updated_at
) VALUES (
  'a0000000-0000-0000-0000-000000000005'::uuid,
  'enterprise',
  'active',
  NOW(),
  NOW() + INTERVAL '1 year',
  NOW(),
  NOW()
) ON CONFLICT (user_id) DO UPDATE SET
  plan_id = EXCLUDED.plan_id,
  status = EXCLUDED.status,
  current_period_end = EXCLUDED.current_period_end;

-- 테스트 계정 확인을 위한 코멘트
COMMENT ON TABLE public.profiles IS '사용자 프로필 테이블. 테스트 계정: test-free@example.com, test-basic@example.com, test-pro@example.com, test-expired@example.com, test-admin@example.com';
COMMENT ON TABLE public.subscriptions IS '구독 정보 테이블. 테스트 플랜: Free, Basic, Pro, Enterprise';

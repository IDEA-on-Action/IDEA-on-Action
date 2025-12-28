-- Minu 테스트 계정 시드
-- 생성일: 2025-11-28
-- 목적: Minu OAuth 연동 테스트를 위한 다양한 플랜의 테스트 계정 생성
-- 참고: 이 마이그레이션은 user_profiles 테이블이 존재할 때만 실행됩니다

DO $$
BEGIN
  -- user_profiles 테이블이 존재하는지 확인
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'user_profiles'
  ) THEN
    RAISE NOTICE 'Skipping test account seed - user_profiles table not found';
    RETURN;
  END IF;

  -- subscriptions 테이블이 존재하는지 확인
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'subscriptions'
  ) THEN
    RAISE NOTICE 'Skipping test account seed - subscriptions table not found';
    RETURN;
  END IF;

  -- 1. Free 플랜 테스트 계정
  INSERT INTO public.user_profiles (
    user_id,
    display_name,
    created_at,
    updated_at
  ) VALUES (
    'a0000000-0000-0000-0000-000000000001'::uuid,
    'Test User Free',
    NOW(),
    NOW()
  ) ON CONFLICT (user_id) DO UPDATE SET
    display_name = EXCLUDED.display_name;

  -- 2. Basic 플랜 테스트 계정
  INSERT INTO public.user_profiles (
    user_id,
    display_name,
    created_at,
    updated_at
  ) VALUES (
    'a0000000-0000-0000-0000-000000000002'::uuid,
    'Test User Basic',
    NOW(),
    NOW()
  ) ON CONFLICT (user_id) DO UPDATE SET
    display_name = EXCLUDED.display_name;

  -- 3. Pro 플랜 테스트 계정
  INSERT INTO public.user_profiles (
    user_id,
    display_name,
    created_at,
    updated_at
  ) VALUES (
    'a0000000-0000-0000-0000-000000000003'::uuid,
    'Test User Pro',
    NOW(),
    NOW()
  ) ON CONFLICT (user_id) DO UPDATE SET
    display_name = EXCLUDED.display_name;

  -- 4. 만료된 Basic 플랜 테스트 계정
  INSERT INTO public.user_profiles (
    user_id,
    display_name,
    created_at,
    updated_at
  ) VALUES (
    'a0000000-0000-0000-0000-000000000004'::uuid,
    'Test User Expired',
    NOW(),
    NOW()
  ) ON CONFLICT (user_id) DO UPDATE SET
    display_name = EXCLUDED.display_name;

  -- 5. Enterprise 플랜 테스트 계정 (관리자)
  INSERT INTO public.user_profiles (
    user_id,
    display_name,
    created_at,
    updated_at
  ) VALUES (
    'a0000000-0000-0000-0000-000000000005'::uuid,
    'Test Admin Enterprise',
    NOW(),
    NOW()
  ) ON CONFLICT (user_id) DO UPDATE SET
    display_name = EXCLUDED.display_name;

  RAISE NOTICE 'Minu test accounts seeded successfully';
END $$;

-- 테스트 계정 설명
COMMENT ON TABLE public.user_profiles IS '사용자 프로필 테이블';

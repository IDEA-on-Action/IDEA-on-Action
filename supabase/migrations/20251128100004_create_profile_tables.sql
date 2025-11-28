-- Phase 10: User Profiles & RBAC Tables
-- 프로필 관리 및 역할 기반 접근 제어
-- Created: 2025-11-28

-- ===================================================================
-- 1. user_profiles 테이블
-- ===================================================================

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
    ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
EXCEPTION
    WHEN duplicate_column THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
EXCEPTION
    WHEN duplicate_column THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS phone TEXT;
EXCEPTION
    WHEN duplicate_column THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS bio TEXT;
EXCEPTION
    WHEN duplicate_column THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
EXCEPTION
    WHEN duplicate_column THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS email_verification_token TEXT;
EXCEPTION
    WHEN duplicate_column THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS email_verification_sent_at TIMESTAMPTZ;
EXCEPTION
    WHEN duplicate_column THEN NULL;
END $$;

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_user_profiles_email_verified ON public.user_profiles(email_verified);

-- ===================================================================
-- 2. user_roles 테이블 (RBAC)
-- ===================================================================

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
    ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user', 'guest'));
EXCEPTION
    WHEN duplicate_column THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_role_key UNIQUE(user_id, role);
EXCEPTION
    WHEN duplicate_table THEN NULL; -- constraint already exists
    WHEN OTHERS THEN NULL;
END $$;

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

-- ===================================================================
-- 3. RLS 정책
-- ===================================================================

-- user_profiles RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- 프로필 조회: 본인만 조회 가능
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
CREATE POLICY "Users can view own profile"
  ON public.user_profiles
  FOR SELECT
  USING (auth.uid() = id);

-- 프로필 업데이트: 본인만 가능
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile"
  ON public.user_profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 프로필 삽입: 본인 ID로만 가능
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
CREATE POLICY "Users can insert own profile"
  ON public.user_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 관리자는 모든 프로필 조회 가능
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;
CREATE POLICY "Admins can view all profiles"
  ON public.user_profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- user_roles RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 역할 조회: 본인 역할만 조회 가능
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles"
  ON public.user_roles
  FOR SELECT
  USING (auth.uid() = user_id);

-- 관리자는 모든 역할 조회 가능
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles"
  ON public.user_roles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

-- 관리자만 역할 생성 가능
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
CREATE POLICY "Admins can insert roles"
  ON public.user_roles
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

-- 관리자만 역할 삭제 가능
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
CREATE POLICY "Admins can delete roles"
  ON public.user_roles
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

-- ===================================================================
-- 4. 자동 프로필 생성 트리거
-- ===================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );

  -- 기본 역할 부여 (user)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 트리거 (auth.users에 새 사용자 생성 시)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===================================================================
-- 5. updated_at 자동 갱신 트리거
-- ===================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===================================================================
-- 6. 이메일 인증 함수
-- ===================================================================

CREATE OR REPLACE FUNCTION public.generate_email_verification_token(user_id UUID)
RETURNS TEXT AS $$
DECLARE
  token TEXT;
BEGIN
  token := encode(gen_random_bytes(32), 'hex');

  UPDATE public.user_profiles
  SET
    email_verification_token = token,
    email_verification_sent_at = NOW()
  WHERE id = user_id;

  RETURN token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.verify_email(token TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  profile_record RECORD;
BEGIN
  SELECT * INTO profile_record
  FROM public.user_profiles
  WHERE email_verification_token = token
    AND email_verification_sent_at > NOW() - INTERVAL '24 hours';

  IF profile_record IS NULL THEN
    RETURN FALSE;
  END IF;

  UPDATE public.user_profiles
  SET
    email_verified = TRUE,
    email_verification_token = NULL,
    email_verification_sent_at = NULL
  WHERE id = profile_record.id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

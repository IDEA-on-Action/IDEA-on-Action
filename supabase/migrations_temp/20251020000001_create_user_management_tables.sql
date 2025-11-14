-- Phase 10: User Profiles, Connected Accounts & 2FA
-- Migration: 20251020000001_create_user_management_tables.sql
-- Author: Claude AI
-- Date: 2025-10-20
-- Description: User profile management, OAuth connections, and two-factor authentication

-- =====================================================
-- 1. USER_PROFILES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  avatar_url TEXT,
  display_name TEXT,
  bio TEXT,
  phone TEXT,
  location JSONB DEFAULT '{}', -- { country, city, timezone }
  preferences JSONB DEFAULT '{}', -- { theme, language, notifications }
  email_verified BOOLEAN DEFAULT false,
  phone_verified BOOLEAN DEFAULT false,
  last_login_at TIMESTAMPTZ,
  last_login_ip INET,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.user_profiles IS 'Extended user profile information';
COMMENT ON COLUMN public.user_profiles.location IS 'User location as JSON: { country, city, timezone }';
COMMENT ON COLUMN public.user_profiles.preferences IS 'User preferences as JSON: { theme, language, notifications }';

-- Create index for fast user lookup
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);

-- =====================================================
-- 2. CONNECTED_ACCOUNTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.connected_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'github', 'kakao', 'microsoft', 'apple')),
  provider_account_id TEXT NOT NULL,
  provider_account_email TEXT,
  is_primary BOOLEAN DEFAULT false,
  connected_at TIMESTAMPTZ DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  UNIQUE(user_id, provider)
);

COMMENT ON TABLE public.connected_accounts IS 'OAuth provider connections for each user';
COMMENT ON COLUMN public.connected_accounts.is_primary IS 'Primary account used for login';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_connected_accounts_user_id ON public.connected_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_connected_accounts_provider ON public.connected_accounts(provider);

-- =====================================================
-- 3. TWO_FACTOR_AUTH TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.two_factor_auth (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  secret TEXT NOT NULL, -- TOTP secret (should be encrypted in production)
  enabled BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  backup_codes TEXT[], -- Array of hashed backup codes
  backup_codes_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_used_at TIMESTAMPTZ
);

COMMENT ON TABLE public.two_factor_auth IS 'Two-factor authentication settings per user';
COMMENT ON COLUMN public.two_factor_auth.secret IS 'TOTP secret key (encrypt in production!)';
COMMENT ON COLUMN public.two_factor_auth.backup_codes IS 'Array of hashed backup codes for account recovery';

-- Create index
CREATE INDEX IF NOT EXISTS idx_two_factor_auth_user_id ON public.two_factor_auth(user_id);

-- =====================================================
-- 4. LOGIN_ATTEMPTS TABLE (Security & Brute Force Prevention)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN DEFAULT false,
  failure_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.login_attempts IS 'Login attempt history for security monitoring and brute force prevention';

-- Create indexes for security queries
CREATE INDEX IF NOT EXISTS idx_login_attempts_user_id ON public.login_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON public.login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_address ON public.login_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_login_attempts_created_at ON public.login_attempts(created_at DESC);

-- =====================================================
-- 5. RLS POLICIES - User Profiles
-- =====================================================
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.user_profiles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON public.user_profiles FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Only admins can delete profiles"
  ON public.user_profiles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid() AND email = 'admin@ideaonaction.local'
    )
  );

-- =====================================================
-- 6. RLS POLICIES - Connected Accounts
-- =====================================================
ALTER TABLE public.connected_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own connected accounts"
  ON public.connected_accounts FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own connected accounts"
  ON public.connected_accounts FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own connected accounts"
  ON public.connected_accounts FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own connected accounts"
  ON public.connected_accounts FOR DELETE
  USING (user_id = auth.uid());

-- =====================================================
-- 7. RLS POLICIES - Two-Factor Auth
-- =====================================================
ALTER TABLE public.two_factor_auth ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own 2FA settings"
  ON public.two_factor_auth FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own 2FA settings"
  ON public.two_factor_auth FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own 2FA settings"
  ON public.two_factor_auth FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own 2FA settings"
  ON public.two_factor_auth FOR DELETE
  USING (user_id = auth.uid());

-- =====================================================
-- 8. RLS POLICIES - Login Attempts
-- =====================================================
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert login attempts"
  ON public.login_attempts FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view own login attempts"
  ON public.login_attempts FOR SELECT
  USING (
    user_id = auth.uid() OR
    email IN (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- =====================================================
-- 9. TRIGGERS (Auto-update timestamps)
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_two_factor_auth_updated_at
  BEFORE UPDATE ON public.two_factor_auth
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 10. HELPER FUNCTIONS
-- =====================================================

-- Function to get recent failed login attempts (brute force detection)
CREATE OR REPLACE FUNCTION public.get_recent_failed_attempts(
  p_email TEXT,
  p_ip_address INET,
  p_minutes INTEGER DEFAULT 30
)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.login_attempts
  WHERE login_attempts.email = p_email
    AND login_attempts.ip_address = p_ip_address
    AND login_attempts.success = false
    AND login_attempts.created_at > (now() - (p_minutes || ' minutes')::INTERVAL);
$$ LANGUAGE SQL STABLE;

COMMENT ON FUNCTION public.get_recent_failed_attempts IS 'Returns count of failed login attempts in last N minutes';

-- =====================================================
-- 11. SAMPLE DATA (For development)
-- =====================================================

-- Create profile for admin user if exists
DO $$
DECLARE
  admin_user_id UUID;
BEGIN
  SELECT id INTO admin_user_id FROM auth.users WHERE email = 'admin@ideaonaction.local' LIMIT 1;

  IF admin_user_id IS NOT NULL THEN
    INSERT INTO public.user_profiles (user_id, display_name, preferences)
    VALUES (
      admin_user_id,
      'Admin User',
      '{"theme": "system", "language": "ko", "notifications": true}'
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
END $$;

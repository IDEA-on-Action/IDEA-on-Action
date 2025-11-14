-- Phase 10 Week 2: Security Enhancement Tables
-- Migration: 20251020000008_create_security_tables.sql
-- Author: Claude AI
-- Date: 2025-10-20
-- Description: Account locks, password reset, and email verification for security

-- =====================================================
-- 0. PREREQUISITES
-- =====================================================
-- Ensure update_updated_at_column() function exists (from migration 001)
-- pgcrypto extension should already be created

-- =====================================================
-- 1. ACCOUNT_LOCKS TABLE (Brute Force Prevention)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.account_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Lock status
  is_locked BOOLEAN NOT NULL DEFAULT true,
  lock_reason TEXT NOT NULL CHECK (lock_reason IN ('brute_force', 'suspicious_activity', 'admin', 'user_requested')),
  locked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  unlock_at TIMESTAMPTZ, -- NULL = manual unlock only

  -- Metadata
  locked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Admin who locked (if admin lock)
  unlock_token TEXT UNIQUE, -- Token for email-based unlock
  unlocked_at TIMESTAMPTZ,
  unlock_reason TEXT
);

COMMENT ON TABLE public.account_locks IS 'Account locks for brute force protection and security';
COMMENT ON COLUMN public.account_locks.lock_reason IS 'Reason: brute_force, suspicious_activity, admin, user_requested';
COMMENT ON COLUMN public.account_locks.unlock_at IS 'Auto-unlock time (NULL = manual only)';
COMMENT ON COLUMN public.account_locks.unlock_token IS 'One-time token for email-based unlock';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_account_locks_user_id ON public.account_locks(user_id);
CREATE INDEX IF NOT EXISTS idx_account_locks_active ON public.account_locks(is_locked, unlock_at) WHERE is_locked = true;

-- =====================================================
-- 2. PASSWORD_RESET_TOKENS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.password_reset_tokens IS 'Password reset tokens (one-time use)';
COMMENT ON COLUMN public.password_reset_tokens.token IS 'One-time reset token (UUID v4)';
COMMENT ON COLUMN public.password_reset_tokens.expires_at IS 'Token expiration (typically 1 hour)';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON public.password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON public.password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires ON public.password_reset_tokens(expires_at) WHERE used_at IS NULL;

-- =====================================================
-- 3. EMAIL_VERIFICATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.email_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.email_verifications IS 'Email verification tokens';
COMMENT ON COLUMN public.email_verifications.token IS 'One-time verification token (UUID v4)';
COMMENT ON COLUMN public.email_verifications.expires_at IS 'Token expiration (typically 24 hours)';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_email_verifications_user_id ON public.email_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_email_verifications_token ON public.email_verifications(token);
CREATE INDEX IF NOT EXISTS idx_email_verifications_expires ON public.email_verifications(expires_at) WHERE verified_at IS NULL;

-- =====================================================
-- 4. HELPER FUNCTIONS
-- =====================================================

-- Function: Check if account is locked
CREATE OR REPLACE FUNCTION public.is_account_locked(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_lock RECORD;
BEGIN
  SELECT * INTO v_lock
  FROM public.account_locks
  WHERE user_id = p_user_id
    AND is_locked = true
    AND (unlock_at IS NULL OR unlock_at > now());

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.is_account_locked(UUID) IS 'Check if user account is currently locked';

-- Function: Lock account on failed login attempts
CREATE OR REPLACE FUNCTION public.lock_account_on_failed_attempts(p_email TEXT)
RETURNS VOID AS $$
DECLARE
  v_user_id UUID;
  v_failed_attempts INTEGER;
  v_max_attempts INTEGER := 5; -- Max attempts before lock
  v_lock_duration INTERVAL := INTERVAL '30 minutes';
BEGIN
  -- Get user ID
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = p_email;

  IF NOT FOUND THEN
    RETURN; -- User doesn't exist
  END IF;

  -- Count failed attempts in last 15 minutes
  SELECT COUNT(*) INTO v_failed_attempts
  FROM public.login_attempts
  WHERE email = p_email
    AND success = false
    AND created_at > now() - INTERVAL '15 minutes';

  -- Lock account if max attempts exceeded
  IF v_failed_attempts >= v_max_attempts THEN
    INSERT INTO public.account_locks (user_id, lock_reason, unlock_at)
    VALUES (v_user_id, 'brute_force', now() + v_lock_duration)
    ON CONFLICT (user_id)
    DO UPDATE SET
      is_locked = true,
      lock_reason = 'brute_force',
      locked_at = now(),
      unlock_at = now() + v_lock_duration;

    RAISE NOTICE 'Account locked: % (% failed attempts)', p_email, v_failed_attempts;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.lock_account_on_failed_attempts(TEXT) IS 'Lock account after 5 failed login attempts in 15 minutes';

-- Function: Generate password reset token
CREATE OR REPLACE FUNCTION public.generate_password_reset_token(p_email TEXT)
RETURNS TEXT AS $$
DECLARE
  v_user_id UUID;
  v_token TEXT;
BEGIN
  -- Get user ID
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = p_email;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found: %', p_email;
  END IF;

  -- Delete existing unused tokens
  DELETE FROM public.password_reset_tokens
  WHERE email = p_email
    AND used_at IS NULL;

  -- Generate new token
  v_token := gen_random_uuid()::TEXT;

  INSERT INTO public.password_reset_tokens (user_id, email, token, expires_at)
  VALUES (v_user_id, p_email, v_token, now() + INTERVAL '1 hour');

  RETURN v_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.generate_password_reset_token(TEXT) IS 'Generate one-time password reset token (1 hour expiry)';

-- Function: Verify password reset token
CREATE OR REPLACE FUNCTION public.verify_password_reset_token(p_token TEXT)
RETURNS JSONB AS $$
DECLARE
  v_reset RECORD;
BEGIN
  -- Get token record
  SELECT * INTO v_reset
  FROM public.password_reset_tokens
  WHERE token = p_token
    AND used_at IS NULL
    AND expires_at > now();

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid or expired token'
    );
  END IF;

  -- Mark token as used
  UPDATE public.password_reset_tokens
  SET used_at = now()
  WHERE id = v_reset.id;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_reset.user_id,
    'email', v_reset.email
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.verify_password_reset_token(TEXT) IS 'Verify and consume password reset token';

-- Function: Generate email verification token
CREATE OR REPLACE FUNCTION public.generate_email_verification_token(
  p_user_id UUID,
  p_email TEXT
)
RETURNS TEXT AS $$
DECLARE
  v_token TEXT;
BEGIN
  -- Delete existing unverified tokens
  DELETE FROM public.email_verifications
  WHERE user_id = p_user_id
    AND email = p_email
    AND verified_at IS NULL;

  -- Generate new token
  v_token := gen_random_uuid()::TEXT;

  INSERT INTO public.email_verifications (user_id, email, token, expires_at)
  VALUES (p_user_id, p_email, v_token, now() + INTERVAL '24 hours');

  RETURN v_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.generate_email_verification_token(UUID, TEXT) IS 'Generate email verification token (24 hour expiry)';

-- Function: Verify email token
CREATE OR REPLACE FUNCTION public.verify_email_token(p_token TEXT)
RETURNS JSONB AS $$
DECLARE
  v_verification RECORD;
BEGIN
  -- Get verification record
  SELECT * INTO v_verification
  FROM public.email_verifications
  WHERE token = p_token
    AND verified_at IS NULL
    AND expires_at > now();

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid or expired token'
    );
  END IF;

  -- Mark as verified
  UPDATE public.email_verifications
  SET verified_at = now()
  WHERE id = v_verification.id;

  -- Update user profile
  UPDATE public.user_profiles
  SET email_verified = true
  WHERE user_id = v_verification.user_id;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_verification.user_id,
    'email', v_verification.email
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.verify_email_token(TEXT) IS 'Verify and consume email verification token';

-- =====================================================
-- 5. RLS POLICIES - Account Locks
-- =====================================================
ALTER TABLE public.account_locks ENABLE ROW LEVEL SECURITY;

-- Users can view their own lock status
CREATE POLICY "Users can view own account lock status"
  ON public.account_locks FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can view all locks
CREATE POLICY "Admins can view all account locks"
  ON public.account_locks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid() AND email = 'admin@ideaonaction.local'
    )
  );

-- Admins can manage locks
CREATE POLICY "Admins can insert account locks"
  ON public.account_locks FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid() AND email = 'admin@ideaonaction.local'
    )
  );

CREATE POLICY "Admins can update account locks"
  ON public.account_locks FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid() AND email = 'admin@ideaonaction.local'
    )
  );

-- =====================================================
-- 6. RLS POLICIES - Password Reset Tokens
-- =====================================================
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Users can view their own reset tokens
CREATE POLICY "Users can view own reset tokens"
  ON public.password_reset_tokens FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- System can insert tokens (via function)
CREATE POLICY "System can insert reset tokens"
  ON public.password_reset_tokens FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =====================================================
-- 7. RLS POLICIES - Email Verifications
-- =====================================================
ALTER TABLE public.email_verifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own verifications
CREATE POLICY "Users can view own email verifications"
  ON public.email_verifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- System can insert verifications (via function)
CREATE POLICY "System can insert email verifications"
  ON public.email_verifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

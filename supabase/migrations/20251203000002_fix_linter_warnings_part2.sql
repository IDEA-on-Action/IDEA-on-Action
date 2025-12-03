-- ==============================================================================
-- Fix Supabase Linter Warnings (Part 2)
-- ==============================================================================
-- Description:
-- 1. Fix 'function_search_path_mutable' warnings by setting search_path = public
--    for various functions.
-- 2. Fix 'extension_in_public' warning for 'vector' extension (if possible).
--    Note: Moving extensions requires dropping dependent objects, which might be risky.
--    We will attempt to relocate it to 'extensions' schema if it exists, or create it.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Fix mutable search_path for functions
-- ------------------------------------------------------------------------------

-- Function: public.get_user_audit_logs
DROP FUNCTION IF EXISTS public.get_user_audit_logs(uuid, integer, integer);
CREATE OR REPLACE FUNCTION public.get_user_audit_logs(
    p_user_id uuid,
    p_limit integer DEFAULT 50,
    p_offset integer DEFAULT 0
)
RETURNS TABLE(
    id uuid,
    action text,
    resource_type text,
    resource_id text,
    details jsonb,
    ip_address text,
    user_agent text,
    created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only allow users to see their own logs, or admins to see all
    IF auth.uid() != p_user_id AND NOT public.is_admin_user(auth.uid()) THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    RETURN QUERY
    SELECT
        al.id,
        al.action,
        al.resource_type,
        al.resource_id,
        al.details,
        al.ip_address,
        al.user_agent,
        al.created_at
    FROM
        public.audit_logs al
    WHERE
        al.user_id = p_user_id
    ORDER BY
        al.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- Function: public.get_sandbox_config
DROP FUNCTION IF EXISTS public.get_sandbox_config(uuid);
CREATE OR REPLACE FUNCTION public.get_sandbox_config(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_config jsonb;
BEGIN
    -- Check permissions
    IF auth.uid() != p_user_id AND NOT public.is_admin_user(auth.uid()) THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    SELECT
        jsonb_build_object(
            'id', sc.id,
            'user_id', sc.user_id,
            'is_active', sc.is_active,
            'expires_at', sc.expires_at,
            'settings', sc.settings,
            'created_at', sc.created_at,
            'updated_at', sc.updated_at
        ) INTO v_config
    FROM
        public.sandbox_configs sc
    WHERE
        sc.user_id = p_user_id;

    RETURN v_config;
END;
$$;

-- Function: public.update_sandbox_configs_timestamp
CREATE OR REPLACE FUNCTION public.update_sandbox_configs_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Function: public.generate_invitation_token
CREATE OR REPLACE FUNCTION public.generate_invitation_token()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    RETURN encode(gen_random_bytes(32), 'hex');
END;
$$;

-- Function: public.update_profile_sync_status_updated_at
CREATE OR REPLACE FUNCTION public.update_profile_sync_status_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Function: public.cleanup_expired_sessions
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    DELETE FROM public.user_sessions
    WHERE expires_at < NOW();
END;
$$;

-- Function: public.update_user_sessions_updated_at
CREATE OR REPLACE FUNCTION public.update_user_sessions_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Function: public.get_resource_audit_logs
DROP FUNCTION IF EXISTS public.get_resource_audit_logs(text, text, integer, integer);
CREATE OR REPLACE FUNCTION public.get_resource_audit_logs(
    p_resource_type text,
    p_resource_id text,
    p_limit integer DEFAULT 50,
    p_offset integer DEFAULT 0
)
RETURNS TABLE(
    id uuid,
    user_id uuid,
    action text,
    details jsonb,
    created_at timestamptz,
    user_email text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only admins can view resource logs
    IF NOT public.is_admin_user(auth.uid()) THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    RETURN QUERY
    SELECT
        al.id,
        al.user_id,
        al.action,
        al.details,
        al.created_at,
        u.email::text as user_email
    FROM
        public.audit_logs al
    LEFT JOIN
        auth.users u ON al.user_id = u.id
    WHERE
        al.resource_type = p_resource_type
        AND al.resource_id = p_resource_id
    ORDER BY
        al.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- Function: public.update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Function: public.cleanup_old_audit_logs
DROP FUNCTION IF EXISTS public.cleanup_old_audit_logs(integer);
CREATE OR REPLACE FUNCTION public.cleanup_old_audit_logs(p_days integer DEFAULT 90)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_deleted_count integer;
BEGIN
    DELETE FROM public.audit_logs
    WHERE created_at < NOW() - (p_days || ' days')::interval;
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RETURN v_deleted_count;
END;
$$;

-- Function: public.cleanup_expired_sandbox_data
DROP FUNCTION IF EXISTS public.cleanup_expired_sandbox_data();
CREATE OR REPLACE FUNCTION public.cleanup_expired_sandbox_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Delete expired sandbox configs
    DELETE FROM public.sandbox_configs
    WHERE expires_at < NOW();
    
    -- Additional cleanup logic for sandbox data can be added here
END;
$$;

-- Function: public.cleanup_old_health_metrics
CREATE OR REPLACE FUNCTION public.cleanup_old_health_metrics()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM health_metrics
  WHERE recorded_at < NOW() - INTERVAL '24 hours';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN deleted_count;
END;
$$;

-- ------------------------------------------------------------------------------
-- 2. Address 'extension_in_public' (vector)
-- ------------------------------------------------------------------------------
-- Moving 'vector' extension from public to extensions schema.
-- WARNING: This might break existing code if it relies on 'public.vector' type
-- without schema qualification or search_path inclusion.
-- We will create the schema if it doesn't exist and attempt to move it.

CREATE SCHEMA IF NOT EXISTS extensions;

-- Move extension to extensions schema
-- Note: If this fails due to dependencies, manual intervention might be required.
-- We wrap it in a DO block to handle potential errors gracefully or log them.
DO $$
BEGIN
    -- Check if vector extension exists in public
    IF EXISTS (
        SELECT 1 FROM pg_extension 
        WHERE extname = 'vector' AND extnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    ) THEN
        ALTER EXTENSION vector SET SCHEMA extensions;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not move vector extension to extensions schema: %', SQLERRM;
END $$;

-- Update search_path to include extensions
ALTER DATABASE postgres SET search_path TO public, extensions;

-- Grant usage on extensions schema
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;


-- ==============================================================================
-- Fix Supabase Linter Warnings (Part 3 - Final)
-- ==============================================================================
-- Description:
-- Fix remaining 'function_search_path_mutable' warnings for:
-- 1. public.get_user_audit_logs
-- 2. public.get_sandbox_config
-- 3. public.get_resource_audit_logs
-- 4. public.cleanup_old_audit_logs
-- ==============================================================================

-- 1. public.get_user_audit_logs
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

-- 2. public.get_sandbox_config
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

-- 3. public.get_resource_audit_logs
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

-- 4. public.cleanup_old_audit_logs
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

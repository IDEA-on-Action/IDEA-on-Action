-- Add Compass Navigator Integration View
-- Date: 2025-11-23
-- Description: Creates a view to expose user and subscription data for Compass Navigator MCP Server.

CREATE OR REPLACE VIEW public.compass_integration_view AS
SELECT
    u.id AS user_id,
    u.email,
    COALESCE(up.display_name, u.raw_user_meta_data->>'full_name', u.email) AS name,
    u.raw_user_meta_data->>'avatar_url' AS avatar_url,
    CASE
        WHEN s.status = 'active' THEN 'active'
        WHEN s.status = 'past_due' THEN 'past_due'
        WHEN s.status = 'canceled' AND s.current_period_end > NOW() THEN 'active'
        ELSE 'inactive'
    END AS subscription_status,
    p.plan_name AS plan_name,
    p.features AS plan_features,
    s.current_period_end AS valid_until
FROM
    auth.users u
LEFT JOIN
    public.user_profiles up ON u.id = up.user_id
LEFT JOIN
    public.subscriptions s ON u.id = s.user_id AND s.status IN ('active', 'past_due', 'canceled')
LEFT JOIN
    public.subscription_plans p ON s.plan_id = p.id;

-- Grant access to authenticated users (or specific service role if configured)
GRANT SELECT ON public.compass_integration_view TO authenticated;
GRANT SELECT ON public.compass_integration_view TO service_role;

-- Comment on view
COMMENT ON VIEW public.compass_integration_view IS 'View for Compass Navigator MCP Server integration. Exposes user and subscription details.';

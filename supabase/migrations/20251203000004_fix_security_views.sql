-- Fix Security Definer View Warnings
-- 2025-12-03
-- Addresses:
-- 1. auth_users_exposed in minu_integration_view
-- 2. security_definer_view in rag_index_stats, project_type_stats, minu_integration_view, compass_integration_view

-- =====================================================
-- 1. rag_index_stats
-- =====================================================
DROP VIEW IF EXISTS public.rag_index_stats;

CREATE VIEW public.rag_index_stats WITH (security_invoker = true) AS
SELECT
  s.schemaname,
  s.relname AS tablename,
  s.indexrelname AS indexname,
  s.idx_scan AS index_scans,
  s.idx_tup_read AS tuples_read,
  s.idx_tup_fetch AS tuples_fetched
FROM pg_stat_user_indexes s
WHERE s.relname IN ('rag_documents', 'rag_embeddings')
ORDER BY s.idx_scan DESC;

COMMENT ON VIEW public.rag_index_stats IS 'RAG 테이블 인덱스 사용 통계 모니터링';

-- =====================================================
-- 2. project_type_stats
-- =====================================================
DROP VIEW IF EXISTS public.project_type_stats;

CREATE VIEW public.project_type_stats WITH (security_invoker = true) AS
SELECT
  pt.id,
  pt.slug,
  pt.name,
  pt.name_ko,
  pt.icon,
  pt.color,
  pt.display_order,
  COUNT(cpi.id) AS total_count,
  COUNT(CASE WHEN cpi.is_published = true THEN 1 END) AS published_count,
  COUNT(CASE WHEN cpi.is_featured = true THEN 1 END) AS featured_count,
  COUNT(CASE WHEN cpi.status = 'active' THEN 1 END) AS active_count
FROM public.project_types pt
LEFT JOIN public.cms_portfolio_items cpi ON pt.id = cpi.project_type_id
WHERE pt.is_active = true
GROUP BY pt.id, pt.slug, pt.name, pt.name_ko, pt.icon, pt.color, pt.display_order
ORDER BY pt.display_order;

COMMENT ON VIEW public.project_type_stats IS 'Project types with portfolio item counts';
GRANT SELECT ON public.project_type_stats TO anon, authenticated;

-- =====================================================
-- 3. minu_integration_view & compass_integration_view
-- =====================================================
-- Drop dependent view first
DROP VIEW IF EXISTS public.compass_integration_view;
DROP VIEW IF EXISTS public.minu_integration_view;

CREATE VIEW public.minu_integration_view WITH (security_invoker = true) AS
SELECT
  u.id as user_id,
  u.email,
  u.raw_user_meta_data->>'full_name' as full_name,
  u.raw_user_meta_data->>'avatar_url' as avatar_url,
  s.id as subscription_id,
  s.status as subscription_status,
  s.current_period_start,
  s.current_period_end,
  sp.plan_name,
  sp.price,
  sp.billing_cycle,
  sp.features,
  srv.title as service_title,
  srv.slug as service_slug
FROM auth.users u
LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
LEFT JOIN subscription_plans sp ON s.plan_id = sp.id
LEFT JOIN services srv ON sp.service_id = srv.id
WHERE srv.slug IN ('find', 'frame', 'build', 'keep') OR srv.slug IS NULL;

COMMENT ON VIEW public.minu_integration_view IS 'Minu 플랫폼 통합 뷰 - 사용자, 구독, 플랜 정보 조회';

-- Recreate deprecated view
CREATE VIEW public.compass_integration_view WITH (security_invoker = true) AS
SELECT * FROM public.minu_integration_view;

COMMENT ON VIEW public.compass_integration_view IS 'Deprecated: minu_integration_view를 사용하세요 (하위 호환성)';

-- Revoke access from public/authenticated to prevent auth.users exposure
REVOKE ALL ON public.minu_integration_view FROM anon, authenticated;
REVOKE ALL ON public.compass_integration_view FROM anon, authenticated;

-- Grant access only to service_role (for MCP server or internal tools)
GRANT SELECT ON public.minu_integration_view TO service_role;
GRANT SELECT ON public.compass_integration_view TO service_role;

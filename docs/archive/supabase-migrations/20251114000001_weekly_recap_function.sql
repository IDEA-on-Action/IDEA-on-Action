-- ============================================
-- Weekly Recap Automation
-- 일시: 2025-11-14
-- 목적: 활동 로그 기반 주간 요약 자동 생성
-- ============================================

-- ============================================
-- STEP 1: 로그 집계 SQL 함수
-- ============================================

-- 주간 로그 집계 함수
CREATE OR REPLACE FUNCTION public.get_weekly_logs(
  start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '7 days',
  end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  log_type TEXT,
  log_count BIGINT,
  logs JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    type AS log_type,
    COUNT(*)::BIGINT AS log_count,
    jsonb_agg(
      jsonb_build_object(
        'id', id,
        'type', type,
        'title', title,
        'content', content,
        'project_id', project_id,
        'tags', tags,
        'created_at', created_at
      ) ORDER BY created_at DESC
    ) AS logs
  FROM public.logs
  WHERE created_at BETWEEN start_date AND end_date
  GROUP BY type
  ORDER BY
    CASE type
      WHEN 'release' THEN 1
      WHEN 'learning' THEN 2
      WHEN 'decision' THEN 3
      ELSE 4
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 주간 프로젝트 활동 집계 함수
CREATE OR REPLACE FUNCTION public.get_weekly_project_activity(
  start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '7 days',
  end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  project_id TEXT,
  project_title TEXT,
  log_count BIGINT,
  release_count BIGINT,
  learning_count BIGINT,
  decision_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id AS project_id,
    p.title AS project_title,
    COUNT(l.id)::BIGINT AS log_count,
    COUNT(CASE WHEN l.type = 'release' THEN 1 END)::BIGINT AS release_count,
    COUNT(CASE WHEN l.type = 'learning' THEN 1 END)::BIGINT AS learning_count,
    COUNT(CASE WHEN l.type = 'decision' THEN 1 END)::BIGINT AS decision_count
  FROM public.projects p
  LEFT JOIN public.logs l ON l.project_id = p.id
    AND l.created_at BETWEEN start_date AND end_date
  WHERE EXISTS (
    SELECT 1 FROM public.logs
    WHERE project_id = p.id
    AND created_at BETWEEN start_date AND end_date
  )
  GROUP BY p.id, p.title
  ORDER BY log_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 주간 통계 집계 함수
CREATE OR REPLACE FUNCTION public.get_weekly_stats(
  start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '7 days',
  end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS JSONB AS $$
DECLARE
  stats JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_logs', (SELECT COUNT(*) FROM public.logs WHERE created_at BETWEEN start_date AND end_date),
    'release_count', (SELECT COUNT(*) FROM public.logs WHERE type = 'release' AND created_at BETWEEN start_date AND end_date),
    'learning_count', (SELECT COUNT(*) FROM public.logs WHERE type = 'learning' AND created_at BETWEEN start_date AND end_date),
    'decision_count', (SELECT COUNT(*) FROM public.logs WHERE type = 'decision' AND created_at BETWEEN start_date AND end_date),
    'active_projects', (SELECT COUNT(DISTINCT project_id) FROM public.logs WHERE created_at BETWEEN start_date AND end_date AND project_id IS NOT NULL),
    'top_tags', (
      SELECT jsonb_agg(tag_count ORDER BY count DESC)
      FROM (
        SELECT jsonb_build_object('tag', tag, 'count', COUNT(*)) AS tag_count, COUNT(*) AS count
        FROM public.logs,
        LATERAL unnest(tags) AS tag
        WHERE created_at BETWEEN start_date AND end_date
        GROUP BY tag
        ORDER BY COUNT(*) DESC
        LIMIT 5
      ) AS top_tags_query
    ),
    'start_date', start_date,
    'end_date', end_date
  ) INTO stats;

  RETURN stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 2: 권한 설정
-- ============================================

-- anon, authenticated 사용자에게 함수 실행 권한 부여
GRANT EXECUTE ON FUNCTION public.get_weekly_logs(TIMESTAMPTZ, TIMESTAMPTZ) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_weekly_project_activity(TIMESTAMPTZ, TIMESTAMPTZ) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_weekly_stats(TIMESTAMPTZ, TIMESTAMPTZ) TO anon, authenticated;

-- ============================================
-- STEP 3: 코멘트
-- ============================================

COMMENT ON FUNCTION public.get_weekly_logs IS 'Version 2.0: 주간 로그 집계 (타입별 그룹화)';
COMMENT ON FUNCTION public.get_weekly_project_activity IS 'Version 2.0: 주간 프로젝트 활동 집계';
COMMENT ON FUNCTION public.get_weekly_stats IS 'Version 2.0: 주간 통계 요약';

-- ============================================
-- Weekly Recap CRON Job 설정
-- 일시: 2025-11-14
-- 목적: 매주 일요일 자정에 Weekly Recap 자동 생성
-- ============================================

-- ============================================
-- STEP 1: pg_cron 확장 설치 (이미 설치되어 있을 수 있음)
-- ============================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ============================================
-- STEP 2: CRON Job 생성
-- ============================================

-- 기존 Weekly Recap 작업 삭제 (있을 경우)
SELECT cron.unschedule('weekly-recap-generation')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'weekly-recap-generation'
);

-- 매주 일요일 자정 (KST 기준 = UTC+9)에 실행
-- UTC 15:00 = KST 00:00 (다음날)
SELECT cron.schedule(
  'weekly-recap-generation',
  '0 15 * * 0', -- 매주 일요일 15:00 UTC (한국 시간 월요일 00:00)
  $$
  SELECT
    net.http_post(
      url := (SELECT current_setting('app.settings.supabase_url', true) || '/functions/v1/weekly-recap'),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT current_setting('app.settings.supabase_service_role_key', true))
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);

-- ============================================
-- STEP 3: Supabase 설정 (config.toml에서 설정 필요)
-- ============================================

-- config.toml 파일에 다음 설정 추가:
-- [app.settings]
-- supabase_url = "https://zykjdneewbzyazfukzyg.supabase.co"
-- supabase_service_role_key = "[YOUR_SERVICE_ROLE_KEY]"

-- ============================================
-- STEP 4: 수동 실행 함수 (테스트용)
-- ============================================

CREATE OR REPLACE FUNCTION public.trigger_weekly_recap()
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  -- Edge Function 호출 (HTTP POST)
  SELECT
    content::JSONB INTO result
  FROM
    net.http_post(
      url := (SELECT current_setting('app.settings.supabase_url', true) || '/functions/v1/weekly-recap'),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT current_setting('app.settings.supabase_service_role_key', true))
      ),
      body := '{}'::jsonb
    );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 권한 부여
GRANT EXECUTE ON FUNCTION public.trigger_weekly_recap() TO authenticated;

-- ============================================
-- STEP 5: CRON Job 확인
-- ============================================

-- 현재 스케줄된 작업 확인
-- SELECT * FROM cron.job WHERE jobname = 'weekly-recap-generation';

-- 작업 실행 기록 확인
-- SELECT * FROM cron.job_run_details WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'weekly-recap-generation') ORDER BY start_time DESC LIMIT 10;

-- ============================================
-- STEP 6: 코멘트
-- ============================================

COMMENT ON FUNCTION public.trigger_weekly_recap IS 'Version 2.0: Weekly Recap 수동 실행 함수 (테스트용)';

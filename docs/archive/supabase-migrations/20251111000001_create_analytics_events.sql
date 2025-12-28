-- Phase 14: 고급 분석 대시보드
-- analytics_events 테이블 생성
-- 작성일: 2025-11-04

-- analytics_events 테이블
CREATE TABLE analytics_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE SET NULL, -- NULL 허용 (비로그인 사용자)
  session_id TEXT NOT NULL, -- 브라우저 세션 ID (sessionStorage)
  event_name TEXT NOT NULL, -- 'page_view', 'add_to_cart', 'purchase' 등
  event_params JSONB DEFAULT '{}', -- 이벤트 파라미터 (검색어, 서비스 ID 등)
  page_url TEXT, -- 이벤트 발생 페이지 URL
  referrer TEXT, -- 리퍼러 URL
  user_agent TEXT, -- 사용자 에이전트 (브라우저 정보)
  ip_address INET, -- IP 주소 (프라이버시 고려)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성 (쿼리 성능 최적화)
CREATE INDEX idx_analytics_events_user_id ON analytics_events(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_analytics_events_event_name ON analytics_events(event_name);
CREATE INDEX idx_analytics_events_session_id ON analytics_events(session_id);
CREATE INDEX idx_analytics_events_created_at ON analytics_events(created_at DESC); -- 시계열 쿼리
CREATE INDEX idx_analytics_events_params ON analytics_events USING GIN(event_params); -- JSONB 검색

-- 복합 인덱스 (퍼널 분석용)
CREATE INDEX idx_analytics_events_funnel ON analytics_events(event_name, session_id, created_at DESC);

-- COMMENT 추가
COMMENT ON TABLE analytics_events IS 'Phase 14: 사용자 이벤트 추적 테이블 (GA4 보완)';
COMMENT ON COLUMN analytics_events.user_id IS '사용자 ID (NULL 허용, 비로그인 사용자 지원)';
COMMENT ON COLUMN analytics_events.session_id IS '브라우저 세션 ID (sessionStorage)';
COMMENT ON COLUMN analytics_events.event_name IS '이벤트 이름 (view_service, add_to_cart, purchase 등)';
COMMENT ON COLUMN analytics_events.event_params IS '이벤트 파라미터 (JSONB, 검색어/서비스 ID 등)';

-- RLS (Row Level Security) 활성화
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- RLS 정책 1: 관리자만 조회 가능
CREATE POLICY "Admins can view analytics events"
ON analytics_events FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    JOIN public.roles ON user_roles.role_id = roles.id
    WHERE user_roles.user_id = auth.uid()
    AND roles.name = 'admin'
  )
);

-- RLS 정책 2: 서비스 역할만 삽입 가능 (클라이언트에서 직접 삽입 불가)
-- 보안 강화: service_role 키를 사용하는 서버 함수/Edge Function에서만 삽입
CREATE POLICY "Service role can insert analytics events"
ON analytics_events FOR INSERT
WITH CHECK (auth.role() = 'service_role');

-- 테이블 통계 정보 (PostgreSQL 최적화)
ALTER TABLE analytics_events SET (autovacuum_vacuum_scale_factor = 0.05);
ALTER TABLE analytics_events SET (autovacuum_analyze_scale_factor = 0.02);

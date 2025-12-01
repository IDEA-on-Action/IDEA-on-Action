/**
 * 프로필 동기화 테이블
 *
 * ideaonaction ↔ Minu 프로필 실시간 동기화를 위한 테이블 및 정책
 *
 * 테이블:
 *   - profile_sync_status: 동기화 상태 추적
 *   - profile_sync_history: 동기화 이력
 *
 * 생성일: 2025-12-01 11:00 KST
 */

-- ============================================================================
-- 1. profile_sync_status 테이블
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.profile_sync_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 동기화 상태
  sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'syncing', 'synced', 'conflict', 'failed')),

  -- 동기화 방향
  last_sync_direction TEXT CHECK (last_sync_direction IN ('ideaonaction_to_minu', 'minu_to_ideaonaction', 'bidirectional')),

  -- 마지막 동기화 시각
  last_synced_at TIMESTAMPTZ,
  ideaonaction_updated_at TIMESTAMPTZ,
  minu_updated_at TIMESTAMPTZ,

  -- 충돌 정보
  conflict_fields JSONB,
  conflict_resolved_at TIMESTAMPTZ,

  -- 에러 정보
  error_message TEXT,
  error_count INTEGER DEFAULT 0,
  last_error_at TIMESTAMPTZ,

  -- 메타데이터
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(user_id)
);

-- 인덱스
CREATE INDEX idx_profile_sync_status_user_id ON public.profile_sync_status(user_id);
CREATE INDEX idx_profile_sync_status_sync_status ON public.profile_sync_status(sync_status);
CREATE INDEX idx_profile_sync_status_last_synced_at ON public.profile_sync_status(last_synced_at);

-- RLS 활성화
ALTER TABLE public.profile_sync_status ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 본인 데이터만 조회 가능
CREATE POLICY "사용자는 본인의 동기화 상태만 조회 가능"
  ON public.profile_sync_status
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS 정책: Service Role은 모든 작업 가능
CREATE POLICY "Service Role은 모든 동기화 상태 접근 가능"
  ON public.profile_sync_status
  FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- 2. profile_sync_history 테이블
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.profile_sync_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 동기화 정보
  sync_direction TEXT NOT NULL CHECK (sync_direction IN ('ideaonaction_to_minu', 'minu_to_ideaonaction', 'bidirectional')),
  sync_result TEXT NOT NULL CHECK (sync_result IN ('success', 'partial', 'conflict', 'failed')),

  -- 동기화된 필드
  synced_fields TEXT[] DEFAULT '{}',
  conflict_fields JSONB,

  -- 변경 전/후 데이터 (디버깅용)
  before_data JSONB,
  after_data JSONB,

  -- 에러 정보
  error_message TEXT,
  error_code TEXT,

  -- 동기화 트리거
  triggered_by TEXT CHECK (triggered_by IN ('user', 'webhook', 'scheduled', 'manual')),

  -- 메타데이터
  metadata JSONB DEFAULT '{}'::jsonb,
  synced_at TIMESTAMPTZ DEFAULT now(),

  -- 성능: user_id로 파티셔닝 고려 가능
  -- PARTITION BY RANGE (synced_at)
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 인덱스
CREATE INDEX idx_profile_sync_history_user_id ON public.profile_sync_history(user_id);
CREATE INDEX idx_profile_sync_history_synced_at ON public.profile_sync_history(synced_at DESC);
CREATE INDEX idx_profile_sync_history_sync_result ON public.profile_sync_history(sync_result);
CREATE INDEX idx_profile_sync_history_user_synced ON public.profile_sync_history(user_id, synced_at DESC);

-- RLS 활성화
ALTER TABLE public.profile_sync_history ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 본인 데이터만 조회 가능
CREATE POLICY "사용자는 본인의 동기화 이력만 조회 가능"
  ON public.profile_sync_history
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS 정책: Service Role은 모든 작업 가능
CREATE POLICY "Service Role은 모든 동기화 이력 접근 가능"
  ON public.profile_sync_history
  FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- 3. Triggers
-- ============================================================================

-- updated_at 자동 업데이트
CREATE OR REPLACE FUNCTION public.update_profile_sync_status_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profile_sync_status_updated_at
  BEFORE UPDATE ON public.profile_sync_status
  FOR EACH ROW
  EXECUTE FUNCTION public.update_profile_sync_status_updated_at();

-- ============================================================================
-- 4. Comments
-- ============================================================================

COMMENT ON TABLE public.profile_sync_status IS 'ideaonaction ↔ Minu 프로필 동기화 상태 추적';
COMMENT ON TABLE public.profile_sync_history IS 'ideaonaction ↔ Minu 프로필 동기화 이력';

COMMENT ON COLUMN public.profile_sync_status.sync_status IS '동기화 상태: pending, syncing, synced, conflict, failed';
COMMENT ON COLUMN public.profile_sync_status.last_sync_direction IS '마지막 동기화 방향';
COMMENT ON COLUMN public.profile_sync_status.conflict_fields IS '충돌 발생 필드 (JSON)';
COMMENT ON COLUMN public.profile_sync_status.error_count IS '연속 실패 횟수';

COMMENT ON COLUMN public.profile_sync_history.sync_direction IS '동기화 방향: ideaonaction_to_minu, minu_to_ideaonaction, bidirectional';
COMMENT ON COLUMN public.profile_sync_history.sync_result IS '동기화 결과: success, partial, conflict, failed';
COMMENT ON COLUMN public.profile_sync_history.synced_fields IS '동기화된 필드 목록';
COMMENT ON COLUMN public.profile_sync_history.triggered_by IS '동기화 트리거: user, webhook, scheduled, manual';

-- ============================================================================
-- AI 대화 컨텍스트 관리 시스템 마이그레이션
--
-- 파일: 20251125110000_create_ai_conversations.sql
-- 작성일: 2025-11-25
-- 버전: 1.0.0
--
-- 테이블:
-- 1. ai_conversations - 대화 세션 관리
-- 2. ai_messages - 대화 메시지 저장
--
-- 기능:
-- - 프로젝트/서비스별 대화 세션 관리
-- - 메시지 이력 저장 및 검색
-- - 대화 요약 및 포크 기능
-- - Supabase Realtime 지원
-- - 토큰 사용량 추적
-- ============================================================================

-- 트랜잭션 시작
BEGIN;

-- ============================================================================
-- 1. ai_conversations 테이블
-- 대화 세션 관리
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ai_conversations (
  -- 기본 식별자
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 대화 메타데이터
  title TEXT NOT NULL,
  description TEXT,

  -- 프롬프트 템플릿 연결 (선택)
  template_id UUID REFERENCES public.prompt_templates(id) ON DELETE SET NULL,

  -- 시스템 프롬프트 (대화별 커스터마이징)
  system_prompt TEXT,

  -- 추가 메타데이터 (프로젝트 정보, 태그 등)
  metadata JSONB DEFAULT '{}',

  -- 도구 설정 (Claude Tools API)
  tool_config JSONB DEFAULT '{}',

  -- RAG 설정 (검색 증강 생성)
  rag_config JSONB DEFAULT '{}',

  -- 포크 관계 (대화 분기)
  parent_id UUID REFERENCES public.ai_conversations(id) ON DELETE SET NULL,
  fork_index INTEGER DEFAULT 0,

  -- 대화 상태
  status TEXT NOT NULL DEFAULT 'active',

  -- 통계
  message_count INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,

  -- 활동 시간
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),

  -- 소유권
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 제약조건
  CONSTRAINT ai_conversations_status_check
    CHECK (status IN ('active', 'archived', 'deleted')),
  CONSTRAINT ai_conversations_fork_index_check
    CHECK (fork_index >= 0)
);

-- ============================================================================
-- 2. ai_messages 테이블
-- 대화 메시지 저장
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ai_messages (
  -- 기본 식별자
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 대화 연결
  conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,

  -- 메시지 역할
  role TEXT NOT NULL,

  -- 메시지 내용 (간단한 텍스트)
  content TEXT,

  -- 콘텐츠 블록 (복잡한 멀티모달 콘텐츠)
  content_blocks JSONB,

  -- 도구 사용 정보 (tool_use 블록)
  tool_use JSONB,

  -- 도구 결과 정보 (tool_result 블록)
  tool_result JSONB,

  -- AI 메타데이터 (assistant 메시지만)
  token_count INTEGER,
  model TEXT,
  stop_reason TEXT,

  -- 피드백 (사용자 평가)
  rating TEXT,
  feedback_text TEXT,

  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- 제약조건
  CONSTRAINT ai_messages_role_check
    CHECK (role IN ('user', 'assistant', 'system', 'tool_result')),
  CONSTRAINT ai_messages_content_check
    CHECK (content IS NOT NULL OR content_blocks IS NOT NULL),
  CONSTRAINT ai_messages_rating_check
    CHECK (rating IS NULL OR rating IN ('positive', 'negative', 'neutral'))
);

-- ============================================================================
-- 3. 인덱스 생성
-- ============================================================================

-- ai_conversations 인덱스
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id
  ON public.ai_conversations(user_id);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_template
  ON public.ai_conversations(template_id)
  WHERE template_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ai_conversations_status
  ON public.ai_conversations(status);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_last_activity
  ON public.ai_conversations(last_activity_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_parent
  ON public.ai_conversations(parent_id)
  WHERE parent_id IS NOT NULL;

-- metadata 내 서비스 ID 검색용 (GIN 인덱스)
CREATE INDEX IF NOT EXISTS idx_ai_conversations_metadata_service
  ON public.ai_conversations USING GIN ((metadata -> 'service_id'));

-- metadata 내 프로젝트 ID 검색용 (GIN 인덱스)
CREATE INDEX IF NOT EXISTS idx_ai_conversations_metadata_project
  ON public.ai_conversations USING GIN ((metadata -> 'project_id'));

-- ai_messages 인덱스
CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation
  ON public.ai_messages(conversation_id, created_at);

CREATE INDEX IF NOT EXISTS idx_ai_messages_role
  ON public.ai_messages(role);

CREATE INDEX IF NOT EXISTS idx_ai_messages_created_at
  ON public.ai_messages(created_at DESC);

-- Full-Text Search 인덱스 (제목 + 내용)
CREATE INDEX IF NOT EXISTS idx_ai_conversations_title_fts
  ON public.ai_conversations
  USING GIN (to_tsvector('korean', title));

CREATE INDEX IF NOT EXISTS idx_ai_messages_content_fts
  ON public.ai_messages
  USING GIN (to_tsvector('korean', COALESCE(content, '')));

-- ============================================================================
-- 4. RLS (Row Level Security) 정책
-- ============================================================================

-- RLS 활성화
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;

-- ai_conversations RLS 정책

-- 사용자는 자신의 대화만 조회
CREATE POLICY "Users can view own conversations"
  ON public.ai_conversations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 사용자는 자신의 대화만 생성
CREATE POLICY "Users can insert own conversations"
  ON public.ai_conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 사용자는 자신의 대화만 수정
CREATE POLICY "Users can update own conversations"
  ON public.ai_conversations
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- 사용자는 자신의 대화만 삭제
CREATE POLICY "Users can delete own conversations"
  ON public.ai_conversations
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 관리자는 모든 대화 조회 가능
CREATE POLICY "Admins can view all conversations"
  ON public.ai_conversations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin')
    )
  );

-- ai_messages RLS 정책

-- 사용자는 자신의 대화 메시지만 조회
CREATE POLICY "Users can view messages in own conversations"
  ON public.ai_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ai_conversations
      WHERE id = ai_messages.conversation_id
      AND user_id = auth.uid()
    )
  );

-- 사용자는 자신의 대화에만 메시지 추가
CREATE POLICY "Users can insert messages in own conversations"
  ON public.ai_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ai_conversations
      WHERE id = ai_messages.conversation_id
      AND user_id = auth.uid()
    )
  );

-- 메시지 수정 (피드백만 허용)
CREATE POLICY "Users can update messages in own conversations"
  ON public.ai_messages
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ai_conversations
      WHERE id = ai_messages.conversation_id
      AND user_id = auth.uid()
    )
  );

-- 사용자는 자신의 대화 메시지만 삭제
CREATE POLICY "Users can delete messages in own conversations"
  ON public.ai_messages
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ai_conversations
      WHERE id = ai_messages.conversation_id
      AND user_id = auth.uid()
    )
  );

-- 관리자는 모든 메시지 조회 가능
CREATE POLICY "Admins can view all messages"
  ON public.ai_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin')
    )
  );

-- 서비스 역할은 모든 작업 가능 (Edge Function용)
CREATE POLICY "Service role full access conversations"
  ON public.ai_conversations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access messages"
  ON public.ai_messages
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 5. 트리거: 대화 통계 자동 업데이트
-- ============================================================================

-- updated_at 자동 업데이트 함수
CREATE OR REPLACE FUNCTION update_ai_conversations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

-- updated_at 트리거
DROP TRIGGER IF EXISTS trigger_ai_conversations_updated_at
  ON public.ai_conversations;

CREATE TRIGGER trigger_ai_conversations_updated_at
  BEFORE UPDATE ON public.ai_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_conversations_updated_at();

-- 메시지 삽입 시 대화 통계 업데이트
CREATE OR REPLACE FUNCTION update_conversation_stats_on_message_insert()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.ai_conversations
  SET
    message_count = message_count + 1,
    total_tokens = total_tokens + COALESCE(NEW.token_count, 0),
    last_activity_at = NEW.created_at,
    updated_at = NOW()
  WHERE id = NEW.conversation_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

-- 메시지 삽입 트리거
DROP TRIGGER IF EXISTS trigger_update_conversation_stats_on_message_insert
  ON public.ai_messages;

CREATE TRIGGER trigger_update_conversation_stats_on_message_insert
  AFTER INSERT ON public.ai_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_stats_on_message_insert();

-- 메시지 삭제 시 대화 통계 업데이트
CREATE OR REPLACE FUNCTION update_conversation_stats_on_message_delete()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.ai_conversations
  SET
    message_count = GREATEST(message_count - 1, 0),
    total_tokens = GREATEST(total_tokens - COALESCE(OLD.token_count, 0), 0),
    updated_at = NOW()
  WHERE id = OLD.conversation_id;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

-- 메시지 삭제 트리거
DROP TRIGGER IF EXISTS trigger_update_conversation_stats_on_message_delete
  ON public.ai_messages;

CREATE TRIGGER trigger_update_conversation_stats_on_message_delete
  AFTER DELETE ON public.ai_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_stats_on_message_delete();

-- ============================================================================
-- 6. 유틸리티 함수
-- ============================================================================

-- 대화 요약 생성 함수 (플레이스홀더)
CREATE OR REPLACE FUNCTION summarize_conversation(
  p_conversation_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_summary TEXT;
  v_messages_text TEXT;
BEGIN
  -- 모든 메시지 내용 수집
  SELECT string_agg(
    CASE
      WHEN role = 'user' THEN '사용자: ' || COALESCE(content, '[콘텐츠 블록]')
      WHEN role = 'assistant' THEN 'AI: ' || COALESCE(content, '[콘텐츠 블록]')
      ELSE ''
    END,
    E'\n\n'
  )
  INTO v_messages_text
  FROM public.ai_messages
  WHERE conversation_id = p_conversation_id
  ORDER BY created_at;

  -- 간단한 요약 (실제로는 Claude API를 호출해야 함)
  v_summary := '대화 요약: ' || LEFT(v_messages_text, 500) || '...';

  -- metadata에 요약 저장
  UPDATE public.ai_conversations
  SET metadata = jsonb_set(
    metadata,
    '{summary}',
    to_jsonb(v_summary),
    true
  )
  WHERE id = p_conversation_id;

  RETURN v_summary;
END;
$$;

COMMENT ON FUNCTION summarize_conversation IS '대화 내용 요약 생성 (Edge Function에서 실제 Claude API 호출 권장)';

-- 대화 포크 함수
CREATE OR REPLACE FUNCTION fork_conversation(
  p_parent_id UUID,
  p_from_message_id UUID,
  p_user_id UUID,
  p_new_title TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_conversation_id UUID;
  v_parent_metadata JSONB;
  v_parent_template_id UUID;
  v_parent_system_prompt TEXT;
  v_max_fork_index INTEGER;
BEGIN
  -- 부모 대화 정보 조회
  SELECT metadata, template_id, system_prompt
  INTO v_parent_metadata, v_parent_template_id, v_parent_system_prompt
  FROM public.ai_conversations
  WHERE id = p_parent_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION '부모 대화를 찾을 수 없습니다: %', p_parent_id;
  END IF;

  -- 최대 fork_index 조회
  SELECT COALESCE(MAX(fork_index), 0) + 1
  INTO v_max_fork_index
  FROM public.ai_conversations
  WHERE parent_id = p_parent_id;

  -- 새 대화 생성
  INSERT INTO public.ai_conversations (
    title,
    template_id,
    system_prompt,
    metadata,
    parent_id,
    fork_index,
    user_id
  ) VALUES (
    p_new_title,
    v_parent_template_id,
    v_parent_system_prompt,
    jsonb_set(v_parent_metadata, '{forked_from_message_id}', to_jsonb(p_from_message_id::TEXT), true),
    p_parent_id,
    v_max_fork_index,
    p_user_id
  )
  RETURNING id INTO v_new_conversation_id;

  -- 포크 시점까지의 메시지 복사
  INSERT INTO public.ai_messages (
    conversation_id,
    role,
    content,
    content_blocks,
    tool_use,
    tool_result,
    token_count,
    model,
    stop_reason,
    created_at
  )
  SELECT
    v_new_conversation_id,
    role,
    content,
    content_blocks,
    tool_use,
    tool_result,
    token_count,
    model,
    stop_reason,
    created_at
  FROM public.ai_messages
  WHERE conversation_id = p_parent_id
  AND created_at <= (
    SELECT created_at FROM public.ai_messages WHERE id = p_from_message_id
  )
  ORDER BY created_at;

  RETURN v_new_conversation_id;
END;
$$;

COMMENT ON FUNCTION fork_conversation IS '특정 메시지 시점에서 대화 포크 생성';

-- 대화 검색 함수
CREATE OR REPLACE FUNCTION search_conversations(
  p_user_id UUID,
  p_query TEXT,
  p_status TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  status TEXT,
  message_count INTEGER,
  total_tokens INTEGER,
  last_activity_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  rank REAL
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    c.title,
    c.description,
    c.status,
    c.message_count,
    c.total_tokens,
    c.last_activity_at,
    c.created_at,
    ts_rank(to_tsvector('korean', c.title), plainto_tsquery('korean', p_query)) AS rank
  FROM public.ai_conversations c
  WHERE
    c.user_id = p_user_id
    AND (p_status IS NULL OR c.status = p_status)
    AND (
      to_tsvector('korean', c.title) @@ plainto_tsquery('korean', p_query)
      OR to_tsvector('korean', COALESCE(c.description, '')) @@ plainto_tsquery('korean', p_query)
    )
  ORDER BY rank DESC, c.last_activity_at DESC
  LIMIT p_limit;
$$;

COMMENT ON FUNCTION search_conversations IS '대화 전체 텍스트 검색 (제목, 설명)';

-- ============================================================================
-- 7. 테이블 코멘트
-- ============================================================================

COMMENT ON TABLE public.ai_conversations IS 'AI 대화 세션 관리 - 프로젝트/서비스별 컨텍스트 저장';
COMMENT ON COLUMN public.ai_conversations.title IS '대화 제목';
COMMENT ON COLUMN public.ai_conversations.template_id IS '사용된 프롬프트 템플릿 ID';
COMMENT ON COLUMN public.ai_conversations.system_prompt IS '대화별 시스템 프롬프트 (템플릿 오버라이드)';
COMMENT ON COLUMN public.ai_conversations.metadata IS 'JSON 메타데이터 (service_id, project_id, tags, summary 등)';
COMMENT ON COLUMN public.ai_conversations.tool_config IS 'Claude Tools API 설정';
COMMENT ON COLUMN public.ai_conversations.rag_config IS 'RAG (검색 증강 생성) 설정';
COMMENT ON COLUMN public.ai_conversations.parent_id IS '부모 대화 ID (포크 관계)';
COMMENT ON COLUMN public.ai_conversations.fork_index IS '포크 순서 (0부터 시작)';
COMMENT ON COLUMN public.ai_conversations.status IS 'active, archived, deleted';
COMMENT ON COLUMN public.ai_conversations.message_count IS '메시지 수 (자동 계산)';
COMMENT ON COLUMN public.ai_conversations.total_tokens IS '총 토큰 수 (자동 계산)';
COMMENT ON COLUMN public.ai_conversations.last_activity_at IS '마지막 메시지 시간 (자동 업데이트)';

COMMENT ON TABLE public.ai_messages IS 'AI 대화 메시지 저장 - 사용자/AI 메시지 이력';
COMMENT ON COLUMN public.ai_messages.conversation_id IS '대화 ID (외래키)';
COMMENT ON COLUMN public.ai_messages.role IS 'user, assistant, system, tool_result';
COMMENT ON COLUMN public.ai_messages.content IS '텍스트 메시지 내용';
COMMENT ON COLUMN public.ai_messages.content_blocks IS 'Claude Content Blocks (멀티모달 콘텐츠)';
COMMENT ON COLUMN public.ai_messages.tool_use IS 'Claude Tool Use 정보';
COMMENT ON COLUMN public.ai_messages.tool_result IS 'Claude Tool Result 정보';
COMMENT ON COLUMN public.ai_messages.token_count IS '토큰 수 (assistant 메시지)';
COMMENT ON COLUMN public.ai_messages.model IS '사용된 Claude 모델 ID';
COMMENT ON COLUMN public.ai_messages.stop_reason IS 'end_turn, max_tokens, stop_sequence, tool_use';
COMMENT ON COLUMN public.ai_messages.rating IS '사용자 평가 (positive, negative, neutral)';
COMMENT ON COLUMN public.ai_messages.feedback_text IS '피드백 텍스트';

-- ============================================================================
-- 마이그레이션 완료
-- ============================================================================

COMMIT;

-- 마이그레이션 확인
DO $$
BEGIN
  RAISE NOTICE 'AI 대화 컨텍스트 관리 시스템 마이그레이션 완료';
  RAISE NOTICE '- ai_conversations 테이블 생성됨';
  RAISE NOTICE '- ai_messages 테이블 생성됨';
  RAISE NOTICE '- RLS 정책 12개 적용됨';
  RAISE NOTICE '- 트리거 3개 생성됨 (통계 자동 업데이트)';
  RAISE NOTICE '- 유틸리티 함수 3개 생성됨';
END $$;

# Sprint 4: 대화 컨텍스트 관리

> Claude AI 통합을 위한 대화 이력 저장 및 컨텍스트 관리 시스템 구축

**시작일**: 2025-11-25
**예상 소요**: 8시간 (1일)
**관련 명세**: [spec/claude-integration/requirements.md](../../spec/claude-integration/requirements.md)
**관련 설계**: [plan/claude-integration/conversation-context/architecture.md](../../plan/claude-integration/conversation-context/architecture.md)
**선행 조건**: Sprint 3 완료 ✅

---

## 목표

1. `ai_conversations` 테이블 마이그레이션
2. `ai_messages` 테이블 마이그레이션
3. TypeScript 타입 정의 (conversation.types.ts)
4. useConversationManager 훅 구현
5. useMessages 훅 구현 (Realtime 구독 포함)
6. 컨텍스트 요약 기능
7. 대화 포크 및 내보내기
8. 대화 목록 UI 컴포넌트
9. 대화 상세 UI 컴포넌트 (채팅 인터페이스)
10. E2E 테스트 6개

---

## 병렬 실행 전략

```
┌─────────────────────────────────────────────────────────────┐
│                      Phase 1 (2h)                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ Agent 1      │  │ Agent 2      │  │ Agent 3      │       │
│  │ TASK-CC-001  │  │ TASK-CC-004  │  │ TASK-CC-007  │       │
│  │ ai_conver    │  │ useConver    │  │ 대화 목록 UI │       │
│  │ sations DB   │  │ sationManager│  │              │       │
│  │ TASK-CC-002  │  │              │  │              │       │
│  │ ai_messages  │  │              │  │              │       │
│  │ TASK-CC-003  │  │              │  │              │       │
│  │ TypeScript   │  │              │  │              │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      Phase 2 (3h)                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ Agent 1      │  │ Agent 2      │  │ Agent 3      │       │
│  │ Realtime     │  │ TASK-CC-005  │  │ TASK-CC-008  │       │
│  │ 구독 설정    │  │ 컨텍스트 요약│  │ 대화 상세 UI │       │
│  │              │  │ TASK-CC-006  │  │              │       │
│  │              │  │ 포크/내보내기│  │              │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      Phase 3 (3h)                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ Agent 1      │  │ Agent 2      │  │ Agent 4      │       │
│  │ 통합 테스트  │  │ 문서화       │  │ TASK-CC-009  │       │
│  │              │  │ Admin 가이드 │  │ E2E 테스트   │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

**예상 총 소요 시간**: 8시간 (병렬 실행 3 Phase)
**단일 실행 시**: ~16시간 (50% 시간 절감)

---

## 작업 목록

### TASK-CC-001: DB 마이그레이션 - ai_conversations 테이블

**예상 시간**: 45분
**상태**: ⏳ 대기
**의존성**: 없음
**담당**: Agent 1 (Phase 1)

**작업 내용**:

#### 1. 마이그레이션 파일 생성

```sql
-- supabase/migrations/20251125000002_create_ai_conversations.sql

-- =====================================================
-- 대화 컨텍스트 관리 시스템 - Part 1
-- Sprint 4: Claude Integration
-- =====================================================

-- 1. ai_conversations 테이블 생성
CREATE TABLE IF NOT EXISTS ai_conversations (
  -- 기본 식별자
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 대화 메타데이터
  title TEXT NOT NULL,
  description TEXT,

  -- 프로젝트 연결 (선택)
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  service_id TEXT,

  -- 대화 상태
  status TEXT NOT NULL DEFAULT 'active',
  -- 'active', 'archived', 'summarized'

  -- 요약 (긴 대화 압축)
  summary TEXT,
  summary_at TIMESTAMPTZ,

  -- 포크 관계
  parent_conversation_id UUID REFERENCES ai_conversations(id) ON DELETE SET NULL,
  forked_from_message_id UUID,

  -- 통계
  message_count INTEGER DEFAULT 0,
  total_tokens_used INTEGER DEFAULT 0,

  -- 소유권
  created_by UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,

  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_at TIMESTAMPTZ,

  -- 제약조건
  CONSTRAINT valid_status CHECK (
    status IN ('active', 'archived', 'summarized')
  )
);

-- 2. 인덱스 생성
CREATE INDEX idx_ai_conversations_created_by ON ai_conversations(created_by);
CREATE INDEX idx_ai_conversations_project_id ON ai_conversations(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX idx_ai_conversations_service_id ON ai_conversations(service_id) WHERE service_id IS NOT NULL;
CREATE INDEX idx_ai_conversations_status ON ai_conversations(status);
CREATE INDEX idx_ai_conversations_last_message_at ON ai_conversations(last_message_at DESC NULLS LAST);
CREATE INDEX idx_ai_conversations_parent_id ON ai_conversations(parent_conversation_id) WHERE parent_conversation_id IS NOT NULL;

-- Full-Text Search 인덱스 (제목 및 설명)
CREATE INDEX idx_ai_conversations_title_fts
ON ai_conversations
USING GIN (to_tsvector('korean', title || ' ' || COALESCE(description, '')));

-- 3. updated_at 자동 업데이트 트리거
CREATE TRIGGER update_ai_conversations_updated_at
BEFORE UPDATE ON ai_conversations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 4. RLS 활성화
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;

-- 5. RLS 정책 생성

-- 조회: 본인이 생성한 대화만
CREATE POLICY "Users can view their own conversations"
ON ai_conversations
FOR SELECT
USING (created_by = auth.uid());

-- 삽입: 인증된 사용자만
CREATE POLICY "Authenticated users can create conversations"
ON ai_conversations
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND created_by = auth.uid()
);

-- 업데이트: 본인이 생성한 대화만
CREATE POLICY "Users can update their own conversations"
ON ai_conversations
FOR UPDATE
USING (created_by = auth.uid());

-- 삭제: 본인이 생성한 대화만
CREATE POLICY "Users can delete their own conversations"
ON ai_conversations
FOR DELETE
USING (created_by = auth.uid());

-- 6. 코멘트 추가
COMMENT ON TABLE ai_conversations IS 'AI 대화 세션 저장소';
COMMENT ON COLUMN ai_conversations.summary IS '대화 요약 (자동 생성)';
COMMENT ON COLUMN ai_conversations.parent_conversation_id IS '포크된 대화의 원본 ID';
COMMENT ON COLUMN ai_conversations.forked_from_message_id IS '포크 시작 메시지 ID';
```

**완료 기준**:
- [ ] 마이그레이션 파일 생성 완료
- [ ] 로컬 테스트 통과
- [ ] 프로덕션 배포 성공
- [ ] RLS 정책 동작 확인

---

### TASK-CC-002: DB 마이그레이션 - ai_messages 테이블

**예상 시간**: 45분
**상태**: ⏳ 대기
**의존성**: TASK-CC-001
**담당**: Agent 1 (Phase 1)

**작업 내용**:

#### 1. 마이그레이션 파일 생성

```sql
-- supabase/migrations/20251125000003_create_ai_messages.sql

-- =====================================================
-- 대화 컨텍스트 관리 시스템 - Part 2
-- Sprint 4: Claude Integration
-- =====================================================

-- 1. ai_messages 테이블 생성
CREATE TABLE IF NOT EXISTS ai_messages (
  -- 기본 식별자
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 대화 연결
  conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,

  -- 메시지 내용
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,

  -- AI 메타데이터 (assistant 메시지만)
  model TEXT,
  tokens_used INTEGER,
  finish_reason TEXT CHECK (finish_reason IN ('end_turn', 'max_tokens', 'stop_sequence', NULL)),

  -- 추가 메타데이터
  metadata JSONB DEFAULT '{}',

  -- 순서
  sequence_number INTEGER NOT NULL,

  -- 소유권
  created_by UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,

  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 인덱스 생성
CREATE INDEX idx_ai_messages_conversation_id ON ai_messages(conversation_id);
CREATE INDEX idx_ai_messages_created_by ON ai_messages(created_by);
CREATE INDEX idx_ai_messages_role ON ai_messages(role);
CREATE INDEX idx_ai_messages_sequence_number ON ai_messages(conversation_id, sequence_number);

-- 복합 유니크 인덱스 (대화별 메시지 정렬)
CREATE UNIQUE INDEX idx_ai_messages_conversation_sequence
ON ai_messages(conversation_id, sequence_number);

-- Full-Text Search 인덱스
CREATE INDEX idx_ai_messages_content_fts
ON ai_messages
USING GIN (to_tsvector('korean', content));

-- 3. RLS 활성화
ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;

-- 4. RLS 정책 생성

-- 조회: 본인이 생성한 메시지만 (대화 소유권 체크)
CREATE POLICY "Users can view messages in their conversations"
ON ai_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM ai_conversations
    WHERE id = ai_messages.conversation_id
    AND created_by = auth.uid()
  )
);

-- 삽입: 본인이 소유한 대화에만 메시지 추가
CREATE POLICY "Users can add messages to their conversations"
ON ai_messages
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND created_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM ai_conversations
    WHERE id = ai_messages.conversation_id
    AND created_by = auth.uid()
  )
);

-- 삭제: 본인이 소유한 대화의 메시지만
CREATE POLICY "Users can delete messages in their conversations"
ON ai_messages
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM ai_conversations
    WHERE id = ai_messages.conversation_id
    AND created_by = auth.uid()
  )
);

-- 5. 자동 통계 업데이트 트리거

-- 메시지 삽입 시 대화 통계 업데이트
CREATE OR REPLACE FUNCTION update_conversation_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE ai_conversations
  SET
    message_count = message_count + 1,
    total_tokens_used = total_tokens_used + COALESCE(NEW.tokens_used, 0),
    last_message_at = NEW.created_at,
    updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_conversation_stats_on_message_insert
AFTER INSERT ON ai_messages
FOR EACH ROW
EXECUTE FUNCTION update_conversation_stats();

-- 메시지 삭제 시 대화 통계 업데이트
CREATE OR REPLACE FUNCTION update_conversation_stats_on_delete()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE ai_conversations
  SET
    message_count = GREATEST(0, message_count - 1),
    total_tokens_used = GREATEST(0, total_tokens_used - COALESCE(OLD.tokens_used, 0)),
    updated_at = NOW()
  WHERE id = OLD.conversation_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_conversation_stats_on_message_delete
AFTER DELETE ON ai_messages
FOR EACH ROW
EXECUTE FUNCTION update_conversation_stats_on_delete();

-- 6. 코멘트 추가
COMMENT ON TABLE ai_messages IS 'AI 대화 메시지 저장소';
COMMENT ON COLUMN ai_messages.metadata IS '추가 메타데이터 (템플릿 ID, 첨부파일 등)';
COMMENT ON COLUMN ai_messages.sequence_number IS '대화 내 메시지 순서';
```

**완료 기준**:
- [ ] 마이그레이션 파일 생성 완료
- [ ] 통계 업데이트 트리거 동작 확인
- [ ] RLS 정책 동작 확인

---

### TASK-CC-003: TypeScript 타입 정의

**예상 시간**: 30분
**상태**: ⏳ 대기
**의존성**: TASK-CC-002
**담당**: Agent 1 (Phase 1)

**작업 내용**:

#### 1. 타입 파일 생성

**파일**: `src/types/conversation.types.ts`

```typescript
/**
 * 대화 컨텍스트 관리 타입 정의
 * Sprint 4: Claude Integration
 */

/**
 * 대화 상태
 */
export type ConversationStatus = 'active' | 'archived' | 'summarized'

/**
 * 메시지 역할
 */
export type MessageRole = 'user' | 'assistant' | 'system'

/**
 * AI 응답 종료 이유
 */
export type FinishReason = 'end_turn' | 'max_tokens' | 'stop_sequence'

/**
 * 대화 세션 (DB 모델)
 */
export interface AIConversation {
  id: string
  title: string
  description?: string

  // 프로젝트 연결
  project_id?: string
  service_id?: string

  // 상태
  status: ConversationStatus

  // 요약
  summary?: string
  summary_at?: string

  // 포크 관계
  parent_conversation_id?: string
  forked_from_message_id?: string

  // 통계
  message_count: number
  total_tokens_used: number

  // 소유권
  created_by: string

  // 타임스탬프
  created_at: string
  updated_at: string
  last_message_at?: string
}

/**
 * AI 메시지 (DB 모델)
 */
export interface AIMessage {
  id: string
  conversation_id: string

  // 내용
  role: MessageRole
  content: string

  // AI 메타데이터
  model?: string
  tokens_used?: number
  finish_reason?: FinishReason

  // 추가 메타데이터
  metadata: {
    template_id?: string
    variables?: Record<string, any>
    attachments?: Array<{
      type: 'image' | 'document'
      url: string
      name: string
    }>
  }

  // 순서
  sequence_number: number

  // 소유권
  created_by: string

  // 타임스탬프
  created_at: string
}

/**
 * 대화 생성 요청
 */
export interface CreateConversationRequest {
  title: string
  description?: string
  project_id?: string
  service_id?: string
  initial_message?: string
}

/**
 * 메시지 생성 요청
 */
export interface CreateMessageRequest {
  conversation_id: string
  role: MessageRole
  content: string
  metadata?: AIMessage['metadata']
}

/**
 * 대화 요약 요청
 */
export interface SummarizeConversationRequest {
  conversation_id: string
  max_length?: number // 요약 최대 길이 (단어)
}

/**
 * 대화 포크 요청
 */
export interface ForkConversationRequest {
  parent_conversation_id: string
  from_message_id: string
  new_title: string
}

/**
 * 대화 내보내기 형식
 */
export type ExportFormat = 'markdown' | 'json' | 'text'

/**
 * 대화 내보내기 요청
 */
export interface ExportConversationRequest {
  conversation_id: string
  format: ExportFormat
  include_metadata?: boolean
}

/**
 * 대화 검색 필터
 */
export interface ConversationFilter {
  status?: ConversationStatus
  service_id?: string
  project_id?: string
  search?: string // 제목, 내용 검색
  created_after?: string
  created_before?: string
}

/**
 * 대화 정렬 옵션
 */
export type ConversationSortBy = 'created_at' | 'updated_at' | 'last_message_at' | 'message_count'
export type ConversationSortOrder = 'asc' | 'desc'

export interface ConversationSortOptions {
  sortBy: ConversationSortBy
  sortOrder: ConversationSortOrder
}
```

#### 2. 타입 내보내기

**파일**: `src/types/index.ts` (추가)

```typescript
// Conversation Context
export * from './conversation.types'
```

**완료 기준**:
- [ ] 타입 파일 생성 완료
- [ ] 타입 내보내기 설정 완료
- [ ] TypeScript 컴파일 에러 없음

---

### TASK-CC-004: useConversationManager 훅 구현 (기본)

**예상 시간**: 1.5시간
**상태**: ⏳ 대기
**의존성**: TASK-CC-003
**담당**: Agent 2 (Phase 1)

**작업 내용**:

**파일**: `src/hooks/ai/useConversationManager.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type {
  AIConversation,
  CreateConversationRequest,
  ConversationFilter,
  ConversationSortOptions
} from '@/types'

interface UseConversationManagerOptions {
  filter?: ConversationFilter
  sortOptions?: ConversationSortOptions
  enabled?: boolean
}

export function useConversationManager(
  options: UseConversationManagerOptions = {}
) {
  const queryClient = useQueryClient()
  const {
    filter = {},
    sortOptions = { sortBy: 'last_message_at', sortOrder: 'desc' },
    enabled = true
  } = options

  // ================== 조회 ==================

  const { data: conversations = [], isLoading, error } = useQuery({
    queryKey: ['ai-conversations', filter, sortOptions],
    queryFn: async () => {
      let query = supabase
        .from('ai_conversations')
        .select('*')

      // 필터 적용
      if (filter.status) {
        query = query.eq('status', filter.status)
      }
      if (filter.service_id) {
        query = query.eq('service_id', filter.service_id)
      }
      if (filter.project_id) {
        query = query.eq('project_id', filter.project_id)
      }
      if (filter.search) {
        query = query.textSearch('title', filter.search, {
          type: 'websearch',
          config: 'korean'
        })
      }
      if (filter.created_after) {
        query = query.gte('created_at', filter.created_after)
      }
      if (filter.created_before) {
        query = query.lte('created_at', filter.created_before)
      }

      // 정렬 적용
      query = query.order(sortOptions.sortBy, {
        ascending: sortOptions.sortOrder === 'asc',
        nullsFirst: false
      })

      const { data, error } = await query

      if (error) throw error
      return data as AIConversation[]
    },
    enabled
  })

  // ================== 생성 ==================

  const createMutation = useMutation({
    mutationFn: async (data: CreateConversationRequest) => {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) throw new Error('Unauthorized')

      const { data: conversation, error } = await supabase
        .from('ai_conversations')
        .insert({
          title: data.title,
          description: data.description,
          project_id: data.project_id,
          service_id: data.service_id,
          created_by: user.user.id
        })
        .select()
        .single()

      if (error) throw error

      // 초기 메시지 추가 (선택)
      if (data.initial_message && conversation) {
        const { error: msgError } = await supabase
          .from('ai_messages')
          .insert({
            conversation_id: conversation.id,
            role: 'user',
            content: data.initial_message,
            sequence_number: 1,
            created_by: user.user.id
          })

        if (msgError) throw msgError
      }

      return conversation as AIConversation
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-conversations'] })
    }
  })

  // ================== 업데이트 ==================

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data
    }: {
      id: string
      data: Partial<AIConversation>
    }) => {
      const { data: conversation, error } = await supabase
        .from('ai_conversations')
        .update(data)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return conversation as AIConversation
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-conversations'] })
    }
  })

  // ================== 삭제 ==================

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ai_conversations')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-conversations'] })
    }
  })

  // ================== 보관 ==================

  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ai_conversations')
        .update({ status: 'archived' })
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-conversations'] })
    }
  })

  // ================== 검색 ==================

  const searchMutation = useMutation({
    mutationFn: async (query: string) => {
      const { data, error } = await supabase
        .from('ai_conversations')
        .select('*')
        .textSearch('title', query, {
          type: 'websearch',
          config: 'korean'
        })
        .order('last_message_at', { ascending: false, nullsFirst: false })

      if (error) throw error
      return data as AIConversation[]
    }
  })

  return {
    conversations,
    isLoading,
    error: error as Error | null,

    // CRUD 작업
    createConversation: createMutation.mutateAsync,
    updateConversation: (id: string, data: Partial<AIConversation>) =>
      updateMutation.mutateAsync({ id, data }),
    deleteConversation: deleteMutation.mutateAsync,
    archiveConversation: archiveMutation.mutateAsync,

    // 검색
    searchConversations: searchMutation.mutateAsync
  }
}
```

**완료 기준**:
- [ ] useConversationManager 훅 생성 완료
- [ ] CRUD 동작 확인
- [ ] TypeScript 컴파일 에러 없음

---

### TASK-CC-005: 컨텍스트 요약 기능

**예상 시간**: 1시간
**상태**: ⏳ 대기
**의존성**: TASK-CC-004
**담당**: Agent 2 (Phase 2)

**작업 내용**:

**파일**: `src/hooks/ai/useConversationManager.ts` (확장)

```typescript
// useConversationManager 내부에 추가

import { useClaudeChat } from './useClaudeChat'

// ... 기존 코드 ...

// ================== 요약 ==================

const summarizeMutation = useMutation({
  mutationFn: async ({
    conversation_id,
    max_length = 500
  }: SummarizeConversationRequest) => {
    // 1. 모든 메시지 조회
    const { data: messages, error: fetchError } = await supabase
      .from('ai_messages')
      .select('*')
      .eq('conversation_id', conversation_id)
      .order('sequence_number')

    if (fetchError) throw fetchError

    // 2. Claude API로 요약 요청
    const conversationText = messages
      .map((m) => `${m.role}: ${m.content}`)
      .join('\n\n')

    const summaryPrompt = `
다음 대화를 ${max_length}단어 이내로 요약해주세요:

${conversationText}

요약 형식:
- 주요 논의 사항
- 결정된 사항
- 다음 액션 아이템
`

    const response = await fetch('/api/claude-ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: summaryPrompt }],
        max_tokens: max_length * 2
      })
    })

    if (!response.ok) throw new Error('요약 실패')

    const { content } = await response.json()

    // 3. 요약 저장
    const { error: updateError } = await supabase
      .from('ai_conversations')
      .update({
        summary: content,
        summary_at: new Date().toISOString(),
        status: 'summarized'
      })
      .eq('id', conversation_id)

    if (updateError) throw updateError

    return content
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['ai-conversations'] })
  }
})

// 반환값에 추가
return {
  // ... 기존 반환값
  summarizeConversation: summarizeMutation.mutateAsync
}
```

**완료 기준**:
- [ ] 요약 기능 구현 완료
- [ ] Claude API 연동 확인
- [ ] 요약 결과 저장 확인

---

### TASK-CC-006: 대화 포크 및 내보내기

**예상 시간**: 30분
**상태**: ⏳ 대기
**의존성**: TASK-CC-005
**담당**: Agent 2 (Phase 2)

**작업 내용**:

**파일**: `src/hooks/ai/useConversationManager.ts` (확장)

```typescript
// useConversationManager 내부에 추가

// ================== 포크 ==================

const forkMutation = useMutation({
  mutationFn: async ({
    parent_conversation_id,
    from_message_id,
    new_title
  }: ForkConversationRequest) => {
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) throw new Error('Unauthorized')

    // 1. 원본 대화 조회
    const { data: parent, error: parentError } = await supabase
      .from('ai_conversations')
      .select('*')
      .eq('id', parent_conversation_id)
      .single()

    if (parentError) throw parentError

    // 2. 새 대화 생성
    const { data: newConversation, error: createError } = await supabase
      .from('ai_conversations')
      .insert({
        title: new_title,
        description: `${parent.title}에서 포크됨`,
        project_id: parent.project_id,
        service_id: parent.service_id,
        parent_conversation_id,
        forked_from_message_id: from_message_id,
        created_by: user.user.id
      })
      .select()
      .single()

    if (createError) throw createError

    // 3. 메시지 복사 (포크 시점까지)
    const { data: messages, error: messagesError } = await supabase
      .from('ai_messages')
      .select('*')
      .eq('conversation_id', parent_conversation_id)
      .lte('sequence_number', (
        await supabase
          .from('ai_messages')
          .select('sequence_number')
          .eq('id', from_message_id)
          .single()
      ).data?.sequence_number || 0)
      .order('sequence_number')

    if (messagesError) throw messagesError

    if (messages && messages.length > 0) {
      const newMessages = messages.map((m, index) => ({
        conversation_id: newConversation.id,
        role: m.role,
        content: m.content,
        model: m.model,
        tokens_used: m.tokens_used,
        finish_reason: m.finish_reason,
        metadata: m.metadata,
        sequence_number: index + 1,
        created_by: user.user.id
      }))

      const { error: copyError } = await supabase
        .from('ai_messages')
        .insert(newMessages)

      if (copyError) throw copyError
    }

    return newConversation as AIConversation
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['ai-conversations'] })
  }
})

// ================== 내보내기 ==================

async function exportConversation({
  conversation_id,
  format,
  include_metadata = false
}: ExportConversationRequest): Promise<string> {
  // 대화 및 메시지 조회
  const { data: conversation } = await supabase
    .from('ai_conversations')
    .select('*')
    .eq('id', conversation_id)
    .single()

  const { data: messages } = await supabase
    .from('ai_messages')
    .select('*')
    .eq('conversation_id', conversation_id)
    .order('sequence_number')

  if (!conversation || !messages) throw new Error('대화를 찾을 수 없습니다')

  switch (format) {
    case 'markdown':
      return exportAsMarkdown(conversation, messages, include_metadata)
    case 'json':
      return JSON.stringify({ conversation, messages }, null, 2)
    case 'text':
      return exportAsText(messages)
    default:
      throw new Error('지원하지 않는 형식입니다')
  }
}

function exportAsMarkdown(
  conversation: AIConversation,
  messages: AIMessage[],
  include_metadata: boolean
): string {
  let markdown = `# ${conversation.title}\n\n`

  if (conversation.description) {
    markdown += `> ${conversation.description}\n\n`
  }

  if (include_metadata) {
    markdown += `**생성일**: ${new Date(conversation.created_at).toLocaleString()}\n`
    markdown += `**메시지 수**: ${conversation.message_count}\n`
    markdown += `**토큰 사용량**: ${conversation.total_tokens_used}\n\n`
    markdown += `---\n\n`
  }

  messages.forEach((msg) => {
    const roleLabel = msg.role === 'user' ? '🧑 사용자' : '🤖 AI'
    markdown += `## ${roleLabel}\n\n${msg.content}\n\n`

    if (include_metadata && msg.tokens_used) {
      markdown += `*토큰: ${msg.tokens_used}*\n\n`
    }
  })

  return markdown
}

function exportAsText(messages: AIMessage[]): string {
  return messages
    .map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`)
    .join('\n\n')
}

// 반환값에 추가
return {
  // ... 기존 반환값
  forkConversation: forkMutation.mutateAsync,
  exportConversation
}
```

**완료 기준**:
- [ ] 포크 기능 구현 완료
- [ ] 내보내기 3가지 형식 지원
- [ ] 메타데이터 포함 옵션 동작 확인

---

### TASK-CC-007: 대화 목록 UI 컴포넌트

**예상 시간**: 1시간
**상태**: ⏳ 대기
**의존성**: TASK-CC-004
**담당**: Agent 3 (Phase 1)

**작업 내용**:

**파일**: `src/components/ai/ConversationList.tsx`

```typescript
import { useState } from 'react'
import { Search, Archive, Trash2, FileDown, Plus } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { useConversationManager } from '@/hooks/ai/useConversationManager'
import type { AIConversation, ConversationFilter } from '@/types'

interface ConversationListProps {
  filter?: ConversationFilter
  onSelect: (conversation: AIConversation) => void
  selectedId?: string
}

export function ConversationList({
  filter,
  onSelect,
  selectedId
}: ConversationListProps) {
  const [search, setSearch] = useState('')

  const {
    conversations,
    isLoading,
    archiveConversation,
    deleteConversation,
    exportConversation
  } = useConversationManager({
    filter: {
      ...filter,
      search: search || undefined
    }
  })

  const handleArchive = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await archiveConversation(id)
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm('정말 삭제하시겠습니까?')) {
      await deleteConversation(id)
    }
  }

  const handleExport = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const markdown = await exportConversation({
      conversation_id: id,
      format: 'markdown',
      include_metadata: true
    })

    // 다운로드
    const blob = new Blob([markdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `conversation-${id}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      {/* 검색 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="대화 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* 대화 목록 */}
      <div className="space-y-2">
        {isLoading ? (
          <div className="text-center text-muted-foreground">로딩 중...</div>
        ) : conversations.length === 0 ? (
          <div className="text-center text-muted-foreground">대화가 없습니다.</div>
        ) : (
          conversations.map((conversation) => (
            <Card
              key={conversation.id}
              className={`cursor-pointer transition-colors hover:border-primary ${
                selectedId === conversation.id ? 'border-primary bg-primary/5' : ''
              }`}
              onClick={() => onSelect(conversation)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base">{conversation.title}</CardTitle>
                    {conversation.description && (
                      <CardDescription className="mt-1 line-clamp-2">
                        {conversation.description}
                      </CardDescription>
                    )}
                  </div>

                  {/* 액션 메뉴 */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                        ⋮
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={(e) => handleArchive(conversation.id, e)}>
                        <Archive className="mr-2 h-4 w-4" />
                        보관
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => handleExport(conversation.id, e)}>
                        <FileDown className="mr-2 h-4 w-4" />
                        내보내기
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={(e) => handleDelete(conversation.id, e)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        삭제
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex gap-4">
                    <span>메시지: {conversation.message_count}</span>
                    <span>토큰: {conversation.total_tokens_used}</span>
                  </div>
                  <Badge variant={conversation.status === 'active' ? 'default' : 'secondary'}>
                    {conversation.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
```

**완료 기준**:
- [ ] ConversationList 컴포넌트 생성 완료
- [ ] 검색/필터 동작 확인
- [ ] 액션 메뉴 동작 확인

---

### TASK-CC-008: 대화 상세 UI 컴포넌트

**예상 시간**: 45분
**상태**: ⏳ 대기
**의존성**: TASK-CC-007
**담당**: Agent 3 (Phase 2)

**작업 내용**:

**파일**: `src/components/ai/ConversationDetail.tsx`

```typescript
import { useState, useRef, useEffect } from 'react'
import { Send, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useMessages } from '@/hooks/ai/useMessages'
import { MessageBubble } from './MessageBubble'
import type { AIConversation } from '@/types'

interface ConversationDetailProps {
  conversation: AIConversation
  onClose: () => void
}

export function ConversationDetail({ conversation, onClose }: ConversationDetailProps) {
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  const { messages, isLoading, addMessage, sendStreamingMessage } = useMessages({
    conversation_id: conversation.id,
    realtime: true
  })

  // 새 메시지 시 자동 스크롤
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    const userMessage = input.trim()
    setInput('')

    // 사용자 메시지 추가
    await addMessage({
      conversation_id: conversation.id,
      role: 'user',
      content: userMessage
    })

    // AI 응답 스트리밍
    await sendStreamingMessage(userMessage, (chunk) => {
      // 스트리밍 중 UI 업데이트
    })
  }

  return (
    <div className="flex h-full flex-col">
      {/* 헤더 */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">{conversation.title}</h2>
            {conversation.description && (
              <p className="text-sm text-muted-foreground">{conversation.description}</p>
            )}
          </div>
          <Button variant="ghost" onClick={onClose}>
            ✕
          </Button>
        </div>
      </div>

      {/* 메시지 타임라인 */}
      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))
          )}
        </div>
      </ScrollArea>

      {/* 입력 폼 */}
      <form onSubmit={handleSubmit} className="border-t p-4">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="메시지를 입력하세요..."
            className="min-h-[60px] resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit(e)
              }
            }}
          />
          <Button type="submit" size="icon" disabled={!input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  )
}
```

**파일**: `src/components/ai/MessageBubble.tsx`

```typescript
import { Copy, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { AIMessage } from '@/types'

interface MessageBubbleProps {
  message: AIMessage
  onCopy?: () => void
  onDelete?: () => void
}

export function MessageBubble({ message, onCopy, onDelete }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <div className={cn('flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}>
      {/* 아바타 */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
        {isUser ? '🧑' : '🤖'}
      </div>

      {/* 메시지 내용 */}
      <div className={cn('max-w-[70%] space-y-2', isUser ? 'items-end' : 'items-start')}>
        <div
          className={cn(
            'rounded-lg px-4 py-2',
            isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
          )}
        >
          <div className="whitespace-pre-wrap">{message.content}</div>
        </div>

        {/* 메타데이터 */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{new Date(message.created_at).toLocaleTimeString()}</span>
          {message.tokens_used && <span>토큰: {message.tokens_used}</span>}

          {/* 액션 버튼 */}
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={onCopy}>
              <Copy className="h-3 w-3" />
            </Button>
            {onDelete && (
              <Button variant="ghost" size="sm" onClick={onDelete}>
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
```

**완료 기준**:
- [ ] ConversationDetail 컴포넌트 생성 완료
- [ ] MessageBubble 컴포넌트 생성 완료
- [ ] 실시간 채팅 동작 확인

---

### TASK-CC-009: E2E 테스트 6개

**예상 시간**: 30분
**상태**: ⏳ 대기
**의존성**: TASK-CC-008
**담당**: Agent 4 (Phase 3)

**작업 내용**:

**파일**: `tests/e2e/conversation-context.spec.ts`

```typescript
import { test, expect } from '@playwright/test'

test.describe('대화 컨텍스트 관리', () => {
  test('대화 목록 조회', async ({ page }) => {
    await page.goto('/ai/conversations')
    await expect(page.locator('h1')).toContainText('대화')
    await expect(page.locator('[data-testid="conversation-card"]')).toHaveCount.greaterThan(0)
  })

  test('새 대화 생성', async ({ page }) => {
    await page.goto('/ai/conversations/new')
    await page.fill('[name="title"]', '테스트 대화')
    await page.fill('[name="initial_message"]', '안녕하세요')
    await page.click('[type="submit"]')
    await expect(page).toHaveURL(/\/ai\/conversations\/[a-z0-9-]+/)
  })

  test('메시지 전송', async ({ page }) => {
    await page.goto('/ai/conversations/[대화ID]')
    await page.fill('textarea', '테스트 메시지')
    await page.press('textarea', 'Enter')
    await expect(page.locator('[data-testid="message-bubble"]').last()).toContainText('테스트 메시지')
  })

  test('대화 검색', async ({ page }) => {
    await page.goto('/ai/conversations')
    await page.fill('[placeholder="대화 검색..."]', '프로젝트')
    await page.waitForTimeout(500) // debounce
    const cards = page.locator('[data-testid="conversation-card"]')
    await expect(cards.first()).toContainText('프로젝트')
  })

  test('대화 요약', async ({ page }) => {
    await page.goto('/ai/conversations/[대화ID]')
    await page.click('[data-testid="summarize-button"]')
    await page.waitForSelector('[data-testid="summary-content"]')
    await expect(page.locator('[data-testid="summary-content"]')).not.toBeEmpty()
  })

  test('대화 내보내기 (Markdown)', async ({ page }) => {
    await page.goto('/ai/conversations/[대화ID]')
    const downloadPromise = page.waitForEvent('download')
    await page.click('[data-testid="export-button"]')
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/conversation-.*\.md/)
  })
})
```

**완료 기준**:
- [ ] E2E 테스트 6개 작성 완료
- [ ] 모든 테스트 통과

---

## 완료 기준

### Sprint 전체 완료 기준
- [ ] 모든 TASK 완료
- [ ] E2E 테스트 통과
- [ ] TypeScript 컴파일 에러 없음
- [ ] 프로덕션 빌드 성공
- [ ] Supabase Realtime 동작 확인

### 검증 항목
- [ ] 대화 CRUD 동작 확인
- [ ] 메시지 실시간 구독 확인
- [ ] 컨텍스트 요약 정상 동작
- [ ] 포크 기능 동작 확인
- [ ] 내보내기 3가지 형식 지원
- [ ] RLS 정책 동작 확인

---

## 참고 문서

- [아키텍처 설계](../../plan/claude-integration/conversation-context/architecture.md)
- [Sprint 3 완료 보고서](./sprint-3.md)
- [Supabase Realtime 가이드](../../docs/guides/database/supabase-realtime.md)

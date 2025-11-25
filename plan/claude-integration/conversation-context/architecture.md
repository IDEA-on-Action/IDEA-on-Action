# 대화 컨텍스트 관리 시스템 아키텍처

> Claude AI 통합을 위한 대화 이력 저장 및 컨텍스트 관리 시스템

**작성일**: 2025-11-25
**버전**: 1.0.0
**상태**: Draft
**관련 명세**: [spec/claude-integration/requirements.md](../../../spec/claude-integration/requirements.md)
**관련 스프린트**: [tasks/claude-integration/sprint-4.md](../../../tasks/claude-integration/sprint-4.md)

---

## 1. 시스템 개요

대화 컨텍스트 관리 시스템은 사용자와 Claude AI 간의 대화 이력을 저장하고, 컨텍스트를 효율적으로 관리하여 연속적인 대화 흐름을 지원합니다.

### 핵심 기능

1. **대화 세션 관리**: 프로젝트별 대화 세션 생성 및 관리
2. **메시지 이력 저장**: 사용자/AI 메시지 영구 저장
3. **컨텍스트 요약**: 긴 대화를 자동 요약하여 토큰 절약
4. **대화 포크**: 특정 시점에서 새로운 대화 분기 생성
5. **대화 내보내기**: Markdown/JSON 형식 내보내기
6. **검색 및 필터**: 대화 이력 전체 검색

---

## 2. 시스템 아키텍처

```
+========================================================================+
|                  대화 컨텍스트 관리 시스템 아키텍처                      |
+========================================================================+
|                                                                         |
|  +-----------------------------------------------------------------+   |
|  |                     Frontend Layer (React)                       |   |
|  |                                                                  |   |
|  |  +-------------------+  +----------------------+                |   |
|  |  | ConversationList  |  | ConversationDetail   |                |   |
|  |  | - 대화 목록        |  | - 메시지 뷰어         |                |   |
|  |  | - 검색 / 필터      |  | - 실시간 채팅         |                |   |
|  |  | - 정렬             |  | - 컨텍스트 요약       |                |   |
|  |  +--------+----------+  +-----------+----------+                |   |
|  |           |                         |                           |   |
|  |           +------------+------------+                           |   |
|  |                        v                                        |   |
|  |  +---------------------------------------------------+          |   |
|  |  |         React Hooks Layer                          |          |   |
|  |  |                                                    |          |   |
|  |  |  +--------------------+  +--------------------+   |          |   |
|  |  |  | useConversation    |  | useMessages        |   |          |   |
|  |  |  | Manager            |  | - 메시지 CRUD      |   |          |   |
|  |  |  | - 대화 생성/삭제   |  | - 실시간 구독      |   |          |   |
|  |  |  | - 요약             |  | - 스트리밍         |   |          |   |
|  |  |  | - 포크/내보내기    |  +--------------------+   |          |   |
|  |  |  +--------------------+                          |          |   |
|  |  +-------------------------+----------------------+          |   |
|  +----------------------------|---------------------------------+   |
|                               |                                      |
|                               | Supabase SDK + Realtime              |
|                               v                                      |
|  +-------------------------------------------------------------------+
|  |                    Database Layer (PostgreSQL)                     |
|  |                                                                    |
|  |  +--------------------------+  +-----------------------------+   |
|  |  | ai_conversations         |  | ai_messages                  |   |
|  |  | - 대화 세션 메타데이터   |  | - 개별 메시지                 |   |
|  |  | - 제목, 프로젝트 연결    |  | - 역할 (user/assistant)       |   |
|  |  | - 요약, 상태             |  | - 내용, 토큰, 메타데이터      |   |
|  |  +--------------------------+  +-----------------------------+   |
|  |                                                                    |
|  |  +----------------------------------------------------------+     |
|  |  |                    RLS 정책                               |     |
|  |  |                                                           |     |
|  |  |  - SELECT: created_by=current_user                       |     |
|  |  |  - INSERT: created_by=current_user                       |     |
|  |  |  - UPDATE: created_by=current_user                       |     |
|  |  |  - DELETE: created_by=current_user                       |     |
|  |  +----------------------------------------------------------+     |
|  +-------------------------------------------------------------------+
|                                                                         |
+========================================================================+
```

---

## 3. 데이터베이스 스키마

### 3.1 ai_conversations 테이블

```sql
CREATE TABLE ai_conversations (
  -- 기본 식별자
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 대화 메타데이터
  title TEXT NOT NULL,
  description TEXT,

  -- 프로젝트 연결 (선택)
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  service_id TEXT, -- 'minu-find', 'minu-frame', 등

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
  created_by UUID NOT NULL REFERENCES auth.users,

  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_at TIMESTAMPTZ
);

-- 인덱스
CREATE INDEX idx_ai_conversations_created_by ON ai_conversations(created_by);
CREATE INDEX idx_ai_conversations_project_id ON ai_conversations(project_id);
CREATE INDEX idx_ai_conversations_service_id ON ai_conversations(service_id);
CREATE INDEX idx_ai_conversations_status ON ai_conversations(status);
CREATE INDEX idx_ai_conversations_last_message_at ON ai_conversations(last_message_at DESC);

-- updated_at 자동 업데이트 트리거
CREATE TRIGGER update_ai_conversations_updated_at
BEFORE UPDATE ON ai_conversations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

### 3.2 ai_messages 테이블

```sql
CREATE TABLE ai_messages (
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
  finish_reason TEXT,
  -- 'end_turn', 'max_tokens', 'stop_sequence'

  -- 추가 메타데이터
  metadata JSONB DEFAULT '{}',
  -- { "template_id": "...", "variables": {...}, "attachments": [...] }

  -- 순서
  sequence_number INTEGER NOT NULL,

  -- 소유권
  created_by UUID NOT NULL REFERENCES auth.users,

  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_ai_messages_conversation_id ON ai_messages(conversation_id);
CREATE INDEX idx_ai_messages_created_by ON ai_messages(created_by);
CREATE INDEX idx_ai_messages_role ON ai_messages(role);
CREATE INDEX idx_ai_messages_sequence_number ON ai_messages(conversation_id, sequence_number);

-- 복합 인덱스 (대화별 메시지 정렬)
CREATE UNIQUE INDEX idx_ai_messages_conversation_sequence
ON ai_messages(conversation_id, sequence_number);

-- Full-Text Search 인덱스
CREATE INDEX idx_ai_messages_content_fts
ON ai_messages
USING GIN (to_tsvector('korean', content));
```

### 3.3 자동 통계 업데이트 트리거

```sql
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
```

---

## 4. TypeScript 타입 정의

### 4.1 conversation.types.ts

```typescript
// src/types/conversation.types.ts

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

---

## 5. React 훅 설계

### 5.1 useConversationManager

**파일**: `src/hooks/ai/useConversationManager.ts`

```typescript
interface UseConversationManagerOptions {
  filter?: ConversationFilter
  sortOptions?: ConversationSortOptions
  enabled?: boolean
}

interface UseConversationManagerReturn {
  conversations: AIConversation[]
  isLoading: boolean
  error: Error | null

  // CRUD 작업
  createConversation: (data: CreateConversationRequest) => Promise<AIConversation>
  updateConversation: (id: string, data: Partial<AIConversation>) => Promise<AIConversation>
  deleteConversation: (id: string) => Promise<void>
  archiveConversation: (id: string) => Promise<void>

  // 컨텍스트 관리
  summarizeConversation: (request: SummarizeConversationRequest) => Promise<string>
  forkConversation: (request: ForkConversationRequest) => Promise<AIConversation>

  // 내보내기
  exportConversation: (request: ExportConversationRequest) => Promise<string>

  // 검색
  searchConversations: (query: string) => Promise<AIConversation[]>
}
```

### 5.2 useMessages

**파일**: `src/hooks/ai/useMessages.ts`

```typescript
interface UseMessagesOptions {
  conversation_id: string
  enabled?: boolean
  realtime?: boolean // Supabase Realtime 구독
}

interface UseMessagesReturn {
  messages: AIMessage[]
  isLoading: boolean
  error: Error | null

  // CRUD 작업
  addMessage: (data: CreateMessageRequest) => Promise<AIMessage>
  deleteMessage: (id: string) => Promise<void>

  // 스트리밍
  sendStreamingMessage: (
    content: string,
    onChunk: (chunk: string) => void
  ) => Promise<AIMessage>

  // 컨텍스트 구성
  getContextMessages: (limit?: number) => AIMessage[]
  getTotalTokens: () => number

  // Realtime 구독
  subscribeToMessages: () => () => void
}
```

---

## 6. UI 컴포넌트 설계

### 6.1 ConversationList

**경로**: `src/components/ai/ConversationList.tsx`

```typescript
interface ConversationListProps {
  filter?: ConversationFilter
  onSelect: (conversation: AIConversation) => void
  selectedId?: string
}

// 기능:
// - 대화 목록 (카드 뷰)
// - 검색 (제목, 내용)
// - 필터 (상태, 서비스, 프로젝트)
// - 정렬 (최근 메시지순, 생성순, 메시지 수)
// - 페이지네이션
// - 컨텍스트 메뉴 (보관, 삭제, 내보내기)
```

### 6.2 ConversationDetail

**경로**: `src/components/ai/ConversationDetail.tsx`

```typescript
interface ConversationDetailProps {
  conversation: AIConversation
  onClose: () => void
}

// 기능:
// - 메시지 타임라인 (스크롤 가능)
// - 실시간 채팅 입력
// - 코드 하이라이팅 (메시지 내 코드 블록)
// - 메시지 복사/삭제
// - 대화 요약 버튼
// - 포크 버튼 (특정 메시지부터 분기)
// - 내보내기 버튼
```

### 6.3 MessageBubble

**경로**: `src/components/ai/MessageBubble.tsx`

```typescript
interface MessageBubbleProps {
  message: AIMessage
  onCopy: () => void
  onDelete: () => void
  onFork?: () => void
}

// 기능:
// - 역할별 스타일 (user: 오른쪽, assistant: 왼쪽)
// - Markdown 렌더링
// - 코드 하이라이팅 (Prism.js)
// - 첨부파일 미리보기 (이미지, 문서)
// - 토큰 사용량 표시 (assistant 메시지)
// - 타임스탬프 표시
```

---

## 7. RLS (Row Level Security) 정책

### 7.1 ai_conversations RLS

```sql
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
```

### 7.2 ai_messages RLS

```sql
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

-- 업데이트: 금지 (메시지는 불변)
-- (필요 시 metadata만 업데이트 허용 가능)

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
```

---

## 8. 컨텍스트 요약 전략

### 8.1 요약 트리거

대화가 다음 조건 중 하나를 만족하면 자동 요약:
1. 메시지 수 > 50개
2. 총 토큰 > 10,000 토큰
3. 사용자 수동 요청

### 8.2 요약 알고리즘

```typescript
/**
 * 대화 요약 생성
 */
async function summarizeConversation(
  conversation_id: string,
  max_length: number = 500
): Promise<string> {
  // 1. 모든 메시지 조회
  const messages = await getMessages(conversation_id)

  // 2. Claude API로 요약 요청
  const summaryPrompt = `
다음 대화를 ${max_length}단어 이내로 요약해주세요:

${messages.map(m => `${m.role}: ${m.content}`).join('\n\n')}

요약 형식:
- 주요 논의 사항
- 결정된 사항
- 다음 액션 아이템
`

  const summary = await callClaudeAPI({
    messages: [{ role: 'user', content: summaryPrompt }],
    max_tokens: max_length * 2
  })

  // 3. 요약 저장
  await updateConversation(conversation_id, {
    summary: summary.content,
    summary_at: new Date().toISOString(),
    status: 'summarized'
  })

  return summary.content
}
```

### 8.3 컨텍스트 윈도우 관리

```typescript
/**
 * 컨텍스트 메시지 구성 (토큰 제한 고려)
 */
function getContextMessages(
  messages: AIMessage[],
  max_tokens: number = 8000
): AIMessage[] {
  let totalTokens = 0
  const contextMessages: AIMessage[] = []

  // 최신 메시지부터 역순으로 추가
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]
    const msgTokens = estimateTokens(msg.content)

    if (totalTokens + msgTokens > max_tokens) {
      break
    }

    contextMessages.unshift(msg)
    totalTokens += msgTokens
  }

  return contextMessages
}

/**
 * 토큰 수 추정 (간이 계산)
 */
function estimateTokens(text: string): number {
  // 영어: 1 토큰 ≈ 4 글자
  // 한글: 1 토큰 ≈ 2 글자 (보수적 추정)
  const koreanChars = (text.match(/[가-힣]/g) || []).length
  const otherChars = text.length - koreanChars
  return Math.ceil((koreanChars / 2) + (otherChars / 4))
}
```

---

## 9. Supabase Realtime 통합

### 9.1 메시지 실시간 구독

```typescript
/**
 * 대화 메시지 실시간 구독
 */
function subscribeToMessages(
  conversation_id: string,
  onNewMessage: (message: AIMessage) => void
) {
  const channel = supabase
    .channel(`conversation:${conversation_id}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'ai_messages',
        filter: `conversation_id=eq.${conversation_id}`
      },
      (payload) => {
        onNewMessage(payload.new as AIMessage)
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}
```

---

## 10. 성능 최적화

### 10.1 메시지 페이지네이션

- **초기 로드**: 최신 50개 메시지
- **무한 스크롤**: 위로 스크롤 시 이전 메시지 로드
- **Virtual Scrolling**: react-window로 긴 대화 렌더링 최적화

### 10.2 캐싱 전략

- **React Query 캐싱**: 대화 목록 5분 캐시
- **메시지 캐싱**: 대화별 메시지 무한 캐시 (Realtime 업데이트)
- **요약 캐싱**: 요약 결과 영구 저장

---

## 11. 보안 고려사항

1. **XSS 방지**: 메시지 내용 sanitize (DOMPurify)
2. **SQL Injection 방지**: Prepared Statements 사용
3. **Rate Limiting**: 메시지 전송 제한 (분당 30개)
4. **컨텐츠 검열**: 민감한 정보 자동 감지 및 경고
5. **권한 검증**: RLS로 대화 소유권 확인

---

## 12. 미래 확장 포인트

### Phase 2 (향후 계획)

#### 12.1 협업 대화
- **다중 사용자 대화**: 팀원 초대 및 공동 작업
- **실시간 타이핑 인디케이터**: "OOO님이 입력 중..."
- **멘션 기능**: @사용자명 알림

#### 12.2 고급 컨텍스트 관리
- **자동 토픽 감지**: 대화 주제 자동 분류
- **컨텍스트 링크**: 관련 문서/코드 자동 연결
- **스마트 요약**: 중요 메시지 자동 하이라이트

#### 12.3 분석 및 인사이트
- **대화 분석**: 토픽 트렌드, 자주 묻는 질문
- **사용 패턴**: 시간대별 사용량, 인기 프롬프트
- **비용 분석**: 토큰 사용량 대시보드

#### 12.4 멀티모달 지원
- **이미지 첨부**: 스크린샷 분석 (Vision API)
- **파일 업로드**: 문서 분석 (PDF, Word, Excel)
- **음성 입력**: 음성-텍스트 변환 (Whisper API)

#### 12.5 통합 기능
- **슬랙 연동**: 대화 내용 슬랙 채널에 공유
- **GitHub 연동**: 코드 리뷰 자동 생성
- **Jira 연동**: 티켓 자동 생성

---

## 13. 데이터 마이그레이션 전략

### 13.1 기존 대화 데이터 이전
- 기존 `claude_usage_logs` 테이블에서 메시지 추출
- 대화 세션 자동 그룹핑 (시간 기준)
- 사용자별 소유권 자동 할당

### 13.2 백워드 호환성
- 기존 `useClaudeChat` 훅은 유지
- 내부적으로 `ai_conversations`/`ai_messages` 사용
- 점진적 마이그레이션 (단계적 롤아웃)

---

## 14. 참고 문서

- [Claude Integration 전체 아키텍처](../architecture.md)
- [Sprint 4 작업 계획](../../../tasks/claude-integration/sprint-4.md)
- [Prompt Templates 아키텍처](../prompt-templates/architecture.md)
- [Supabase Realtime 가이드](../../../docs/guides/database/supabase-realtime.md)
- [React Query 최적화 가이드](../../../docs/guides/performance/react-query.md)

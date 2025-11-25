# 대화 컨텍스트 관리 UI 컴포넌트 가이드

> Claude와의 대화 세션을 관리하는 UI 컴포넌트 사용 가이드

**작성일**: 2025-11-25
**버전**: 1.0.0
**관련 TASK**: CC-007, CC-008

---

## 📋 개요

대화 컨텍스트 관리 UI는 Claude와의 대화 세션을 효율적으로 관리하기 위한 2개의 핵심 컴포넌트로 구성됩니다:

1. **ConversationList**: 대화 세션 목록 (필터링, 정렬, 액션)
2. **ConversationDetail**: 대화 메시지 뷰 (채팅 UI, 입력, 요약)

---

## 🎨 컴포넌트 구조

### 1. ConversationList

대화 세션 목록을 표시하고 관리하는 컴포넌트입니다.

#### Props

```typescript
interface ConversationListProps {
  /** 대화 세션 목록 */
  conversations?: ConversationSessionWithStats[];
  /** 현재 선택된 대화 ID */
  selectedConversationId?: string;
  /** 대화 선택 핸들러 */
  onSelectConversation?: (id: string) => void;
  /** 새 대화 시작 핸들러 */
  onNewConversation?: () => void;
  /** 로딩 상태 */
  isLoading?: boolean;
  /** 필터 (active/archived) */
  filter?: ConversationStatus;
  /** 필터 변경 핸들러 */
  onFilterChange?: (filter: ConversationStatus) => void;
}
```

#### 주요 기능

- ✅ **탭 기반 필터링**: 활성/보관 대화 분리
- ✅ **최근 활동순 정렬**: 마지막 업데이트 시각 기준
- ✅ **메타데이터 표시**: 메시지 수, 토큰 사용량, 경과 시간
- ✅ **인라인 액션**: 포크, 아카이브, 삭제 (드롭다운 메뉴)
- ✅ **선택 상태 표시**: 현재 선택된 대화 하이라이트
- ✅ **빈 상태 처리**: 대화가 없을 때 안내 메시지

#### 사용 예제

```tsx
import { ConversationList } from '@/components/ai';

function MyPage() {
  const [selectedId, setSelectedId] = useState<string>();

  return (
    <ConversationList
      conversations={conversations}
      selectedConversationId={selectedId}
      onSelectConversation={setSelectedId}
      onNewConversation={() => console.log('새 대화')}
      filter="active"
      onFilterChange={(filter) => console.log(filter)}
    />
  );
}
```

---

### 2. ConversationDetail

대화 메시지를 표시하고 새 메시지를 입력하는 컴포넌트입니다.

#### Props

```typescript
interface ConversationDetailProps {
  /** 대화 세션 */
  conversation: ConversationSession | null;
  /** 메시지 목록 */
  messages: ConversationMessage[];
  /** 로딩 상태 */
  isLoading?: boolean;
  /** 전송 중 상태 */
  isSending?: boolean;
  /** 메시지 전송 핸들러 */
  onSendMessage?: (content: string) => Promise<void>;
  /** 포크 핸들러 */
  onFork?: () => void;
  /** 내보내기 핸들러 */
  onExport?: (format: 'markdown' | 'json' | 'html') => void;
  /** 요약 생성 핸들러 */
  onCreateSummary?: () => void;
}
```

#### 주요 기능

- ✅ **채팅 UI**: User/Assistant 메시지 구분 표시
- ✅ **메시지 입력**: Textarea + 전송 버튼 (Enter/Shift+Enter 지원)
- ✅ **자동 스크롤**: 새 메시지 추가 시 하단으로 이동
- ✅ **메시지 복사**: 각 메시지 복사 버튼 (클립보드)
- ✅ **포크/내보내기**: 헤더 액션 버튼
- ✅ **컨텍스트 요약 권장**: 메시지 10개 이상일 때 알림
- ✅ **로딩/전송 상태**: 스켈레톤 UI 및 전송 중 표시

#### 사용 예제

```tsx
import { ConversationDetail } from '@/components/ai';

function MyPage() {
  const [isSending, setIsSending] = useState(false);

  const handleSend = async (content: string) => {
    setIsSending(true);
    await sendToClaudeAPI(content);
    setIsSending(false);
  };

  return (
    <ConversationDetail
      conversation={currentConversation}
      messages={messages}
      isSending={isSending}
      onSendMessage={handleSend}
      onFork={() => forkConversation(conversationId)}
      onExport={(format) => exportConversation(conversationId, format)}
      onCreateSummary={() => summarizeContext(conversationId)}
    />
  );
}
```

---

## 🚀 전체 페이지 예제

좌측 목록 + 우측 상세 레이아웃으로 구성된 전체 페이지 예제:

```tsx
import { ConversationList, ConversationDetail } from '@/components/ai';

export function ConversationPage() {
  const [selectedId, setSelectedId] = useState<string>();
  const [filter, setFilter] = useState<ConversationStatus>('active');

  // 실제로는 useConversationManager 훅 사용
  const { conversations, conversation, messages } = useConversationManager({
    conversationId: selectedId,
    filter,
  });

  return (
    <div className="grid grid-cols-12 gap-6 h-screen p-6">
      {/* 좌측: 대화 목록 (4칸) */}
      <div className="col-span-4">
        <ConversationList
          conversations={conversations}
          selectedConversationId={selectedId}
          onSelectConversation={setSelectedId}
          onNewConversation={createNewConversation}
          filter={filter}
          onFilterChange={setFilter}
        />
      </div>

      {/* 우측: 대화 상세 (8칸) */}
      <div className="col-span-8">
        <ConversationDetail
          conversation={conversation}
          messages={messages}
          onSendMessage={sendMessage}
          onFork={forkConversation}
          onExport={exportConversation}
          onCreateSummary={summarizeContext}
        />
      </div>
    </div>
  );
}
```

---

## 🎯 주요 기능 상세

### 1. 대화 필터링

**활성 탭**:
- `status = 'active'` 인 대화만 표시
- 진행 중인 대화 관리

**보관 탭**:
- `status = 'archived'` 인 대화만 표시
- 완료되거나 더 이상 사용하지 않는 대화

### 2. 대화 포크

현재 대화를 복사하여 새로운 대화를 생성합니다.

**사용 시나리오**:
- 대화 중 다른 방향으로 분기하고 싶을 때
- 특정 시점부터 다시 시작하고 싶을 때
- A/B 테스트 (같은 컨텍스트에서 다른 프롬프트 시도)

**구현**:
```tsx
const handleFork = async () => {
  const newSession = await forkConversation({
    parentSessionId: conversation.id,
    forkFromSequence: messages.length,
    newTitle: `${conversation.title} (포크)`,
  });

  // 새 세션으로 이동
  setSelectedId(newSession.id);
};
```

### 3. 대화 내보내기

대화를 파일로 다운로드합니다.

**지원 형식**:
- **Markdown** (`.md`): 문서 작성, 공유용
- **JSON** (`.json`): 데이터 백업, 마이그레이션
- **HTML** (`.html`): 웹 페이지, 프레젠테이션

**구현**:
```tsx
const handleExport = async (format: 'markdown' | 'json' | 'html') => {
  const result = await exportToMarkdown(conversationId);

  // 파일 다운로드
  const blob = new Blob([result.content], { type: result.mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = result.filename;
  a.click();
};
```

### 4. 컨텍스트 요약

메시지가 많아지면 컨텍스트 창이 초과할 수 있습니다. 요약 기능으로 토큰을 절약하세요.

**요약 시점**:
- 메시지 10개 이상
- 토큰 50,000개 이상
- 수동 요청

**요약 타입**:
- `conversation_summary`: 전체 대화 요약
- `key_decisions`: 주요 결정사항만
- `technical_details`: 기술적 세부사항만
- `action_items`: 액션 아이템만

**구현**:
```tsx
const handleCreateSummary = async () => {
  const summary = await summarizeContext({
    sessionId: conversationId,
    summarizeBeforeSequence: messages.length - 5, // 최근 5개는 제외
  });

  console.log(`요약 생성 완료: ${summary.tokensSaved} 토큰 절약`);
};
```

---

## 🎨 스타일링 및 반응형

### 데스크톱 (lg 이상)

```tsx
<div className="grid grid-cols-12 gap-6">
  <div className="col-span-4">{/* 목록 */}</div>
  <div className="col-span-8">{/* 상세 */}</div>
</div>
```

### 태블릿/모바일

```tsx
<div className="flex flex-col gap-4">
  <div className="h-64">{/* 목록 (축소) */}</div>
  <div className="flex-1">{/* 상세 */}</div>
</div>
```

### 다크모드

모든 컴포넌트는 `dark:` 클래스를 사용하여 다크모드를 자동 지원합니다.

---

## 🔌 데이터 연동

실제 프로젝트에서는 `useConversationManager` 훅을 사용하여 Supabase와 연동합니다.

```tsx
import { useConversationManager } from '@/hooks/ai/useConversationManager';

function MyPage() {
  const {
    // 조회
    conversations,
    conversation,
    messages,

    // CRUD
    createConversation,
    updateConversation,
    archiveConversation,
    addMessage,

    // 고급 기능
    summarizeContext,
    forkConversation,
    exportToMarkdown,

    // 상태
    isLoading,
    error,
  } = useConversationManager({
    conversationId: selectedId,
    filter: 'active',
  });

  return (
    <ConversationList
      conversations={conversations}
      isLoading={isLoading}
      // ...
    />
  );
}
```

---

## 📚 관련 문서

- **타입 정의**: `src/types/conversation-context.types.ts`
- **React 훅**: `src/hooks/ai/useConversationManager.ts` (TASK CC-006)
- **데이터베이스**: `supabase/migrations/20250124000000_conversation_context.sql` (TASK CC-002)
- **Edge Functions**: `supabase/functions/conversation-context/` (TASK CC-004)
- **예제 페이지**: `src/pages/examples/ConversationContextExample.tsx`

---

## 🐛 트러블슈팅

### Q: 메시지가 업데이트되어도 스크롤이 하단으로 이동하지 않아요

A: `useEffect`의 의존성 배열에 `messages`를 포함했는지 확인하세요.

```tsx
React.useEffect(() => {
  scrollToBottom();
}, [messages]); // ✅
```

### Q: 복사 버튼이 동작하지 않아요

A: `navigator.clipboard.writeText`는 HTTPS 또는 localhost에서만 동작합니다.

### Q: 대화 목록이 비어있어요

A: `useConversationManager` 훅의 `filter` 값을 확인하세요. `archived` 대화만 있는데 `active` 필터를 사용하면 빈 목록이 표시됩니다.

---

**작성자**: Claude Code
**최종 수정**: 2025-11-25

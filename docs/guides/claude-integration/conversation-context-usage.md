# 대화 컨텍스트 관리 사용 가이드

> `useConversationManager` 훅을 사용한 대화 세션 관리 가이드

**작성일**: 2025-11-25
**버전**: 1.0.0

---

## 목차

1. [개요](#개요)
2. [기본 사용법](#기본-사용법)
3. [세션 관리](#세션-관리)
4. [메시지 관리](#메시지-관리)
5. [고급 기능](#고급-기능)
6. [예제](#예제)

---

## 개요

`useConversationManager` 훅은 Claude AI와의 대화를 DB에 저장하고 관리하는 통합 인터페이스를 제공합니다.

### 주요 기능

- **세션 CRUD**: 대화 세션 생성, 조회, 수정, 아카이브
- **메시지 관리**: 메시지 저장 및 조회, 자동 토큰 계산
- **컨텍스트 요약**: 오래된 메시지 요약으로 토큰 절약
- **대화 포크**: 특정 시점에서 대화 분기
- **Markdown 내보내기**: 대화 내용을 문서로 저장

---

## 기본 사용법

### 훅 임포트

```tsx
import { useConversationManager } from '@/hooks/useConversationManager';
```

### 기본 초기화

```tsx
function ChatPage() {
  const {
    conversations,      // 세션 목록
    conversation,       // 현재 세션
    messages,           // 메시지 목록
    createConversation, // 세션 생성
    addMessage,         // 메시지 추가
    isLoading,
    error,
  } = useConversationManager();

  // ...
}
```

### 특정 세션 로드

```tsx
function ChatPage({ sessionId }: { sessionId: string }) {
  const manager = useConversationManager(sessionId);

  // 세션과 메시지가 자동으로 로드됨
  console.log(manager.conversation); // 세션 상세
  console.log(manager.messages);     // 메시지 목록
}
```

---

## 세션 관리

### 1. 세션 목록 조회

```tsx
const { conversations, isLoading } = useConversationManager(null, {
  status: 'active',   // 활성 세션만
  limit: 20,          // 20개씩
  offset: 0,
});

conversations.map((session) => (
  <div key={session.id}>
    <h3>{session.title}</h3>
    <p>메시지 {session.messageCount}개</p>
    <p>토큰 {session.totalTokens}개</p>
  </div>
));
```

### 2. 세션 생성

```tsx
const { createConversation } = useConversationManager();

async function handleCreateSession() {
  try {
    const newSession = await createConversation({
      title: '프로젝트 기획 상담',
      systemPrompt: 'You are a helpful project manager...',
      templateId: 'template-uuid', // 선택 사항
      metadata: {
        skillType: 'rfp-generator',
      },
    });

    console.log('세션 생성됨:', newSession.id);
  } catch (err) {
    console.error('세션 생성 실패:', err);
  }
}
```

### 3. 세션 업데이트

```tsx
const { updateConversation } = useConversationManager(sessionId);

async function handleRenameSession(newTitle: string) {
  await updateConversation({
    id: sessionId,
    title: newTitle,
  });
}
```

### 4. 세션 아카이브

```tsx
const { archiveConversation } = useConversationManager();

async function handleArchive(sessionId: string) {
  await archiveConversation(sessionId);
  // 아카이브된 세션은 목록에서 숨겨짐 (status='archived')
}
```

---

## 메시지 관리

### 1. 메시지 목록 조회

```tsx
const { messages, isLoading } = useConversationManager(sessionId);

messages.map((msg) => (
  <div key={msg.id} className={msg.role}>
    <p>{msg.content}</p>
    <span>{msg.tokenCount} tokens</span>
  </div>
));
```

### 2. 메시지 추가

```tsx
const { addMessage } = useConversationManager(sessionId);

async function handleSendMessage(userInput: string) {
  // 사용자 메시지 저장
  await addMessage({
    sessionId,
    role: 'user',
    content: userInput,
  });

  // Claude API 호출 (별도 로직)
  const aiResponse = await callClaudeAPI(userInput);

  // AI 응답 저장
  await addMessage({
    sessionId,
    role: 'assistant',
    content: aiResponse.content,
    tokenCount: aiResponse.usage.output_tokens,
    model: 'claude-3-5-sonnet-20241022',
  });
}
```

### 3. 자동 토큰 계산

```tsx
// tokenCount를 제공하지 않으면 자동 추정 (1 토큰 ≈ 4 글자)
await addMessage({
  sessionId,
  role: 'user',
  content: '긴 텍스트...',
  // tokenCount 생략 → 자동 계산
});
```

---

## 고급 기능

### 1. 컨텍스트 요약

메시지가 10개 이상일 때 오래된 메시지를 요약하여 토큰을 절약합니다.

```tsx
const { summarizeContext, messages } = useConversationManager(sessionId);

// 요약 제안 표시
const shouldSuggestSummary = messages.length >= 10;

async function handleSummarize() {
  try {
    const result = await summarizeContext({
      sessionId,
      summarizeBeforeSequence: messages.length - 10, // 최근 10개는 제외
    });

    console.log('요약 생성됨:', result.summary);
    console.log('요약된 메시지:', result.summarizedCount);
    console.log('절약된 토큰:', result.tokensSaved);
  } catch (err) {
    console.error('요약 실패:', err);
  }
}
```

**UI 예제**:

```tsx
{shouldSuggestSummary && (
  <button onClick={handleSummarize}>
    메시지 {messages.length}개 요약하기 (토큰 절약)
  </button>
)}
```

### 2. 대화 포크

특정 시점에서 대화를 분기하여 다양한 시나리오를 탐색합니다.

```tsx
const { forkConversation } = useConversationManager();

async function handleFork(fromMessageSequence: number) {
  try {
    const result = await forkConversation({
      parentSessionId: sessionId,
      forkFromSequence: fromMessageSequence,
      newTitle: '대안 시나리오 1',
    });

    console.log('새 세션 생성:', result.newSession.id);
    console.log('복사된 메시지:', result.copiedMessageCount);

    // 새 세션으로 이동
    navigate(`/chat/${result.newSession.id}`);
  } catch (err) {
    console.error('포크 실패:', err);
  }
}
```

**UI 예제**:

```tsx
{messages.map((msg, index) => (
  <div key={msg.id}>
    <p>{msg.content}</p>
    <button onClick={() => handleFork(msg.sequence)}>
      여기서 분기
    </button>
  </div>
))}
```

### 3. Markdown 내보내기

대화 내용을 Markdown 파일로 다운로드합니다.

```tsx
const { exportToMarkdown } = useConversationManager(sessionId);

async function handleExport() {
  try {
    const result = await exportToMarkdown(sessionId);

    // Blob 생성 및 다운로드
    const blob = new Blob([result.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = result.filename; // conversation-xxxx-2025-11-25.md
    a.click();

    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('내보내기 실패:', err);
  }
}
```

---

## 예제

### 완전한 채팅 페이지

```tsx
import { useState } from 'react';
import { useConversationManager } from '@/hooks/useConversationManager';
import { supabase } from '@/lib/supabase';

function ChatPage({ sessionId }: { sessionId: string | null }) {
  const [input, setInput] = useState('');
  const [currentSessionId, setCurrentSessionId] = useState(sessionId);

  const {
    conversations,
    conversation,
    messages,
    createConversation,
    addMessage,
    summarizeContext,
    exportToMarkdown,
    isLoading,
    error,
  } = useConversationManager(currentSessionId);

  // 새 세션 생성
  async function handleNewSession() {
    const newSession = await createConversation({
      title: '새 대화',
    });
    setCurrentSessionId(newSession.id);
  }

  // 메시지 전송
  async function handleSendMessage() {
    if (!input.trim() || !currentSessionId) return;

    // 사용자 메시지 저장
    await addMessage({
      sessionId: currentSessionId,
      role: 'user',
      content: input,
    });

    setInput('');

    // Claude API 호출
    const { data } = await supabase.functions.invoke('claude-ai/chat', {
      body: {
        messages: [
          ...messages.map((m) => ({ role: m.role, content: m.content })),
          { role: 'user', content: input },
        ],
      },
    });

    if (data?.success) {
      // AI 응답 저장
      await addMessage({
        sessionId: currentSessionId,
        role: 'assistant',
        content: data.data.content,
        tokenCount: data.data.usage.output_tokens,
        model: data.data.model,
      });
    }
  }

  // 요약 제안
  const shouldSuggestSummary = messages.length >= 10;

  async function handleSummarize() {
    if (!currentSessionId) return;
    await summarizeContext({ sessionId: currentSessionId });
  }

  // 내보내기
  async function handleExport() {
    if (!currentSessionId) return;
    const result = await exportToMarkdown(currentSessionId);

    const blob = new Blob([result.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (error) {
    return <div>에러: {error.message}</div>;
  }

  return (
    <div className="chat-page">
      {/* 사이드바 - 세션 목록 */}
      <aside className="sessions-sidebar">
        <button onClick={handleNewSession}>새 대화</button>
        {conversations.map((conv) => (
          <div
            key={conv.id}
            onClick={() => setCurrentSessionId(conv.id)}
            className={conv.id === currentSessionId ? 'active' : ''}
          >
            <h4>{conv.title}</h4>
            <p>{conv.messageCount}개 메시지</p>
          </div>
        ))}
      </aside>

      {/* 메인 - 채팅 */}
      <main className="chat-main">
        {/* 헤더 */}
        <header>
          <h2>{conversation?.title || '대화 선택'}</h2>
          {currentSessionId && (
            <>
              {shouldSuggestSummary && (
                <button onClick={handleSummarize}>요약하기</button>
              )}
              <button onClick={handleExport}>내보내기</button>
            </>
          )}
        </header>

        {/* 메시지 목록 */}
        <div className="messages">
          {messages.map((msg) => (
            <div key={msg.id} className={`message message-${msg.role}`}>
              <p>{msg.content}</p>
              {msg.tokenCount && <span>{msg.tokenCount} tokens</span>}
            </div>
          ))}
        </div>

        {/* 입력 */}
        {currentSessionId && (
          <div className="input-area">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="메시지를 입력하세요..."
              disabled={isLoading}
            />
            <button onClick={handleSendMessage} disabled={isLoading}>
              전송
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export default ChatPage;
```

---

## 참고 자료

- **타입 정의**: `src/types/conversation-context.types.ts`
- **훅 구현**: `src/hooks/useConversationManager.ts`
- **요구사항 명세**: `spec/claude-integration/conversation-context/requirements.md`
- **DB 마이그레이션**: `supabase/migrations/xxx_conversation_context.sql`

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|----------|
| 1.0.0 | 2025-11-25 | 초기 작성 |

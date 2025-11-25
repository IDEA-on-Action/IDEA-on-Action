# AI 채팅 위젯 아키텍처 설계

> Claude AI 통합 - 사이트 전역 채팅 위젯 기술 설계
>
> **Stage**: Plan (계획 수립)
> **작성일**: 2025-11-25
> **담당**: Claude & 서민원

---

## 📋 개요

### 목적
AI 채팅 위젯의 기술적 아키텍처, 컴포넌트 구조, 데이터 흐름을 정의합니다.

### 설계 원칙
1. **기존 훅 재사용**: 새로운 API 호출 로직 작성하지 않고 기존 훅 활용
2. **단일 책임**: 각 컴포넌트는 하나의 역할만 수행
3. **성능 최적화**: 코드 스플리팅, 메모이제이션, Lazy Loading
4. **접근성 우선**: ARIA, 키보드 네비게이션, 스크린 리더 지원

---

## 🏗️ 컴포넌트 구조

### 컴포넌트 트리
```
App.tsx
└── AIChatWidget (Provider)
    ├── AIChatButton (플로팅 버튼)
    └── AIChatWindow (조건부 렌더링)
        ├── AIChatHeader
        │   ├── Title ("AI 어시스턴트")
        │   ├── ConversationHistoryButton
        │   └── CloseButton
        ├── AIChatMessages (메시지 목록)
        │   ├── WelcomeMessage (초기)
        │   └── AIChatMessage[] (반복)
        │       ├── Avatar (AI만)
        │       ├── Content (마크다운)
        │       └── Timestamp
        └── AIChatInput (입력 영역)
            ├── TemplateSelector (선택)
            ├── Textarea
            └── SendButton / StopButton
```

---

## 📦 컴포넌트 상세 설계

### 1. AIChatWidget (최상위 컴포넌트)

**파일**: `src/components/ai/AIChatWidget.tsx`

**책임**:
- 채팅 위젯 전역 상태 관리
- 플로팅 버튼과 채팅 창 렌더링
- 페이지 컨텍스트 추출 및 제공

**Props**: 없음 (전역 사용)

**상태**:
```typescript
interface AIChatWidgetState {
  isOpen: boolean;              // 채팅 창 열림 여부
  currentConversationId: string | null;  // 현재 대화 ID
  pageContext: PageContext;     // 페이지 컨텍스트
}

interface PageContext {
  pathname: string;             // 현재 URL 경로
  serviceId?: string;           // 서비스 ID (예: 'minu-find')
  pageTitle: string;            // 페이지 제목
  systemPrompt: string;         // 페이지별 시스템 프롬프트
}
```

**사용 훅**:
- `useLocation()` - 현재 URL 감지
- `useParams()` - 서비스 ID 추출
- `useAuth()` - 로그인 상태 확인
- `useConversationManager()` - 대화 세션 관리
- `useClaudeStreaming()` - 메시지 스트리밍
- `useEffect()` - 페이지 변경 감지

**구현 예시**:
```typescript
export function AIChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const params = useParams();
  const { user } = useAuth();

  // 페이지 컨텍스트 추출
  const pageContext = useMemo<PageContext>(() => {
    const serviceId = params.serviceId;
    const pathname = location.pathname;

    // 서비스별 시스템 프롬프트 생성
    let systemPrompt = DEFAULT_SYSTEM_PROMPT;
    if (serviceId) {
      systemPrompt = generateServiceSystemPrompt(serviceId);
    }

    return {
      pathname,
      serviceId,
      pageTitle: document.title,
      systemPrompt,
    };
  }, [location.pathname, params.serviceId]);

  return (
    <AIChatWidgetContext.Provider value={{ isOpen, setIsOpen, pageContext }}>
      <AIChatButton />
      {isOpen && <AIChatWindow />}
    </AIChatWidgetContext.Provider>
  );
}
```

---

### 2. AIChatButton (플로팅 버튼)

**파일**: `src/components/ai/AIChatButton.tsx`

**책임**:
- 플로팅 버튼 렌더링
- 클릭 시 채팅 창 열기/닫기 토글
- 새 메시지 알림 표시 (선택)

**Props**: 없음 (Context 사용)

**스타일**:
```typescript
const buttonStyles = {
  position: 'fixed',
  bottom: '20px',
  right: '20px',
  width: '60px',
  height: '60px',
  borderRadius: '50%',
  backgroundColor: 'hsl(var(--primary))',
  zIndex: 1000,

  // 모바일
  '@media (max-width: 767px)': {
    bottom: '16px',
    right: 'calc(50% - 28px)', // 중앙 정렬
    width: '56px',
    height: '56px',
  },
};
```

**구현 예시**:
```typescript
export function AIChatButton() {
  const { isOpen, setIsOpen } = useAIChatWidgetContext();

  return (
    <Button
      onClick={() => setIsOpen(!isOpen)}
      className="ai-chat-button"
      aria-label="AI 어시스턴트 열기"
      size="icon"
    >
      <MessageCircle className="h-6 w-6" />
    </Button>
  );
}
```

---

### 3. AIChatWindow (채팅 창)

**파일**: `src/components/ai/AIChatWindow.tsx`

**책임**:
- 채팅 창 레이아웃 렌더링
- 열기/닫기 애니메이션
- 스크롤 잠금 (모바일)

**Props**: 없음 (Context 사용)

**스타일**:
```typescript
const windowStyles = {
  position: 'fixed',
  bottom: '90px',
  right: '20px',
  width: '400px',
  height: '600px',
  zIndex: 1001,

  // 모바일
  '@media (max-width: 767px)': {
    inset: 0,
    width: '100%',
    height: '100%',
    bottom: 0,
    right: 0,
  },
};
```

**애니메이션**:
```typescript
// Framer Motion 또는 Tailwind animate-in 사용
const animationVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 20, scale: 0.95 },
};
```

**구현 예시**:
```typescript
export function AIChatWindow() {
  const { isOpen, setIsOpen } = useAIChatWidgetContext();

  // 모바일에서 body 스크롤 잠금
  useEffect(() => {
    if (isOpen && window.innerWidth < 768) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  return (
    <motion.div
      className="ai-chat-window"
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={animationVariants}
      transition={{ duration: 0.3 }}
    >
      <AIChatHeader />
      <AIChatMessages />
      <AIChatInput />
    </motion.div>
  );
}
```

---

### 4. AIChatHeader (헤더)

**파일**: `src/components/ai/AIChatHeader.tsx`

**책임**:
- 제목 표시
- 대화 기록 버튼 (로그인 사용자만)
- 닫기 버튼

**Props**:
```typescript
interface AIChatHeaderProps {
  onClose: () => void;
  onHistoryClick?: () => void;
}
```

**구현 예시**:
```typescript
export function AIChatHeader({ onClose, onHistoryClick }: AIChatHeaderProps) {
  const { user } = useAuth();

  return (
    <div className="ai-chat-header flex items-center justify-between p-4 border-b">
      <h2 className="text-lg font-semibold">AI 어시스턴트</h2>
      <div className="flex items-center gap-2">
        {user && onHistoryClick && (
          <Button
            onClick={onHistoryClick}
            variant="ghost"
            size="icon"
            aria-label="대화 기록"
          >
            <History className="h-5 w-5" />
          </Button>
        )}
        <Button
          onClick={onClose}
          variant="ghost"
          size="icon"
          aria-label="닫기"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
```

---

### 5. AIChatMessages (메시지 목록)

**파일**: `src/components/ai/AIChatMessages.tsx`

**책임**:
- 메시지 목록 렌더링
- 자동 스크롤 (새 메시지 추가 시)
- 무한 스크롤 (이전 메시지 로드, 선택)

**Props**:
```typescript
interface AIChatMessagesProps {
  messages: AIMessage[];
  streamingText?: string;
  isStreaming: boolean;
}
```

**사용 훅**:
- `useRef()` - 스크롤 컨테이너 참조
- `useEffect()` - 자동 스크롤
- `useIntersectionObserver()` - 무한 스크롤 (선택)

**구현 예시**:
```typescript
export function AIChatMessages({ messages, streamingText, isStreaming }: AIChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 새 메시지 추가 시 자동 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, streamingText]);

  return (
    <div className="ai-chat-messages flex-1 overflow-y-auto p-4 space-y-4" role="log">
      {messages.length === 0 && (
        <WelcomeMessage />
      )}

      {messages.map((message) => (
        <AIChatMessage key={message.id} message={message} />
      ))}

      {isStreaming && streamingText && (
        <AIChatMessage
          message={{
            role: 'assistant',
            content: streamingText,
            id: 'streaming',
            created_at: new Date().toISOString(),
          }}
          isStreaming
        />
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}
```

---

### 6. AIChatMessage (개별 메시지)

**파일**: `src/components/ai/AIChatMessage.tsx`

**책임**:
- 사용자/AI 메시지 렌더링
- 마크다운 변환
- 타임스탬프 표시

**Props**:
```typescript
interface AIChatMessageProps {
  message: AIMessage;
  isStreaming?: boolean;
}
```

**구현 예시**:
```typescript
export function AIChatMessage({ message, isStreaming }: AIChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div
      className={cn(
        'flex gap-3',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      {!isUser && (
        <Avatar className="h-8 w-8">
          <Bot className="h-5 w-5" />
        </Avatar>
      )}

      <div
        className={cn(
          'rounded-lg px-4 py-2 max-w-[80%]',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted'
        )}
      >
        {isUser ? (
          <p>{message.content}</p>
        ) : (
          <ReactMarkdown>{message.content || ''}</ReactMarkdown>
        )}

        {isStreaming && <TypingIndicator />}

        <time className="text-xs opacity-70 mt-1 block">
          {formatRelativeTime(message.created_at)}
        </time>
      </div>
    </div>
  );
}
```

---

### 7. AIChatInput (입력 영역)

**파일**: `src/components/ai/AIChatInput.tsx`

**책임**:
- 텍스트 입력 처리
- 전송 버튼 / 중지 버튼 토글
- Enter 키 전송 (Shift+Enter는 줄바꿈)

**Props**:
```typescript
interface AIChatInputProps {
  onSendMessage: (content: string) => Promise<void>;
  onStopStreaming: () => void;
  isStreaming: boolean;
  disabled?: boolean;
}
```

**사용 훅**:
- `useState()` - 입력 텍스트 상태
- `useRef()` - Textarea 참조

**구현 예시**:
```typescript
export function AIChatInput({
  onSendMessage,
  onStopStreaming,
  isStreaming,
  disabled,
}: AIChatInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming || disabled) return;

    setInput('');
    await onSendMessage(trimmed);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="ai-chat-input border-t p-4">
      <div className="flex gap-2">
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="메시지를 입력하세요..."
          aria-label="메시지 입력"
          rows={2}
          disabled={disabled}
        />

        {isStreaming ? (
          <Button
            onClick={onStopStreaming}
            variant="outline"
            size="icon"
            aria-label="중지"
          >
            <StopCircle className="h-5 w-5" />
          </Button>
        ) : (
          <Button
            onClick={handleSend}
            disabled={!input.trim() || disabled}
            size="icon"
            aria-label="전송"
          >
            <Send className="h-5 w-5" />
          </Button>
        )}
      </div>
    </div>
  );
}
```

---

## 🔄 데이터 흐름

### 메시지 전송 흐름
```
1. 사용자 입력
   └─> AIChatInput (input state)

2. Enter 또는 전송 버튼 클릭
   └─> handleSend()
       └─> onSendMessage(content)

3. AIChatWindow (부모 컴포넌트)
   └─> useClaudeStreaming.sendMessage(content, {
         systemPrompt: pageContext.systemPrompt
       })

4. Edge Function 호출
   └─> /functions/v1/claude-chat
       └─> Claude API (스트리밍)

5. 스트리밍 응답
   └─> onStreamingText 콜백
       └─> state.streamingText 업데이트
           └─> AIChatMessages 리렌더링

6. 스트리밍 완료
   └─> onComplete 콜백
       └─> useConversationManager.addMessage()
           └─> DB 저장 (로그인 사용자)
           └─> LocalStorage 저장 (비회원)
```

### 페이지 컨텍스트 흐름
```
1. 페이지 이동
   └─> useLocation() 감지

2. AIChatWidget
   └─> useMemo(() => {
         const serviceId = params.serviceId;
         const systemPrompt = generateServiceSystemPrompt(serviceId);
         return { pathname, serviceId, systemPrompt };
       }, [location, params])

3. Context 업데이트
   └─> AIChatWidgetContext.Provider

4. useClaudeStreaming 시스템 프롬프트 변경
   └─> setSystemPrompt(pageContext.systemPrompt)

5. 다음 메시지 전송 시 새로운 컨텍스트 적용
```

### 대화 기록 흐름
```
1. 로그인 사용자 + 첫 메시지 전송
   └─> useConversationManager.createConversation({
         title: "AI 어시스턴트 대화 - {날짜}",
         system_prompt: pageContext.systemPrompt,
         metadata: { service_id: pageContext.serviceId }
       })

2. 메시지 전송마다 DB 저장
   └─> useConversationManager.addMessage({
         conversation_id: currentConversationId,
         role: 'user' | 'assistant',
         content: message.content,
         token_count: usage.output_tokens
       })

3. 대화 기록 버튼 클릭
   └─> useConversationManager.conversations
       └─> ConversationList 모달 표시

4. 특정 대화 선택
   └─> useMessages(conversationId)
       └─> messages 로드
           └─> setMessages(loadedMessages)
               └─> AIChatMessages 렌더링
```

---

## 🗂️ 파일 구조

```
src/
├── components/
│   └── ai/
│       ├── AIChatWidget.tsx         (최상위 Provider)
│       ├── AIChatButton.tsx         (플로팅 버튼)
│       ├── AIChatWindow.tsx         (채팅 창)
│       ├── AIChatHeader.tsx         (헤더)
│       ├── AIChatMessages.tsx       (메시지 목록)
│       ├── AIChatMessage.tsx        (개별 메시지)
│       ├── AIChatInput.tsx          (입력 영역)
│       ├── WelcomeMessage.tsx       (환영 메시지)
│       ├── TypingIndicator.tsx      (타이핑 애니메이션)
│       └── ConversationListModal.tsx (대화 기록 모달, 선택)
│
├── hooks/
│   ├── useAIChatWidgetContext.ts    (Context 훅)
│   └── usePageContext.ts            (페이지 컨텍스트 추출 훅)
│
├── lib/
│   ├── ai-chat-utils.ts             (유틸리티 함수)
│   └── service-prompts.ts           (서비스별 시스템 프롬프트)
│
└── types/
    └── ai-chat.types.ts             (타입 정의)
```

---

## 🔧 사용 훅 및 라이브러리

### 재사용 훅
| 훅 | 위치 | 용도 |
|---|---|---|
| `useClaudeStreaming` | `src/hooks/useClaudeStreaming.ts` | 메시지 스트리밍 |
| `useConversationManager` | `src/hooks/useConversationManager.ts` | 대화 세션 CRUD |
| `useAuth` | `src/hooks/useAuth.ts` | 로그인 상태 확인 |
| `useLocation` | `react-router-dom` | 현재 URL 감지 |
| `useParams` | `react-router-dom` | URL 파라미터 추출 |

### 외부 라이브러리
| 라이브러리 | 버전 | 용도 |
|-----------|------|------|
| `react-markdown` | 최신 | 마크다운 렌더링 |
| `framer-motion` | 최신 | 애니메이션 (선택) |
| `@radix-ui/react-dialog` | 최신 | 대화 기록 모달 (선택) |
| `lucide-react` | 최신 | 아이콘 |

---

## 🎨 스타일링 전략

### Tailwind CSS 클래스
```typescript
// 플로팅 버튼
"fixed bottom-5 right-5 z-[1000] h-15 w-15 rounded-full bg-primary shadow-lg hover:bg-primary/90 transition-all md:bottom-5 md:right-5 max-md:bottom-4 max-md:right-[calc(50%-28px)]"

// 채팅 창 (데스크톱)
"fixed bottom-[90px] right-5 z-[1001] h-[600px] w-[400px] rounded-lg border bg-background shadow-xl md:block max-md:inset-0 max-md:h-full max-md:w-full max-md:rounded-none"

// 메시지 (사용자)
"ml-auto max-w-[80%] rounded-lg bg-primary px-4 py-2 text-primary-foreground"

// 메시지 (AI)
"mr-auto max-w-[80%] rounded-lg bg-muted px-4 py-2"
```

### 애니메이션
```css
/* Slide up animation */
@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.ai-chat-window {
  animation: slideUp 0.3s ease-out;
}

/* Typing indicator */
@keyframes typing {
  0%, 60%, 100% { opacity: 0.3; }
  30% { opacity: 1; }
}
```

---

## 🔐 보안 고려사항

### XSS 방지
```typescript
import DOMPurify from 'dompurify';

// 마크다운 렌더링 전 sanitize
const sanitizedContent = DOMPurify.sanitize(message.content);
```

### Rate Limiting
```typescript
// Edge Function에서 처리
// 비회원: 세션당 10개/분
// 로그인 사용자: 사용자당 100개/일
```

### 민감 정보 필터링
```typescript
// 시스템 프롬프트에 추가
const SAFETY_PROMPT = `
중요: 사용자의 비밀번호, 개인정보, 금융 정보를 절대 요청하지 마세요.
서비스 관련 질문에만 답변하세요.
`;
```

---

## 📊 성능 최적화

### 코드 스플리팅
```typescript
// Lazy Loading
const AIChatWidget = lazy(() => import('@/components/ai/AIChatWidget'));

// App.tsx
<Suspense fallback={<div>Loading...</div>}>
  <AIChatWidget />
</Suspense>
```

### 메모이제이션
```typescript
// 페이지 컨텍스트 메모이제이션
const pageContext = useMemo(() => {
  return generatePageContext(location, params);
}, [location.pathname, params.serviceId]);

// 메시지 렌더링 최적화
const MemoizedMessage = memo(AIChatMessage);
```

### Virtual Scrolling (선택)
```typescript
// 메시지가 100개 이상일 때만
import { VirtualList } from 'react-tiny-virtual-list';

<VirtualList
  height={500}
  itemCount={messages.length}
  itemSize={80}
  renderItem={({ index, style }) => (
    <div style={style}>
      <AIChatMessage message={messages[index]} />
    </div>
  )}
/>
```

---

## 🧪 테스트 전략

### 단위 테스트
```typescript
// AIChatInput.test.tsx
describe('AIChatInput', () => {
  it('Enter 키로 메시지 전송', () => {
    const onSend = vi.fn();
    render(<AIChatInput onSendMessage={onSend} />);

    const textarea = screen.getByLabelText('메시지 입력');
    fireEvent.change(textarea, { target: { value: '안녕하세요' } });
    fireEvent.keyDown(textarea, { key: 'Enter' });

    expect(onSend).toHaveBeenCalledWith('안녕하세요');
  });
});
```

### E2E 테스트
```typescript
// tests/e2e/ai/ai-chat-widget.spec.ts
test('채팅 위젯 전체 플로우', async ({ page }) => {
  await page.goto('/');

  // 플로팅 버튼 클릭
  await page.click('[aria-label="AI 어시스턴트 열기"]');

  // 채팅 창 확인
  await expect(page.locator('.ai-chat-window')).toBeVisible();

  // 메시지 전송
  await page.fill('textarea', '안녕하세요');
  await page.click('[aria-label="전송"]');

  // 응답 대기
  await expect(page.locator('text=안녕하세요')).toBeVisible();
  await expect(page.locator('[role="log"] >> text=/안녕/')).toBeVisible();
});
```

---

## 🔗 관련 문서

- **요구사항**: [../../spec/claude-integration/ai-chat-widget/requirements.md](../../spec/claude-integration/ai-chat-widget/requirements.md)
- **인수 조건**: [../../spec/claude-integration/ai-chat-widget/acceptance-criteria.md](../../spec/claude-integration/ai-chat-widget/acceptance-criteria.md)
- **작업 계획**: [../../tasks/claude-integration/ai-chat-widget/sprint-1.md](../../tasks/claude-integration/ai-chat-widget/sprint-1.md)

---

## 📝 변경 이력

| 날짜 | 작성자 | 변경 내용 |
|------|--------|-----------|
| 2025-11-25 | Claude | 초안 작성 |

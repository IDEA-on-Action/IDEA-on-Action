# AI 채팅 위젯 Sprint 1 - 작업 계획

> Claude AI 통합 - 사이트 전역 채팅 위젯 구현
>
> **Stage**: Tasks (작업 분해)
> **작성일**: 2025-11-25
> **담당**: Claude & 서민원
> **예상 소요**: 12~16시간

---

## 📋 Sprint 개요

### 목표
사이트 전역에서 사용 가능한 AI 채팅 위젯의 핵심 기능을 구현합니다.

### 범위
- 플로팅 버튼 및 채팅 창 UI
- 메시지 전송 및 스트리밍 응답
- 페이지 컨텍스트 인식
- 대화 기록 저장 (로그인 사용자)

### 제외 사항 (다음 Sprint)
- 대화 기록 모달 UI
- 프롬프트 템플릿 선택기
- 메시지 평가 및 피드백
- 무한 스크롤 (메시지 페이지네이션)

---

## 📦 작업 목록

### TASK AI-001: 타입 정의 생성
**우선순위**: P0
**예상 소요**: 1시간
**담당**: Claude
**의존성**: 없음

#### 설명
AI 채팅 위젯에 필요한 TypeScript 타입 정의를 작성합니다.

#### 산출물
- `src/types/ai-chat.types.ts`

#### 작업 내용
1. **PageContext 타입**:
   ```typescript
   interface PageContext {
     pathname: string;
     serviceId?: string;
     pageTitle: string;
     systemPrompt: string;
   }
   ```

2. **AIChatWidgetState 타입**:
   ```typescript
   interface AIChatWidgetState {
     isOpen: boolean;
     currentConversationId: string | null;
     pageContext: PageContext;
   }
   ```

3. **AIChatWidgetContextValue 타입**:
   ```typescript
   interface AIChatWidgetContextValue {
     isOpen: boolean;
     setIsOpen: (open: boolean) => void;
     pageContext: PageContext;
     currentConversationId: string | null;
     setCurrentConversationId: (id: string | null) => void;
   }
   ```

4. **컴포넌트 Props 타입**:
   - `AIChatHeaderProps`
   - `AIChatMessagesProps`
   - `AIChatMessageProps`
   - `AIChatInputProps`

#### 완료 기준
- [ ] 타입 파일 생성 완료
- [ ] 모든 타입에 JSDoc 주석 포함
- [ ] TypeScript strict mode 에러 없음
- [ ] 기존 `conversation.types.ts`와 호환

---

### TASK AI-002: 페이지 컨텍스트 유틸리티 생성
**우선순위**: P0
**예상 소요**: 1.5시간
**담당**: Claude
**의존성**: AI-001

#### 설명
현재 페이지 정보를 추출하고 서비스별 시스템 프롬프트를 생성하는 유틸리티 함수를 작성합니다.

#### 산출물
- `src/lib/service-prompts.ts`
- `src/hooks/usePageContext.ts`

#### 작업 내용
1. **서비스별 시스템 프롬프트 상수**:
   ```typescript
   // service-prompts.ts
   export const SERVICE_PROMPTS: Record<string, string> = {
     'minu-find': `당신은 Minu Find 서비스 전문가입니다.
       사용자가 시장 분석, 경쟁사 비교, 사업 기회 탐색에 대해 질문하면
       Minu Find의 Excel 생성 기능을 안내하세요.`,
     'minu-frame': `당신은 Minu Frame 서비스 전문가입니다.
       RFP 작성, 요구사항 정의서, 제안서 작성을 도와주세요.`,
     'minu-build': `당신은 Minu Build 서비스 전문가입니다.
       프로젝트 관리, 스프린트 계획, 리포트 생성을 도와주세요.`,
     'minu-keep': `당신은 Minu Keep 서비스 전문가입니다.
       운영 보고서, SLA 모니터링, 유지보수 관리를 도와주세요.`,
   };

   export const DEFAULT_SYSTEM_PROMPT = `당신은 IDEA on Action의 친절한 AI 어시스턴트입니다.
     사용자의 질문에 정확하고 도움이 되는 답변을 제공하세요.`;
   ```

2. **usePageContext 훅**:
   ```typescript
   export function usePageContext(): PageContext {
     const location = useLocation();
     const params = useParams();

     return useMemo(() => {
       const serviceId = params.serviceId;
       const pathname = location.pathname;
       const pageTitle = document.title;

       const systemPrompt = serviceId
         ? SERVICE_PROMPTS[serviceId] || DEFAULT_SYSTEM_PROMPT
         : DEFAULT_SYSTEM_PROMPT;

       return { pathname, serviceId, pageTitle, systemPrompt };
     }, [location.pathname, params.serviceId]);
   }
   ```

#### 완료 기준
- [ ] 4개 Minu 서비스 시스템 프롬프트 작성
- [ ] usePageContext 훅 구현
- [ ] JSDoc 주석 포함
- [ ] 린트 에러 없음

---

### TASK AI-003: Context Provider 생성
**우선순위**: P0
**예상 소요**: 1시간
**담당**: Claude
**의존성**: AI-001, AI-002

#### 설명
AI 채팅 위젯의 전역 상태를 관리하는 React Context Provider를 생성합니다.

#### 산출물
- `src/components/ai/AIChatWidget.tsx` (Provider만)
- `src/hooks/useAIChatWidgetContext.ts`

#### 작업 내용
1. **Context 생성**:
   ```typescript
   const AIChatWidgetContext = createContext<AIChatWidgetContextValue | null>(null);
   ```

2. **Provider 컴포넌트**:
   ```typescript
   export function AIChatWidget({ children }: { children: React.ReactNode }) {
     const [isOpen, setIsOpen] = useState(false);
     const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
     const pageContext = usePageContext();

     const value = {
       isOpen,
       setIsOpen,
       pageContext,
       currentConversationId,
       setCurrentConversationId,
     };

     return (
       <AIChatWidgetContext.Provider value={value}>
         {children}
       </AIChatWidgetContext.Provider>
     );
   }
   ```

3. **useAIChatWidgetContext 훅**:
   ```typescript
   export function useAIChatWidgetContext() {
     const context = useContext(AIChatWidgetContext);
     if (!context) {
       throw new Error('useAIChatWidgetContext must be used within AIChatWidget');
     }
     return context;
   }
   ```

#### 완료 기준
- [ ] Context Provider 생성
- [ ] Context 훅 생성
- [ ] 에러 핸들링 포함
- [ ] TypeScript 타입 안전성 확보

---

### TASK AI-004: 플로팅 버튼 컴포넌트
**우선순위**: P0
**예상 소요**: 1.5시간
**담당**: Claude
**의존성**: AI-003

#### 설명
화면 우하단에 고정되는 플로팅 버튼을 구현합니다.

#### 산출물
- `src/components/ai/AIChatButton.tsx`

#### 작업 내용
1. **버튼 컴포넌트**:
   ```typescript
   export function AIChatButton() {
     const { isOpen, setIsOpen } = useAIChatWidgetContext();

     return (
       <Button
         onClick={() => setIsOpen(!isOpen)}
         className="fixed bottom-5 right-5 z-[1000] h-15 w-15 rounded-full shadow-lg hover:scale-110 transition-transform md:bottom-5 md:right-5 max-md:bottom-4 max-md:right-[calc(50%-28px)]"
         size="icon"
         aria-label="AI 어시스턴트 열기"
       >
         <MessageCircle className="h-6 w-6" />
       </Button>
     );
   }
   ```

2. **키보드 단축키 (Alt+C)**:
   ```typescript
   useEffect(() => {
     const handleKeyDown = (e: KeyboardEvent) => {
       if (e.altKey && e.key === 'c') {
         e.preventDefault();
         setIsOpen((prev) => !prev);
       }
     };

     window.addEventListener('keydown', handleKeyDown);
     return () => window.removeEventListener('keydown', handleKeyDown);
   }, [setIsOpen]);
   ```

3. **모바일 스타일링**:
   - 데스크톱: `bottom-5 right-5`
   - 모바일: `bottom-4 right-[calc(50%-28px)]` (중앙 정렬)

#### 완료 기준
- [ ] 플로팅 버튼 렌더링
- [ ] 클릭 시 채팅 창 토글
- [ ] Alt+C 단축키 작동
- [ ] 반응형 위치 조정
- [ ] ARIA 레이블 설정
- [ ] 호버 애니메이션 적용

---

### TASK AI-005: 채팅 창 레이아웃 컴포넌트
**우선순위**: P0
**예상 소요**: 2시간
**담당**: Claude
**의존성**: AI-003

#### 설명
채팅 창의 전체 레이아웃과 열기/닫기 애니메이션을 구현합니다.

#### 산출물
- `src/components/ai/AIChatWindow.tsx`
- `src/components/ai/AIChatHeader.tsx`

#### 작업 내용
1. **AIChatWindow 컴포넌트**:
   ```typescript
   export function AIChatWindow() {
     const { isOpen, setIsOpen } = useAIChatWidgetContext();

     // 모바일 body 스크롤 잠금
     useEffect(() => {
       if (isOpen && window.innerWidth < 768) {
         document.body.style.overflow = 'hidden';
         return () => {
           document.body.style.overflow = '';
         };
       }
     }, [isOpen]);

     if (!isOpen) return null;

     return (
       <div className="fixed bottom-[90px] right-5 z-[1001] h-[600px] w-[400px] flex flex-col rounded-lg border bg-background shadow-xl animate-in slide-in-from-bottom-4 duration-300 md:bottom-[90px] md:right-5 max-md:inset-0 max-md:h-full max-md:w-full max-md:rounded-none">
         <AIChatHeader onClose={() => setIsOpen(false)} />
         <AIChatMessages />
         <AIChatInput />
       </div>
     );
   }
   ```

2. **AIChatHeader 컴포넌트**:
   ```typescript
   export function AIChatHeader({ onClose }: { onClose: () => void }) {
     const { user } = useAuth();

     return (
       <div className="flex items-center justify-between border-b p-4">
         <h2 className="text-lg font-semibold">AI 어시스턴트</h2>
         <div className="flex items-center gap-2">
           {user && (
             <Button variant="ghost" size="icon" aria-label="대화 기록">
               <History className="h-5 w-5" />
             </Button>
           )}
           <Button onClick={onClose} variant="ghost" size="icon" aria-label="닫기">
             <X className="h-5 w-5" />
           </Button>
         </div>
       </div>
     );
   }
   ```

3. **ESC 키 닫기**:
   ```typescript
   useEffect(() => {
     const handleEsc = (e: KeyboardEvent) => {
       if (e.key === 'Escape' && isOpen) {
         setIsOpen(false);
       }
     };

     window.addEventListener('keydown', handleEsc);
     return () => window.removeEventListener('keydown', handleEsc);
   }, [isOpen, setIsOpen]);
   ```

#### 완료 기준
- [ ] 채팅 창 레이아웃 렌더링
- [ ] 열기/닫기 애니메이션 (300ms)
- [ ] ESC 키로 닫기
- [ ] 모바일 전체 화면
- [ ] 모바일 body 스크롤 잠금
- [ ] 헤더 버튼 작동
- [ ] 반응형 크기 조정

---

### TASK AI-006: 메시지 표시 컴포넌트
**우선순위**: P0
**예상 소요**: 2.5시간
**담당**: Claude
**의존성**: AI-005

#### 설명
메시지 목록과 개별 메시지를 렌더링하는 컴포넌트를 구현합니다.

#### 산출물
- `src/components/ai/AIChatMessages.tsx`
- `src/components/ai/AIChatMessage.tsx`
- `src/components/ai/WelcomeMessage.tsx`
- `src/components/ai/TypingIndicator.tsx`

#### 작업 내용
1. **WelcomeMessage 컴포넌트**:
   ```typescript
   export function WelcomeMessage() {
     const { pageContext } = useAIChatWidgetContext();

     const message = pageContext.serviceId
       ? `${pageContext.serviceId} 서비스에 대해 도와드릴까요?`
       : 'IDEA on Action에 대해 궁금한 점이 있으신가요?';

     return (
       <div className="flex gap-3 justify-start">
         <Avatar className="h-8 w-8">
           <Bot className="h-5 w-5" />
         </Avatar>
         <div className="rounded-lg bg-muted px-4 py-2 max-w-[80%]">
           <p>{message}</p>
         </div>
       </div>
     );
   }
   ```

2. **AIChatMessage 컴포넌트**:
   ```typescript
   export function AIChatMessage({ message, isStreaming }: AIChatMessageProps) {
     const isUser = message.role === 'user';

     return (
       <div className={cn('flex gap-3', isUser ? 'justify-end' : 'justify-start')}>
         {!isUser && (
           <Avatar className="h-8 w-8">
             <Bot className="h-5 w-5" />
           </Avatar>
         )}

         <div className={cn(
           'rounded-lg px-4 py-2 max-w-[80%]',
           isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
         )}>
           {isUser ? (
             <p className="whitespace-pre-wrap">{message.content}</p>
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

3. **AIChatMessages 컴포넌트**:
   ```typescript
   export function AIChatMessages() {
     const { state } = useClaudeStreaming();
     const messagesEndRef = useRef<HTMLDivElement>(null);

     useEffect(() => {
       messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
     }, [state.messages.length, state.streamingText]);

     return (
       <div className="flex-1 overflow-y-auto p-4 space-y-4" role="log">
         {state.messages.length === 0 && <WelcomeMessage />}

         {state.messages.map((msg) => (
           <AIChatMessage key={msg.id || Math.random()} message={msg} />
         ))}

         {state.isStreaming && state.streamingText && (
           <AIChatMessage
             message={{
               role: 'assistant',
               content: state.streamingText,
             }}
             isStreaming
           />
         )}

         <div ref={messagesEndRef} />
       </div>
     );
   }
   ```

4. **TypingIndicator 컴포넌트**:
   ```typescript
   export function TypingIndicator() {
     return (
       <div className="flex gap-1 items-center mt-2">
         <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
         <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
         <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
       </div>
     );
   }
   ```

5. **formatRelativeTime 유틸리티**:
   ```typescript
   // src/lib/ai-chat-utils.ts
   export function formatRelativeTime(timestamp: string): string {
     const now = new Date();
     const date = new Date(timestamp);
     const diff = now.getTime() - date.getTime();

     if (diff < 60000) return '방금 전';
     if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`;
     if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전`;
     return date.toLocaleDateString('ko-KR');
   }
   ```

#### 완료 기준
- [ ] 환영 메시지 표시
- [ ] 사용자/AI 메시지 구분 렌더링
- [ ] 마크다운 렌더링 (react-markdown)
- [ ] 타이핑 애니메이션
- [ ] 타임스탬프 표시
- [ ] 자동 스크롤
- [ ] role="log" ARIA 속성

---

### TASK AI-007: 메시지 입력 컴포넌트
**우선순위**: P0
**예상 소요**: 2시간
**담당**: Claude
**의존성**: AI-005

#### 설명
텍스트 입력 및 전송 버튼을 포함한 입력 영역을 구현합니다.

#### 산출물
- `src/components/ai/AIChatInput.tsx`

#### 작업 내용
1. **AIChatInput 컴포넌트**:
   ```typescript
   export function AIChatInput() {
     const [input, setInput] = useState('');
     const textareaRef = useRef<HTMLTextAreaElement>(null);
     const { sendMessage, stopStreaming, isStreaming } = useClaudeStreaming();

     const handleSend = async () => {
       const trimmed = input.trim();
       if (!trimmed || isStreaming) return;

       setInput('');
       try {
         await sendMessage(trimmed);
       } catch (error) {
         console.error('메시지 전송 실패:', error);
       }
       textareaRef.current?.focus();
     };

     const handleKeyDown = (e: React.KeyboardEvent) => {
       if (e.key === 'Enter' && !e.shiftKey) {
         e.preventDefault();
         handleSend();
       }
     };

     return (
       <div className="border-t p-4">
         <div className="flex gap-2">
           <Textarea
             ref={textareaRef}
             value={input}
             onChange={(e) => setInput(e.target.value)}
             onKeyDown={handleKeyDown}
             placeholder="메시지를 입력하세요..."
             aria-label="메시지 입력"
             rows={2}
             className="resize-none"
           />

           {isStreaming ? (
             <Button
               onClick={stopStreaming}
               variant="outline"
               size="icon"
               aria-label="중지"
             >
               <StopCircle className="h-5 w-5" />
             </Button>
           ) : (
             <Button
               onClick={handleSend}
               disabled={!input.trim()}
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

2. **빈 메시지 검증**:
   - `input.trim()` 확인
   - 빈 문자열이면 전송 버튼 비활성화

3. **Enter/Shift+Enter 처리**:
   - Enter: 전송
   - Shift+Enter: 줄바꿈

#### 완료 기준
- [ ] 텍스트 입력 처리
- [ ] 전송 버튼 클릭 작동
- [ ] Enter 키 전송
- [ ] Shift+Enter 줄바꿈
- [ ] 빈 메시지 방지
- [ ] 스트리밍 중 전송 버튼 → 중지 버튼
- [ ] ARIA 레이블 설정

---

### TASK AI-008: App.tsx 통합
**우선순위**: P0
**예상 소요**: 0.5시간
**담당**: Claude
**의존성**: AI-004, AI-005, AI-006, AI-007

#### 설명
AIChatWidget을 App.tsx에 통합하고 전역 Context를 제공합니다.

#### 산출물
- `src/App.tsx` (수정)
- `src/components/ai/AIChatWidget.tsx` (완성)

#### 작업 내용
1. **AIChatWidget 완성**:
   ```typescript
   // src/components/ai/AIChatWidget.tsx
   export function AIChatWidget() {
     const [isOpen, setIsOpen] = useState(false);
     const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
     const pageContext = usePageContext();
     const { user } = useAuth();

     const value = {
       isOpen,
       setIsOpen,
       pageContext,
       currentConversationId,
       setCurrentConversationId,
     };

     return (
       <AIChatWidgetContext.Provider value={value}>
         <AIChatButton />
         {isOpen && <AIChatWindow />}
       </AIChatWidgetContext.Provider>
     );
   }
   ```

2. **App.tsx 수정**:
   ```typescript
   // src/App.tsx
   import { AIChatWidget } from '@/components/ai/AIChatWidget';

   function App() {
     return (
       <BrowserRouter>
         <AuthProvider>
           <ThemeProvider>
             {/* 기존 레이아웃 */}
             <Routes>
               {/* 기존 라우트 */}
             </Routes>

             {/* AI 채팅 위젯 추가 */}
             <AIChatWidget />
           </ThemeProvider>
         </AuthProvider>
       </BrowserRouter>
     );
   }
   ```

3. **Lazy Loading (선택)**:
   ```typescript
   const AIChatWidget = lazy(() => import('@/components/ai/AIChatWidget'));

   <Suspense fallback={null}>
     <AIChatWidget />
   </Suspense>
   ```

#### 완료 기준
- [ ] AIChatWidget Provider 완성
- [ ] App.tsx에 통합
- [ ] 모든 페이지에서 위젯 표시
- [ ] 빌드 에러 없음
- [ ] 린트 에러 없음

---

### TASK AI-009: E2E 테스트 작성
**우선순위**: P1
**예상 소요**: 2시간
**담당**: Claude
**의존성**: AI-008

#### 설명
AI 채팅 위젯의 핵심 기능에 대한 E2E 테스트를 작성합니다.

#### 산출물
- `tests/e2e/ai/ai-chat-widget.spec.ts`

#### 작업 내용
1. **플로팅 버튼 테스트**:
   ```typescript
   test('플로팅 버튼이 표시된다', async ({ page }) => {
     await page.goto('/');

     const button = page.locator('[aria-label="AI 어시스턴트 열기"]');
     await expect(button).toBeVisible();
     await expect(button).toHaveCSS('position', 'fixed');
   });
   ```

2. **채팅 창 열기/닫기 테스트**:
   ```typescript
   test('채팅 창 열기/닫기', async ({ page }) => {
     await page.goto('/');

     // 열기
     await page.click('[aria-label="AI 어시스턴트 열기"]');
     await expect(page.locator('.ai-chat-window')).toBeVisible();

     // 닫기
     await page.click('[aria-label="닫기"]');
     await expect(page.locator('.ai-chat-window')).not.toBeVisible();
   });
   ```

3. **메시지 전송 테스트**:
   ```typescript
   test('메시지 전송 및 응답', async ({ page }) => {
     await page.goto('/');
     await page.click('[aria-label="AI 어시스턴트 열기"]');

     // 메시지 입력
     await page.fill('textarea[aria-label="메시지 입력"]', '안녕하세요');
     await page.click('[aria-label="전송"]');

     // 사용자 메시지 확인
     await expect(page.locator('text=안녕하세요').first()).toBeVisible();

     // AI 응답 대기 (최대 10초)
     await expect(page.locator('[role="log"] >> text=/안녕/').nth(1)).toBeVisible({ timeout: 10000 });
   });
   ```

4. **페이지 컨텍스트 테스트**:
   ```typescript
   test('서비스 페이지 컨텍스트 인식', async ({ page }) => {
     await page.goto('/services/minu-find');
     await page.click('[aria-label="AI 어시스턴트 열기"]');

     // 환영 메시지 확인
     await expect(page.locator('text=/Minu Find/')).toBeVisible();
   });
   ```

5. **키보드 단축키 테스트**:
   ```typescript
   test('Alt+C 단축키로 열기/닫기', async ({ page }) => {
     await page.goto('/');

     // Alt+C로 열기
     await page.keyboard.press('Alt+C');
     await expect(page.locator('.ai-chat-window')).toBeVisible();

     // Alt+C로 닫기
     await page.keyboard.press('Alt+C');
     await expect(page.locator('.ai-chat-window')).not.toBeVisible();
   });
   ```

6. **반응형 테스트**:
   ```typescript
   test('모바일 전체 화면', async ({ page }) => {
     await page.setViewportSize({ width: 375, height: 667 });
     await page.goto('/');
     await page.click('[aria-label="AI 어시스턴트 열기"]');

     const window = page.locator('.ai-chat-window');
     await expect(window).toHaveCSS('inset', '0px');
   });
   ```

#### 완료 기준
- [ ] 6개 이상 E2E 테스트 작성
- [ ] 모든 테스트 통과
- [ ] 플로팅 버튼, 채팅 창, 메시지 전송 커버
- [ ] 페이지 컨텍스트 테스트
- [ ] 키보드 접근성 테스트
- [ ] 반응형 테스트

---

## 📊 진행 상황

| TASK | 상태 | 담당 | 예상 소요 | 실제 소요 |
|------|------|------|-----------|-----------|
| AI-001 | ⬜ 대기 | Claude | 1h | - |
| AI-002 | ⬜ 대기 | Claude | 1.5h | - |
| AI-003 | ⬜ 대기 | Claude | 1h | - |
| AI-004 | ⬜ 대기 | Claude | 1.5h | - |
| AI-005 | ⬜ 대기 | Claude | 2h | - |
| AI-006 | ⬜ 대기 | Claude | 2.5h | - |
| AI-007 | ⬜ 대기 | Claude | 2h | - |
| AI-008 | ⬜ 대기 | Claude | 0.5h | - |
| AI-009 | ⬜ 대기 | Claude | 2h | - |

**총 예상 소요**: 14시간

---

## 🔗 관련 문서

- **요구사항**: [../../spec/claude-integration/ai-chat-widget/requirements.md](../../spec/claude-integration/ai-chat-widget/requirements.md)
- **인수 조건**: [../../spec/claude-integration/ai-chat-widget/acceptance-criteria.md](../../spec/claude-integration/ai-chat-widget/acceptance-criteria.md)
- **아키텍처**: [../../plan/claude-integration/ai-chat-widget/architecture.md](../../plan/claude-integration/ai-chat-widget/architecture.md)

---

## 📝 변경 이력

| 날짜 | 작성자 | 변경 내용 |
|------|--------|-----------|
| 2025-11-25 | Claude | 초안 작성 |

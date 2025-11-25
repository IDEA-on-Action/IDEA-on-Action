# AI 채팅 위젯 통합 가이드

## 개요

IDEA on Action 프로젝트에 AI 채팅 위젯이 구현되었습니다. 이 가이드는 위젯을 앱에 통합하는 방법을 설명합니다.

## 파일 구조

```
src/
├── types/
│   └── ai-chat-widget.types.ts         # 타입 정의
├── hooks/
│   └── usePageContext.ts                # 페이지 컨텍스트 훅
└── components/
    └── ai-chat/                         # AI 채팅 위젯
        ├── AIChatWidget.tsx             # 메인 위젯
        ├── AIChatButton.tsx             # 플로팅 버튼
        ├── AIChatWindow.tsx             # 채팅창
        ├── AIChatHeader.tsx             # 헤더
        ├── AIChatMessages.tsx           # 메시지 목록
        ├── AIChatMessage.tsx            # 개별 메시지
        ├── AIChatInput.tsx              # 입력창
        ├── index.ts                     # Export
        └── README.md                    # 문서
```

## 1단계: App.tsx에 통합

### Option 1: Eager Loading (권장 - 작은 번들)

```tsx
// src/App.tsx
import { AIChatWidget } from '@/components/ai-chat';

function App() {
  return (
    <BrowserRouter>
      {/* ... 기존 코드 ... */}

      {/* AI 채팅 위젯 추가 */}
      <AIChatWidget />
    </BrowserRouter>
  );
}
```

### Option 2: Lazy Loading (권장 - 초기 로딩 최적화)

```tsx
// src/App.tsx
import { Suspense, lazy } from 'react';

// Lazy load AIChatWidget
const AIChatWidget = lazy(() =>
  import('./components/ai-chat').then(m => ({ default: m.AIChatWidget }))
);

function App() {
  return (
    <BrowserRouter>
      {/* ... 기존 코드 ... */}

      {/* AI 채팅 위젯 추가 (Lazy) */}
      <Suspense fallback={null}>
        <AIChatWidget />
      </Suspense>
    </BrowserRouter>
  );
}
```

## 2단계: 기존 ChatWidget 대체 (선택)

기존 ChatWidget과 병행하거나 대체할 수 있습니다.

### 병행 사용 (추천)

```tsx
// src/App.tsx
const ChatWidget = lazy(() => import("./components/chat").then(module => ({ default: module.ChatWidget })));
const AIChatWidget = lazy(() => import("./components/ai-chat").then(m => ({ default: m.AIChatWidget })));

function App() {
  return (
    <>
      {/* 기존 챗봇 (왼쪽 하단) */}
      <Suspense fallback={null}>
        <ChatWidget />
      </Suspense>

      {/* 신규 AI 위젯 (오른쪽 하단) */}
      <Suspense fallback={null}>
        <AIChatWidget config={{ position: 'bottom-right' }} />
      </Suspense>
    </>
  );
}
```

### 완전 대체

```tsx
// src/App.tsx
- const ChatWidget = lazy(() => import("./components/chat").then(module => ({ default: module.ChatWidget })));
+ const AIChatWidget = lazy(() => import("./components/ai-chat").then(m => ({ default: m.AIChatWidget })));

function App() {
  return (
    <>
      <Suspense fallback={null}>
-       <ChatWidget />
+       <AIChatWidget />
      </Suspense>
    </>
  );
}
```

## 3단계: 설정 커스터마이징 (선택)

```tsx
<AIChatWidget
  config={{
    // 위치 설정
    position: 'bottom-right', // 'bottom-left' | 'bottom-right'

    // 기본 열림 여부
    defaultOpen: false,

    // 커스텀 시스템 프롬프트
    systemPrompt: `
      당신은 IDEA on Action의 전문가입니다.
      사용자의 질문에 친절하고 정확하게 답변하세요.
    `,
  }}
/>
```

## 4단계: 페이지별 컨텍스트 확인

위젯은 자동으로 페이지 컨텍스트를 감지합니다. 필요시 `usePageContext` 훅을 수정하여 커스터마이징할 수 있습니다.

```typescript
// src/hooks/usePageContext.ts
const serviceNameMap: Record<string, string> = {
  'mvp': 'MVP 개발',
  'fullstack': '풀스택 개발',
  // 신규 서비스 추가
  'new-service': '신규 서비스명',
};
```

## 5단계: 빌드 및 테스트

```bash
# 린트 검사
npm run lint

# 타입 체크
npx tsc --noEmit

# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build
```

### 테스트 체크리스트

- [ ] 플로팅 버튼이 우하단에 표시됨
- [ ] 버튼 클릭 시 채팅창 열림
- [ ] 메시지 입력 및 전송 가능
- [ ] AI 응답 스트리밍 동작
- [ ] 마크다운 렌더링 정상
- [ ] 새 대화 버튼 동작
- [ ] 닫기 버튼 동작
- [ ] 다크 모드 지원
- [ ] 모바일 반응형 정상

## 6단계: 스타일 커스터마이징 (선택)

Tailwind CSS 변수를 사용하여 색상 커스터마이징이 가능합니다.

```css
/* src/index.css */
:root {
  --ai-chat-primary: 220 90% 56%;
  --ai-chat-secondary: 210 40% 96%;
}

.dark {
  --ai-chat-primary: 217 91% 60%;
  --ai-chat-secondary: 217 33% 17%;
}
```

## 트러블슈팅

### 위젯이 표시되지 않음

1. `AIChatWidget`이 `<BrowserRouter>` 내부에 있는지 확인
2. z-index 충돌이 없는지 확인 (위젯은 z-50 사용)
3. 브라우저 콘솔에서 에러 확인

### 스트리밍이 작동하지 않음

1. Supabase Edge Function이 배포되어 있는지 확인
   ```bash
   supabase functions list
   ```
2. 환경 변수 확인
   ```bash
   echo $VITE_SUPABASE_URL
   echo $VITE_SUPABASE_ANON_KEY
   ```

### 페이지 컨텍스트가 인식되지 않음

1. `usePageContext` 훅의 URL 패턴 로직 확인
2. 브라우저 콘솔에서 `pageContext` 값 확인
   ```tsx
   const pageContext = usePageContext();
   console.log('Page Context:', pageContext);
   ```

## 추가 리소스

- **컴포넌트 문서**: `src/components/ai-chat/README.md`
- **타입 정의**: `src/types/ai-chat-widget.types.ts`
- **Claude API 문서**: `docs/guides/claude-api.md`
- **Supabase 설정**: `docs/guides/supabase-setup.md`

## 지원

문제가 발생하면 다음을 확인하세요:

1. 브라우저 콘솔 로그
2. 네트워크 탭 (API 요청/응답)
3. Supabase 대시보드 (Edge Function 로그)
4. React DevTools (컴포넌트 상태)

## 다음 단계

- [ ] E2E 테스트 작성 (`tests/e2e/ai-chat-widget.spec.ts`)
- [ ] 유닛 테스트 작성 (`src/components/ai-chat/__tests__/`)
- [ ] 스토리북 스토리 작성 (선택)
- [ ] 성능 모니터링 설정
- [ ] 사용자 피드백 수집

---

**작성일**: 2025-11-25
**버전**: 1.0.0
**작성자**: Claude (AI Assistant)

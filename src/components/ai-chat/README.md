# AI 채팅 위젯

IDEA on Action 프로젝트를 위한 AI 채팅 위젯입니다. Claude API를 사용하여 실시간 스트리밍 응답을 제공합니다.

## 특징

- **실시간 스트리밍**: Claude API의 SSE(Server-Sent Events) 스트리밍 지원
- **페이지 컨텍스트**: 현재 페이지 정보를 자동으로 AI에게 전달
- **대화 저장**: 로그인한 사용자의 대화 내역 저장 (선택적)
- **마크다운 지원**: AI 응답을 마크다운으로 렌더링
- **반응형 디자인**: 모바일/데스크톱 모두 지원
- **다크 모드**: Tailwind CSS 다크 모드 지원
- **접근성**: ARIA 레이블 및 키보드 네비게이션

## 사용 방법

### 기본 사용

```tsx
import { AIChatWidget } from '@/components/ai-chat';

function App() {
  return (
    <>
      {/* 페이지 컨텐츠 */}
      <AIChatWidget />
    </>
  );
}
```

### 설정 옵션

```tsx
<AIChatWidget
  config={{
    position: 'bottom-right', // 또는 'bottom-left'
    defaultOpen: false,       // 기본 열림 여부
    systemPrompt: '커스텀 시스템 프롬프트', // 선택적
  }}
/>
```

## 컴포넌트 구조

```
AIChatWidget (메인 컨테이너)
├── AIChatButton (플로팅 버튼)
└── AIChatWindow (채팅창)
    ├── AIChatHeader (헤더)
    ├── AIChatMessages (메시지 목록)
    │   └── AIChatMessage × N (개별 메시지)
    └── AIChatInput (입력창)
```

## 주요 파일

| 파일 | 설명 |
|------|------|
| `AIChatWidget.tsx` | 메인 위젯 (상태 관리, API 연동) |
| `AIChatButton.tsx` | 플로팅 버튼 (우하단 고정) |
| `AIChatWindow.tsx` | 채팅창 레이아웃 |
| `AIChatHeader.tsx` | 헤더 (제목, 새 대화, 닫기) |
| `AIChatMessages.tsx` | 메시지 목록 (자동 스크롤) |
| `AIChatMessage.tsx` | 개별 메시지 (마크다운 렌더링) |
| `AIChatInput.tsx` | 입력창 (자동 높이 조절) |

## 타입 정의

```typescript
// src/types/ai-chat-widget.types.ts
interface AIChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

interface PageContext {
  path: string;
  serviceId?: string;
  serviceName?: string;
  pageType: 'home' | 'service' | 'admin' | 'other';
}

interface AIChatConfig {
  position: 'bottom-right' | 'bottom-left';
  defaultOpen?: boolean;
  systemPrompt?: string;
}
```

## 사용된 훅

| 훅 | 설명 |
|----|------|
| `useClaudeStreaming` | Claude API 스트리밍 통신 |
| `useConversationManager` | 대화 저장/불러오기 (로그인 시) |
| `useAuth` | 사용자 인증 상태 |
| `usePageContext` | 현재 페이지 컨텍스트 추출 |

## 페이지 컨텍스트

위젯은 현재 페이지 정보를 자동으로 추출하여 AI에게 전달합니다:

```typescript
// 예시 1: 홈페이지
{ path: '/', pageType: 'home' }

// 예시 2: 서비스 페이지
{
  path: '/services/mvp',
  pageType: 'service',
  serviceId: 'mvp',
  serviceName: 'MVP 개발'
}

// 예시 3: 관리자 페이지
{ path: '/admin/services', pageType: 'admin' }
```

## 시스템 프롬프트

기본 시스템 프롬프트에는 다음 정보가 포함됩니다:

- 회사 정보 (비전, 슬로건)
- 서비스 라인업 (Minu Find, Frame, Build, Keep)
- 기술 스택 (React, TypeScript, Supabase, Claude API)
- 현재 페이지 컨텍스트

커스텀 프롬프트를 제공하면 기본 프롬프트에 추가됩니다.

## 키보드 단축키

| 키 | 동작 |
|----|------|
| `Enter` | 메시지 전송 |
| `Shift + Enter` | 줄바꿈 |

## 접근성

- **ARIA 레이블**: 모든 상호작용 요소에 레이블 제공
- **키보드 네비게이션**: Tab, Enter 키 지원
- **스크린 리더**: 메시지 역할(사용자/AI) 구분
- **포커스 표시**: 키보드 포커스 시각적 표시

## 스타일링

Tailwind CSS를 사용하며, 다음 클래스를 커스터마이징할 수 있습니다:

- `bg-background`: 배경색
- `text-foreground`: 텍스트 색
- `bg-primary`: 주요 색상 (사용자 메시지)
- `bg-muted`: 보조 색상 (AI 메시지)

## 의존성

```json
{
  "react": "^18.x",
  "react-markdown": "^10.1.0",
  "remark-gfm": "^4.0.1",
  "lucide-react": "latest",
  "@radix-ui/react-scroll-area": "latest"
}
```

## 빌드 최적화

- **Lazy Loading**: react-markdown은 AIChatWidget에 번들됨
- **Code Splitting**: 위젯 전체를 lazy load 가능
- **Tree Shaking**: 개별 컴포넌트 import 가능

```tsx
// 전체 위젯 lazy load
const AIChatWidget = lazy(() => import('@/components/ai-chat').then(m => ({ default: m.AIChatWidget })));
```

## 트러블슈팅

### 스트리밍이 작동하지 않음

- Supabase Edge Function이 배포되어 있는지 확인
- `VITE_SUPABASE_URL`과 `VITE_SUPABASE_ANON_KEY`가 설정되어 있는지 확인
- 브라우저 콘솔에서 네트워크 에러 확인

### 대화가 저장되지 않음

- 사용자가 로그인했는지 확인
- `ai_conversations` 및 `ai_messages` 테이블이 존재하는지 확인
- RLS 정책이 올바르게 설정되어 있는지 확인

### 페이지 컨텍스트가 인식되지 않음

- URL 패턴이 `usePageContext` 훅의 로직과 일치하는지 확인
- 서비스 slug가 `serviceNameMap`에 정의되어 있는지 확인

## 향후 개선 사항

- [ ] 음성 입력 지원
- [ ] 파일 업로드 (이미지, 문서)
- [ ] 대화 내보내기 (PDF, TXT)
- [ ] 자동 저장 (로컬 스토리지)
- [ ] 다국어 지원 (i18n)
- [ ] 테마 커스터마이징
- [ ] 프리셋 질문 (Quick Replies)
- [ ] 이모지 피커

## 라이선스

이 코드는 IDEA on Action 프로젝트의 일부입니다.

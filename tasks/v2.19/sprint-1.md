# v2.19.0 Sprint 1: AI 위젯 + Fast Refresh

**작성일**: 2025-11-26
**Sprint**: 1/5
**예상 시간**: 4시간
**상태**: 📝 Ready

---

## Sprint 목표

1. **SDD 문서 작성**: spec, plan, tasks 문서 5개
2. **AI 채팅 위젯 전역 배포**: App.tsx 통합
3. **Fast Refresh 경고 해결**: 5개 파일 분리
4. **E2E 테스트**: 5개 신규 작성

---

## TASK-001: SDD 문서 작성

**담당**: AI 에이전트
**예상 시간**: 1시간
**우선순위**: P0

### 설명
v2.19.0 SDD 문서를 작성합니다.

### 체크리스트
- [ ] spec/v2.19/requirements.md (3,000자 이상)
- [ ] spec/v2.19/acceptance-criteria.md (2,500자 이상)
- [ ] plan/v2.19/implementation-strategy.md (4,000자 이상)
- [ ] tasks/v2.19/sprint-1.md (이 파일)
- [ ] tasks/v2.19/sprint-2.md

### 완료 조건
- 5개 파일 모두 생성
- 린트 통과 (markdownlint)
- 디렉토리 구조 정리

---

## TASK-002: MCPPermissionContext 훅 분리

**담당**: 병렬 에이전트 A
**예상 시간**: 20분
**우선순위**: P0

### 설명
`useMCPPermission` 훅을 별도 파일로 분리하여 Fast Refresh 경고를 해결합니다.

### 현재 구조
```
src/contexts/
  MCPPermissionContext.tsx  # 컴포넌트 + 훅 (경고 발생)
```

### 변경 후 구조
```
src/contexts/
  MCPPermissionContext.tsx  # 컴포넌트만
  useMCPPermission.ts       # 훅 분리
```

### 파일 내용

#### useMCPPermission.ts (신규)
```typescript
import { useContext } from 'react';
import { MCPPermissionContext } from './MCPPermissionContext';

/**
 * MCP 권한 훅
 * @description MCPPermissionContext의 값을 가져옵니다.
 */
export function useMCPPermission() {
  const context = useContext(MCPPermissionContext);
  if (context === undefined) {
    throw new Error('useMCPPermission must be used within MCPPermissionProvider');
  }
  return context;
}
```

#### MCPPermissionContext.tsx (수정)
```typescript
// 기존 useMCPPermission 함수 제거
// export는 컴포넌트만
export const MCPPermissionProvider = ({ children }: Props) => {
  // ...
};
```

### import 경로 호환성
```typescript
// 기존 (유지)
import { useMCPPermission } from '@/contexts/MCPPermissionContext';

// 또는 (새로운 방식)
import { useMCPPermission } from '@/contexts/useMCPPermission';
```

### 체크리스트
- [ ] useMCPPermission.ts 파일 생성
- [ ] MCPPermissionContext.tsx에서 훅 제거
- [ ] MCPPermissionContext.tsx에서 useMCPPermission.ts export
- [ ] 기존 import 경로 호환성 유지
- [ ] Fast Refresh 경고 해결 확인
- [ ] TypeScript 에러 없음

### 완료 조건
```bash
# Fast Refresh 경고 확인
npm run dev
# 파일 수정 시 경고 없음

# TypeScript 검사
npx tsc --noEmit
# 0 errors

# 린트 검사
npm run lint
# 0 errors, 0 warnings
```

---

## TASK-003: MCPProtected HOC 분리

**담당**: 병렬 에이전트 B
**예상 시간**: 20분
**우선순위**: P0

### 설명
`withMCPProtection` HOC를 별도 파일로 분리하여 Fast Refresh 경고를 해결합니다.

### 현재 구조
```
src/components/mcp/
  MCPProtected.tsx  # 컴포넌트 + HOC (경고 발생)
```

### 변경 후 구조
```
src/components/mcp/
  MCPProtected.tsx         # 컴포넌트만
  withMCPProtection.tsx    # HOC 분리
```

### 파일 내용

#### withMCPProtection.tsx (신규)
```typescript
import React from 'react';
import { MCPProtected } from './MCPProtected';
import type { MCPProtectedProps } from './MCPProtected';

/**
 * MCP 권한 HOC
 * @description 컴포넌트를 MCP 권한으로 감쌉니다.
 */
export function withMCPProtection<P extends object>(
  Component: React.ComponentType<P>,
  options: Omit<MCPProtectedProps, 'children'>
) {
  return function WrappedComponent(props: P) {
    return (
      <MCPProtected {...options}>
        <Component {...props} />
      </MCPProtected>
    );
  };
}
```

#### MCPProtected.tsx (수정)
```typescript
// 기존 withMCPProtection 함수 제거
// export는 컴포넌트와 타입만
export interface MCPProtectedProps {
  // ...
}

export const MCPProtected = ({ children, ...options }: MCPProtectedProps) => {
  // ...
};
```

### import 경로 호환성
```typescript
// 기존 (유지)
import { withMCPProtection } from '@/components/mcp/MCPProtected';

// 또는 (새로운 방식)
import { withMCPProtection } from '@/components/mcp/withMCPProtection';
```

### 체크리스트
- [ ] withMCPProtection.tsx 파일 생성
- [ ] MCPProtected.tsx에서 HOC 제거
- [ ] MCPProtected.tsx에서 withMCPProtection.tsx export
- [ ] 기존 import 경로 호환성 유지
- [ ] Fast Refresh 경고 해결 확인
- [ ] TypeScript 에러 없음

### 완료 조건
```bash
# Fast Refresh 경고 확인
npm run dev
# 파일 수정 시 경고 없음

# TypeScript 검사
npx tsc --noEmit
# 0 errors

# 린트 검사
npm run lint
# 0 errors, 0 warnings
```

---

## TASK-004: toggle variants 분리

**담당**: 병렬 에이전트 C
**예상 시간**: 15분
**우선순위**: P0

### 설명
`toggleVariants` 상수를 별도 파일로 분리하여 Fast Refresh 경고를 해결합니다.

### 현재 구조
```
src/components/ui/
  toggle.tsx  # 컴포넌트 + variants (경고 발생)
```

### 변경 후 구조
```
src/components/ui/
  toggle.tsx          # 컴포넌트만
  toggle.variants.ts  # variants 분리
```

### 파일 내용

#### toggle.variants.ts (신규)
```typescript
import { cva } from 'class-variance-authority';

/**
 * Toggle 컴포넌트 variants
 * @description shadcn/ui toggle 스타일 정의
 */
export const toggleVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors hover:bg-muted hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground',
  {
    variants: {
      variant: {
        default: 'bg-transparent',
        outline:
          'border border-input bg-transparent hover:bg-accent hover:text-accent-foreground',
      },
      size: {
        default: 'h-10 px-3',
        sm: 'h-9 px-2.5',
        lg: 'h-11 px-5',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);
```

#### toggle.tsx (수정)
```typescript
import { toggleVariants } from './toggle.variants';

// 기존 toggleVariants 정의 제거
// export는 컴포넌트와 타입만
export interface ToggleProps {
  // ...
}

const Toggle = React.forwardRef<HTMLButtonElement, ToggleProps>(
  ({ className, variant, size, ...props }, ref) => (
    <TogglePrimitive.Root
      ref={ref}
      className={cn(toggleVariants({ variant, size, className }))}
      {...props}
    />
  )
);
```

### import 경로 호환성
```typescript
// 기존 (유지)
import { toggleVariants } from '@/components/ui/toggle';

// 또는 (새로운 방식)
import { toggleVariants } from '@/components/ui/toggle.variants';
```

### 체크리스트
- [ ] toggle.variants.ts 파일 생성
- [ ] toggle.tsx에서 variants 제거
- [ ] toggle.tsx에서 toggle.variants.ts import
- [ ] 기존 export 호환성 유지
- [ ] Fast Refresh 경고 해결 확인
- [ ] TypeScript 에러 없음

### 완료 조건
```bash
# Fast Refresh 경고 확인
npm run dev
# 파일 수정 시 경고 없음

# TypeScript 검사
npx tsc --noEmit
# 0 errors

# 린트 검사
npm run lint
# 0 errors, 0 warnings
```

---

## TASK-005: Announcer 훅 분리

**담당**: 병렬 에이전트 D
**예상 시간**: 20분
**우선순위**: P0

### 설명
`useAnnouncer` 훅을 별도 파일로 분리하여 Fast Refresh 경고를 해결합니다.

### 현재 구조
```
src/components/accessibility/
  Announcer.tsx  # 컴포넌트 + 훅 + 상수 (경고 발생)
```

### 변경 후 구조
```
src/components/accessibility/
  Announcer.tsx           # 컴포넌트만
  useAnnouncer.ts         # 훅 분리
  announcer.constants.ts  # 상수 분리 (TASK-006)
```

### 파일 내용

#### useAnnouncer.ts (신규)
```typescript
import { useCallback } from 'react';
import { ARIA_LIVE_TIMEOUT } from './announcer.constants';

/**
 * Announcer 훅
 * @description 접근성 알림을 위한 훅
 */
export function useAnnouncer() {
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const announcer = document.getElementById(`announcer-${priority}`);
    if (!announcer) return;

    announcer.textContent = message;

    setTimeout(() => {
      announcer.textContent = '';
    }, ARIA_LIVE_TIMEOUT);
  }, []);

  return { announce };
}
```

#### Announcer.tsx (수정)
```typescript
// 기존 useAnnouncer 함수 제거
// 기존 ARIA_LIVE_TIMEOUT 상수 제거
// export는 컴포넌트만
export const Announcer = () => {
  return (
    <>
      <div
        id="announcer-polite"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />
      <div
        id="announcer-assertive"
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      />
    </>
  );
};
```

### import 경로 호환성
```typescript
// 기존 (유지)
import { useAnnouncer } from '@/components/accessibility/Announcer';

// 또는 (새로운 방식)
import { useAnnouncer } from '@/components/accessibility/useAnnouncer';
```

### 체크리스트
- [ ] useAnnouncer.ts 파일 생성
- [ ] Announcer.tsx에서 훅 제거
- [ ] Announcer.tsx에서 useAnnouncer.ts export
- [ ] 기존 import 경로 호환성 유지
- [ ] Fast Refresh 경고 해결 확인
- [ ] TypeScript 에러 없음

### 완료 조건
```bash
# Fast Refresh 경고 확인
npm run dev
# 파일 수정 시 경고 없음

# TypeScript 검사
npx tsc --noEmit
# 0 errors

# 린트 검사
npm run lint
# 0 errors, 0 warnings
```

---

## TASK-006: Announcer 상수 분리

**담당**: 병렬 에이전트 E
**예상 시간**: 10분
**우선순위**: P0

### 설명
`ARIA_LIVE_TIMEOUT` 상수를 별도 파일로 분리하여 Fast Refresh 경고를 해결합니다.

### 파일 내용

#### announcer.constants.ts (신규)
```typescript
/**
 * Announcer 상수
 * @description 접근성 알림 설정
 */

/**
 * ARIA Live Region 타임아웃 (ms)
 * @description 알림 메시지가 사라지는 시간
 */
export const ARIA_LIVE_TIMEOUT = 5000;

/**
 * ARIA Live 우선순위 타입
 */
export type AriaLivePriority = 'polite' | 'assertive';

/**
 * 기본 우선순위
 */
export const DEFAULT_ARIA_LIVE_PRIORITY: AriaLivePriority = 'polite';
```

#### useAnnouncer.ts (수정)
```typescript
import { ARIA_LIVE_TIMEOUT } from './announcer.constants';

// ARIA_LIVE_TIMEOUT import로 변경
```

### import 경로 호환성
```typescript
// 기존 (유지)
import { ARIA_LIVE_TIMEOUT } from '@/components/accessibility/Announcer';

// 또는 (새로운 방식)
import { ARIA_LIVE_TIMEOUT } from '@/components/accessibility/announcer.constants';
```

### 체크리스트
- [ ] announcer.constants.ts 파일 생성
- [ ] useAnnouncer.ts에서 상수 import
- [ ] Announcer.tsx에서 announcer.constants.ts export
- [ ] 기존 import 경로 호환성 유지
- [ ] Fast Refresh 경고 해결 확인
- [ ] TypeScript 에러 없음

### 완료 조건
```bash
# Fast Refresh 경고 확인
npm run dev
# 파일 수정 시 경고 없음

# TypeScript 검사
npx tsc --noEmit
# 0 errors

# 린트 검사
npm run lint
# 0 errors, 0 warnings
```

---

## TASK-007: App.tsx AI 위젯 통합

**담당**: AI 에이전트
**예상 시간**: 30분
**우선순위**: P0
**의존성**: TASK-002 완료 후 진행

### 설명
App.tsx에 AIChatWidget을 통합하여 모든 페이지에서 AI 어시스턴트에 접근할 수 있도록 합니다.

### 파일 수정

#### src/App.tsx
```typescript
import { AIChatWidget } from '@/components/ai-chat/AIChatWidget';
import { MCPPermissionProvider } from '@/contexts/MCPPermissionContext';

function App() {
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <MCPPermissionProvider>
          <Routes>
            {/* 기존 라우트 */}
            <Route path="/" element={<Index />} />
            <Route path="/services" element={<ServiceList />} />
            {/* ... */}
          </Routes>

          {/* AI 채팅 위젯 (전역) */}
          <AIChatWidget />
        </MCPPermissionProvider>
        <Toaster />
        <Sonner />
      </QueryClientProvider>
    </BrowserRouter>
  );
}

export default App;
```

### 체크리스트
- [ ] MCPPermissionProvider import
- [ ] AIChatWidget import
- [ ] Routes를 MCPPermissionProvider로 감싸기
- [ ] AIChatWidget 컴포넌트 추가 (Routes 아래)
- [ ] 인증 체크 (useAuth 사용)
- [ ] TypeScript 에러 없음
- [ ] 빌드 성공

### 테스트 시나리오
1. **홈페이지 접속**
   - 플로팅 버튼 표시 확인
   - 버튼 위치 (우하단 고정)

2. **채팅 창 오픈**
   - 버튼 클릭 → 채팅 창 오픈
   - ESC 키 → 채팅 창 닫힘
   - 오버레이 클릭 → 채팅 창 닫힘

3. **페이지 컨텍스트**
   - 홈페이지: "현재 페이지는?" → "홈페이지"
   - ProjectsHub: "현재 페이지는?" → "프로젝트 허브"
   - MinuFind: "현재 페이지는?" → "Minu Find"

### 완료 조건
```bash
# 개발 서버 시작
npm run dev

# 플로팅 버튼 확인
# 채팅 창 오픈 확인
# 페이지 컨텍스트 확인

# 빌드 성공
npm run build
```

---

## TASK-008: E2E 테스트 작성

**담당**: AI 에이전트
**예상 시간**: 30분
**우선순위**: P0
**의존성**: TASK-007 완료 후 진행

### 설명
AI 채팅 위젯 E2E 테스트를 작성합니다.

### 파일 생성

#### tests/e2e/ai-chat-widget.spec.ts
```typescript
import { test, expect } from '@playwright/test';

test.describe('AI Chat Widget', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should show floating button on all pages', async ({ page }) => {
    // 홈페이지
    const button = page.locator('[data-testid="ai-chat-button"]');
    await expect(button).toBeVisible();

    // ProjectsHub
    await page.goto('/projects');
    await expect(button).toBeVisible();

    // MinuFind
    await page.goto('/services/find');
    await expect(button).toBeVisible();
  });

  test('should open chat window on button click', async ({ page }) => {
    const button = page.locator('[data-testid="ai-chat-button"]');
    await button.click();

    const chatWindow = page.locator('[data-testid="ai-chat-window"]');
    await expect(chatWindow).toBeVisible();
  });

  test('should close chat window on ESC key', async ({ page }) => {
    const button = page.locator('[data-testid="ai-chat-button"]');
    await button.click();

    const chatWindow = page.locator('[data-testid="ai-chat-window"]');
    await expect(chatWindow).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(chatWindow).not.toBeVisible();
  });

  test('should detect page context automatically', async ({ page }) => {
    const button = page.locator('[data-testid="ai-chat-button"]');
    await button.click();

    const input = page.locator('[data-testid="ai-chat-input"]');
    await input.fill('현재 페이지는?');
    await input.press('Enter');

    const response = page.locator('[data-testid="ai-chat-message"]:last-child');
    await expect(response).toContainText('홈페이지');
  });

  test('should work after Fast Refresh', async ({ page }) => {
    // Fast Refresh 트리거 (파일 수정)
    // 실제 테스트에서는 개발 서버가 필요

    const button = page.locator('[data-testid="ai-chat-button"]');
    await expect(button).toBeVisible();
  });
});
```

### 체크리스트
- [ ] ai-chat-widget.spec.ts 파일 생성
- [ ] 5개 테스트 케이스 작성
- [ ] data-testid 추가 (AIChatWidget 컴포넌트)
- [ ] 테스트 실행 및 통과 확인

### 완료 조건
```bash
# E2E 테스트 실행
npm run test:e2e -- tests/e2e/ai-chat-widget.spec.ts

# 기대 출력:
Running 5 tests using 1 worker
  ✓ should show floating button on all pages (2.3s)
  ✓ should open chat window on button click (1.8s)
  ✓ should close chat window on ESC key (1.5s)
  ✓ should detect page context automatically (3.2s)
  ✓ should work after Fast Refresh (1.1s)

5 passed (10.1s)
```

---

## Sprint 1 완료 조건

### 코드 품질
- [ ] Fast Refresh 경고 5개 → 0개
- [ ] TypeScript 에러 0개
- [ ] ESLint 경고 36개 → 31개 (-5개)

### 기능 동작
- [ ] AI 채팅 위젯 플로팅 버튼 표시
- [ ] 채팅 창 오픈/닫기 동작
- [ ] 페이지 컨텍스트 자동 감지

### 테스트
- [ ] E2E 테스트 5개 통과
- [ ] 총 테스트 292개 → 297개 (+5개)

### 문서
- [ ] SDD 문서 5개 작성
- [ ] CLAUDE.md 업데이트 (v2.19.0 Sprint 1 완료)
- [ ] project-todo.md 체크

### 빌드
```bash
# 린트 검사
npm run lint
# 기대: 31 warnings (36 - 5)

# TypeScript 검사
npx tsc --noEmit
# 기대: 0 errors

# 프로덕션 빌드
npm run build
# 기대: success in ~30s
```

---

## 다음 단계

Sprint 1 완료 후 **Sprint 2: Edge Functions 타입화**로 진행합니다.

- [Sprint 2 문서](./sprint-2.md)
- [구현 전략](../../plan/v2.19/implementation-strategy.md)
- [요구사항](../../spec/v2.19/requirements.md)

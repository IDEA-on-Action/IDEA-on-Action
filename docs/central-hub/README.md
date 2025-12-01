# Central Hub 구현 문서 인덱스

IDEA on Action이 Minu 서비스들의 중심 허브 역할을 수행하기 위한 구현 문서입니다.

---

## 📋 목차

- [개요](#개요)
- [Phase 2 구현 현황](#phase-2-구현-현황)
- [문서 구조](#문서-구조)
- [주요 컴포넌트](#주요-컴포넌트)
- [빠른 시작](#빠른-시작)

---

## 개요

Central Hub는 IDEA on Action이 Minu 서비스(Find, Frame, Build, Keep)의 중앙 통합 포인트로 작동하도록 하는 시스템입니다.

**주요 기능**:
- 서비스별 권한 관리 (MCPProtected HOC)
- 실시간 이벤트 수신 및 알림
- 통합 대시보드 및 모니터링
- 서비스 간 데이터 동기화

---

## Phase 2 구현 현황

### ✅ Agent 1: MCPProtected HOC (완료)

**상태**: Production Ready
**완료일**: 2025-12-01

서비스별 권한 보호를 위한 Higher-Order Component 구현 완료.

**주요 산출물**:
- `src/components/mcp/MCPProtected.tsx` - 메인 HOC
- `src/components/mcp/MCPLoading.tsx` - 로딩 UI
- `src/components/mcp/MCPFallback.tsx` - Fallback UI
- `src/hooks/useMCPPermission.ts` - 권한 확인 훅

**문서**:
- [구현 요약](phase2-agent1-summary.md)
- [검증 가이드](phase2-agent1-verification.md)
- [컴포넌트 문서](../../src/components/mcp/README.md)
- [사용 예시](../examples/mcp-protected-usage.tsx)

**메트릭**:
- 구현 파일: 11개 (1,116 LOC)
- 문서: 4개 (32 KB)
- 번들 크기: ~5 kB (gzip)
- 린트 경고: 0개

---

### 🔄 Agent 2: 서비스별 알림 UI (예정)

**상태**: 예정
**목표**: 서비스별 실시간 알림 컴포넌트 구현

**예상 산출물**:
- EventNotification 컴포넌트
- IssueAlert 컴포넌트
- ServiceStatusBadge 컴포넌트

---

### 🔄 Agent 3: 통합 대시보드 (예정)

**상태**: 예정
**목표**: Central Hub 통합 대시보드 페이지 구현

**예상 산출물**:
- CentralHubDashboard 페이지
- ServiceOverview 컴포넌트
- RealtimeEventStream 컴포넌트

---

## 문서 구조

```
docs/
├── central-hub/
│   ├── README.md                         # 본 문서 (인덱스)
│   ├── phase2-agent1-summary.md          # Agent 1 구현 요약
│   └── phase2-agent1-verification.md     # Agent 1 검증 가이드
├── examples/
│   └── mcp-protected-usage.tsx           # MCPProtected 사용 예시
└── guides/
    └── mcp-deployment-checklist.md       # MCP 배포 체크리스트

src/
├── components/
│   └── mcp/
│       └── README.md                     # MCP 컴포넌트 상세 문서
└── types/
    └── central-hub.types.ts              # Central Hub 타입 정의
```

---

## 주요 컴포넌트

### 1. MCPProtected (Phase 2 - Agent 1)

서비스별 권한을 확인하고 보호하는 Higher-Order Component입니다.

**위치**: `src/components/mcp/MCPProtected.tsx`

**사용법**:
```tsx
import { MCPProtected } from '@/components/mcp';

function MyPage() {
  return (
    <MCPProtected serviceId="minu-find">
      <ProtectedContent />
    </MCPProtected>
  );
}
```

**상세 문서**: [MCP 컴포넌트 README](../../src/components/mcp/README.md)

---

### 2. ServiceHealthCard

Minu 서비스의 헬스 상태를 카드 형태로 표시하는 컴포넌트입니다.

**위치**: `src/components/central-hub/ServiceHealthCard.tsx`

**사용법**:
```tsx
import { ServiceHealthCard } from '@/components/central-hub';

function Dashboard() {
  return (
    <div className="grid grid-cols-2 gap-4">
      <ServiceHealthCard serviceId="minu-find" />
      <ServiceHealthCard serviceId="minu-frame" />
      <ServiceHealthCard serviceId="minu-build" />
      <ServiceHealthCard serviceId="minu-keep" />
    </div>
  );
}
```

---

### 3. EventTimeline

서비스 이벤트를 타임라인 형태로 표시하는 컴포넌트입니다.

**위치**: `src/components/central-hub/EventTimeline.tsx`

**사용법**:
```tsx
import { EventTimeline } from '@/components/central-hub';

function EventsPage() {
  return <EventTimeline serviceId="minu-build" limit={20} />;
}
```

---

### 4. IssueList

서비스 이슈를 리스트 형태로 표시하는 컴포넌트입니다.

**위치**: `src/components/central-hub/IssueList.tsx`

**사용법**:
```tsx
import { IssueList } from '@/components/central-hub';

function IssuesPage() {
  return (
    <IssueList
      serviceId="minu-frame"
      severity="high"
      status="open"
    />
  );
}
```

---

## 빠른 시작

### 1. MCPProtected 사용하기

```tsx
// 1. 임포트
import { MCPProtected } from '@/components/mcp';

// 2. 컴포넌트 감싸기
export function MinuFindPage() {
  return (
    <MCPProtected serviceId="minu-find">
      <YourProtectedContent />
    </MCPProtected>
  );
}
```

### 2. 권한 확인 훅 사용하기

```tsx
import { useMCPServicePermission } from '@/hooks/useMCPPermission';

function MyComponent() {
  const {
    hasAccess,
    isLoading,
    subscription
  } = useMCPServicePermission('minu-find');

  if (isLoading) return <Loader />;
  if (!hasAccess) return <Upgrade />;

  return <Content />;
}
```

### 3. 서비스 헬스 표시하기

```tsx
import { ServiceHealthCard } from '@/components/central-hub';

function Dashboard() {
  return (
    <div className="grid grid-cols-2 gap-4">
      <ServiceHealthCard serviceId="minu-find" />
      <ServiceHealthCard serviceId="minu-frame" />
    </div>
  );
}
```

---

## 타입 정의

### ServiceId

```typescript
type ServiceId =
  | 'minu-find'
  | 'minu-frame'
  | 'minu-build'
  | 'minu-keep';
```

### EventType

```typescript
type EventType =
  | 'progress.updated'
  | 'task.completed'
  | 'task.started'
  | 'milestone.reached'
  | 'issue.created'
  | 'issue.resolved'
  | 'service.health'
  | 'user.action';
```

### HealthStatus

```typescript
type HealthStatus =
  | 'healthy'
  | 'degraded'
  | 'unhealthy'
  | 'unknown';
```

**전체 타입 정의**: [central-hub.types.ts](../../src/types/central-hub.types.ts)

---

## 관련 문서

### Phase 2 문서
- [Agent 1 구현 요약](phase2-agent1-summary.md)
- [Agent 1 검증 가이드](phase2-agent1-verification.md)

### 컴포넌트 문서
- [MCP 컴포넌트](../../src/components/mcp/README.md)
- [사용 예시](../examples/mcp-protected-usage.tsx)

### 스펙 문서
- [MCP Server 스펙](../specs/mcp-server-spec.md)
- [배포 체크리스트](../guides/mcp-deployment-checklist.md)

### 타입 정의
- [Central Hub 타입](../../src/types/central-hub.types.ts)

---

## 기여 가이드

### 새로운 컴포넌트 추가

1. **컴포넌트 작성**
   - `src/components/central-hub/` 또는 `src/components/mcp/`에 작성
   - TypeScript strict mode 준수
   - JSDoc 문서화 필수
   - 한글 주석 사용

2. **타입 정의**
   - `src/types/central-hub.types.ts`에 타입 추가
   - 기존 타입과 일관성 유지

3. **문서 작성**
   - 컴포넌트 README 업데이트
   - 사용 예시 추가
   - 본 인덱스 문서 업데이트

4. **테스트**
   - 유닛 테스트 작성 (선택)
   - 통합 테스트 작성 (선택)
   - 빌드 및 린트 확인 (필수)

---

## 문제 해결

### Q: MCPProtected가 작동하지 않습니다

**A**: 다음을 확인하세요.
1. 올바른 serviceId 사용 (`'minu-find'`, `'minu-frame'`, `'minu-build'`, `'minu-keep'`)
2. 사용자 로그인 상태
3. 활성 구독 여부
4. React Query DevTools로 캐시 확인

### Q: 권한 캐시를 무효화하고 싶습니다

**A**: 권한 훅의 `invalidate` 함수를 사용하세요.
```tsx
const { invalidate } = useMCPServicePermission('minu-find');
invalidate(); // 캐시 무효화
```

### Q: 커스텀 Fallback UI를 만들고 싶습니다

**A**: `fallback` prop을 사용하세요.
```tsx
<MCPProtected
  serviceId="minu-frame"
  fallback={<MyCustomUpgradePrompt />}
>
  <Content />
</MCPProtected>
```

---

## 연락처

**프로젝트**: IDEA on Action
**버전**: 2.24.0
**최종 업데이트**: 2025-12-01

**관련 문의**:
- 기술 지원: 프로젝트 이슈 트래커
- 문서 개선: Pull Request 환영

---

**이전**: [프로젝트 문서 인덱스](../README.md)
**다음**: [Phase 2 - Agent 1 구현 요약](phase2-agent1-summary.md)

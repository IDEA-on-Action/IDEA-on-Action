# MCP 권한 보호 컴포넌트

Minu 서비스 접근 권한을 관리하는 컴포넌트 모음입니다.

---

## 📦 구성 요소

### 1. MCPProtected (메인 HOC)

서비스별 권한을 확인하고 보호하는 Higher-Order Component입니다.

**Props**:
```typescript
interface MCPProtectedProps {
  serviceId: MinuServiceId;            // 'minu-find' | 'minu-frame' | 'minu-build' | 'minu-keep'
  requiredPermission?: string;         // 추가 권한 (선택)
  fallback?: React.ReactNode;          // 권한 없을 시 표시할 UI
  loadingFallback?: React.ReactNode;   // 로딩 중 표시할 UI
  children: React.ReactNode;           // 보호할 컨텐츠
}
```

**사용 예시**:
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

---

### 2. MCPLoading

권한 확인 중 표시되는 로딩 UI 컴포넌트입니다.

**Props**:
```typescript
interface MCPLoadingProps {
  serviceId?: string;  // 서비스 ID (메시지 커스터마이징)
  message?: string;    // 커스텀 메시지
}
```

**사용 예시**:
```tsx
import { MCPLoading } from '@/components/mcp';

function CustomLoading() {
  return <MCPLoading serviceId="minu-frame" />;
}
```

---

### 3. MCPFallback

권한이 없을 때 표시되는 Fallback UI 컴포넌트입니다.

**Props**:
```typescript
interface MCPFallbackProps {
  serviceId: string;
  reason: FallbackReason;      // 'no_subscription' | 'insufficient_plan' | 'expired' | 'service_error' | 'render_error'
  requiredPlan?: string;       // 필요한 플랜
  currentPlan?: string;        // 현재 플랜
  message?: string;            // 커스텀 메시지
}
```

**사용 예시**:
```tsx
import { MCPFallback } from '@/components/mcp';

function CustomFallback() {
  return (
    <MCPFallback
      serviceId="minu-build"
      reason="insufficient_plan"
      requiredPlan="Pro"
      currentPlan="Basic"
    />
  );
}
```

---

### 4. withMCPProtection (HOC 헬퍼)

MCPProtected를 HOC 패턴으로 사용할 수 있게 해주는 헬퍼 함수입니다.

**시그니처**:
```typescript
function withMCPProtection<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  serviceId: MinuServiceId,
  requiredPermission?: string
): React.ComponentType<P>
```

**사용 예시**:
```tsx
import { withMCPProtection } from '@/components/mcp';

function MinuFrameContent() {
  return <div>Minu Frame 컨텐츠</div>;
}

// HOC로 감싸기
const ProtectedMinuFrame = withMCPProtection(
  MinuFrameContent,
  'minu-frame'
);

// 사용
function App() {
  return <ProtectedMinuFrame />;
}
```

---

## 🎯 주요 기능

### 1. 서비스별 권한 확인

```tsx
<MCPProtected serviceId="minu-find">
  <MinuFindContent />
</MCPProtected>
```

- 사용자 로그인 여부 확인
- 구독 상태 확인
- 서비스별 기본 권한 확인

---

### 2. 추가 권한 확인

```tsx
<MCPProtected
  serviceId="minu-build"
  requiredPermission="export_data"
>
  <ExportFeature />
</MCPProtected>
```

- 서비스 기본 권한 + 추가 권한 확인
- 플랜별 세부 기능 제어

---

### 3. 커스텀 UI

```tsx
<MCPProtected
  serviceId="minu-keep"
  fallback={<CustomUpgradePrompt />}
  loadingFallback={<CustomLoader />}
>
  <KeepContent />
</MCPProtected>
```

- 로딩 UI 커스터마이징
- Fallback UI 커스터마이징

---

### 4. 자동 캐싱

- React Query 기반 5분 TTL 캐싱
- 불필요한 API 호출 방지
- 성능 최적화

---

## 🔄 권한 확인 플로우

```
1. 로딩 시작
   ↓
2. 사용자 인증 확인
   ├─ 비로그인 → Fallback (no_subscription)
   └─ 로그인 → 다음 단계
      ↓
3. 구독 조회
   ├─ 구독 없음 → Fallback (no_subscription)
   ├─ 구독 만료 → Fallback (expired)
   └─ 활성 구독 → 다음 단계
      ↓
4. 서비스 권한 확인
   ├─ 권한 없음 → Fallback (insufficient_plan)
   └─ 권한 있음 → 다음 단계
      ↓
5. 추가 권한 확인 (있는 경우)
   ├─ 권한 없음 → Fallback (insufficient_plan)
   └─ 권한 있음 → children 렌더링
```

---

## 🎨 Fallback 사유별 UI

### 1. no_subscription (구독 없음)

- **아이콘**: 🔒 Lock
- **제목**: "구독이 필요합니다"
- **설명**: "{서비스명} 서비스를 이용하려면 구독이 필요합니다."
- **CTA**:
  - Primary: "플랜 선택하기" → `/services/minu/{서비스}`
  - Secondary: "무료 체험 시작" → `/signup?trial=true`

---

### 2. insufficient_plan (플랜 부족)

- **아이콘**: 🔒 Lock (amber)
- **제목**: "플랜 업그레이드 필요"
- **설명**: "이 기능은 {필요플랜} 플랜 이상에서 사용 가능합니다. 현재: {현재플랜}"
- **CTA**:
  - Primary: "업그레이드" → `/subscriptions/upgrade?plan={플랜}`
  - Secondary: "플랜 비교" → `/pricing`

---

### 3. expired (구독 만료)

- **아이콘**: ⏰ Clock
- **제목**: "구독이 만료되었습니다"
- **설명**: "구독을 갱신하면 서비스를 계속 이용할 수 있습니다."
- **CTA**:
  - Primary: "구독 갱신" → `/subscriptions/renew`
  - Secondary: "고객 지원" → `/support`

---

### 4. service_error (서비스 오류)

- **아이콘**: ⚠ AlertCircle
- **제목**: "일시적인 문제가 발생했습니다"
- **설명**: "잠시 후 다시 시도해주세요."
- **CTA**:
  - Primary: "새로고침" → `window.location.reload()`
  - Secondary: "고객 지원" → `/support`

---

## 📖 고급 사용법

### 1. 중첩 권한

```tsx
<MCPProtected serviceId="minu-frame">
  <div>
    <h1>Minu Frame 기본 기능</h1>

    {/* 중첩된 추가 권한 */}
    <MCPProtected
      serviceId="minu-frame"
      requiredPermission="advanced_analytics"
    >
      <AdvancedAnalytics />
    </MCPProtected>
  </div>
</MCPProtected>
```

---

### 2. 동적 서비스 ID

```tsx
interface DynamicPageProps {
  serviceId: ServiceId;
}

function DynamicPage({ serviceId }: DynamicPageProps) {
  return (
    <MCPProtected serviceId={serviceId}>
      <ServiceContent serviceId={serviceId} />
    </MCPProtected>
  );
}
```

---

### 3. 에러 바운더리 통합

```tsx
import { ErrorBoundary } from 'react-error-boundary';

function SafePage() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <MCPProtected serviceId="minu-build">
        <BuildContent />
      </MCPProtected>
    </ErrorBoundary>
  );
}
```

---

## 🔧 권한 훅 사용

### useMCPServicePermission

```tsx
import { useMCPServicePermission } from '@/hooks/useMCPPermission';

function MyComponent() {
  const {
    hasAccess,        // 서비스 접근 가능 여부
    hasPermission,    // 추가 권한 보유 여부
    isLoading,        // 로딩 중 여부
    error,            // 에러
    subscription,     // 구독 정보
    requiredPlan,     // 필요한 플랜
    invalidate,       // 캐시 무효화
  } = useMCPServicePermission('minu-find', 'export_data');

  if (isLoading) return <Loader />;
  if (!hasAccess) return <Upgrade />;

  return <Content />;
}
```

---

## 🎯 타입 정의

### ServiceId

```typescript
type ServiceId =
  | 'minu-find'
  | 'minu-frame'
  | 'minu-build'
  | 'minu-keep';
```

### FallbackReason

```typescript
type FallbackReason =
  | 'no_subscription'
  | 'insufficient_plan'
  | 'expired'
  | 'service_error'
  | 'render_error';
```

### Permission

```typescript
type Permission = 'none' | 'read' | 'write' | 'admin';
```

---

## 📚 참고 문서

- [useMCPPermission 훅](../../../hooks/useMCPPermission.ts)
- [Central Hub 타입](../../../types/central-hub.types.ts)
- [사용 예시](../../../docs/examples/mcp-protected-usage.tsx)
- [검증 가이드](../../../docs/central-hub/phase2-agent1-verification.md)

---

## 🐛 문제 해결

### Q: "구독이 있는데도 Fallback이 표시됩니다"

**A**: 캐시를 무효화해보세요.

```tsx
const { invalidate } = useMCPServicePermission('minu-find');

// 구독 변경 후
invalidate();
```

---

### Q: "로딩이 너무 오래 걸립니다"

**A**: React Query 캐시가 만료되었을 수 있습니다. DevTools로 확인해보세요.

```tsx
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

<ReactQueryDevtools initialIsOpen={false} />
```

---

### Q: "타입 에러가 발생합니다"

**A**: ServiceId 타입이 올바른지 확인하세요.

```tsx
// ✅ 올바름
<MCPProtected serviceId="minu-find">

// ❌ 잘못됨
<MCPProtected serviceId="minu-search">
```

---

**버전**: 2.24.0
**최종 업데이트**: 2025-12-01

# Subscription Components

Minu 통합용 구독 관리 React 컴포넌트 및 훅 라이브러리입니다.

## 📦 설치된 컴포넌트

### 컴포넌트
1. **SubscriptionGate** - 기능 접근 제어 래퍼
2. **UpgradePrompt** - 업그레이드 유도 UI
3. **UsageIndicator** - 사용량 표시 프로그레스 바
4. **BillingDashboard** - 결제 대시보드 전체 페이지

### 훅
1. **useCanAccess** - 기능별 접근 권한 확인
2. **useBillingPortal** - 플랜 변경, 구독 취소 등
3. **useSubscriptionUsage** - 사용량 조회

---

## 🎯 사용법

### 1. SubscriptionGate - 기능 접근 제어

자식 컴포넌트를 기능 접근 제어로 감싸는 HOC/컴포넌트입니다.

```tsx
import { SubscriptionGate } from '@/components/subscription';

// 기본 사용
function MyPage() {
  return (
    <SubscriptionGate feature_key="api_calls">
      <APIConsole />
    </SubscriptionGate>
  );
}

// 커스텀 Fallback
function MyPage2() {
  return (
    <SubscriptionGate
      feature_key="storage_gb"
      fallback={<CustomUpgradeMessage />}
    >
      <FileUploader />
    </SubscriptionGate>
  );
}

// HOC 형태로 사용
import { withSubscriptionGate } from '@/components/subscription';

const ProtectedAPIConsole = withSubscriptionGate(
  APIConsole,
  'api_calls'
);

function MyPage3() {
  return <ProtectedAPIConsole />;
}
```

**Props**:
- `feature_key` (string, 필수): 기능 키 (예: 'api_calls', 'storage_gb')
- `fallback` (ReactNode, 선택): 접근 불가 시 표시할 커스텀 컴포넌트
- `children` (ReactNode, 필수): 자식 컴포넌트

**동작**:
- 로딩 중: Skeleton UI 표시
- 접근 불가: fallback 또는 UpgradePrompt 표시
- 접근 가능: children 렌더링

---

### 2. UpgradePrompt - 업그레이드 유도 UI

접근 권한이 없을 때 플랜 업그레이드를 유도하는 UI입니다.

```tsx
import { UpgradePrompt } from '@/components/subscription';

function RestrictedPage() {
  return (
    <UpgradePrompt
      feature_key="api_calls"
      currentPlan="Basic"
      requiredPlan="Pro"
    />
  );
}
```

**Props**:
- `feature_key` (string, 필수): 기능 키
- `currentPlan` (string, 선택): 현재 플랜
- `requiredPlan` (string, 선택): 필요한 플랜 (기본값: 'Pro')

**기능**:
- 플랜 비교 배지 (현재 → 권장)
- 업그레이드 혜택 목록
- 업그레이드 버튼 (결제 페이지로 이동)
- 플랜 비교 버튼 (프라이싱 페이지로 이동)

---

### 3. UsageIndicator - 사용량 표시

기능별 사용량을 프로그레스 바로 시각화합니다.

```tsx
import { UsageIndicator } from '@/components/subscription';

// 기본 사용
function Dashboard() {
  return <UsageIndicator feature_key="api_calls" />;
}

// 라벨 표시
function Dashboard2() {
  return (
    <UsageIndicator
      feature_key="storage_gb"
      showLabel
    />
  );
}

// 크기 조절
function Dashboard3() {
  return (
    <UsageIndicator
      feature_key="team_members"
      size="lg"
      showLabel
    />
  );
}
```

**Props**:
- `feature_key` (string, 필수): 기능 키
- `showLabel` (boolean, 선택): 라벨 표시 여부 (기본값: false)
- `size` ('sm' | 'md' | 'lg', 선택): 크기 (기본값: 'md')
- `className` (string, 선택): 커스텀 클래스명

**색상 규칙**:
- 0~50%: 초록 (안전)
- 50~90%: 노랑 (주의)
- 90~100%: 빨강 (위험)
- 무제한: ∞ 표시

---

### 4. BillingDashboard - 결제 대시보드

구독 관리, 결제 내역, 사용량을 통합적으로 표시하는 전체 페이지 컴포넌트입니다.

```tsx
import { BillingDashboard } from '@/components/subscription';

function SettingsPage() {
  return <BillingDashboard />;
}
```

**기능**:
- 현재 구독 정보 (플랜, 다음 결제일, 결제 수단)
- 이번 달 사용량 요약 (4개 서비스별)
- 최근 결제 내역 테이블
- 플랜 변경 버튼
- 구독 취소 다이얼로그 (확인 절차)

**섹션**:
1. **현재 구독**: 플랜 이름, 가격, 상태, 다음 결제일
2. **이번 달 사용량**: 기능별 사용량 프로그레스 바
3. **최근 결제 내역**: 날짜, 설명, 금액, 상태

---

## 🪝 훅 사용법

### 1. useCanAccess - 기능 접근 권한 확인

```tsx
import { useCanAccess } from '@/hooks/subscription';

function MyComponent() {
  const { canAccess, remaining, limit, isUnlimited, isLoading } = useCanAccess('api_calls');

  if (isLoading) return <div>로딩 중...</div>;

  if (!canAccess) {
    return <div>접근 권한이 없습니다. 남은 사용량: {remaining}/{limit}</div>;
  }

  return <div>기능을 사용할 수 있습니다.</div>;
}
```

**반환 타입**:
```typescript
{
  canAccess: boolean;        // 접근 가능 여부
  remaining: number;         // 남은 사용량
  limit: number;             // 총 사용 제한
  isUnlimited: boolean;      // 무제한 여부
  isLoading: boolean;        // 로딩 중
  error: Error | null;       // 에러
  currentPlan?: string;      // 현재 플랜
  requiredPlan?: string;     // 필요한 플랜
}
```

---

### 2. useBillingPortal - 플랜 변경 및 구독 관리

```tsx
import { useBillingPortal } from '@/hooks/subscription';

function SettingsPage() {
  const {
    upgradePlan,
    cancelSubscription,
    renewSubscription,
    upgradeLoading,
  } = useBillingPortal();

  const handleUpgrade = async () => {
    await upgradePlan({
      subscription_id: 'sub_123',
      new_plan_id: 'plan_pro',
    });
  };

  const handleCancel = async () => {
    await cancelSubscription({
      subscription_id: 'sub_123',
      cancel_at_period_end: true,
      reason: '사용자 요청',
    });
  };

  return (
    <div>
      <button onClick={handleUpgrade} disabled={upgradeLoading}>
        Pro 플랜으로 업그레이드
      </button>
      <button onClick={handleCancel}>구독 취소</button>
    </div>
  );
}
```

**반환 타입**:
```typescript
{
  upgradePlan: (request: UpgradeSubscriptionRequest) => Promise<void>;
  upgradeLoading: boolean;
  cancelSubscription: (request: CancelSubscriptionRequest) => Promise<void>;
  cancelLoading: boolean;
  renewSubscription: (subscriptionId: string) => Promise<void>;
  renewLoading: boolean;
  updatePaymentMethod: (subscriptionId: string, billingKeyId: string) => Promise<void>;
  updatePaymentLoading: boolean;
}
```

---

### 3. useSubscriptionUsage - 사용량 조회

```tsx
import { useSubscriptionUsage } from '@/hooks/subscription';

function UsagePage() {
  const { data, isLoading } = useSubscriptionUsage();

  if (isLoading) return <div>로딩 중...</div>;

  return (
    <div>
      <h2>플랜: {data?.plan_name}</h2>
      <p>다음 리셋: {data?.next_reset_date}</p>
      {data?.features.map(feature => (
        <div key={feature.feature_key}>
          <span>{feature.feature_name}</span>
          <span>{feature.usage_count} / {feature.limit}</span>
          <span>{feature.usage_percentage}%</span>
        </div>
      ))}
    </div>
  );
}
```

**반환 타입**:
```typescript
{
  data: SubscriptionUsageSummary | null;
  isLoading: boolean;
}

interface SubscriptionUsageSummary {
  subscription_id: string;
  plan_name: string;
  features: FeatureUsage[];
  next_reset_date: string;
}

interface FeatureUsage {
  feature_key: string;
  feature_name: string;
  usage_count: number;
  limit: number;
  is_unlimited: boolean;
  usage_percentage: number;
}
```

---

## 🗃️ 데이터베이스 요구사항

### 필요한 테이블
1. **subscriptions** - 구독 정보
2. **subscription_plans** - 플랜 정보
3. **subscription_usage** - 사용량 기록
4. **subscription_payments** - 결제 내역
5. **billing_keys** - 결제 수단

### 플랜 features 예시 (JSON)
```json
{
  "api_calls": 1000,        // 숫자: 제한
  "storage_gb": 10,
  "team_members": 3,
  "projects": -1,           // -1: 무제한
  "exports": true,          // boolean: 가능/불가능
  "priority_support": false
}
```

---

## 🎨 디자인 시스템

### 색상 규칙
- **초록 (green-500)**: 안전 (0~50% 사용)
- **노랑 (yellow-500)**: 주의 (50~90% 사용)
- **빨강 (red-500)**: 위험 (90~100% 사용)

### 배지 Variant
- `default`: 활성 상태
- `secondary`: 체험 중
- `destructive`: 취소/실패
- `outline`: 만료

### 반응형
- **모바일**: 단일 컬럼
- **태블릿**: 2컬럼 그리드
- **데스크톱**: 3컬럼 그리드

---

## 📝 타입 정의

모든 타입은 `@/types/subscription.types.ts`에 정의되어 있습니다.

```typescript
import type {
  Subscription,
  SubscriptionWithPlan,
  SubscriptionPaymentWithDetails,
  CreateSubscriptionRequest,
  CancelSubscriptionRequest,
  UpgradeSubscriptionRequest,
  SubscriptionSummary,
  NextBillingInfo,
} from '@/types/subscription.types';
```

---

## 🧪 테스트

E2E 테스트 예시:

```typescript
// tests/e2e/subscription.spec.ts
import { test, expect } from '@playwright/test';

test('구독 게이트 - 접근 불가 시 업그레이드 프롬프트 표시', async ({ page }) => {
  await page.goto('/protected-feature');
  await expect(page.getByText('업그레이드가 필요합니다')).toBeVisible();
});

test('사용량 인디케이터 - 프로그레스 바 표시', async ({ page }) => {
  await page.goto('/dashboard');
  const progress = page.getByRole('progressbar');
  await expect(progress).toBeVisible();
});
```

---

## 🔧 커스터마이징

### 기능 이름 변경

`UsageIndicator.tsx`, `useSubscriptionUsage.ts`에서 `FEATURE_NAMES` 객체를 수정하세요:

```typescript
const FEATURE_NAMES: Record<string, string> = {
  api_calls: 'API 호출',
  storage_gb: '저장 공간',
  custom_feature: '커스텀 기능', // 추가
};
```

### 업그레이드 혜택 수정

`UpgradePrompt.tsx`에서 혜택 목록을 수정하세요:

```tsx
<ul className="space-y-1 ml-4">
  <li>✓ {featureName} 무제한 사용</li>
  <li>✓ 커스텀 혜택 1</li>
  <li>✓ 커스텀 혜택 2</li>
</ul>
```

---

## 📚 참고 문서

- [Supabase 구독 시스템 가이드](../../../docs/guides/subscription/)
- [Toss Payments 연동 가이드](../../../docs/guides/toss-payments/)
- [MCP 권한 관리](../mcp/README.md)

---

## 🐛 문제 해결

### 1. "로그인이 필요합니다" 에러
→ `useAuth` 훅이 제대로 동작하는지 확인하세요.

### 2. 구독 정보가 로딩되지 않음
→ Supabase RLS 정책이 올바르게 설정되었는지 확인하세요.

### 3. 사용량이 업데이트되지 않음
→ `subscription_usage` 테이블에 레코드가 생성되었는지 확인하세요.

---

## 📄 라이선스

이 컴포넌트는 IDEA on Action 프로젝트의 일부입니다.

# Central Hub Phase 2 - 상세 기술 명세

> MCPProtected HOC 및 권한 관리 시스템 상세 설계

**작성일**: 2025-11-23
**버전**: 1.0.0
**관련 문서**:
- [requirements.md](requirements.md)
- [acceptance-criteria.md](acceptance-criteria.md)
- [sprint-2.md](../../tasks/central-hub/sprint-2.md)

---

## 1. 현재 상태 분석

### 1.1 기존 구현

#### useMCPClient.ts (완료)
```typescript
// 이미 구현된 기능
- useMCPClient(): MCP 서버 연결 및 기본 API
- useCompassPermission(permission): 단일 권한 확인
- useCompassPermissions(permissions[]): 다중 권한 확인
- useMinuSubscription(): 구독 정보 조회
```

#### MinuFramePage.tsx (현재 패턴)
```typescript
// 현재: 각 페이지에서 직접 MCP 훅 호출
const { subscription, isLoading, error } = useMinuSubscription();
const { hasPermission } = useCompassPermission('feature_x');
```

### 1.2 문제점

1. **코드 중복**: 각 페이지마다 동일한 권한 확인 로직 반복
2. **일관성 부족**: Fallback UI가 페이지마다 다름
3. **캐싱 비효율**: 같은 권한을 여러 컴포넌트에서 중복 요청

---

## 2. 목표 아키텍처

### 2.1 MCPProtected HOC

```
┌─────────────────────────────────────────────────────────┐
│ MCPPermissionProvider (전역 Context)                    │
│  ├── 권한 캐시 관리                                      │
│  └── 캐시 무효화 함수                                    │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│ MCPProtected (HOC)                                      │
│  ├── serviceId로 권한 확인                               │
│  ├── 로딩 시 MCPLoading 표시                            │
│  ├── 권한 없음 시 MCPFallback 표시                      │
│  └── 권한 있음 시 children 렌더링                       │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│ MinuFramePage / MinuBuildPage / MinuKeepPage            │
│  └── MCPProtected 래핑                                   │
└─────────────────────────────────────────────────────────┘
```

### 2.2 파일 구조

```
src/
├── components/
│   └── mcp/
│       ├── index.ts                    # Export 모음
│       ├── MCPProtected.tsx            # HOC 컴포넌트
│       ├── MCPLoading.tsx              # 로딩 상태 UI
│       ├── MCPFallback.tsx             # 권한 없음 UI
│       └── MCPPermissionContext.tsx    # 전역 Context
├── hooks/
│   └── useMCPPermission.ts             # 새 훅 (기존 확장)
```

---

## 3. 상세 스펙

### 3.1 MCPProtected.tsx

```typescript
// 파일: src/components/mcp/MCPProtected.tsx

import React from 'react';
import { useMCPServicePermission } from '@/hooks/useMCPPermission';
import { MCPLoading } from './MCPLoading';
import { MCPFallback } from './MCPFallback';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';

/**
 * Minu 서비스 ID
 */
export type MinuServiceId =
  | 'minu-find'
  | 'minu-frame'
  | 'minu-build'
  | 'minu-keep';

/**
 * MCPProtected 컴포넌트 Props
 */
interface MCPProtectedProps {
  /** 서비스 ID (minu-find, minu-frame, minu-build, minu-keep) */
  serviceId: MinuServiceId;

  /** 추가로 필요한 권한 (예: 'export_data', 'advanced_analytics') */
  requiredPermission?: string;

  /** 권한 없을 때 표시할 커스텀 컴포넌트 */
  fallback?: React.ReactNode;

  /** 로딩 중 표시할 커스텀 컴포넌트 */
  loadingFallback?: React.ReactNode;

  /** 자식 컴포넌트 */
  children: React.ReactNode;
}

/**
 * MCP 권한 기반 보호 컴포넌트
 *
 * @example
 * ```tsx
 * <MCPProtected serviceId="minu-frame">
 *   <MinuFrameContent />
 * </MCPProtected>
 *
 * <MCPProtected
 *   serviceId="minu-build"
 *   requiredPermission="export_data"
 *   fallback={<CustomUpgradePrompt />}
 * >
 *   <ExportFeature />
 * </MCPProtected>
 * ```
 */
export function MCPProtected({
  serviceId,
  requiredPermission,
  fallback,
  loadingFallback,
  children,
}: MCPProtectedProps) {
  const {
    hasAccess,
    isLoading,
    error,
    subscription,
    requiredPlan,
  } = useMCPServicePermission(serviceId, requiredPermission);

  // 에러 발생 시 Fallback 표시
  if (error) {
    return (
      <MCPFallback
        serviceId={serviceId}
        reason="service_error"
        message="서비스 연결 중 문제가 발생했습니다."
      />
    );
  }

  // 로딩 중
  if (isLoading) {
    return loadingFallback ?? <MCPLoading serviceId={serviceId} />;
  }

  // 권한 없음
  if (!hasAccess) {
    return fallback ?? (
      <MCPFallback
        serviceId={serviceId}
        reason={subscription ? 'insufficient_plan' : 'no_subscription'}
        requiredPlan={requiredPlan}
        currentPlan={subscription?.planName}
      />
    );
  }

  // 권한 있음 - children 렌더링
  return (
    <ErrorBoundary fallback={<MCPFallback serviceId={serviceId} reason="render_error" />}>
      {children}
    </ErrorBoundary>
  );
}
```

### 3.2 MCPLoading.tsx

```typescript
// 파일: src/components/mcp/MCPLoading.tsx

import { Skeleton } from '@/components/ui/skeleton';
import { Loader2 } from 'lucide-react';

interface MCPLoadingProps {
  serviceId: string;
  message?: string;
}

/**
 * MCP 권한 확인 중 로딩 UI
 */
export function MCPLoading({ serviceId, message }: MCPLoadingProps) {
  const serviceName = getServiceName(serviceId);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
      <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
      <p className="text-muted-foreground">
        {message ?? `${serviceName} 서비스 로딩 중...`}
      </p>
    </div>
  );
}

function getServiceName(serviceId: string): string {
  const names: Record<string, string> = {
    'minu-find': 'Minu Find',
    'minu-frame': 'Minu Frame',
    'minu-build': 'Minu Build',
    'minu-keep': 'Minu Keep',
  };
  return names[serviceId] ?? serviceId;
}
```

### 3.3 MCPFallback.tsx

```typescript
// 파일: src/components/mcp/MCPFallback.tsx

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, AlertCircle, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';

type FallbackReason =
  | 'no_subscription'
  | 'insufficient_plan'
  | 'expired'
  | 'service_error'
  | 'render_error';

interface MCPFallbackProps {
  serviceId: string;
  reason: FallbackReason;
  requiredPlan?: string;
  currentPlan?: string;
  message?: string;
}

/**
 * MCP 권한 없음 시 표시되는 Fallback UI
 */
export function MCPFallback({
  serviceId,
  reason,
  requiredPlan,
  currentPlan,
  message,
}: MCPFallbackProps) {
  const serviceName = getServiceName(serviceId);
  const content = getContent(reason, serviceName, requiredPlan, currentPlan, message);

  return (
    <div className="flex items-center justify-center min-h-[400px] p-8">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          {content.icon}
          <CardTitle className="mt-4">{content.title}</CardTitle>
          <CardDescription>{content.description}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {content.primaryAction && (
            <Button asChild>
              <Link to={content.primaryAction.href}>
                {content.primaryAction.label}
              </Link>
            </Button>
          )}
          {content.secondaryAction && (
            <Button variant="outline" asChild>
              <Link to={content.secondaryAction.href}>
                {content.secondaryAction.label}
              </Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function getContent(
  reason: FallbackReason,
  serviceName: string,
  requiredPlan?: string,
  currentPlan?: string,
  message?: string
) {
  switch (reason) {
    case 'no_subscription':
      return {
        icon: <Lock className="h-12 w-12 text-muted-foreground mx-auto" />,
        title: '구독이 필요합니다',
        description: `${serviceName} 서비스를 이용하려면 구독이 필요합니다.`,
        primaryAction: { label: '플랜 선택하기', href: `/services/minu/${serviceName.split(' ')[1]?.toLowerCase()}` },
        secondaryAction: { label: '무료 체험 시작', href: '/signup?trial=true' },
      };

    case 'insufficient_plan':
      return {
        icon: <Lock className="h-12 w-12 text-amber-500 mx-auto" />,
        title: '플랜 업그레이드 필요',
        description: `이 기능은 ${requiredPlan} 플랜 이상에서 사용 가능합니다. 현재: ${currentPlan}`,
        primaryAction: { label: '업그레이드', href: `/subscriptions/upgrade?plan=${requiredPlan?.toLowerCase()}` },
        secondaryAction: { label: '플랜 비교', href: '/pricing' },
      };

    case 'expired':
      return {
        icon: <AlertCircle className="h-12 w-12 text-destructive mx-auto" />,
        title: '구독이 만료되었습니다',
        description: '구독을 갱신하면 서비스를 계속 이용할 수 있습니다.',
        primaryAction: { label: '구독 갱신', href: '/subscriptions/renew' },
        secondaryAction: { label: '고객 지원', href: '/support' },
      };

    case 'service_error':
    case 'render_error':
    default:
      return {
        icon: <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />,
        title: '일시적인 문제가 발생했습니다',
        description: message ?? '잠시 후 다시 시도해주세요.',
        primaryAction: { label: '새로고침', href: '#', onClick: () => window.location.reload() },
        secondaryAction: { label: '고객 지원', href: '/support' },
      };
  }
}

function getServiceName(serviceId: string): string {
  const names: Record<string, string> = {
    'minu-find': 'Minu Find',
    'minu-frame': 'Minu Frame',
    'minu-build': 'Minu Build',
    'minu-keep': 'Minu Keep',
  };
  return names[serviceId] ?? serviceId;
}
```

### 3.4 useMCPPermission.ts (신규)

```typescript
// 파일: src/hooks/useMCPPermission.ts

import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useCompassPermission, useMinuSubscription, mcpQueryKeys } from '@/hooks/useMCPClient';
import type { MinuServiceId } from '@/components/mcp/MCPProtected';

/**
 * 서비스별 기본 권한 매핑
 */
const SERVICE_PERMISSIONS: Record<MinuServiceId, string> = {
  'minu-find': 'access_minu_find',
  'minu-frame': 'access_minu_frame',
  'minu-build': 'access_minu_build',
  'minu-keep': 'access_minu_keep',
};

/**
 * useMCPServicePermission 훅 반환 타입
 */
interface UseMCPServicePermissionResult {
  /** 서비스 접근 가능 여부 */
  hasAccess: boolean;
  /** 추가 권한 보유 여부 */
  hasPermission: boolean;
  /** 로딩 중 여부 */
  isLoading: boolean;
  /** 에러 */
  error: Error | null;
  /** 구독 정보 */
  subscription: {
    planName: string;
    status: string;
    validUntil: string;
  } | null;
  /** 필요한 플랜 */
  requiredPlan?: string;
  /** 캐시 무효화 */
  invalidate: () => void;
}

/**
 * 서비스 단위 권한 확인 훅
 *
 * 구독 상태와 추가 권한을 동시에 확인합니다.
 * React Query를 통해 5분간 캐싱됩니다.
 *
 * @param serviceId - Minu 서비스 ID
 * @param additionalPermission - 추가로 확인할 권한 (선택)
 *
 * @example
 * ```tsx
 * const { hasAccess, isLoading, subscription } = useMCPServicePermission('minu-frame');
 *
 * const { hasAccess, hasPermission } = useMCPServicePermission(
 *   'minu-build',
 *   'export_data'
 * );
 * ```
 */
export function useMCPServicePermission(
  serviceId: MinuServiceId,
  additionalPermission?: string
): UseMCPServicePermissionResult {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // 구독 정보 조회
  const {
    subscription: mcpSubscription,
    isLoading: subscriptionLoading,
    error: subscriptionError,
  } = useMinuSubscription();

  // 서비스 기본 권한 확인
  const basePermission = SERVICE_PERMISSIONS[serviceId];
  const {
    hasPermission: hasBasePermission,
    isLoading: basePermissionLoading,
    requiredPlan: baseRequiredPlan,
  } = useCompassPermission(basePermission, {
    enabled: !!user && !!basePermission,
  });

  // 추가 권한 확인 (있는 경우)
  const {
    hasPermission: hasAdditionalPermission,
    isLoading: additionalPermissionLoading,
    requiredPlan: additionalRequiredPlan,
  } = useCompassPermission(additionalPermission ?? '', {
    enabled: !!user && !!additionalPermission,
  });

  const isLoading = subscriptionLoading || basePermissionLoading ||
    (!!additionalPermission && additionalPermissionLoading);

  const error = subscriptionError || null;

  // 구독 정보 정규화
  const subscription = useMemo(() => {
    if (!mcpSubscription) return null;
    return {
      planName: mcpSubscription.planName,
      status: mcpSubscription.status,
      validUntil: mcpSubscription.validUntil,
    };
  }, [mcpSubscription]);

  // 접근 권한 계산
  const hasAccess = useMemo(() => {
    if (!user) return false;
    if (!subscription) return false;
    if (subscription.status !== 'active') return false;
    return hasBasePermission;
  }, [user, subscription, hasBasePermission]);

  // 추가 권한 계산
  const hasPermission = useMemo(() => {
    if (!additionalPermission) return true;
    return hasAdditionalPermission;
  }, [additionalPermission, hasAdditionalPermission]);

  // 필요한 플랜 결정
  const requiredPlan = additionalRequiredPlan ?? baseRequiredPlan;

  return {
    hasAccess,
    hasPermission,
    isLoading,
    error,
    subscription,
    requiredPlan,
    invalidate: () => {
      queryClient.invalidateQueries({ queryKey: mcpQueryKeys.subscription() });
      queryClient.invalidateQueries({ queryKey: mcpQueryKeys.permission(basePermission) });
      if (additionalPermission) {
        queryClient.invalidateQueries({ queryKey: mcpQueryKeys.permission(additionalPermission) });
      }
    },
  };
}

/**
 * 전역 MCP 권한 캐시 무효화
 */
export function useInvalidateMCPCache() {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () => {
      queryClient.invalidateQueries({ queryKey: ['mcp'] });
    },
    invalidateSubscription: () => {
      queryClient.invalidateQueries({ queryKey: mcpQueryKeys.subscription() });
    },
    invalidatePermission: (permission: string) => {
      queryClient.invalidateQueries({ queryKey: mcpQueryKeys.permission(permission) });
    },
  };
}
```

### 3.5 MCPPermissionContext.tsx

```typescript
// 파일: src/components/mcp/MCPPermissionContext.tsx

import React, { createContext, useContext, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { mcpQueryKeys } from '@/hooks/useMCPClient';
import type { MinuServiceId } from './MCPProtected';

/**
 * MCP 권한 Context 값
 */
interface MCPPermissionContextValue {
  /** 모든 MCP 캐시 무효화 */
  invalidateAll: () => void;
  /** 특정 서비스 캐시 무효화 */
  invalidateService: (serviceId: MinuServiceId) => void;
  /** 구독 정보 캐시 무효화 */
  invalidateSubscription: () => void;
}

const MCPPermissionContext = createContext<MCPPermissionContextValue | null>(null);

/**
 * MCP 권한 Provider
 *
 * 앱 최상위에 배치하여 전역 권한 캐시를 관리합니다.
 *
 * @example
 * ```tsx
 * // App.tsx
 * <MCPPermissionProvider>
 *   <App />
 * </MCPPermissionProvider>
 * ```
 */
export function MCPPermissionProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['mcp'] });
  }, [queryClient]);

  const invalidateService = useCallback((serviceId: MinuServiceId) => {
    const permission = `access_${serviceId.replace('-', '_')}`;
    queryClient.invalidateQueries({ queryKey: mcpQueryKeys.permission(permission) });
  }, [queryClient]);

  const invalidateSubscription = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: mcpQueryKeys.subscription() });
  }, [queryClient]);

  const value = useMemo(() => ({
    invalidateAll,
    invalidateService,
    invalidateSubscription,
  }), [invalidateAll, invalidateService, invalidateSubscription]);

  return (
    <MCPPermissionContext.Provider value={value}>
      {children}
    </MCPPermissionContext.Provider>
  );
}

/**
 * MCP 권한 Context 훅
 *
 * @example
 * ```tsx
 * const { invalidateAll } = useMCPPermissionContext();
 *
 * // 구독 변경 후 캐시 무효화
 * await updateSubscription();
 * invalidateAll();
 * ```
 */
export function useMCPPermissionContext(): MCPPermissionContextValue {
  const context = useContext(MCPPermissionContext);

  if (!context) {
    throw new Error('useMCPPermissionContext must be used within MCPPermissionProvider');
  }

  return context;
}
```

---

## 4. 적용 예시

### 4.1 MinuFramePage 리팩토링

```typescript
// 기존
export default function MinuFramePage() {
  const { subscription, isLoading, error } = useMinuSubscription();
  // ... 복잡한 권한 확인 로직

  return <PageLayout>...</PageLayout>;
}

// 개선
import { MCPProtected } from '@/components/mcp';

export default function MinuFramePage() {
  return (
    <MCPProtected serviceId="minu-frame">
      <MinuFrameContent />
    </MCPProtected>
  );
}

function MinuFrameContent() {
  // 이 컴포넌트는 권한이 확인된 후에만 렌더링됨
  const service = minuFrameService;
  // ...
}
```

### 4.2 기능별 권한 확인

```typescript
// 특정 기능에 대한 추가 권한 확인
<MCPProtected
  serviceId="minu-frame"
  requiredPermission="export_data"
>
  <ExportButton />
</MCPProtected>
```

---

## 5. 테스트 시나리오

### 5.1 E2E 테스트

| 시나리오 | 기대 결과 |
|---------|----------|
| 구독자가 서비스 페이지 접근 | 컨텐츠 정상 표시 |
| 비구독자가 서비스 페이지 접근 | MCPFallback 표시 |
| 만료된 구독으로 접근 | "구독 만료" Fallback 표시 |
| MCP 서버 오류 시 | "일시적 문제" Fallback 표시 |
| 권한 캐시 테스트 | 5분 이내 재요청 시 캐시 사용 |

### 5.2 유닛 테스트

- MCPProtected: 권한 상태별 렌더링
- useMCPServicePermission: 권한 계산 로직
- MCPFallback: 각 reason에 따른 UI

---

## 6. 성능 고려사항

### 6.1 캐싱 전략

| 데이터 | TTL | 이유 |
|--------|-----|------|
| 구독 정보 | 5분 | 변경 빈도 낮음 |
| 권한 정보 | 5분 | 플랜과 연동 |
| 서버 헬스 | 30초 | 빠른 감지 필요 |

### 6.2 번들 영향

- 예상 증가량: ~15KB (gzip)
- 코드 스플리팅: `@/components/mcp` 청크 분리 가능

---

## 7. 마이그레이션 계획

### Phase 1: 기반 구축 (TASK-CH-007~009)
1. MCPProtected, MCPLoading, MCPFallback 생성
2. useMCPServicePermission 훅 생성
3. MCPPermissionContext 생성

### Phase 2: 적용 (TASK-CH-010~012)
1. MinuFramePage MCPProtected 적용
2. MinuBuildPage MCPProtected 적용
3. MinuKeepPage MCPProtected 적용

### Phase 3: 검증 (TASK-CH-013)
1. E2E 테스트 작성 및 실행
2. 수동 QA

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|----------|--------|
| 1.0.0 | 2025-11-23 | 초기 작성 | Claude |

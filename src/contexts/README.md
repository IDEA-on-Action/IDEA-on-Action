# Contexts

React Context API를 사용한 전역 상태 관리 모듈입니다.

## MCPPermissionContext

MCP 서비스별 권한 정보를 캐싱하고 관리하는 Context입니다.

### 기능

- **서비스별 권한 캐싱**: 각 MCP 서비스(minu-find, minu-frame, minu-build, minu-keep)의 권한 정보를 캐싱
- **TTL 기반 만료**: 5분 동안 캐시 유지, 만료 시 자동 재검증
- **구독 변경 감지**: React Query의 구독 캐시 변경 시 자동으로 권한 캐시 무효화
- **수동 무효화 API**: 특정 서비스 또는 전체 캐시를 수동으로 무효화 가능

### 사용법

#### 1. Provider 설정

App.tsx에서 최상위 컴포넌트를 MCPPermissionProvider로 감싸세요:

```tsx
import { MCPPermissionProvider } from '@/contexts';

function App() {
  return (
    <MCPPermissionProvider>
      {/* 앱 컴포넌트들 */}
    </MCPPermissionProvider>
  );
}
```

#### 2. 컴포넌트에서 사용

```tsx
import { useMCPPermissionContext } from '@/contexts';

function MinuFindPage() {
  const { checkPermission, permissions, invalidateCache } = useMCPPermissionContext();

  useEffect(() => {
    // 권한 확인 (캐시 사용)
    checkPermission('minu-find');
  }, []);

  // 캐시된 권한 정보 가져오기
  const permission = permissions.get('minu-find');

  if (!permission) {
    return <div>권한 확인 중...</div>;
  }

  if (permission.permission === 'none') {
    return (
      <div>
        <h2>접근 권한 없음</h2>
        <p>사유: {permission.reason}</p>
      </div>
    );
  }

  return (
    <div>
      <h1>Minu Find</h1>
      <p>권한 레벨: {permission.permission}</p>
      {/* 서비스 컨텐츠 */}
    </div>
  );
}
```

#### 3. 캐시 무효화

```tsx
function SubscriptionManagement() {
  const { invalidateCache, invalidateAll } = useMCPPermissionContext();

  const handleUpgrade = async () => {
    // 구독 업그레이드 후 특정 서비스 캐시 무효화
    await upgradeSubscription();
    invalidateCache('minu-find');
  };

  const handleCancelAll = async () => {
    // 모든 구독 취소 후 전체 캐시 무효화
    await cancelAllSubscriptions();
    invalidateAll();
  };

  return (
    // UI...
  );
}
```

### API

#### `useMCPPermissionContext()`

MCP 권한 Context를 사용하는 훅입니다.

**반환값:**

```typescript
{
  // 서비스별 권한 정보 Map
  permissions: Map<ServiceId, PermissionInfo>;

  // 특정 서비스의 권한 확인 (캐시 활용)
  checkPermission: (serviceId: ServiceId) => Promise<PermissionInfo>;

  // 특정 서비스의 캐시 무효화
  invalidateCache: (serviceId?: ServiceId) => void;

  // 전체 캐시 무효화
  invalidateAll: () => void;

  // 로딩 상태
  isLoading: boolean;
}
```

### 타입

#### `ServiceId`

```typescript
type ServiceId = 'minu-find' | 'minu-frame' | 'minu-build' | 'minu-keep';
```

#### `Permission`

```typescript
type Permission = 'none' | 'read' | 'write' | 'admin';
```

#### `FallbackReason`

```typescript
type FallbackReason =
  | 'subscription_required'   // 구독 필요
  | 'subscription_expired'    // 구독 만료
  | 'insufficient_permission' // 권한 부족
  | 'service_unavailable';    // 서비스 이용 불가
```

#### `PermissionInfo`

```typescript
interface PermissionInfo {
  permission: Permission;      // 권한 레벨
  reason?: FallbackReason;     // Fallback 사유 (권한이 제한된 경우)
  checkedAt: Date;             // 권한 확인 시각
}
```

### 캐싱 전략

1. **TTL 기반 캐싱**:
   - 권한 정보는 5분 동안 캐시됩니다
   - TTL 만료 시 다음 `checkPermission` 호출에서 자동으로 재검증

2. **자동 무효화**:
   - React Query의 구독 관련 쿼리 변경 감지
   - 구독 생성/업그레이드/취소 시 자동으로 전체 캐시 무효화

3. **수동 무효화**:
   - `invalidateCache(serviceId)`: 특정 서비스 캐시만 무효화
   - `invalidateCache()` 또는 `invalidateAll()`: 전체 캐시 무효화

### 구현 노트

- **현재 제한사항**:
  - 서비스와 구독 플랜 간의 실제 매핑 로직은 TODO로 남아있습니다
  - 플랜별 권한 레벨 결정 로직도 구체화가 필요합니다

- **향후 개선사항**:
  - 서비스별 구독 플랜 매핑 테이블 구현
  - 플랜별 권한 매트릭스 정의
  - RLS 정책과의 통합

### 관련 파일

- `src/contexts/MCPPermissionContext.tsx` - Provider와 훅 구현
- `src/contexts/MCPPermissionContext.types.ts` - 타입 정의
- `src/hooks/useSubscriptions.ts` - 구독 관리 훅 (자동 무효화 연동)

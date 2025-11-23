# Central Hub Sprint 2: MCP 통합 확대

> Minu Frame, Build, Keep 페이지에 MCP 클라이언트 적용

**시작일**: (예정)
**예상 소요**: 1일 (8시간)
**관련 명세**: [spec/central-hub/requirements.md](../../spec/central-hub/requirements.md)
**관련 설계**: [plan/central-hub/architecture.md](../../plan/central-hub/architecture.md)
**이전 Sprint**: [sprint-1.md](sprint-1.md) ✅ 완료

---

## 목표

1. 모든 Minu 서비스 페이지에서 일관된 권한 관리
2. 구독 상태에 따른 기능 활성화/비활성화
3. 권한 캐싱으로 성능 최적화

---

## 작업 목록

### TASK-CH-007: MCPProtected HOC 생성
**예상 시간**: 2시간
**상태**: 대기

**작업 내용**:
```typescript
// src/components/mcp/MCPProtected.tsx

interface MCPProtectedProps {
  serviceId: ServiceId;
  requiredPermission?: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function MCPProtected({
  serviceId,
  requiredPermission,
  fallback = <MCPFallback />,
  children,
}: MCPProtectedProps) {
  const { hasPermission, isLoading } = useMCPPermission(serviceId, requiredPermission);

  if (isLoading) return <MCPLoading />;
  if (!hasPermission) return fallback;

  return <>{children}</>;
}
```

**완료 조건**:
- [ ] MCPProtected 컴포넌트 생성
- [ ] MCPLoading 컴포넌트 생성
- [ ] MCPFallback 컴포넌트 생성
- [ ] 에러 바운더리 포함

---

### TASK-CH-008: useMCPPermission 훅 생성
**예상 시간**: 1시간
**상태**: 대기

**작업 내용**:
```typescript
// src/hooks/useMCPPermission.ts

interface UseMCPPermissionResult {
  hasPermission: boolean;
  isLoading: boolean;
  error: Error | null;
  permissions: string[];
  refetch: () => void;
}

export function useMCPPermission(
  serviceId: ServiceId,
  requiredPermission?: string
): UseMCPPermissionResult {
  // MCP 서버에 권한 확인 요청
  // React Query로 5분 캐싱
  // 구독 상태 기반 권한 확인
}
```

**완료 조건**:
- [ ] useMCPPermission 훅 생성
- [ ] React Query 캐싱 적용 (5분 TTL)
- [ ] 에러 핸들링
- [ ] 타입 정의

---

### TASK-CH-009: MCPPermissionContext 생성
**예상 시간**: 30분
**상태**: 대기

**작업 내용**:
```typescript
// src/components/mcp/MCPPermissionContext.tsx

interface MCPPermissionContextValue {
  permissions: Record<ServiceId, string[]>;
  isLoading: boolean;
  invalidateCache: (serviceId?: ServiceId) => void;
}

export const MCPPermissionProvider: React.FC<{ children: React.ReactNode }>;
export function useMCPPermissionContext(): MCPPermissionContextValue;
```

**완료 조건**:
- [ ] Context Provider 생성
- [ ] 전역 권한 캐시 관리
- [ ] 캐시 무효화 함수

---

### TASK-CH-010: MinuFramePage MCP 적용
**예상 시간**: 1시간
**상태**: 대기

**작업 내용**:
```typescript
// src/pages/services/MinuFramePage.tsx

export function MinuFramePage() {
  return (
    <MCPProtected serviceId="minu-frame">
      {/* 기존 페이지 내용 */}
    </MCPProtected>
  );
}
```

**완료 조건**:
- [ ] MCPProtected 래퍼 적용
- [ ] 기능별 권한 확인 추가
- [ ] Fallback UI 커스터마이징

---

### TASK-CH-011: MinuBuildPage MCP 적용
**예상 시간**: 1시간
**상태**: 대기

**작업 내용**:
```typescript
// src/pages/services/MinuBuildPage.tsx

export function MinuBuildPage() {
  return (
    <MCPProtected serviceId="minu-build">
      {/* 기존 페이지 내용 */}
    </MCPProtected>
  );
}
```

**완료 조건**:
- [ ] MCPProtected 래퍼 적용
- [ ] 기능별 권한 확인 추가
- [ ] Fallback UI 커스터마이징

---

### TASK-CH-012: MinuKeepPage MCP 적용
**예상 시간**: 1시간
**상태**: 대기

**작업 내용**:
```typescript
// src/pages/services/MinuKeepPage.tsx

export function MinuKeepPage() {
  return (
    <MCPProtected serviceId="minu-keep">
      {/* 기존 페이지 내용 */}
    </MCPProtected>
  );
}
```

**완료 조건**:
- [ ] MCPProtected 래퍼 적용
- [ ] 기능별 권한 확인 추가
- [ ] Fallback UI 커스터마이징

---

### TASK-CH-013: E2E 테스트 작성
**예상 시간**: 2시간
**상태**: 대기

**작업 내용**:
```typescript
// tests/e2e/services/mcp-integration.spec.ts

test.describe('MCP Integration', () => {
  test('구독자는 서비스에 접근 가능', async ({ page }) => {
    // 구독자 로그인
    // 서비스 페이지 접근
    // 컨텐츠 표시 확인
  });

  test('비구독자는 Fallback UI 표시', async ({ page }) => {
    // 비구독자 로그인
    // 서비스 페이지 접근
    // Fallback UI 확인
  });

  test('권한 캐시가 5분간 유지', async ({ page }) => {
    // 권한 확인 호출
    // 5분 이내 재호출 시 캐시 사용 확인
  });
});
```

**완료 조건**:
- [ ] 구독자 접근 테스트
- [ ] 비구독자 접근 테스트
- [ ] 권한 변경 반영 테스트
- [ ] 캐시 동작 테스트

---

## 검증 계획

### 기능 테스트
- [ ] 각 서비스 페이지 접근 권한 확인
- [ ] Fallback UI 표시 확인
- [ ] 권한 캐싱 동작 확인

### 성능 테스트
- [ ] MCP 서버 응답 시간 측정
- [ ] 캐시 히트율 측정

### 보안 테스트
- [ ] 권한 우회 시도 차단 확인
- [ ] 토큰 만료 시 재인증 확인

---

## 완료 조건

- [ ] MCPProtected HOC 생성 완료
- [ ] useMCPPermission 훅 생성 완료
- [ ] 3개 서비스 페이지 MCP 적용 완료
- [ ] E2E 테스트 통과
- [ ] 빌드 성공

---

## 다음 Sprint

Sprint 3: 실시간 상태 동기화 + 관리자 대시보드

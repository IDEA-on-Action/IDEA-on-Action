# Central Hub Sprint 2: MCP 통합 확대

> Minu Frame, Build, Keep 페이지에 MCP 클라이언트 적용

**시작일**: 2025-11-23
**완료일**: 2025-11-23
**예상 소요**: 1일 (8시간)
**실제 소요**: 4시간
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

### TASK-CH-007: MCPProtected HOC 생성 ✅
**예상 시간**: 2시간
**상태**: ✅ 완료

**구현 파일**:
- `src/components/mcp/MCPProtected.tsx` - HOC 컴포넌트
- `src/components/mcp/MCPLoading.tsx` - 로딩 상태 컴포넌트
- `src/components/mcp/MCPFallback.tsx` - Fallback UI 컴포넌트
- `src/components/mcp/index.ts` - Barrel exports

**완료 조건**:
- [x] MCPProtected 컴포넌트 생성
- [x] MCPLoading 컴포넌트 생성
- [x] MCPFallback 컴포넌트 생성
- [x] withMCPProtection HOC 함수 생성

---

### TASK-CH-008: useMCPPermission 훅 생성 ✅
**예상 시간**: 1시간
**상태**: ✅ 완료

**구현 파일**:
- `src/hooks/useMCPPermission.ts`

**주요 기능**:
```typescript
export type MinuServiceId = 'minu-find' | 'minu-frame' | 'minu-build' | 'minu-keep';

export function useMCPServicePermission(
  serviceId: MinuServiceId,
  additionalPermission?: string
): UseMCPServicePermissionResult;
```

**완료 조건**:
- [x] useMCPServicePermission 훅 생성
- [x] 기존 useCompassPermission 래핑
- [x] React Query 캐싱 적용 (5분 TTL)
- [x] 에러 핸들링
- [x] TypeScript 타입 정의

---

### TASK-CH-009: MCPPermissionContext 생성 ✅
**예상 시간**: 30분
**상태**: ✅ 완료

**구현 파일**:
- `src/components/mcp/MCPPermissionContext.tsx`

**주요 기능**:
```typescript
export function MCPPermissionProvider({ children }: { children: React.ReactNode });
export function useMCPPermissionContext(): MCPPermissionContextValue;
export function useMCPPermissionContextOptional(): MCPPermissionContextValue | null;
```

**완료 조건**:
- [x] Context Provider 생성
- [x] 전역 권한 캐시 관리
- [x] invalidateAll, invalidateService, invalidateSubscription, invalidatePermission 함수
- [x] Optional context 훅 (Provider 없이도 사용 가능)

---

### TASK-CH-010~012: MinuFrame/Build/Keep 페이지 MCP 적용 ⏳
**예상 시간**: 3시간
**상태**: ⏳ 보류 (향후 프리미엄 기능 추가 시 적용)

**결정 사항**:
현재 Minu 페이지들은 **서비스 소개 페이지**로, 모든 사용자에게 공개되어야 합니다.
MCPProtected는 **향후 추가될 실제 프리미엄 기능 페이지**에 적용할 예정입니다.

**향후 적용 시점**:
- Minu Frame 대시보드 (RFP 생성 기능)
- Minu Build 칸반 보드 (프로젝트 관리 기능)
- Minu Keep 모니터링 대시보드 (운영 관리 기능)

---

### TASK-CH-013: E2E 테스트 작성 ✅
**예상 시간**: 2시간
**상태**: ✅ 완료

**구현 파일**:
- `tests/e2e/services/mcp-permission.spec.ts`

**테스트 범위** (40개 테스트):
- Minu Service Pages - Loading States (3개)
- Minu Service Pages - Plan Display (3개)
- Minu Service Pages - Beta Tester Section (3개)
- Minu Service Pages - CTA Buttons (4개)
- Minu Service Pages - Key Features (3개)
- MCP Error Handling (2개)
- MCP Permission Accessibility (3개)
- MCP Responsive Design (3개)

**완료 조건**:
- [x] 각 서비스 페이지 접근 테스트
- [x] 플랜 표시 테스트
- [x] 베타 테스터 섹션 테스트
- [x] CTA 버튼 테스트
- [x] 접근성 테스트
- [x] 반응형 디자인 테스트

---

## 검증 계획

### 기능 테스트
- [x] MCP 컴포넌트 빌드 성공
- [x] 타입 체크 통과
- [x] ESLint 검사 통과 (0 errors)
- [ ] E2E 테스트 (개발 서버 필요)

### 성능 테스트
- [x] React Query 캐싱 설정 (staleTime: 5분)
- [ ] 프로덕션 환경에서 MCP 서버 응답 시간 측정

### 보안 테스트
- [x] 권한 확인 로직 구현
- [ ] 프로덕션 환경에서 권한 우회 시도 차단 확인

---

## 완료 조건

- [x] MCPProtected HOC 생성 완료
- [x] useMCPPermission 훅 생성 완료
- [ ] 3개 서비스 페이지 MCP 적용 (향후 프리미엄 기능 추가 시)
- [x] E2E 테스트 작성 완료
- [x] 빌드 성공 (24.89s)

---

## 생성된 파일

```
src/components/mcp/
├── index.ts              # Barrel exports
├── MCPProtected.tsx      # HOC 컴포넌트
├── MCPLoading.tsx        # 로딩 상태 UI
├── MCPFallback.tsx       # Fallback UI
└── MCPPermissionContext.tsx  # 전역 Context

src/hooks/
└── useMCPPermission.ts   # 권한 확인 훅

tests/e2e/services/
└── mcp-permission.spec.ts  # E2E 테스트 (40개)
```

---

## 다음 Sprint

Sprint 3: 실시간 상태 동기화 + 관리자 대시보드

**예정 작업**:
- Central Hub 대시보드 UI
- 서비스 상태 실시간 모니터링
- 이슈/이벤트 알림 시스템

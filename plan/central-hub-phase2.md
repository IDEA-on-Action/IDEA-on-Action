# Central Hub Phase 2 계획

> MCPProtected 권한 시스템 및 대시보드 고도화

**버전**: v2.25.0
**작성일**: 2025-12-01
**예상 완료**: 2025-12-03
**방법론**: SSDD (병렬 에이전트 작업)

---

## 목표

1. **MCPProtected HOC 구현**: 서비스별 권한 보호 컴포넌트
2. **권한 관리 시스템**: 캐싱 및 Fallback UI
3. **대시보드 고도화**: 분석 기능 및 필터 확장
4. **테스트 강화**: Unit + E2E 테스트 추가

---

## Phase 1 완료 현황

### 구현된 컴포넌트 (8개)

| 컴포넌트 | 경로 | 기능 |
|---------|------|------|
| EventTimeline | `src/components/central-hub/` | 이벤트 시간순 표시 |
| IssueList | `src/components/central-hub/` | 이슈 목록 및 상태 관리 |
| StatisticsChart | `src/components/central-hub/` | 통계 차트 |
| RealtimeAlertPanel | `src/components/central-hub/` | 실시간 알림 패널 |
| ServiceHealthCard | `src/components/central-hub/` | 서비스 헬스 카드 |
| AlertFilterPanel | `src/components/central-hub/` | 알림 필터링 |
| AlertSettings | `src/components/central-hub/` | 알림 설정 |
| AlertDetailModal | `src/components/central-hub/` | 알림 상세 모달 |

### 구현된 훅

- `useNotifications()` - 알림 조회/관리
- `useRealtimeServiceStatus()` - 서비스 연결 상태
- `useRealtimeEventStream()` - 이벤트/이슈 스트림
- `useServiceHealth()` - 헬스 정보

### E2E 테스트 (24개)

- `central-hub-dashboard.spec.ts` - 13개
- `central-hub-realtime.spec.ts` - 11개

---

## Phase 2 병렬 작업 계획

### Sprint 2-1: 기반 구축 (4개 병렬 에이전트)

| Agent | 작업 | 산출물 | 예상 시간 |
|-------|------|--------|----------|
| **Agent 1** | MCPProtected HOC | `src/components/mcp/MCPProtected.tsx` | 2시간 |
| **Agent 2** | Fallback UI 컴포넌트 | `MCPLoading.tsx`, `MCPFallback.tsx`, `MCPError.tsx` | 2시간 |
| **Agent 3** | useMCPPermission 확장 | `src/hooks/useMCPPermission.ts` 수정 | 2시간 |
| **Agent 4** | MCPPermissionContext | `src/contexts/MCPPermissionContext.tsx` | 2시간 |

#### Agent 1: MCPProtected HOC

```typescript
// 구현할 인터페이스
interface MCPProtectedProps {
  serviceId: ServiceId;
  requiredPermission?: 'read' | 'write' | 'admin';
  fallback?: React.ReactNode;
  loadingComponent?: React.ReactNode;
  children: React.ReactNode;
}

// 사용 예시
<MCPProtected serviceId="minu-find" requiredPermission="read">
  <MinuFindPage />
</MCPProtected>
```

#### Agent 2: Fallback UI 컴포넌트

| 컴포넌트 | 용도 |
|---------|------|
| MCPLoading | 권한 확인 중 로딩 UI |
| MCPFallback | 권한 없음 시 안내 UI (reason별 메시지) |
| MCPError | 권한 확인 실패 시 에러 UI |

**Fallback Reason Types:**
- `subscription_required` - 구독 필요
- `subscription_expired` - 구독 만료
- `insufficient_permission` - 권한 부족
- `service_unavailable` - 서비스 이용 불가

#### Agent 3: useMCPPermission 확장

```typescript
interface UseMCPPermissionReturn {
  hasPermission: boolean;
  isLoading: boolean;
  error: Error | null;
  permission: 'none' | 'read' | 'write' | 'admin';
  reason?: FallbackReason;
  refetch: () => void;
}

// 권한 계산 로직
// 1. 구독 상태 확인
// 2. 서비스 접근 권한 확인
// 3. 역할 기반 권한 계산
```

#### Agent 4: MCPPermissionContext

```typescript
interface MCPPermissionContextValue {
  permissions: Map<ServiceId, PermissionInfo>;
  checkPermission: (serviceId: ServiceId) => Promise<PermissionInfo>;
  invalidateCache: (serviceId?: ServiceId) => void;
  isLoading: boolean;
}

// 캐싱 전략
// - TTL: 5분
// - 구독 변경 시 무효화
// - 수동 무효화 API 제공
```

---

### Sprint 2-2: 페이지 적용 (3개 병렬 에이전트)

| Agent | 작업 | 대상 파일 |
|-------|------|----------|
| **Agent 5** | Minu Find/Frame 적용 | `MinuFindPage.tsx`, `MinuFramePage.tsx` |
| **Agent 6** | Minu Build/Keep 적용 | `MinuBuildPage.tsx`, `MinuKeepPage.tsx` |
| **Agent 7** | CentralHub 적용 | `CentralHubDashboard.tsx` 리팩토링 |

#### 적용 패턴

```tsx
// Before
export default function MinuFindPage() {
  const { hasPermission } = useSubscription('minu-find');
  if (!hasPermission) return <NoAccessPage />;
  return <PageContent />;
}

// After
export default function MinuFindPage() {
  return (
    <MCPProtected serviceId="minu-find">
      <PageContent />
    </MCPProtected>
  );
}
```

---

### Sprint 2-3: 대시보드 고도화 (3개 병렬 에이전트)

| Agent | 작업 | 산출물 |
|-------|------|--------|
| **Agent 8** | 분석 차트 확장 | 서비스별 사용량, 트렌드 차트 |
| **Agent 9** | 필터 고도화 | 날짜 범위, 서비스 멀티 선택 |
| **Agent 10** | 알림 센터 UI | 알림 그룹화, 액션 버튼 |

#### Agent 8: 분석 차트 확장

- 서비스별 일간/주간/월간 사용량 차트
- 이슈 발생 트렌드 라인 차트
- 응답 시간 히스토그램

#### Agent 9: 필터 고도화

```typescript
interface EnhancedFilter {
  services: ServiceId[];      // 멀티 선택
  dateRange: DateRange;       // 시작일/종료일
  severity?: IssueSeverity[]; // 심각도 멀티 선택
  status?: IssueStatus[];     // 상태 멀티 선택
  searchQuery?: string;       // 텍스트 검색
}
```

#### Agent 10: 알림 센터 UI

- 알림 그룹화 (서비스별, 날짜별)
- 일괄 처리 버튼 (모두 읽음, 선택 삭제)
- 알림 우선순위 표시

---

### Sprint 2-4: 테스트 및 검증 (3개 병렬 에이전트)

| Agent | 작업 | 테스트 수 |
|-------|------|----------|
| **Agent 11** | MCPProtected Unit 테스트 | 15개+ |
| **Agent 12** | useMCPPermission Unit 테스트 | 12개+ |
| **Agent 13** | E2E 권한 시나리오 테스트 | 10개+ |

#### Agent 11: MCPProtected 테스트

```typescript
describe('MCPProtected', () => {
  it('권한이 있으면 children을 렌더링해야 함');
  it('권한이 없으면 Fallback을 렌더링해야 함');
  it('로딩 중에는 Loading 컴포넌트를 렌더링해야 함');
  it('에러 시 Error 컴포넌트를 렌더링해야 함');
  it('subscription_required reason 시 구독 안내를 표시해야 함');
  // ...
});
```

#### Agent 12: useMCPPermission 테스트

```typescript
describe('useMCPPermission', () => {
  it('구독이 있으면 hasPermission이 true여야 함');
  it('구독이 만료되면 reason이 subscription_expired여야 함');
  it('캐시가 5분 후 만료되어야 함');
  it('invalidateCache 호출 시 즉시 재조회해야 함');
  // ...
});
```

#### Agent 13: E2E 권한 시나리오

```typescript
test.describe('권한 시나리오', () => {
  test('비로그인 사용자가 Minu 페이지 접근 시 로그인 안내');
  test('무료 사용자가 프리미엄 서비스 접근 시 구독 안내');
  test('구독 만료 사용자가 접근 시 갱신 안내');
  test('권한 있는 사용자가 정상 접근');
  // ...
});
```

---

## 산출물 요약

### 생성 예정 파일 (12개)

| 카테고리 | 파일 |
|---------|------|
| Components | `MCPProtected.tsx`, `MCPLoading.tsx`, `MCPFallback.tsx`, `MCPError.tsx` |
| Contexts | `MCPPermissionContext.tsx` |
| Hooks | `useMCPPermission.ts` (수정) |
| Charts | `UsageChart.tsx`, `TrendChart.tsx` |
| Filters | `EnhancedFilter.tsx` |
| Tests | `MCPProtected.test.tsx`, `useMCPPermission.test.tsx`, `permission-scenarios.spec.ts` |

### 수정 예정 파일 (5개)

- `MinuFindPage.tsx`
- `MinuFramePage.tsx`
- `MinuBuildPage.tsx`
- `MinuKeepPage.tsx`
- `CentralHubDashboard.tsx`

---

## 타임라인

| 일차 | Sprint | 에이전트 | 작업 |
|------|--------|----------|------|
| Day 1 | 2-1 | Agent 1-4 | 기반 구축 (병렬) |
| Day 2 | 2-2, 2-3 | Agent 5-10 | 페이지 적용 + 대시보드 고도화 (병렬) |
| Day 3 | 2-4 | Agent 11-13 | 테스트 및 검증 (병렬) |

---

## 성공 기준

| 지표 | 목표 |
|------|------|
| MCPProtected 적용 | 5개 페이지 |
| Unit 테스트 | 27개+ 추가 |
| E2E 테스트 | 10개+ 추가 |
| 번들 증가 | < 20KB (gzip) |
| 린트 에러 | 0개 |

---

## 의존성

- Minu 연동 Phase 2 마이그레이션 배포 완료 (✅ 완료)
- useSubscription 훅 존재 (확인 필요)
- React Query 캐싱 인프라 (✅ 존재)

---

## 다음 단계 (Phase 3 예정)

- SSO 통합 (Minu ↔ ideaonaction)
- 프로필 양방향 동기화
- 고급 분석 대시보드 (AI 기반 인사이트)

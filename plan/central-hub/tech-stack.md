# Central Hub 기술 스택 (Tech Stack)

> Minu 서비스 중심 시스템의 기술 선택 및 이유

**작성일**: 2025-11-23
**버전**: 1.0.0
**관련 문서**: [architecture.md](./architecture.md) | [implementation-strategy.md](./implementation-strategy.md)

---

## 1. 기술 스택 개요

```
Central Hub Infrastructure
├── Edge Functions (Deno)
│   └── receive-service-event (웹훅 수신)
├── Database (PostgreSQL)
│   ├── service_events (이벤트 저장)
│   ├── service_issues (이슈 추적)
│   └── service_health (상태 모니터링)
├── Realtime (Supabase)
│   └── WebSocket 구독
└── Frontend (React)
    ├── useServiceEvents
    ├── useServiceIssues
    └── useServiceHealth
```

---

## 2. Backend 기술

### 2.1 Supabase Edge Functions (Deno)

**선택 이유**:
- **기존 인프라 활용**: 프로젝트에서 이미 사용 중인 Supabase 플랫폼
- **빠른 콜드 스타트**: V8 Isolates 기반, < 50ms 응답
- **TypeScript 네이티브**: 별도 컴파일 없이 TS 직접 실행
- **보안**: HMAC 서명 검증, 환경 변수 관리

**사용 함수**:
| 함수명 | 용도 | 트리거 |
|--------|------|--------|
| `receive-service-event` | 웹훅 수신 및 검증 | HTTP POST |

**환경 변수**:
```bash
MINU_FIND_WEBHOOK_SECRET=...
MINU_FRAME_WEBHOOK_SECRET=...
MINU_BUILD_WEBHOOK_SECRET=...
MINU_KEEP_WEBHOOK_SECRET=...
```

---

### 2.2 PostgreSQL (Supabase)

**선택 이유**:
- **기존 DB 활용**: 추가 인프라 비용 없음
- **JSONB 지원**: 유연한 페이로드 저장
- **RLS (Row Level Security)**: 세밀한 권한 제어
- **인덱스 최적화**: 빠른 쿼리 성능

**테이블 구조**:
| 테이블 | 용도 | 주요 컬럼 |
|--------|------|----------|
| `service_events` | 이벤트 로그 | service_id, event_type, payload |
| `service_issues` | 이슈 추적 | severity, status, title |
| `service_health` | 상태 모니터링 | status, last_ping, metrics |

---

### 2.3 Supabase Realtime

**선택 이유**:
- **자동 WebSocket 관리**: 연결, 재연결, heartbeat 자동 처리
- **postgres_changes**: DB 변경 시 자동 브로드캐스트
- **기존 패턴 유지**: 프로젝트의 다른 Realtime 기능과 일관성

**구독 채널**:
```typescript
supabase
  .channel('service-events')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'service_events'
  }, callback)
  .subscribe();
```

---

## 3. Frontend 기술

### 3.1 React Query (TanStack Query)

**선택 이유**:
- **서버 상태 관리**: 캐싱, 자동 재조회, 낙관적 업데이트
- **기존 패턴 유지**: 프로젝트 전체에서 사용 중
- **DevTools**: 디버깅 용이

**설정**:
```typescript
{
  staleTime: 5 * 60 * 1000,  // 5분
  cacheTime: 10 * 60 * 1000, // 10분
  refetchOnWindowFocus: false
}
```

---

### 3.2 React Hooks

**생성된 훅**:
| 훅 | 용도 | 반환값 |
|-----|------|--------|
| `useServiceEvents` | 이벤트 조회 | events, isLoading, error |
| `useServiceIssues` | 이슈 조회/관리 | issues, createIssue, updateIssue |
| `useServiceHealth` | 상태 모니터링 | health, isHealthy |

---

### 3.3 TypeScript 타입

**파일**: `src/types/central-hub.types.ts`

**주요 타입**:
```typescript
interface ServiceEvent {
  id: string;
  service_id: ServiceId;
  event_type: string;
  payload: Record<string, unknown>;
  created_at: string;
}

interface ServiceIssue {
  id: string;
  service_id: ServiceId;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  title: string;
  description?: string;
}

type ServiceId = 'minu-find' | 'minu-frame' | 'minu-build' | 'minu-keep';
```

---

## 4. 보안 기술

### 4.1 웹훅 인증 (HMAC-SHA256)

**구현**:
```typescript
// Edge Function에서 서명 검증
const expectedSignature = crypto
  .createHmac('sha256', WEBHOOK_SECRET)
  .update(rawBody)
  .digest('hex');

if (signature !== `sha256=${expectedSignature}`) {
  return new Response('Invalid signature', { status: 401 });
}
```

**특징**:
- 서비스별 고유 시크릿 키
- 타임스탬프 검증 (5분 이내)
- replay attack 방지

---

### 4.2 RLS (Row Level Security)

**정책**:
```sql
-- 관리자만 이벤트 조회
CREATE POLICY "Admins can read events"
ON service_events FOR SELECT
USING (is_admin(auth.uid()));

-- 본인 이슈 또는 관리자
CREATE POLICY "Users can read own issues"
ON service_issues FOR SELECT
USING (
  reported_by = auth.uid()
  OR assigned_to = auth.uid()
  OR is_admin(auth.uid())
);
```

---

## 5. 의존성 목록

### 5.1 신규 추가 없음

Central Hub는 **기존 프로젝트 의존성만 사용**합니다:

| 패키지 | 버전 | 용도 |
|--------|------|------|
| `@supabase/supabase-js` | 2.75.0 | DB, Auth, Realtime |
| `@tanstack/react-query` | 5.83.0 | 서버 상태 관리 |
| `react` | 18.3.1 | UI 프레임워크 |
| `typescript` | 5.8.3 | 타입 안전성 |

---

## 6. 성능 최적화

### 6.1 데이터베이스 인덱스

```sql
-- service_events
CREATE INDEX idx_service_events_service ON service_events(service_id);
CREATE INDEX idx_service_events_type ON service_events(event_type);
CREATE INDEX idx_service_events_created ON service_events(created_at DESC);

-- service_issues
CREATE INDEX idx_service_issues_status ON service_issues(status);
CREATE INDEX idx_service_issues_severity ON service_issues(severity);
```

### 6.2 React Query 캐싱

```typescript
// 이벤트: 5분 stale, 자동 갱신
useQuery({
  queryKey: ['service-events', serviceId],
  staleTime: 5 * 60 * 1000
});

// 이슈: 2분 stale, 빈번한 갱신
useQuery({
  queryKey: ['service-issues', serviceId],
  staleTime: 2 * 60 * 1000
});
```

---

## 7. 확장 계획

### Phase 2 (예정)
- MCP 서버 통합 확대
- 알림 시스템 (Slack, Email)
- 대시보드 시각화

### Phase 3 (예정)
- AI 이슈 분류
- 자동 진행률 계산
- 예측 분석

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|----------|--------|
| 1.0.0 | 2025-11-23 | 초기 작성 | Claude |

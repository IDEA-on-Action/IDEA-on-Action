# Central Hub 아키텍처 설계

> IDEA on Action 중심 시스템의 기술 아키텍처

**작성일**: 2025-11-23
**버전**: 1.0.0
**관련 명세**: [spec/central-hub/requirements.md](../../spec/central-hub/requirements.md)

---

## 1. 시스템 아키텍처 개요

```
┌─────────────────────────────────────────────────────────────────────┐
│                      IDEA on Action (Central Hub)                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐   │
│  │   Auth Hub   │  │  Event Hub   │  │    Status Dashboard      │   │
│  │              │  │              │  │                          │   │
│  │ - OAuth/JWT  │  │ - Webhooks   │  │ - Realtime Updates       │   │
│  │ - 2FA        │  │ - Events DB  │  │ - Issue Tracking         │   │
│  │ - Sessions   │  │ - Issues DB  │  │ - Health Monitoring      │   │
│  └──────┬───────┘  └──────┬───────┘  └────────────┬─────────────┘   │
│         │                 │                        │                 │
│         ▼                 ▼                        ▼                 │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                    Supabase Platform                           │ │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌──────────┐ │ │
│  │  │  Auth   │ │PostgREST│ │Realtime │ │  Edge   │ │ Storage  │ │ │
│  │  │         │ │  (API)  │ │         │ │Functions│ │          │ │ │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └──────────┘ │ │
│  │                          │                                     │ │
│  │  ┌─────────────────────────────────────────────────────────┐  │ │
│  │  │                    PostgreSQL                           │  │ │
│  │  │  users │ subscriptions │ service_events │ service_issues│  │ │
│  │  └─────────────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
         │                    ▲                    ▲
         │ JWT Token          │ Webhook            │ Webhook
         │ (인증)              │ (진행상태)          │ (이슈)
         ▼                    │                    │
┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  Minu Find  │  │ Minu Frame  │  │ Minu Build  │  │  Minu Keep  │
│             │  │             │  │             │  │             │
│ 사업기회탐색 │  │ 문제정의/RFP │  │ 프로젝트진행 │  │ 운영/유지   │
└─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘
```

---

## 2. 컴포넌트 설계

### 2.1 웹훅 수신 시스템

```
┌─────────────────────────────────────────────────────────────┐
│                    Edge Function Layer                       │
│  ┌─────────────────────────────────────────────────────┐    │
│  │         receive-service-event (Edge Function)        │    │
│  │                                                      │    │
│  │  1. HMAC 서명 검증                                    │    │
│  │  2. 페이로드 파싱                                     │    │
│  │  3. 이벤트 유형 분류                                  │    │
│  │  4. DB 저장                                          │    │
│  │  5. 알림 트리거 (필요시)                              │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Database Layer                          │
│  ┌────────────────┐  ┌────────────────┐  ┌───────────────┐  │
│  │ service_events │  │ service_issues │  │ service_health│  │
│  │                │  │                │  │               │  │
│  │ - id           │  │ - id           │  │ - service_id  │  │
│  │ - service_id   │  │ - service_id   │  │ - status      │  │
│  │ - event_type   │  │ - severity     │  │ - last_ping   │  │
│  │ - payload      │  │ - title        │  │ - metrics     │  │
│  │ - created_at   │  │ - status       │  │ - updated_at  │  │
│  └────────────────┘  └────────────────┘  └───────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 MCP 통합 구조

```
┌─────────────────────────────────────────────────────────────┐
│                      React Application                       │
│                                                              │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │ MinuFindPage    │  │ MinuFramePage   │                   │
│  │ MinuBuildPage   │  │ MinuKeepPage    │                   │
│  └────────┬────────┘  └────────┬────────┘                   │
│           │                    │                             │
│           ▼                    ▼                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              <MCPProtected> HOC                      │    │
│  │                                                      │    │
│  │  - 구독 상태 확인                                     │    │
│  │  - 권한 검증                                         │    │
│  │  - 로딩/에러 상태 처리                                │    │
│  │  - 접근 거부 시 Fallback UI                          │    │
│  └─────────────────────────────────────────────────────┘    │
│                              │                               │
│                              ▼                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                 useMCPClient Hook                    │    │
│  │                                                      │    │
│  │  - useMinuSubscription()                             │    │
│  │  - useCheckPermission()                              │    │
│  │  - useListPermissions()                              │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   MCP Server    │
                    │   (Port 3001)   │
                    └─────────────────┘
```

### 2.3 실시간 동기화 구조

```
┌─────────────────────────────────────────────────────────────┐
│                    Client (React App)                        │
│                                                              │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │useServiceEvents │  │useServiceIssues │                   │
│  │     Hook        │  │     Hook        │                   │
│  └────────┬────────┘  └────────┬────────┘                   │
│           │                    │                             │
│           ▼                    ▼                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │            Supabase Realtime Client                  │    │
│  │                                                      │    │
│  │  channel.on('postgres_changes', callback)            │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ WebSocket
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Supabase Realtime                          │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Broadcast Changes                       │    │
│  │                                                      │    │
│  │  - INSERT on service_events → broadcast             │    │
│  │  - INSERT/UPDATE on service_issues → broadcast      │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. 데이터베이스 스키마

### 3.1 service_events 테이블

```sql
CREATE TABLE service_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id TEXT NOT NULL,           -- 'minu-find', 'minu-frame', etc.
  event_type TEXT NOT NULL,           -- 'progress.updated', 'task.completed', etc.
  project_id UUID,                    -- 관련 프로젝트 (optional)
  user_id UUID REFERENCES auth.users, -- 관련 사용자 (optional)
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- 인덱스
  CONSTRAINT valid_service CHECK (service_id IN ('minu-find', 'minu-frame', 'minu-build', 'minu-keep'))
);

-- 인덱스
CREATE INDEX idx_service_events_service ON service_events(service_id);
CREATE INDEX idx_service_events_type ON service_events(event_type);
CREATE INDEX idx_service_events_project ON service_events(project_id);
CREATE INDEX idx_service_events_created ON service_events(created_at DESC);
```

### 3.2 service_issues 테이블

```sql
CREATE TABLE service_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  project_id UUID,
  reported_by UUID REFERENCES auth.users,
  assigned_to UUID REFERENCES auth.users,
  resolved_at TIMESTAMPTZ,
  resolution TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_severity CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  CONSTRAINT valid_status CHECK (status IN ('open', 'in_progress', 'resolved', 'closed'))
);

-- 인덱스
CREATE INDEX idx_service_issues_service ON service_issues(service_id);
CREATE INDEX idx_service_issues_status ON service_issues(status);
CREATE INDEX idx_service_issues_severity ON service_issues(severity);
```

### 3.3 service_health 테이블

```sql
CREATE TABLE service_health (
  service_id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'unknown',
  last_ping TIMESTAMPTZ,
  metrics JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_health_status CHECK (status IN ('healthy', 'degraded', 'unhealthy', 'unknown'))
);
```

---

## 4. API 설계

### 4.1 웹훅 엔드포인트

```
POST /functions/v1/receive-service-event

Headers:
  X-Service-Id: minu-find
  X-Signature: sha256=...
  Content-Type: application/json

Body:
{
  "event_type": "progress.updated",
  "project_id": "uuid",
  "payload": {
    "stage": "discovery",
    "progress": 75,
    "message": "시장 조사 완료"
  },
  "timestamp": "2025-11-23T10:00:00Z"
}

Response:
  200 OK: { "received": true, "event_id": "uuid" }
  401 Unauthorized: { "error": "Invalid signature" }
  400 Bad Request: { "error": "Invalid payload" }
```

### 4.2 웹훅 서명 검증

```typescript
// HMAC-SHA256 서명 생성 (클라이언트)
const signature = crypto
  .createHmac('sha256', WEBHOOK_SECRET)
  .update(JSON.stringify(payload))
  .digest('hex');

// 헤더에 포함
headers['X-Signature'] = `sha256=${signature}`;
```

---

## 5. 보안 설계

### 5.1 웹훅 인증
- 각 Minu 서비스에 고유 `WEBHOOK_SECRET` 발급
- HMAC-SHA256 서명으로 요청 검증
- Timestamp 검증 (5분 이내 요청만 허용)

### 5.2 RLS 정책
```sql
-- service_events: 관리자만 읽기 가능
CREATE POLICY "Admins can read events"
ON service_events FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

-- service_issues: 관련 사용자 또는 관리자
CREATE POLICY "Users can read own issues"
ON service_issues FOR SELECT
TO authenticated
USING (
  reported_by = auth.uid()
  OR assigned_to = auth.uid()
  OR is_admin(auth.uid())
);
```

---

## 6. 기술 스택

| 레이어 | 기술 | 이유 |
|--------|------|------|
| **Edge Function** | Deno (Supabase) | 기존 인프라 활용, 빠른 콜드 스타트 |
| **Database** | PostgreSQL | 기존 Supabase DB, JSONB 지원 |
| **Realtime** | Supabase Realtime | 기존 인프라, WebSocket 자동 관리 |
| **Frontend Hooks** | React Query + Supabase | 기존 패턴 유지, 캐싱 최적화 |

---

## 7. 확장성 고려사항

### 7.1 새 서비스 추가
1. `service_id` CHECK 제약에 새 서비스 추가
2. 해당 서비스에 `WEBHOOK_SECRET` 발급
3. 프론트엔드 서비스 페이지에 MCP 클라이언트 적용

### 7.2 새 이벤트 유형 추가
1. `event_type` 문서 업데이트
2. Edge Function에 핸들러 추가 (필요시)
3. 프론트엔드 UI 업데이트 (필요시)

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|----------|--------|
| 1.0.0 | 2025-11-23 | 초기 작성 | Claude |

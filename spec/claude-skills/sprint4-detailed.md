# Claude Skills Sprint 4 상세 스펙: MCP Orchestrator

> 서비스 간 인증, 이벤트 라우팅, 상태 동기화를 위한 중앙 조율 시스템

**작성일**: 2025-11-23
**버전**: 1.0.0
**상태**: Draft
**관련 문서**:
- [requirements.md](./requirements.md) - 전체 요구사항
- [tasks/claude-skills/sprint-4.md](../../tasks/claude-skills/sprint-4.md) - 작업 목록

---

## 1. 개요

### 1.1 목적

MCP Orchestrator는 IDEA on Action Hub와 Minu 4개 서비스(Find, Frame, Build, Keep) 간의 **안전하고 효율적인 통신**을 담당하는 중앙 조율 시스템입니다.

**핵심 역할**:
- **인증 중앙화**: 서비스 간 JWT 토큰 발급/검증
- **이벤트 라우팅**: 웹훅 이벤트를 적절한 서비스로 전달
- **상태 동기화**: Cross-service 데이터 일관성 유지
- **장애 복구**: 재시도 및 Dead Letter Queue

### 1.2 범위

| 포함 범위 | 제외 범위 |
|-----------|-----------|
| JWT 토큰 발급/검증/갱신/폐기 | 개별 서비스 비즈니스 로직 |
| 이벤트 라우팅 및 전달 | UI 컴포넌트 |
| 상태 동기화 알림 | 데이터베이스 스키마 변경 (기존 테이블) |
| 재시도 및 DLQ | 외부 시스템 연동 (Slack, Email 등) |
| 캐시 관리 | 성능 최적화 (Phase 2) |

### 1.3 대상 서비스

```
                    ┌─────────────────┐
                    │  MCP Orchestrator │
                    │   (Central Hub)   │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
   ┌────┴────┐         ┌────┴────┐         ┌────┴────┐
   │Minu Find│         │Minu Frame│        │Minu Build│
   └─────────┘         └──────────┘        └──────────┘
                             │
                       ┌────┴────┐
                       │Minu Keep│
                       └─────────┘
```

---

## 2. 사용자 스토리

### US-SP4-01: 서비스 간 인증 토큰 발급

> **As a** 시스템 관리자
> **I want to** Minu 각 서비스가 Hub에 안전하게 접근할 수 있는 토큰을 발급받도록
> **So that** 서비스 간 통신이 인증되고 추적 가능하다

**인수 조건**:
- [ ] AC-01: 서비스 ID와 권한 목록으로 JWT 토큰 발급 가능
- [ ] AC-02: 토큰 발급 시 100ms 이내 응답
- [ ] AC-03: 발급된 토큰은 SHA256 해시로 DB에 저장
- [ ] AC-04: Refresh Token으로 Access Token 갱신 가능
- [ ] AC-05: 토큰 폐기(revoke) 시 즉시 무효화

**시나리오**:
```gherkin
Scenario: Minu Find 서비스가 토큰을 발급받는다
  Given Minu Find 서비스가 Hub에 등록되어 있다
  When Minu Find가 토큰 발급을 요청한다
    | serviceId | minu-find |
    | permissions | ["read:events", "write:issues"] |
  Then 1시간 유효한 Access Token이 발급된다
  And 7일 유효한 Refresh Token이 발급된다
  And 토큰 해시가 service_tokens 테이블에 저장된다
```

---

### US-SP4-02: 이벤트 라우팅 및 전달

> **As a** 시스템 관리자
> **I want to** 서비스에서 발생한 이벤트가 관련 서비스로 자동 전달되도록
> **So that** 서비스 간 실시간 연동이 가능하다

**인수 조건**:
- [ ] AC-06: 이벤트 유형에 따라 적절한 서비스로 라우팅
- [ ] AC-07: 라우팅 실패 시 지수 백오프로 최대 3회 재시도
- [ ] AC-08: 3회 실패 후 Dead Letter Queue에 저장
- [ ] AC-09: 이벤트 전달 이력 로깅

**시나리오**:
```gherkin
Scenario: Minu Frame의 RFP 생성 이벤트를 Minu Build로 전달
  Given Minu Frame에서 RFP가 생성되었다
  When Hub가 "rfp.created" 이벤트를 수신한다
  Then 이벤트가 Minu Build로 전달된다
  And 전달 성공 시 delivery_status가 "delivered"로 업데이트된다

Scenario: 서비스 연결 실패 시 재시도
  Given Minu Build 서비스가 일시적으로 응답하지 않는다
  When Hub가 이벤트 전달을 시도한다
  Then 1초 후 첫 번째 재시도
  And 2초 후 두 번째 재시도
  And 4초 후 세 번째 재시도
  And 3회 실패 시 DLQ에 이벤트 저장
```

---

### US-SP4-03: 상태 동기화

> **As a** 시스템 관리자
> **I want to** 한 서비스의 상태 변경이 관련 서비스에 즉시 반영되도록
> **So that** 데이터 일관성이 유지된다

**인수 조건**:
- [ ] AC-10: 상태 변경 시 관련 서비스에 알림 전송
- [ ] AC-11: 캐시 무효화 트리거 작동
- [ ] AC-12: React Query 캐시 TTL 5분 적용
- [ ] AC-13: 변경 시 관련 캐시 즉시 무효화

**시나리오**:
```gherkin
Scenario: Minu Keep의 서비스 상태 변경이 Hub 대시보드에 반영
  Given Minu Keep 서비스 상태가 "healthy"이다
  When Minu Keep에서 장애가 발생하여 상태가 "degraded"로 변경된다
  Then Hub가 상태 변경 알림을 수신한다
  And Hub 대시보드의 ServiceHealthCard가 즉시 업데이트된다
  And 관련 React Query 캐시가 무효화된다
```

---

## 3. 기능 요구사항

### TASK-CS-026: service_tokens 테이블

**목적**: 서비스 간 인증 토큰 저장 및 관리

**테이블 스키마**:

| 컬럼 | 타입 | 설명 | 제약조건 |
|------|------|------|----------|
| `id` | UUID | 기본키 | PK, auto-generate |
| `service_id` | TEXT | 서비스 식별자 | NOT NULL, CHECK IN ('minu-find', 'minu-frame', 'minu-build', 'minu-keep') |
| `token_hash` | TEXT | SHA256 해시 | NOT NULL |
| `permissions` | JSONB | 권한 목록 | DEFAULT '[]' |
| `issued_at` | TIMESTAMPTZ | 발급 시간 | NOT NULL, DEFAULT now() |
| `expires_at` | TIMESTAMPTZ | 만료 시간 | NOT NULL, DEFAULT now() + 1 hour |
| `is_revoked` | BOOLEAN | 폐기 여부 | NOT NULL, DEFAULT false |
| `revoked_at` | TIMESTAMPTZ | 폐기 시간 | NULL |
| `revoked_reason` | TEXT | 폐기 사유 | NULL |
| `created_by` | TEXT | 발급 요청자 | NULL |
| `ip_address` | INET | 요청 IP | NULL |
| `user_agent` | TEXT | User-Agent | NULL |

**인덱스**:
- `idx_service_tokens_service` - service_id
- `idx_service_tokens_expires` - expires_at (WHERE NOT is_revoked)
- `idx_service_tokens_hash` - token_hash (유니크하지 않음, 조회용)

**RLS 정책**:
- `service_role` 역할만 CRUD 가능
- 일반 사용자 접근 불가

**인수 조건**:
- [ ] 마이그레이션 파일 생성 (`20251129xxxxxx_create_service_tokens.sql`)
- [ ] 로컬 DB 적용 테스트 통과
- [ ] RLS 정책 작동 확인
- [ ] 인덱스 생성 확인

---

### TASK-CS-027: JWT 토큰 발급

**목적**: 서비스 간 인증을 위한 JWT 토큰 발급

**API 엔드포인트**: `POST /functions/v1/mcp-auth`

**요청/응답 스펙**:

#### Issue Token

```json
// Request
{
  "action": "issue",
  "serviceId": "minu-find",
  "permissions": ["read:events", "write:issues"]
}

// Response (200 OK)
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 3600,
  "tokenType": "Bearer"
}
```

#### Verify Token

```json
// Request
{
  "action": "verify",
  "token": "eyJhbGciOiJIUzI1NiIs..."
}

// Response (200 OK)
{
  "valid": true,
  "payload": {
    "iss": "idea-on-action-hub",
    "sub": "minu-find",
    "permissions": ["read:events", "write:issues"],
    "iat": 1732320000,
    "exp": 1732323600
  }
}

// Response (401 Unauthorized)
{
  "valid": false,
  "error": "Token expired"
}
```

**JWT 페이로드 구조**:

| 필드 | 설명 | 예시 |
|------|------|------|
| `iss` | 발급자 | "idea-on-action-hub" |
| `sub` | 주체 (서비스 ID) | "minu-find" |
| `permissions` | 권한 목록 | ["read:events", "write:issues"] |
| `iat` | 발급 시간 (Unix timestamp) | 1732320000 |
| `exp` | 만료 시간 (Unix timestamp) | 1732323600 |

**보안 요구사항**:
- HMAC-SHA256 알고리즘 사용
- JWT Secret은 환경 변수로 관리 (`MCP_JWT_SECRET`)
- 토큰 원본은 저장하지 않고 해시만 저장

**인수 조건**:
- [ ] 토큰 발급 API 작동 (응답 시간 100ms 이내)
- [ ] 토큰 검증 API 작동
- [ ] 유효하지 않은 serviceId 요청 시 400 에러 반환
- [ ] JWT Secret 누락 시 500 에러 반환

---

### TASK-CS-028: 토큰 검증 미들웨어

**목적**: 다른 Edge Function에서 재사용 가능한 토큰 검증 로직

**미들웨어 인터페이스**:

```typescript
// supabase/functions/_shared/auth-middleware.ts

interface AuthResult {
  isValid: boolean;
  serviceId?: string;
  permissions?: string[];
  error?: string;
}

async function verifyServiceToken(
  authHeader: string | null
): Promise<AuthResult>;

async function requirePermission(
  authHeader: string | null,
  requiredPermission: string
): Promise<AuthResult>;
```

**사용 예시**:

```typescript
// supabase/functions/mcp-router/index.ts
import { verifyServiceToken } from '../_shared/auth-middleware.ts';

serve(async (req) => {
  const authResult = await verifyServiceToken(
    req.headers.get('authorization')
  );

  if (!authResult.isValid) {
    return new Response(
      JSON.stringify({ error: authResult.error }),
      { status: 401 }
    );
  }

  // 인증된 요청 처리
});
```

**인수 조건**:
- [ ] 미들웨어 함수 구현
- [ ] Bearer 토큰 파싱 지원
- [ ] 만료 토큰 검증
- [ ] 폐기 토큰 검증 (DB 조회)
- [ ] 여러 Edge Function에서 import 가능

---

### TASK-CS-029: 이벤트 라우터

**목적**: 이벤트 유형에 따라 적절한 서비스로 라우팅

**API 엔드포인트**: `POST /functions/v1/mcp-router`

**이벤트 라우팅 규칙**:

| 이벤트 유형 | 원본 서비스 | 대상 서비스 | 설명 |
|-------------|-------------|-------------|------|
| `rfp.created` | minu-frame | minu-build | RFP 생성 알림 |
| `rfp.updated` | minu-frame | minu-build | RFP 수정 알림 |
| `project.started` | minu-build | minu-keep | 프로젝트 시작 알림 |
| `project.completed` | minu-build | minu-keep | 프로젝트 완료 알림 |
| `issue.critical` | minu-keep | minu-build | 긴급 이슈 에스컬레이션 |
| `opportunity.found` | minu-find | minu-frame | 사업기회 발견 알림 |
| `health.changed` | * | hub | 서비스 상태 변경 |

**라우팅 설정 예시**:

```typescript
const ROUTING_TABLE: Record<string, string[]> = {
  'rfp.created': ['minu-build'],
  'rfp.updated': ['minu-build'],
  'project.started': ['minu-keep'],
  'project.completed': ['minu-keep'],
  'issue.critical': ['minu-build', 'hub'],
  'opportunity.found': ['minu-frame'],
  'health.changed': ['hub'],
};
```

**요청/응답 스펙**:

```json
// Request
{
  "eventType": "rfp.created",
  "sourceService": "minu-frame",
  "payload": {
    "rfpId": "uuid-123",
    "title": "정부 SI 프로젝트 RFP",
    "createdAt": "2025-11-29T10:00:00Z"
  }
}

// Response (200 OK)
{
  "routed": true,
  "targets": ["minu-build"],
  "deliveryStatus": "delivered"
}
```

**인수 조건**:
- [ ] 이벤트 유형별 라우팅 테이블 구현
- [ ] 서비스별 웹훅 엔드포인트 매핑
- [ ] 라우팅 결과 로깅 (service_events 테이블)
- [ ] 알 수 없는 이벤트 유형 처리 (경고 로그)

---

### TASK-CS-030: 재시도 및 DLQ

**목적**: 이벤트 전달 실패 시 재시도 및 실패 이벤트 보관

**재시도 전략**:

| 시도 | 대기 시간 | 누적 시간 |
|------|-----------|-----------|
| 1차 | 1초 | 1초 |
| 2차 | 2초 | 3초 |
| 3차 | 4초 | 7초 |

**Dead Letter Queue 테이블**:

```sql
CREATE TABLE dead_letter_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  source_service TEXT NOT NULL,
  target_service TEXT NOT NULL,
  payload JSONB NOT NULL,
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  is_processed BOOLEAN NOT NULL DEFAULT false
);
```

**인수 조건**:
- [ ] 지수 백오프 재시도 구현 (1초, 2초, 4초)
- [ ] 재시도 횟수 기록
- [ ] DLQ 테이블 생성
- [ ] 3회 실패 시 DLQ에 저장
- [ ] DLQ 항목 조회 API (관리자용)

---

### TASK-CS-031: 상태 동기화

**목적**: 서비스 간 상태 변경 알림 및 동기화

**API 엔드포인트**: `POST /functions/v1/mcp-sync`

**동기화 대상**:

| 상태 유형 | 설명 | 구독자 |
|-----------|------|--------|
| `service_health` | 서비스 헬스 상태 | hub |
| `issue_status` | 이슈 상태 변경 | hub, 관련 서비스 |
| `project_progress` | 프로젝트 진행률 | hub |

**알림 메시지 형식**:

```json
{
  "type": "state_change",
  "entity": "service_health",
  "serviceId": "minu-keep",
  "previousState": "healthy",
  "newState": "degraded",
  "timestamp": "2025-11-29T10:00:00Z",
  "metadata": {
    "reason": "Database connection timeout",
    "affectedEndpoints": ["/api/tickets", "/api/reports"]
  }
}
```

**인수 조건**:
- [ ] 상태 변경 감지 트리거 구현
- [ ] Supabase Realtime 채널 활용
- [ ] 관련 서비스에 알림 전송
- [ ] 알림 실패 시 로깅

---

### TASK-CS-032: 캐시 관리

**목적**: React Query 캐시 일관성 유지

**캐시 설정**:

| 쿼리 키 | TTL | 무효화 트리거 |
|---------|-----|---------------|
| `serviceHealth` | 5분 | health.changed |
| `serviceEvents` | 5분 | event.created |
| `serviceIssues` | 5분 | issue.* |
| `serviceTokens` | 1분 | token.revoked |

**캐시 무효화 훅**:

```typescript
// src/hooks/useMCPCacheInvalidation.ts

interface MCPCacheInvalidation {
  invalidateServiceHealth: (serviceId?: string) => void;
  invalidateServiceEvents: (serviceId?: string) => void;
  invalidateServiceIssues: (serviceId?: string) => void;
  invalidateAll: () => void;
}

export function useMCPCacheInvalidation(): MCPCacheInvalidation;
```

**Realtime 구독 통합**:

```typescript
// 상태 변경 시 자동 캐시 무효화
useEffect(() => {
  const channel = supabase
    .channel('mcp-sync')
    .on('broadcast', { event: 'state_change' }, (payload) => {
      switch (payload.entity) {
        case 'service_health':
          queryClient.invalidateQueries(['serviceHealth']);
          break;
        // ...
      }
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, []);
```

**인수 조건**:
- [ ] React Query 캐시 TTL 5분 설정
- [ ] Realtime 구독으로 변경 감지
- [ ] 변경 시 관련 쿼리 즉시 무효화
- [ ] 캐시 상태 모니터링 (DevTools)

---

### TASK-CS-033: E2E 테스트

**목적**: MCP Orchestrator 전체 기능 검증

**테스트 파일**: `tests/e2e/mcp-orchestrator.spec.ts`

**테스트 시나리오**:

#### 토큰 발급/검증 테스트

```typescript
describe('MCP Auth', () => {
  test('서비스 토큰 발급', async () => {
    const response = await fetch('/functions/v1/mcp-auth', {
      method: 'POST',
      body: JSON.stringify({
        action: 'issue',
        serviceId: 'minu-find',
        permissions: ['read:events'],
      }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.accessToken).toBeDefined();
    expect(data.refreshToken).toBeDefined();
    expect(data.expiresIn).toBe(3600);
  });

  test('토큰 검증', async () => {
    // ...
  });

  test('토큰 갱신', async () => {
    // ...
  });

  test('토큰 폐기', async () => {
    // ...
  });
});
```

#### 이벤트 라우팅 테스트

```typescript
describe('MCP Router', () => {
  test('이벤트가 올바른 서비스로 라우팅됨', async () => {
    // ...
  });

  test('실패 시 재시도', async () => {
    // ...
  });

  test('3회 실패 후 DLQ 저장', async () => {
    // ...
  });
});
```

#### 캐시 무효화 테스트

```typescript
describe('MCP Cache', () => {
  test('상태 변경 시 캐시 무효화', async () => {
    // ...
  });
});
```

**인수 조건**:
- [ ] 토큰 발급/검증/갱신/폐기 테스트 4개
- [ ] 이벤트 라우팅 테스트 3개
- [ ] 재시도 테스트 2개
- [ ] 캐시 무효화 테스트 2개
- [ ] 전체 테스트 통과 (11개)

---

## 4. 비기능 요구사항

### 4.1 성능

| 항목 | 요구사항 | 측정 방법 |
|------|----------|-----------|
| 토큰 발급 응답 시간 | 100ms 이내 (p95) | Edge Function 로그 |
| 토큰 검증 응답 시간 | 50ms 이내 (p95) | Edge Function 로그 |
| 이벤트 라우팅 응답 시간 | 200ms 이내 (p95) | Edge Function 로그 |
| 동시 요청 처리 | 100 RPS 이상 | 부하 테스트 |

### 4.2 보안

| 항목 | 요구사항 | 구현 방법 |
|------|----------|-----------|
| 토큰 서명 | HMAC-SHA256 | jose 라이브러리 |
| 토큰 저장 | 해시 저장 (원본 미저장) | SHA256 해시 |
| 토큰 만료 | Access 1시간, Refresh 7일 | JWT exp 클레임 |
| 토큰 폐기 | 즉시 무효화 | is_revoked 플래그 |
| 전송 보안 | HTTPS 필수 | Supabase Edge |
| 접근 제어 | RLS 정책 | service_role만 허용 |

### 4.3 확장성

| 항목 | 요구사항 | 구현 방법 |
|------|----------|-----------|
| 새 서비스 추가 | CHECK 제약 수정으로 가능 | service_id CHECK |
| 새 이벤트 유형 | 라우팅 테이블 추가로 가능 | ROUTING_TABLE 상수 |
| 새 권한 추가 | permissions JSONB 확장 | 동적 권한 |
| 수평 확장 | Supabase Edge Function 자동 스케일 | 서버리스 |

### 4.4 모니터링

| 항목 | 요구사항 | 구현 방법 |
|------|----------|-----------|
| 토큰 발급 로그 | 모든 발급 기록 | service_tokens 테이블 |
| 라우팅 로그 | 모든 라우팅 기록 | service_events 테이블 |
| 에러 로그 | 모든 에러 기록 | Supabase Logs |
| DLQ 모니터링 | 미처리 항목 알림 | 관리자 대시보드 |

---

## 5. 의존성 및 제약사항

### 5.1 기술적 의존성

| 의존성 | 버전 | 용도 |
|--------|------|------|
| Supabase Edge Function | - | 서버리스 함수 |
| jose (Deno) | v4.14.4 | JWT 생성/검증 |
| @supabase/supabase-js | v2 | DB 접근 |

### 5.2 인프라 의존성

- **Central Hub Phase 1 완료 필수**: service_events, service_issues, service_health 테이블
- **환경 변수 설정 필수**: `MCP_JWT_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`

### 5.3 제약사항

| 항목 | 제약 | 대응 |
|------|------|------|
| Edge Function 메모리 | 50MB 제한 | 경량 로직 유지 |
| Edge Function 실행 시간 | 60초 제한 | 비동기 처리 |
| Supabase Realtime | 동시 연결 수 제한 | 연결 풀링 |
| 토큰 저장소 | PostgreSQL | 별도 Redis 불필요 |

---

## 6. 용어 정의

| 용어 | 정의 |
|------|------|
| **MCP Orchestrator** | 서비스 간 통신을 조율하는 중앙 시스템 |
| **JWT (JSON Web Token)** | 서비스 간 인증을 위한 토큰 형식 |
| **Access Token** | 단기 유효 (1시간) 인증 토큰 |
| **Refresh Token** | 장기 유효 (7일) 갱신 토큰 |
| **DLQ (Dead Letter Queue)** | 처리 실패 이벤트 보관소 |
| **지수 백오프** | 재시도 간격이 지수적으로 증가하는 전략 |
| **캐시 무효화** | 데이터 변경 시 캐시를 삭제하여 일관성 유지 |

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|----------|--------|
| 1.0.0 | 2025-11-23 | 초기 작성 | Claude |

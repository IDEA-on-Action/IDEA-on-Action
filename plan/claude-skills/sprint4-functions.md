# Claude Skills Sprint 4: MCP Orchestrator Edge Functions 설계

> MCP Orchestrator를 위한 Edge Function 상세 설계 문서

**작성일**: 2025-11-23
**버전**: 1.0.0
**상태**: Draft
**관련 명세**: [spec/claude-skills/requirements.md](../../spec/claude-skills/requirements.md)
**관련 설계**: [architecture.md](architecture.md)
**관련 전략**: [implementation-strategy.md](implementation-strategy.md)

---

## 1. 개요

### 1.1 목적

MCP Orchestrator Edge Functions는 Minu 시리즈 서비스(Find, Frame, Build, Keep)와 Central Hub 간의 안전한 통신을 위한 인증, 라우팅, 동기화 기능을 제공합니다.

### 1.2 Edge Function 구성

```
supabase/functions/
├── mcp-auth/           # 토큰 발급 및 검증
│   └── index.ts
├── mcp-router/         # 이벤트 라우팅
│   └── index.ts
└── mcp-sync/           # 상태 동기화
    └── index.ts
```

### 1.3 아키텍처 개요

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          MCP Orchestrator 아키텍처                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌───────────────────────────────────────────────────────────────────┐     │
│   │                        Edge Functions Layer                         │     │
│   │                                                                     │     │
│   │   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐           │     │
│   │   │  mcp-auth   │    │ mcp-router  │    │  mcp-sync   │           │     │
│   │   │ (인증/토큰)  │    │ (이벤트라우팅)│    │ (상태동기화) │           │     │
│   │   └──────┬──────┘    └──────┬──────┘    └──────┬──────┘           │     │
│   │          │                  │                  │                   │     │
│   └──────────┼──────────────────┼──────────────────┼───────────────────┘     │
│              │                  │                  │                         │
│              ▼                  ▼                  ▼                         │
│   ┌───────────────────────────────────────────────────────────────────┐     │
│   │                         Supabase (PostgreSQL)                       │     │
│   │   ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐  │     │
│   │   │  service   │  │  service   │  │  service   │  │  service   │  │     │
│   │   │  _tokens   │  │  _events   │  │  _issues   │  │  _health   │  │     │
│   │   └────────────┘  └────────────┘  └────────────┘  └────────────┘  │     │
│   └───────────────────────────────────────────────────────────────────┘     │
│                                                                              │
│   ┌───────────────────────────────────────────────────────────────────┐     │
│   │                        External Services                            │     │
│   │   ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐             │     │
│   │   │Minu Find│  │Minu Frame│ │Minu Build│ │Minu Keep│             │     │
│   │   └─────────┘  └─────────┘  └─────────┘  └─────────┘             │     │
│   └───────────────────────────────────────────────────────────────────┘     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Function 설계

### 2.1 mcp-auth: 토큰 발급 및 검증

서비스 간 인증을 위한 JWT 토큰 관리 기능을 제공합니다.

#### 2.1.1 엔드포인트 목록

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/mcp-auth/token` | 새 토큰 발급 |
| POST | `/mcp-auth/verify` | 토큰 유효성 검증 |
| POST | `/mcp-auth/refresh` | 토큰 갱신 |
| POST | `/mcp-auth/revoke` | 토큰 폐기 |

#### 2.1.2 POST /mcp-auth/token - 토큰 발급

새로운 서비스 토큰을 발급합니다.

**요청 헤더**:
```
X-Service-Id: minu-find | minu-frame | minu-build | minu-keep
X-Signature: sha256=<HMAC_SIGNATURE>
X-Timestamp: <ISO_8601_TIMESTAMP>
Content-Type: application/json
```

**요청 본문**:
```json
{
  "grant_type": "service_credentials",
  "scope": ["events:read", "events:write", "health:write"],
  "client_id": "minu-find-client-001"
}
```

**응답 (200 OK)**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 900,
  "refresh_token": "rt_abc123def456...",
  "scope": "events:read events:write health:write",
  "issued_at": "2025-11-23T10:00:00.000Z"
}
```

**JWT 페이로드 구조**:
```json
{
  "iss": "mcp-auth",
  "sub": "minu-find",
  "aud": "central-hub",
  "iat": 1732356000,
  "exp": 1732356900,
  "jti": "uuid-v4",
  "scope": ["events:read", "events:write", "health:write"],
  "client_id": "minu-find-client-001"
}
```

#### 2.1.3 POST /mcp-auth/verify - 토큰 검증

제공된 토큰의 유효성을 검증합니다.

**요청 헤더**:
```
Authorization: Bearer <ACCESS_TOKEN>
Content-Type: application/json
```

**요청 본문**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "required_scope": ["events:write"]
}
```

**응답 (200 OK)**:
```json
{
  "valid": true,
  "service_id": "minu-find",
  "scope": ["events:read", "events:write", "health:write"],
  "expires_at": "2025-11-23T10:15:00.000Z",
  "remaining_seconds": 540
}
```

**응답 (401 Unauthorized)**:
```json
{
  "valid": false,
  "error": "token_expired",
  "error_description": "토큰이 만료되었습니다.",
  "expired_at": "2025-11-23T10:15:00.000Z"
}
```

#### 2.1.4 POST /mcp-auth/refresh - 토큰 갱신

Refresh 토큰을 사용하여 새 액세스 토큰을 발급합니다.

**요청 헤더**:
```
Content-Type: application/json
```

**요청 본문**:
```json
{
  "grant_type": "refresh_token",
  "refresh_token": "rt_abc123def456..."
}
```

**응답 (200 OK)**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 900,
  "refresh_token": "rt_new123xyz...",
  "issued_at": "2025-11-23T10:15:00.000Z"
}
```

#### 2.1.5 POST /mcp-auth/revoke - 토큰 폐기

토큰을 즉시 폐기합니다. 이 토큰은 더 이상 사용할 수 없습니다.

**요청 헤더**:
```
Authorization: Bearer <ACCESS_TOKEN>
Content-Type: application/json
```

**요청 본문**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type_hint": "access_token",
  "reason": "security_incident"
}
```

**응답 (200 OK)**:
```json
{
  "revoked": true,
  "token_id": "uuid-v4",
  "revoked_at": "2025-11-23T10:20:00.000Z"
}
```

---

### 2.2 mcp-router: 이벤트 라우팅

서비스 간 이벤트를 라우팅하고 전달합니다.

#### 2.2.1 엔드포인트 목록

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/mcp-router/dispatch` | 이벤트 전달 |
| GET | `/mcp-router/status` | 라우터 상태 조회 |

#### 2.2.2 POST /mcp-router/dispatch - 이벤트 전달

이벤트를 대상 서비스로 라우팅합니다.

**요청 헤더**:
```
Authorization: Bearer <ACCESS_TOKEN>
X-Request-Id: <UUID>
X-Idempotency-Key: <UNIQUE_KEY>
Content-Type: application/json
```

**요청 본문**:
```json
{
  "source": "minu-find",
  "target": "central-hub",
  "event_type": "opportunity.discovered",
  "priority": "normal",
  "payload": {
    "opportunity_id": "opp-123",
    "title": "정부 SI 사업 기회",
    "category": "government",
    "budget": 500000000,
    "deadline": "2025-12-31"
  },
  "metadata": {
    "correlation_id": "uuid-v4",
    "timestamp": "2025-11-23T10:00:00.000Z"
  }
}
```

**우선순위 레벨**:

| 우선순위 | 설명 | 처리 지연 |
|----------|------|----------|
| `critical` | 즉시 처리 필요 | < 100ms |
| `high` | 높은 우선순위 | < 500ms |
| `normal` | 일반 이벤트 | < 1s |
| `low` | 낮은 우선순위 | < 5s |

**응답 (202 Accepted)**:
```json
{
  "dispatched": true,
  "dispatch_id": "dsp-uuid-v4",
  "status": "queued",
  "estimated_delivery": "2025-11-23T10:00:01.000Z",
  "retry_policy": {
    "max_retries": 3,
    "backoff_type": "exponential",
    "initial_delay_ms": 1000
  }
}
```

**라우팅 규칙**:

```typescript
// 이벤트 타입별 라우팅 규칙
const ROUTING_RULES: RoutingRule[] = [
  // Minu Find → Central Hub
  { event_pattern: 'opportunity.*', source: 'minu-find', target: 'central-hub' },

  // Minu Frame → Central Hub
  { event_pattern: 'rfp.*', source: 'minu-frame', target: 'central-hub' },
  { event_pattern: 'document.*', source: 'minu-frame', target: 'central-hub' },

  // Minu Build → Central Hub
  { event_pattern: 'project.*', source: 'minu-build', target: 'central-hub' },
  { event_pattern: 'milestone.*', source: 'minu-build', target: 'central-hub' },

  // Minu Keep → Central Hub
  { event_pattern: 'incident.*', source: 'minu-keep', target: 'central-hub' },
  { event_pattern: 'maintenance.*', source: 'minu-keep', target: 'central-hub' },

  // Central Hub → 모든 서비스 (브로드캐스트)
  { event_pattern: 'system.*', source: 'central-hub', target: '*' },
];
```

#### 2.2.3 GET /mcp-router/status - 라우터 상태

라우터의 현재 상태와 통계를 조회합니다.

**요청 헤더**:
```
Authorization: Bearer <ACCESS_TOKEN>
```

**응답 (200 OK)**:
```json
{
  "status": "healthy",
  "uptime_seconds": 86400,
  "statistics": {
    "total_dispatched": 15423,
    "successful": 15201,
    "failed": 122,
    "pending": 100,
    "success_rate": 98.41
  },
  "queue_depth": {
    "critical": 0,
    "high": 5,
    "normal": 45,
    "low": 50
  },
  "last_dispatch": "2025-11-23T10:25:30.000Z",
  "services": {
    "minu-find": { "status": "connected", "latency_ms": 45 },
    "minu-frame": { "status": "connected", "latency_ms": 52 },
    "minu-build": { "status": "connected", "latency_ms": 38 },
    "minu-keep": { "status": "degraded", "latency_ms": 250 }
  }
}
```

---

### 2.3 mcp-sync: 상태 동기화

서비스 간 상태를 동기화합니다.

#### 2.3.1 엔드포인트 목록

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/mcp-sync/state` | 상태 업데이트 |
| GET | `/mcp-sync/state/:service` | 특정 서비스 상태 조회 |
| GET | `/mcp-sync/state` | 전체 상태 조회 |

#### 2.3.2 POST /mcp-sync/state - 상태 업데이트

서비스의 상태를 업데이트합니다.

**요청 헤더**:
```
Authorization: Bearer <ACCESS_TOKEN>
X-Service-Id: minu-find
Content-Type: application/json
```

**요청 본문**:
```json
{
  "service_id": "minu-find",
  "state_type": "health",
  "state": {
    "status": "healthy",
    "version": "1.2.3",
    "metrics": {
      "cpu_percent": 45.2,
      "memory_percent": 62.8,
      "active_connections": 128,
      "request_per_minute": 450
    },
    "capabilities": ["opportunity_search", "market_analysis", "trend_detection"],
    "last_activity": "2025-11-23T10:30:00.000Z"
  },
  "ttl_seconds": 300
}
```

**상태 유형 (state_type)**:

| 상태 유형 | 설명 | TTL 기본값 |
|----------|------|-----------|
| `health` | 서비스 헬스 상태 | 60초 |
| `capabilities` | 서비스 기능 목록 | 3600초 |
| `config` | 서비스 설정 | 3600초 |
| `metadata` | 서비스 메타데이터 | 300초 |

**응답 (200 OK)**:
```json
{
  "synced": true,
  "sync_id": "sync-uuid-v4",
  "service_id": "minu-find",
  "state_type": "health",
  "version": 42,
  "synced_at": "2025-11-23T10:30:05.000Z",
  "expires_at": "2025-11-23T10:35:05.000Z"
}
```

#### 2.3.3 GET /mcp-sync/state/:service - 특정 서비스 상태 조회

특정 서비스의 상태를 조회합니다.

**요청 헤더**:
```
Authorization: Bearer <ACCESS_TOKEN>
```

**요청 경로 파라미터**:
- `service`: 서비스 ID (minu-find, minu-frame, minu-build, minu-keep)

**쿼리 파라미터**:
- `state_type`: 상태 유형 (선택, 없으면 전체)
- `include_history`: 이력 포함 여부 (선택, 기본 false)

**응답 (200 OK)**:
```json
{
  "service_id": "minu-find",
  "states": {
    "health": {
      "status": "healthy",
      "version": "1.2.3",
      "metrics": {
        "cpu_percent": 45.2,
        "memory_percent": 62.8
      },
      "synced_at": "2025-11-23T10:30:05.000Z",
      "expires_at": "2025-11-23T10:35:05.000Z",
      "version": 42
    },
    "capabilities": {
      "features": ["opportunity_search", "market_analysis"],
      "synced_at": "2025-11-23T09:00:00.000Z",
      "version": 5
    }
  },
  "last_seen": "2025-11-23T10:30:05.000Z"
}
```

#### 2.3.4 GET /mcp-sync/state - 전체 상태 조회

모든 서비스의 상태를 한 번에 조회합니다.

**요청 헤더**:
```
Authorization: Bearer <ACCESS_TOKEN>
```

**응답 (200 OK)**:
```json
{
  "services": {
    "minu-find": {
      "status": "healthy",
      "last_seen": "2025-11-23T10:30:05.000Z",
      "state_count": 3
    },
    "minu-frame": {
      "status": "healthy",
      "last_seen": "2025-11-23T10:29:55.000Z",
      "state_count": 2
    },
    "minu-build": {
      "status": "healthy",
      "last_seen": "2025-11-23T10:30:00.000Z",
      "state_count": 3
    },
    "minu-keep": {
      "status": "degraded",
      "last_seen": "2025-11-23T10:25:00.000Z",
      "state_count": 2
    }
  },
  "total_services": 4,
  "healthy_services": 3,
  "synced_at": "2025-11-23T10:30:10.000Z"
}
```

---

## 3. 인증 흐름

### 3.1 서비스 토큰 발급 흐름

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   Service   │      │  mcp-auth   │      │  Supabase   │      │  service_   │
│ (Minu Find) │      │  Function   │      │   Auth      │      │   tokens    │
└──────┬──────┘      └──────┬──────┘      └──────┬──────┘      └──────┬──────┘
       │                    │                    │                    │
       │  1. POST /token    │                    │                    │
       │  + HMAC Signature  │                    │                    │
       ├───────────────────>│                    │                    │
       │                    │                    │                    │
       │                    │  2. HMAC 검증       │                    │
       │                    ├───────────────────>│                    │
       │                    │                    │                    │
       │                    │  3. 검증 결과        │                    │
       │                    │<───────────────────┤                    │
       │                    │                    │                    │
       │                    │  4. JWT 생성        │                    │
       │                    │  (15분 만료)        │                    │
       │                    │                    │                    │
       │                    │  5. 토큰 저장        │                    │
       │                    ├─────────────────────────────────────────>│
       │                    │                    │                    │
       │  6. JWT + Refresh  │                    │                    │
       │<───────────────────┤                    │                    │
       │                    │                    │                    │
```

### 3.2 이벤트 전송 흐름

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   Service   │      │  mcp-router │      │  mcp-auth   │      │  Central    │
│ (Minu Find) │      │  Function   │      │  (verify)   │      │    Hub      │
└──────┬──────┘      └──────┬──────┘      └──────┬──────┘      └──────┬──────┘
       │                    │                    │                    │
       │  1. POST /dispatch │                    │                    │
       │  Authorization:    │                    │                    │
       │  Bearer <TOKEN>    │                    │                    │
       ├───────────────────>│                    │                    │
       │                    │                    │                    │
       │                    │  2. 토큰 검증       │                    │
       │                    ├───────────────────>│                    │
       │                    │                    │                    │
       │                    │  3. 검증 결과 + scope                   │
       │                    │<───────────────────┤                    │
       │                    │                    │                    │
       │                    │  4. 권한 확인       │                    │
       │                    │  (scope 체크)       │                    │
       │                    │                    │                    │
       │                    │  5. 이벤트 라우팅    │                    │
       │                    ├─────────────────────────────────────────>│
       │                    │                    │                    │
       │                    │                    │  6. 이벤트 저장     │
       │                    │                    │                    │
       │  7. 202 Accepted   │                    │                    │
       │<───────────────────┤                    │                    │
       │                    │                    │                    │
```

### 3.3 토큰 갱신 흐름

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   Service   │      │  mcp-auth   │      │  service_   │
│ (Minu Find) │      │  Function   │      │   tokens    │
└──────┬──────┘      └──────┬──────┘      └──────┬──────┘
       │                    │                    │
       │  1. POST /refresh  │                    │
       │  + refresh_token   │                    │
       ├───────────────────>│                    │
       │                    │                    │
       │                    │  2. Refresh 토큰 조회│
       │                    ├───────────────────>│
       │                    │                    │
       │                    │  3. 토큰 정보 반환   │
       │                    │<───────────────────┤
       │                    │                    │
       │                    │  4. 유효성 검증     │
       │                    │  - 만료 확인        │
       │                    │  - 폐기 여부 확인   │
       │                    │                    │
       │                    │  5. 새 JWT 생성     │
       │                    │                    │
       │                    │  6. 기존 Refresh    │
       │                    │     토큰 폐기       │
       │                    ├───────────────────>│
       │                    │                    │
       │                    │  7. 새 Refresh      │
       │                    │     토큰 저장       │
       │                    ├───────────────────>│
       │                    │                    │
       │  8. 새 토큰 세트    │                    │
       │<───────────────────┤                    │
       │                    │                    │
```

---

## 4. 에러 처리

### 4.1 에러 코드 정의

| HTTP 코드 | 에러 코드 | 설명 | 재시도 |
|-----------|----------|------|--------|
| 400 | `bad_request` | 잘못된 요청 형식 | 아니오 |
| 400 | `invalid_payload` | 유효하지 않은 페이로드 | 아니오 |
| 400 | `missing_header` | 필수 헤더 누락 | 아니오 |
| 401 | `unauthorized` | 인증 실패 | 아니오 |
| 401 | `token_expired` | 토큰 만료 | Refresh 후 예 |
| 401 | `invalid_signature` | 잘못된 HMAC 서명 | 아니오 |
| 403 | `forbidden` | 권한 없음 | 아니오 |
| 403 | `insufficient_scope` | 권한 범위 부족 | 아니오 |
| 404 | `not_found` | 리소스 없음 | 아니오 |
| 409 | `conflict` | 상태 충돌 | 아니오 |
| 429 | `rate_limited` | Rate Limit 초과 | 예 (대기 후) |
| 500 | `internal_error` | 내부 서버 오류 | 예 |
| 502 | `bad_gateway` | 외부 서비스 오류 | 예 |
| 503 | `service_unavailable` | 서비스 이용 불가 | 예 |

### 4.2 에러 응답 형식

```json
{
  "error": {
    "code": "token_expired",
    "message": "액세스 토큰이 만료되었습니다.",
    "details": {
      "expired_at": "2025-11-23T10:15:00.000Z",
      "token_id": "uuid-v4"
    },
    "request_id": "req-uuid-v4",
    "timestamp": "2025-11-23T10:20:00.000Z"
  },
  "hint": "POST /mcp-auth/refresh 엔드포인트로 토큰을 갱신하세요.",
  "documentation_url": "https://docs.ideaonaction.ai/mcp/errors#token_expired"
}
```

### 4.3 401 Unauthorized - 인증 실패

**발생 상황**:
- 토큰이 제공되지 않음
- 토큰 형식이 잘못됨
- 토큰이 만료됨
- HMAC 서명이 일치하지 않음

**응답 예시**:
```json
{
  "error": {
    "code": "invalid_signature",
    "message": "HMAC 서명이 유효하지 않습니다.",
    "details": {
      "expected_algorithm": "SHA-256",
      "service_id": "minu-find"
    },
    "request_id": "req-uuid-v4",
    "timestamp": "2025-11-23T10:00:00.000Z"
  }
}
```

### 4.4 403 Forbidden - 권한 없음

**발생 상황**:
- 유효한 토큰이지만 해당 작업에 대한 권한이 없음
- 필요한 scope가 토큰에 포함되지 않음

**응답 예시**:
```json
{
  "error": {
    "code": "insufficient_scope",
    "message": "이 작업을 수행할 권한이 없습니다.",
    "details": {
      "required_scope": ["events:write"],
      "token_scope": ["events:read"],
      "missing_scope": ["events:write"]
    },
    "request_id": "req-uuid-v4",
    "timestamp": "2025-11-23T10:00:00.000Z"
  }
}
```

### 4.5 429 Rate Limit - 요청 제한 초과

**발생 상황**:
- 단위 시간당 허용된 요청 수 초과

**Rate Limit 정책**:

| 엔드포인트 | 제한 | 윈도우 |
|-----------|------|--------|
| `/mcp-auth/token` | 10회 | 분당 |
| `/mcp-auth/verify` | 100회 | 분당 |
| `/mcp-router/dispatch` | 1000회 | 분당 |
| `/mcp-sync/state` | 60회 | 분당 |

**응답 예시**:
```json
{
  "error": {
    "code": "rate_limited",
    "message": "요청 제한을 초과했습니다.",
    "details": {
      "limit": 100,
      "remaining": 0,
      "reset_at": "2025-11-23T10:01:00.000Z"
    },
    "request_id": "req-uuid-v4",
    "timestamp": "2025-11-23T10:00:30.000Z"
  },
  "retry_after": 30
}
```

**응답 헤더**:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1732356060
Retry-After: 30
```

### 4.6 500 Internal Error - 서버 오류

**발생 상황**:
- 예상치 못한 서버 오류
- 데이터베이스 연결 실패
- 외부 의존성 오류

**응답 예시**:
```json
{
  "error": {
    "code": "internal_error",
    "message": "서버 내부 오류가 발생했습니다.",
    "details": {
      "incident_id": "inc-uuid-v4"
    },
    "request_id": "req-uuid-v4",
    "timestamp": "2025-11-23T10:00:00.000Z"
  },
  "hint": "문제가 지속되면 지원팀에 incident_id와 함께 문의하세요."
}
```

---

## 5. 보안 고려사항

### 5.1 HMAC 서명

모든 서비스 인증 요청은 HMAC-SHA256 서명으로 검증됩니다.

**서명 생성 방법**:

```typescript
// 서명 대상 문자열 생성
const signaturePayload = [
  timestamp,           // ISO 8601 형식
  method,              // HTTP 메서드 (POST)
  path,                // 요청 경로 (/mcp-auth/token)
  body                 // 요청 본문 JSON
].join('\n');

// HMAC-SHA256 서명 생성
const signature = crypto
  .createHmac('sha256', webhookSecret)
  .update(signaturePayload)
  .digest('hex');

// 헤더에 서명 포함
headers['X-Signature'] = `sha256=${signature}`;
headers['X-Timestamp'] = timestamp;
```

**서명 검증 규칙**:
- 타임스탬프는 현재 시간 기준 ±5분 이내여야 함
- 서명은 대소문자 구분 없이 비교
- 실패 시 상세한 에러 메시지 노출 금지 (보안)

### 5.2 토큰 만료 정책

| 토큰 유형 | 만료 시간 | 갱신 가능 |
|----------|----------|----------|
| Access Token | 15분 | Refresh Token으로 갱신 |
| Refresh Token | 7일 | 재인증 필요 |
| Revoked Token | 즉시 | 불가 |

**토큰 저장 보안**:
- Access Token: 메모리에만 저장 (절대 영구 저장 금지)
- Refresh Token: Secure Cookie 또는 암호화된 저장소
- 서버 측: 토큰 해시만 저장 (원본 저장 금지)

### 5.3 Refresh 토큰 보안

**Refresh Token Rotation**:
- Refresh Token 사용 시 새 Refresh Token 발급
- 기존 Refresh Token은 즉시 무효화
- 동일 Refresh Token 재사용 감지 시 전체 세션 무효화

```typescript
// Refresh Token Rotation 구현
async function refreshToken(oldRefreshToken: string) {
  // 1. 기존 토큰 조회
  const tokenRecord = await db.findByHash(hash(oldRefreshToken));

  // 2. 이미 사용된 토큰인지 확인
  if (tokenRecord.used) {
    // 보안 위협: 토큰 재사용 감지
    await revokeAllTokensForService(tokenRecord.serviceId);
    throw new SecurityError('refresh_token_reuse_detected');
  }

  // 3. 기존 토큰 무효화
  await db.markAsUsed(tokenRecord.id);

  // 4. 새 토큰 발급
  const newAccessToken = generateAccessToken();
  const newRefreshToken = generateRefreshToken();

  // 5. 새 Refresh Token 저장
  await db.saveToken({
    hash: hash(newRefreshToken),
    serviceId: tokenRecord.serviceId,
    used: false
  });

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}
```

### 5.4 Rate Limiting

**구현 방식**: Sliding Window Counter

```typescript
// Rate Limit 검사
async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStart = now - windowMs;

  // Redis ZSET 사용
  await redis.zremrangebyscore(key, 0, windowStart);
  const count = await redis.zcard(key);

  if (count >= limit) {
    const oldestTimestamp = await redis.zrange(key, 0, 0, 'WITHSCORES');
    const resetAt = parseInt(oldestTimestamp[1]) + windowMs;

    return {
      allowed: false,
      limit,
      remaining: 0,
      resetAt: new Date(resetAt)
    };
  }

  await redis.zadd(key, now, `${now}-${Math.random()}`);
  await redis.expire(key, Math.ceil(windowMs / 1000));

  return {
    allowed: true,
    limit,
    remaining: limit - count - 1,
    resetAt: new Date(now + windowMs)
  };
}
```

### 5.5 추가 보안 조치

| 보안 조치 | 설명 |
|----------|------|
| TLS 1.3 | 모든 통신 암호화 |
| IP Allowlist | 허용된 IP에서만 토큰 발급 (선택적) |
| Request Signing | 모든 요청에 서명 포함 |
| Audit Logging | 모든 인증 시도 로깅 |
| Anomaly Detection | 비정상 패턴 감지 시 알림 |

---

## 6. 데이터베이스 스키마

### 6.1 service_tokens 테이블

```sql
-- 서비스 간 인증 토큰 테이블
CREATE TABLE service_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 토큰 정보
  service_id TEXT NOT NULL CHECK (service_id IN ('minu-find', 'minu-frame', 'minu-build', 'minu-keep')),
  client_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE, -- SHA256 해시
  token_type TEXT NOT NULL CHECK (token_type IN ('access', 'refresh')),

  -- 권한
  scope TEXT[] NOT NULL DEFAULT '{}',

  -- 유효 기간
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,

  -- 상태
  is_revoked BOOLEAN NOT NULL DEFAULT false,
  revoked_at TIMESTAMPTZ,
  revoked_reason TEXT,

  -- Refresh Token Rotation
  used BOOLEAN NOT NULL DEFAULT false,
  used_at TIMESTAMPTZ,

  -- 메타데이터
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 인덱스
CREATE INDEX idx_tokens_service ON service_tokens(service_id);
CREATE INDEX idx_tokens_hash ON service_tokens(token_hash);
CREATE INDEX idx_tokens_expires ON service_tokens(expires_at);
CREATE INDEX idx_tokens_type ON service_tokens(token_type);
CREATE INDEX idx_tokens_revoked ON service_tokens(is_revoked) WHERE is_revoked = false;

-- RLS 정책
ALTER TABLE service_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role만 토큰 관리"
  ON service_tokens FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- 만료 토큰 자동 삭제 함수
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM service_tokens
  WHERE expires_at < now() - INTERVAL '1 day';
END;
$$;
```

### 6.2 mcp_audit_log 테이블

```sql
-- MCP 감사 로그 테이블
CREATE TABLE mcp_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 요청 정보
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  service_id TEXT,
  client_id TEXT,

  -- 결과
  status_code INTEGER NOT NULL,
  success BOOLEAN NOT NULL,
  error_code TEXT,

  -- 컨텍스트
  request_id TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,

  -- 시간
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  response_time_ms INTEGER
);

-- 인덱스
CREATE INDEX idx_audit_service ON mcp_audit_log(service_id);
CREATE INDEX idx_audit_endpoint ON mcp_audit_log(endpoint);
CREATE INDEX idx_audit_created ON mcp_audit_log(created_at DESC);
CREATE INDEX idx_audit_success ON mcp_audit_log(success);

-- 파티셔닝 (월별)
-- 프로덕션에서는 파티셔닝 적용 권장
```

---

## 7. 구현 체크리스트

### Phase 4 작업 목록

| 순서 | 작업 | 예상 시간 | 상태 |
|------|------|----------|------|
| 1 | service_tokens 테이블 마이그레이션 | 30분 | ⏳ 대기 |
| 2 | mcp_audit_log 테이블 마이그레이션 | 30분 | ⏳ 대기 |
| 3 | mcp-auth/index.ts 구현 | 3시간 | ⏳ 대기 |
| 4 | mcp-router/index.ts 구현 | 2시간 | ⏳ 대기 |
| 5 | mcp-sync/index.ts 구현 | 2시간 | ⏳ 대기 |
| 6 | 공통 미들웨어 구현 | 1시간 | ⏳ 대기 |
| 7 | Rate Limiting 구현 | 1시간 | ⏳ 대기 |
| 8 | 에러 핸들링 통합 | 1시간 | ⏳ 대기 |
| 9 | E2E 테스트 작성 | 2시간 | ⏳ 대기 |
| 10 | 통합 테스트 작성 | 1시간 | ⏳ 대기 |

**총 예상 소요**: 14시간 (2일)

---

## 8. 테스트 계획

### 8.1 단위 테스트

```typescript
// tests/unit/mcp-auth.test.ts
describe('mcp-auth', () => {
  describe('verifySignature', () => {
    it('유효한 서명을 검증해야 함', async () => {});
    it('잘못된 서명을 거부해야 함', async () => {});
    it('만료된 타임스탬프를 거부해야 함', async () => {});
  });

  describe('generateToken', () => {
    it('유효한 JWT를 생성해야 함', async () => {});
    it('올바른 만료 시간을 설정해야 함', async () => {});
    it('scope를 포함해야 함', async () => {});
  });

  describe('refreshToken', () => {
    it('새 토큰 세트를 발급해야 함', async () => {});
    it('기존 Refresh Token을 무효화해야 함', async () => {});
    it('토큰 재사용 시 보안 오류를 발생시켜야 함', async () => {});
  });
});
```

### 8.2 통합 테스트

```typescript
// tests/integration/mcp-flow.test.ts
describe('MCP 통합 플로우', () => {
  it('토큰 발급 → 이벤트 전송 → 상태 동기화', async () => {
    // 1. 토큰 발급
    const tokenResponse = await fetch('/mcp-auth/token', {
      method: 'POST',
      headers: { 'X-Signature': signature, 'X-Timestamp': timestamp },
      body: JSON.stringify({ grant_type: 'service_credentials' })
    });
    expect(tokenResponse.status).toBe(200);

    // 2. 이벤트 전송
    const dispatchResponse = await fetch('/mcp-router/dispatch', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}` },
      body: JSON.stringify({ event_type: 'test.event' })
    });
    expect(dispatchResponse.status).toBe(202);

    // 3. 상태 동기화
    const syncResponse = await fetch('/mcp-sync/state', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}` },
      body: JSON.stringify({ state_type: 'health', state: {} })
    });
    expect(syncResponse.status).toBe(200);
  });
});
```

### 8.3 E2E 테스트

```typescript
// tests/e2e/mcp/orchestrator.spec.ts
import { test, expect } from '@playwright/test';

test.describe('MCP Orchestrator E2E', () => {
  test('서비스 인증 및 이벤트 전송 전체 플로우', async ({ request }) => {
    // 테스트 구현
  });

  test('토큰 만료 후 갱신 플로우', async ({ request }) => {
    // 테스트 구현
  });

  test('Rate Limit 적용 확인', async ({ request }) => {
    // 테스트 구현
  });
});
```

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|----------|--------|
| 1.0.0 | 2025-11-23 | 초기 작성 | Claude |

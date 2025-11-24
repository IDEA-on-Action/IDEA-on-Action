# Claude AI 통합 아키텍처 설계

> IDEA on Action 프로젝트에 Claude AI를 통합하기 위한 시스템 아키텍처

**작성일**: 2025-11-24
**버전**: 1.0.0
**상태**: Draft
**관련 명세**: 추후 작성 예정

---

## 1. 시스템 아키텍처 개요

```
+===========================================================================+
|                    IDEA on Action - Claude AI 통합 아키텍처                   |
+===========================================================================+
|                                                                            |
|  +--------------------------------------------------------------------+   |
|  |                         Frontend Layer (React)                      |   |
|  |                                                                      |   |
|  |  +-----------------+  +------------------+  +--------------------+   |   |
|  |  |   Chat UI       |  |  AI Assistant    |  |   Document         |   |   |
|  |  |   Components    |  |  Components      |  |   Generator        |   |   |
|  |  +--------+--------+  +--------+---------+  +---------+----------+   |   |
|  |           |                    |                       |              |   |
|  |           +--------------------+-----------------------+              |   |
|  |                                |                                      |   |
|  |                                v                                      |   |
|  |  +------------------------------------------------------------+      |   |
|  |  |                   Claude Integration Layer                   |      |   |
|  |  |                                                              |      |   |
|  |  |  +---------------+  +---------------+  +-----------------+  |      |   |
|  |  |  | useClaude     |  | useClaudeChat |  | useClaudeStream |  |      |   |
|  |  |  | Generate      |  | (대화형)       |  | (스트리밍)       |  |      |   |
|  |  |  +-------+-------+  +-------+-------+  +--------+--------+  |      |   |
|  |  |          |                  |                    |          |      |   |
|  |  |          +------------------+--------------------+          |      |   |
|  |  |                             |                               |      |   |
|  |  |                             v                               |      |   |
|  |  |  +------------------------------------------------------+  |      |   |
|  |  |  |              ClaudeClient (API Wrapper)               |  |      |   |
|  |  |  |  - 요청 직렬화 / 응답 파싱                              |  |      |   |
|  |  |  |  - 토큰 관리 (Rate Limit 대응)                         |  |      |   |
|  |  |  |  - 스트리밍 처리                                       |  |      |   |
|  |  |  +-------------------------+----------------------------+  |      |   |
|  |  +----------------------------|-------------------------------+      |   |
|  +--------------------------------|--------------------------------------+   |
|                                   |                                          |
|                                   | HTTPS (TLS 1.3)                          |
|                                   |                                          |
|  +--------------------------------v--------------------------------------+   |
|  |                     Edge Function Layer (Deno)                         |   |
|  |                                                                        |   |
|  |  +----------------------------------------------------------------+   |   |
|  |  |                   claude-proxy Edge Function                    |   |   |
|  |  |                                                                  |   |   |
|  |  |  +--------------+  +----------------+  +------------------+     |   |   |
|  |  |  | Auth         |  | Rate Limiter   |  | Request          |     |   |   |
|  |  |  | Middleware   |  | (Token Bucket) |  | Validator        |     |   |   |
|  |  |  +------+-------+  +-------+--------+  +---------+--------+     |   |   |
|  |  |         |                  |                      |             |   |   |
|  |  |         v                  v                      v             |   |   |
|  |  |  +------------------------------------------------------+      |   |   |
|  |  |  |                  Claude API Handler                   |      |   |   |
|  |  |  |  - messages.create() 호출                             |      |   |   |
|  |  |  |  - 스트리밍 응답 포워딩                                |      |   |   |
|  |  |  |  - 에러 핸들링 / 재시도 로직                           |      |   |   |
|  |  |  +--------------------------+---------------------------+      |   |   |
|  |  +------------------------------|-------------------------------+   |   |
|  +--------------------------------------|-------------------------------+   |
|                                         |                                    |
|                                         | HTTPS                              |
|                                         v                                    |
|  +----------------------------------------------------------------------+   |
|  |                        External Services                               |   |
|  |                                                                        |   |
|  |  +------------------------+      +-------------------------------+    |   |
|  |  |   Anthropic API        |      |   Supabase (로그/캐시)         |    |   |
|  |  |   (Claude Sonnet 4)    |      |   - claude_usage_logs         |    |   |
|  |  |                        |      |   - claude_response_cache     |    |   |
|  |  +------------------------+      +-------------------------------+    |   |
|  |                                                                        |   |
|  +----------------------------------------------------------------------+   |
|                                                                            |
+===========================================================================+
```

---

## 2. 컴포넌트 설계

### 2.1 Edge Function Proxy 구조

```
+========================================================================+
|                    claude-proxy Edge Function                           |
+========================================================================+
|                                                                         |
|  Request Flow:                                                          |
|  ============                                                           |
|                                                                         |
|  [클라이언트 요청]                                                        |
|         |                                                               |
|         v                                                               |
|  +------------------+                                                   |
|  | CORS Middleware  |  <- Access-Control-Allow-Origin 처리              |
|  +--------+---------+                                                   |
|           |                                                             |
|           v                                                             |
|  +------------------+                                                   |
|  | Auth Middleware  |  <- Supabase JWT 검증                             |
|  +--------+---------+                                                   |
|           |                                                             |
|           +-- [실패] --> 401 Unauthorized                               |
|           |                                                             |
|           v [성공]                                                       |
|  +------------------+                                                   |
|  | Rate Limiter     |  <- user_id 기반 토큰 버킷                         |
|  +--------+---------+                                                   |
|           |                                                             |
|           +-- [초과] --> 429 Too Many Requests                          |
|           |                                                             |
|           v [통과]                                                       |
|  +------------------+                                                   |
|  | Request Validator|  <- 페이로드 검증 (Zod 스키마)                     |
|  +--------+---------+                                                   |
|           |                                                             |
|           +-- [실패] --> 400 Bad Request                                |
|           |                                                             |
|           v [성공]                                                       |
|  +------------------+                                                   |
|  | Cache Check      |  <- 동일 요청 캐시 확인 (선택)                     |
|  +--------+---------+                                                   |
|           |                                                             |
|           +-- [히트] --> 캐시된 응답 반환                                |
|           |                                                             |
|           v [미스]                                                       |
|  +------------------+                                                   |
|  | Anthropic Client |  <- @anthropic-ai/sdk 호출                        |
|  +--------+---------+                                                   |
|           |                                                             |
|           +-- [스트리밍] --> SSE 응답 포워딩                             |
|           |                                                             |
|           v [일반]                                                       |
|  +------------------+                                                   |
|  | Usage Logger     |  <- 사용량 기록 (tokens, latency)                 |
|  +--------+---------+                                                   |
|           |                                                             |
|           v                                                             |
|  [클라이언트 응답]                                                        |
|                                                                         |
+========================================================================+
```

### 2.2 React 훅 계층 구조

```
+========================================================================+
|                    Claude React Hooks 계층                              |
+========================================================================+
|                                                                         |
|  Application Layer (사용자 대면)                                         |
|  ====================================                                   |
|                                                                         |
|  +------------------------+  +------------------------+                 |
|  | useDocumentAssistant  |  | useChatWithClaude     |                 |
|  | - RFP 생성 도우미       |  | - 범용 대화 인터페이스   |                 |
|  +------------+-----------+  +------------+-----------+                 |
|               |                           |                             |
|               +-------------+-------------+                             |
|                             |                                           |
|                             v                                           |
|  Core Hooks Layer (핵심 기능)                                            |
|  ====================================                                   |
|                                                                         |
|  +--------------------+  +--------------------+  +------------------+   |
|  | useClaudeGenerate |  | useClaudeChat      |  | useClaudeStream |   |
|  | - 단일 응답 생성    |  | - 대화 컨텍스트 관리 |  | - 스트리밍 응답   |   |
|  | - React Query      |  | - 히스토리 관리     |  | - 청크 처리      |   |
|  +----------+---------+  +----------+---------+  +---------+--------+   |
|             |                       |                      |            |
|             +-----------------------+----------------------+            |
|                                     |                                   |
|                                     v                                   |
|  Infrastructure Layer (인프라)                                           |
|  ====================================                                   |
|                                                                         |
|  +--------------------------------------------------------------+      |
|  |                      ClaudeClient                             |      |
|  |  - Edge Function 호출                                          |      |
|  |  - 인증 토큰 주입                                               |      |
|  |  - 응답 파싱 / 에러 변환                                        |      |
|  +--------------------------------------------------------------+      |
|                                                                         |
+========================================================================+
```

### 2.3 데이터 흐름

```
+========================================================================+
|                    Claude 요청-응답 데이터 플로우                         |
+========================================================================+
|                                                                         |
|  1. 단일 응답 요청 (useClaudeGenerate)                                   |
|  =====================================                                   |
|                                                                         |
|  [사용자]                                                                |
|      |                                                                  |
|      | "RFP 개요 작성해줘"                                               |
|      v                                                                  |
|  +--------+     +------------+     +-----------+     +------------+     |
|  | React  | --> | useClaude  | --> | Claude    | --> | Edge       |     |
|  | 컴포넌트 |     | Generate   |     | Client    |     | Function   |     |
|  +--------+     +------------+     +-----------+     +-----+------+     |
|                                                            |            |
|                                                            v            |
|                                                      +------------+     |
|                                                      | Anthropic  |     |
|                                                      | API        |     |
|                                                      +-----+------+     |
|                                                            |            |
|      +-----------------------------------------------------+            |
|      |                                                                  |
|      v                                                                  |
|  +--------+     +------------+     +-----------+     +------------+     |
|  | React  | <-- | React      | <-- | Claude    | <-- | Edge       |     |
|  | 컴포넌트 |     | Query      |     | Client    |     | Function   |     |
|  +--------+     +------------+     +-----------+     +------------+     |
|      |                                                                  |
|      | {content: "## RFP 개요\n...", usage: {input: 100, output: 500}}  |
|      v                                                                  |
|  [UI 렌더링]                                                             |
|                                                                         |
|                                                                         |
|  2. 스트리밍 응답 (useClaudeStream)                                      |
|  =====================================                                   |
|                                                                         |
|  [사용자 입력]                                                            |
|      |                                                                  |
|      v                                                                  |
|  +--------+     +------------+     +-----------+     +------------+     |
|  | React  | --> | useClaude  | --> | Claude    | --> | Edge       |     |
|  | 컴포넌트 |     | Stream     |     | Client    |     | Function   |     |
|  +--------+     +------+-----+     +-----------+     +-----+------+     |
|                        |                                   |            |
|                        |                                   v            |
|                        |                             +------------+     |
|                        |                             | Anthropic  |     |
|                        |                             | API        |     |
|                        |                             | (stream)   |     |
|                        |                             +-----+------+     |
|                        |                                   |            |
|                        |     SSE: data: {"type":"content"} |            |
|                        |     <-----------------------------+            |
|                        |     SSE: data: {"type":"content"}              |
|                        |     <-----------------------------+            |
|                        |     SSE: data: {"type":"done"}                 |
|                        |     <-----------------------------+            |
|                        |                                                |
|                        v                                                |
|                  [청크별 UI 업데이트]                                     |
|                        |                                                |
|                        v                                                |
|                  [타이핑 애니메이션]                                      |
|                                                                         |
+========================================================================+
```

---

## 3. Edge Function 상세 설계

### 3.1 claude-proxy 엔드포인트

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/functions/v1/claude-proxy/messages` | Claude 메시지 생성 |
| POST | `/functions/v1/claude-proxy/messages/stream` | 스트리밍 메시지 생성 |
| GET | `/functions/v1/claude-proxy/usage` | 사용량 조회 (관리자) |

### 3.2 요청/응답 인터페이스

```typescript
// 요청 타입
interface ClaudeProxyRequest {
  messages: ClaudeMessage[];
  model?: ClaudeModel;          // 기본: claude-sonnet-4-5-20250929
  max_tokens?: number;          // 기본: 4096
  temperature?: number;         // 기본: 0.7
  system?: string;              // 시스템 프롬프트
  stream?: boolean;             // 스트리밍 여부
}

interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string | ClaudeContentBlock[];
}

interface ClaudeContentBlock {
  type: 'text' | 'image';
  text?: string;
  source?: {
    type: 'base64';
    media_type: string;
    data: string;
  };
}

// 응답 타입 (일반)
interface ClaudeProxyResponse {
  id: string;
  content: ClaudeContentBlock[];
  model: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
  stop_reason: 'end_turn' | 'max_tokens' | 'stop_sequence';
}

// 응답 타입 (스트리밍)
interface ClaudeStreamEvent {
  type: 'content_block_start' | 'content_block_delta' | 'content_block_stop' | 'message_stop';
  index?: number;
  delta?: {
    type: 'text_delta';
    text: string;
  };
}
```

### 3.3 환경 변수

```bash
# Anthropic API
ANTHROPIC_API_KEY=sk-ant-...      # Anthropic API 키

# Rate Limiting
CLAUDE_RATE_LIMIT_RPM=60          # 분당 요청 제한 (기본: 60)
CLAUDE_RATE_LIMIT_TPM=100000      # 분당 토큰 제한 (기본: 100K)

# 캐시 (선택)
CLAUDE_CACHE_ENABLED=true         # 캐시 사용 여부
CLAUDE_CACHE_TTL_SECONDS=3600     # 캐시 TTL (1시간)
```

---

## 4. 보안 설계

### 4.1 인증 흐름

```
+========================================================================+
|                    Claude API 인증 보안 아키텍처                         |
+========================================================================+
|                                                                         |
|  1. 클라이언트 인증 (Supabase Auth)                                      |
|  ===================================                                    |
|                                                                         |
|  [사용자]                                                                |
|      |                                                                  |
|      | Supabase 로그인                                                   |
|      v                                                                  |
|  +------------------+                                                   |
|  | Supabase Auth    | --> access_token (JWT)                           |
|  +------------------+                                                   |
|      |                                                                  |
|      v                                                                  |
|  [클라이언트 저장]                                                        |
|                                                                         |
|                                                                         |
|  2. API 요청 인증                                                        |
|  ===================================                                    |
|                                                                         |
|  [클라이언트]                                                             |
|      |                                                                  |
|      | Authorization: Bearer {supabase_jwt}                             |
|      v                                                                  |
|  +------------------+                                                   |
|  | Edge Function    |                                                   |
|  |                  |                                                   |
|  | 1. JWT 검증      | --> Supabase Auth API                            |
|  | 2. user_id 추출  |                                                   |
|  | 3. 권한 확인     | --> profiles 테이블 조회                           |
|  +------------------+                                                   |
|      |                                                                  |
|      v [검증 성공]                                                       |
|  +------------------+                                                   |
|  | Anthropic 호출   | --> X-Api-Key: {ANTHROPIC_API_KEY}                |
|  +------------------+                                                   |
|                                                                         |
|                                                                         |
|  ** 중요: ANTHROPIC_API_KEY는 절대 클라이언트에 노출되지 않음 **          |
|                                                                         |
+========================================================================+
```

### 4.2 Rate Limiting 전략

```
+========================================================================+
|                    Rate Limiting 구현                                   |
+========================================================================+
|                                                                         |
|  Token Bucket Algorithm (사용자별)                                       |
|  ===================================                                    |
|                                                                         |
|  버킷 구조:                                                              |
|  +-----------------------------------------+                            |
|  | user_id: "user-123"                     |                            |
|  | tokens: 60                              | <- 현재 남은 요청 수         |
|  | max_tokens: 60                          | <- 최대 요청 수 (RPM)       |
|  | refill_rate: 1/second                   | <- 초당 토큰 충전률          |
|  | last_refill: 1732400000000              |                            |
|  +-----------------------------------------+                            |
|                                                                         |
|  동작 흐름:                                                              |
|  1. 요청 수신 --> 사용자 버킷 조회                                        |
|  2. 토큰 충전 (경과 시간 * refill_rate)                                   |
|  3. 토큰 >= 1 ? 요청 허용 : 429 반환                                     |
|  4. 토큰 차감 후 처리                                                    |
|                                                                         |
|  저장소: Supabase (claude_rate_limits 테이블)                            |
|                                                                         |
+========================================================================+
```

### 4.3 권한 매트릭스

| 역할 | Claude 요청 | 스트리밍 | 사용량 조회 | 모델 선택 |
|------|------------|---------|------------|----------|
| guest | - | - | - | - |
| user | O (제한) | O | 본인만 | 기본 모델 |
| premium | O (확장) | O | 본인만 | 선택 가능 |
| admin | O (무제한) | O | 전체 | 전체 |

---

## 5. 데이터베이스 스키마

### 5.1 claude_usage_logs 테이블

```sql
-- Claude API 사용량 로그 테이블
CREATE TABLE claude_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 사용자 정보
  user_id UUID NOT NULL REFERENCES profiles(id),

  -- 요청 정보
  request_id TEXT NOT NULL UNIQUE,
  model TEXT NOT NULL DEFAULT 'claude-sonnet-4-5-20250929',

  -- 토큰 사용량
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  total_tokens INTEGER GENERATED ALWAYS AS (input_tokens + output_tokens) STORED,

  -- 성능 메트릭
  latency_ms INTEGER,
  stream BOOLEAN NOT NULL DEFAULT false,

  -- 에러 정보 (실패 시)
  error_code TEXT,
  error_message TEXT,

  -- 메타데이터
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 인덱스
CREATE INDEX idx_claude_usage_user ON claude_usage_logs(user_id);
CREATE INDEX idx_claude_usage_created ON claude_usage_logs(created_at DESC);
CREATE INDEX idx_claude_usage_model ON claude_usage_logs(model);

-- RLS 정책
ALTER TABLE claude_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "사용자 본인 로그만 조회"
  ON claude_usage_logs FOR SELECT
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));
```

### 5.2 claude_rate_limits 테이블

```sql
-- Rate Limit 상태 테이블 (Token Bucket)
CREATE TABLE claude_rate_limits (
  user_id UUID PRIMARY KEY REFERENCES profiles(id),

  -- 토큰 버킷
  tokens NUMERIC NOT NULL DEFAULT 60,
  max_tokens INTEGER NOT NULL DEFAULT 60,

  -- 토큰 사용량 (일별)
  daily_tokens_used INTEGER NOT NULL DEFAULT 0,
  daily_limit INTEGER NOT NULL DEFAULT 100000,

  -- 타임스탬프
  last_refill_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  daily_reset_at DATE NOT NULL DEFAULT CURRENT_DATE,

  -- 메타데이터
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 자동 업데이트 트리거
CREATE TRIGGER update_claude_rate_limits_updated_at
  BEFORE UPDATE ON claude_rate_limits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS 정책
ALTER TABLE claude_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role만 접근"
  ON claude_rate_limits FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');
```

### 5.3 claude_response_cache 테이블 (선택)

```sql
-- 응답 캐시 테이블 (비용 절감용)
CREATE TABLE claude_response_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 캐시 키 (요청 해시)
  request_hash TEXT NOT NULL UNIQUE,

  -- 캐시된 응답
  response JSONB NOT NULL,
  model TEXT NOT NULL,

  -- TTL
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '1 hour'),

  -- 통계
  hit_count INTEGER NOT NULL DEFAULT 0,
  last_hit_at TIMESTAMPTZ
);

-- 인덱스
CREATE INDEX idx_cache_hash ON claude_response_cache(request_hash);
CREATE INDEX idx_cache_expires ON claude_response_cache(expires_at);

-- 만료 캐시 자동 삭제
CREATE OR REPLACE FUNCTION cleanup_expired_claude_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM claude_response_cache WHERE expires_at < now();
END;
$$;
```

---

## 6. 에러 처리

### 6.1 에러 코드 체계

| 코드 | HTTP | 설명 | 클라이언트 대응 |
|------|------|------|----------------|
| CLAUDE_AUTH_001 | 401 | 인증 토큰 없음 | 로그인 유도 |
| CLAUDE_AUTH_002 | 401 | 토큰 만료 | 토큰 갱신 |
| CLAUDE_AUTH_003 | 403 | 권한 부족 | 업그레이드 안내 |
| CLAUDE_RATE_001 | 429 | 요청 제한 초과 | 재시도 대기 |
| CLAUDE_RATE_002 | 429 | 토큰 제한 초과 | 다음 날 안내 |
| CLAUDE_API_001 | 500 | Anthropic API 오류 | 재시도 |
| CLAUDE_API_002 | 503 | Anthropic 서비스 불가 | 잠시 후 재시도 |
| CLAUDE_API_003 | 400 | 잘못된 요청 | 입력 검증 |

### 6.2 재시도 전략

```typescript
// 재시도 설정
const retryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  retryableStatuses: [429, 500, 502, 503, 504],
};
```

---

## 7. 모니터링 및 로깅

### 7.1 메트릭 수집

- **요청 수**: 분당/시간당/일당 요청 수
- **토큰 사용량**: 입력/출력 토큰 추이
- **응답 시간**: 평균/P95/P99 레이턴시
- **에러율**: 에러 유형별 발생 빈도
- **캐시 적중률**: 캐시 히트/미스 비율

### 7.2 알림 설정

| 이벤트 | 임계값 | 알림 채널 |
|--------|--------|----------|
| 에러율 급증 | > 5% (5분간) | Slack |
| 응답 시간 증가 | P95 > 30초 | Slack |
| 일일 토큰 소진 | > 80% | 이메일 + Slack |
| API 키 오류 | 즉시 | 관리자 이메일 |

---

## 8. 확장성 고려사항

### 8.1 향후 확장 계획

1. **멀티 모델 지원**: Claude Opus, Haiku 등 모델 선택
2. **컨텍스트 캐싱**: 긴 시스템 프롬프트 캐싱
3. **배치 처리**: 대량 문서 생성 큐
4. **비전 기능**: 이미지 분석 통합
5. **Tool Use**: 외부 API 호출 에이전트

### 8.2 스케일링 전략

- **수평 확장**: Edge Function 자동 스케일링 활용
- **캐싱**: 동일 요청 캐싱으로 API 호출 감소
- **우선순위 큐**: Premium 사용자 우선 처리

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|----------|--------|
| 1.0.0 | 2025-11-24 | 초기 작성 | Claude |

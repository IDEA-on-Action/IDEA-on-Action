# Rate Limiting 공유 모듈

Edge Function용 Supabase 테이블 기반 Rate Limiting 구현

## 개요

- **알고리즘**: 슬라이딩 윈도우 (Sliding Window)
- **저장소**: Supabase 테이블 (`rate_limit_entries`)
- **표준 준수**: RFC 6585 (429 Too Many Requests)
- **추가 비용**: 없음 (Supabase 무료 플랜 범위 내)

## 설치

### 1. 마이그레이션 실행

```bash
supabase db push
```

또는 수동 실행:

```bash
psql -h [HOST] -U postgres -d postgres -f supabase/migrations/20251201000001_create_rate_limit_table.sql
```

### 2. Edge Function에서 사용

```typescript
import { rateLimitMiddleware, RATE_LIMIT_PRESETS } from '../_shared/rate-limit.ts'
```

## Rate Limit 정책

| 엔드포인트 | 제한 | 키 기준 | 프리셋 |
|-----------|------|---------|--------|
| OAuth (token, authorize) | 10 req/min | IP 주소 | `RATE_LIMIT_PRESETS.OAUTH` |
| API (subscription, user) | 60 req/min | User ID | `RATE_LIMIT_PRESETS.API` |
| Webhook | 100 req/min | Client ID | `RATE_LIMIT_PRESETS.WEBHOOK` |

## 사용 방법

### 방법 1: 미들웨어 방식 (권장)

가장 간단한 방법. Rate Limit 초과 시 자동으로 429 응답 반환.

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { rateLimitMiddleware, RATE_LIMIT_PRESETS } from '../_shared/rate-limit.ts'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Rate Limit 체크
  const rateLimitResponse = await rateLimitMiddleware(
    supabase,
    req,
    RATE_LIMIT_PRESETS.OAUTH // 또는 API, WEBHOOK
  )

  if (rateLimitResponse) {
    // Rate Limit 초과 시 429 응답
    return rateLimitResponse
  }

  // 정상 처리 로직...
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
```

### 방법 2: 수동 방식

Rate Limit 결과를 직접 처리하고 싶을 때 사용.

```typescript
import { checkRateLimit, addRateLimitHeaders, RATE_LIMIT_PRESETS } from '../_shared/rate-limit.ts'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Rate Limit 체크
  const result = await checkRateLimit(
    supabase,
    req,
    RATE_LIMIT_PRESETS.API
  )

  if (!result.allowed) {
    // Rate Limit 초과 시 커스텀 응답
    return new Response(
      JSON.stringify({
        error: 'rate_limit_exceeded',
        message: `${result.retryAfter}초 후 다시 시도하세요.`,
        limit: result.limit,
        current: result.current,
        remaining: result.remaining,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': result.limit.toString(),
          'X-RateLimit-Remaining': result.remaining.toString(),
          'X-RateLimit-Reset': result.resetAt.toString(),
          'Retry-After': result.retryAfter.toString(),
        },
      }
    )
  }

  // 정상 처리 로직...
  const response = new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })

  // Rate Limit 헤더 추가 (선택)
  return addRateLimitHeaders(response, result)
})
```

### 방법 3: 커스텀 설정

자체 Rate Limit 정책을 정의할 때 사용.

```typescript
import { rateLimitMiddleware, type RateLimitConfig } from '../_shared/rate-limit.ts'

const CUSTOM_RATE_LIMIT: RateLimitConfig = {
  windowMs: 5 * 60 * 1000, // 5분
  maxRequests: 100,
  keyGenerator: (req: Request) => {
    const apiKey = req.headers.get('x-api-key') || 'anonymous'
    return `custom:apikey:${apiKey}`
  },
}

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const rateLimitResponse = await rateLimitMiddleware(
    supabase,
    req,
    CUSTOM_RATE_LIMIT
  )

  if (rateLimitResponse) {
    return rateLimitResponse
  }

  // 정상 처리 로직...
  return new Response(JSON.stringify({ success: true }))
})
```

## 응답 헤더

모든 응답에 다음 헤더가 포함됩니다:

```
X-RateLimit-Limit: 60          # 최대 요청 수
X-RateLimit-Remaining: 45      # 남은 요청 수
X-RateLimit-Reset: 1701234567  # 리셋 시간 (Unix timestamp)
```

Rate Limit 초과 시 추가 헤더:

```
Retry-After: 30  # 재시도 가능 시간 (초)
```

## 429 응답 형식

RFC 6585 표준을 따르는 Problem Details 형식:

```json
{
  "type": "https://ideaonaction.ai/errors/rate-limit-exceeded",
  "title": "Rate Limit 초과",
  "status": 429,
  "detail": "요청 한도를 초과했습니다. 30초 후 다시 시도하세요.",
  "instance": "/functions/v1/oauth-token",
  "extensions": {
    "limit": 10,
    "current": 11,
    "remaining": 0,
    "reset_at": 1701234567,
    "retry_after": 30
  }
}
```

## 키 생성 전략

### 1. IP 주소 기반 (OAuth)

```typescript
keyGenerator: (req: Request) => {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
  return `oauth:ip:${ip}`
}
```

### 2. User ID 기반 (API)

```typescript
import { createUserIdKeyGenerator } from '../_shared/rate-limit.ts'

keyGenerator: createUserIdKeyGenerator('api')
```

또는 수동으로:

```typescript
keyGenerator: (req: Request) => {
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.substring(7) // "Bearer " 제거
  const userId = extractUserIdFromJWT(token)
  return `api:user:${userId}`
}
```

### 3. Client ID 기반 (Webhook)

```typescript
keyGenerator: (req: Request) => {
  const clientId = req.headers.get('x-client-id') || 'unknown'
  return `webhook:client:${clientId}`
}
```

## 기존 엔드포인트 적용 가이드

### oauth-token

```typescript
// Before
serve(async (req) => {
  // ... existing code
})

// After
import { rateLimitMiddleware, RATE_LIMIT_PRESETS } from '../_shared/rate-limit.ts'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Rate Limit 체크 추가
  const rateLimitResponse = await rateLimitMiddleware(
    supabase,
    req,
    RATE_LIMIT_PRESETS.OAUTH
  )
  if (rateLimitResponse) return rateLimitResponse

  // ... existing code
})
```

### subscription-api

```typescript
// Before: 인메모리 Map 방식
const rateLimitStore = new Map<string, RateLimitInfo>()

// After: Supabase 테이블 방식
import { rateLimitMiddleware, RATE_LIMIT_PRESETS } from '../_shared/rate-limit.ts'

serve(async (req) => {
  // ... CORS, 인증 등

  // 기존 checkRateLimit 함수 제거
  // const rateLimitResult = checkRateLimit(userId)

  // 새 Rate Limit 체크
  const rateLimitResponse = await rateLimitMiddleware(
    supabase,
    req,
    RATE_LIMIT_PRESETS.API
  )
  if (rateLimitResponse) return rateLimitResponse

  // ... 기존 로직
})
```

### user-api

subscription-api와 동일한 패턴 적용.

### payment-webhook

```typescript
import { rateLimitMiddleware, RATE_LIMIT_PRESETS } from '../_shared/rate-limit.ts'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const rateLimitResponse = await rateLimitMiddleware(
    supabase,
    req,
    RATE_LIMIT_PRESETS.WEBHOOK
  )
  if (rateLimitResponse) return rateLimitResponse

  // ... 기존 Webhook 처리 로직
})
```

## 문제 해결

### 1. Rate Limit이 작동하지 않는 경우

- `rate_limit_entries` 테이블이 생성되었는지 확인
- Service Role Key가 올바르게 설정되었는지 확인
- Supabase 클라이언트가 `SERVICE_ROLE_KEY`를 사용하는지 확인 (ANON_KEY는 RLS로 차단됨)

### 2. Rate Limit이 너무 엄격한 경우

프리셋 값 조정:

```typescript
const RELAXED_OAUTH: RateLimitConfig = {
  ...RATE_LIMIT_PRESETS.OAUTH,
  maxRequests: 20, // 10 → 20으로 증가
}
```

### 3. Rate Limit 초기화

특정 키의 Rate Limit을 수동으로 초기화:

```sql
DELETE FROM rate_limit_entries WHERE key = 'oauth:ip:127.0.0.1';
```

모든 Rate Limit 초기화:

```sql
DELETE FROM rate_limit_entries;
```

## 성능 최적화

### 1. 인덱스 최적화

마이그레이션 파일에 이미 포함되어 있음:

- `idx_rate_limit_entries_key_window`: 키 + 윈도우 시작 시간 복합 인덱스
- `idx_rate_limit_entries_expires_at`: 만료 시간 인덱스
- `idx_rate_limit_entries_key`: 키 인덱스

### 2. 자동 정리

만료된 엔트리는 pg_cron으로 5분마다 자동 삭제:

```sql
SELECT cleanup_expired_rate_limit_entries();
```

수동 실행:

```sql
DELETE FROM rate_limit_entries WHERE expires_at < now();
```

### 3. 테이블 모니터링

현재 Rate Limit 상태 확인:

```sql
SELECT key, count, window_start, expires_at
FROM rate_limit_entries
ORDER BY updated_at DESC
LIMIT 10;
```

키별 통계:

```sql
SELECT
  substring(key from 1 for position(':' in key || ':') - 1) as prefix,
  COUNT(*) as total_entries,
  SUM(count) as total_requests
FROM rate_limit_entries
WHERE expires_at > now()
GROUP BY prefix;
```

## 테스트

### 단위 테스트 (Deno)

```typescript
import { assertEquals } from 'https://deno.land/std@0.168.0/testing/asserts.ts'
import { checkRateLimit, RATE_LIMIT_PRESETS } from './rate-limit.ts'

Deno.test('Rate Limit - 정상 요청', async () => {
  const req = new Request('http://localhost', {
    headers: { 'x-forwarded-for': '127.0.0.1' },
  })

  const result = await checkRateLimit(supabase, req, RATE_LIMIT_PRESETS.OAUTH)

  assertEquals(result.allowed, true)
  assertEquals(result.limit, 10)
  assertEquals(result.current, 1)
  assertEquals(result.remaining, 9)
})

Deno.test('Rate Limit - 초과 요청', async () => {
  const req = new Request('http://localhost', {
    headers: { 'x-forwarded-for': '127.0.0.1' },
  })

  // 11번 요청
  for (let i = 0; i < 11; i++) {
    await checkRateLimit(supabase, req, RATE_LIMIT_PRESETS.OAUTH)
  }

  const result = await checkRateLimit(supabase, req, RATE_LIMIT_PRESETS.OAUTH)

  assertEquals(result.allowed, false)
  assertEquals(result.remaining, 0)
})
```

### 통합 테스트 (curl)

```bash
# OAuth 엔드포인트 테스트 (10 req/min)
for i in {1..11}; do
  curl -X POST http://localhost:54321/functions/v1/oauth-token \
    -H "Content-Type: application/json" \
    -d '{"grant_type":"authorization_code"}'
  echo ""
done

# 11번째 요청은 429 응답 예상
```

## 참고 자료

- [RFC 6585: Additional HTTP Status Codes](https://datatracker.ietf.org/doc/html/rfc6585)
- [RFC 7807: Problem Details for HTTP APIs](https://datatracker.ietf.org/doc/html/rfc7807)
- [Supabase Edge Functions 문서](https://supabase.com/docs/guides/functions)
- [Rate Limiting Best Practices](https://www.ietf.org/archive/id/draft-ietf-httpapi-ratelimit-headers-07.html)

## 변경 이력

- **v1.0.0** (2025-12-01): 초기 구현
  - 슬라이딩 윈도우 알고리즘
  - Supabase 테이블 기반 저장소
  - OAuth, API, Webhook 프리셋
  - RFC 6585 준수 응답

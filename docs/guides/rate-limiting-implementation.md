# Rate Limiting 구현 가이드

Edge Function용 Rate Limiting 모듈 구현 및 적용 가이드

## 개요

- **구현 날짜**: 2025-12-01
- **버전**: 1.0.0
- **알고리즘**: 슬라이딩 윈도우 (Sliding Window)
- **저장소**: Supabase 테이블 (`rate_limit_entries`)
- **표준 준수**: RFC 6585 (429 Too Many Requests)

## 구현 파일

| 파일 | 경로 | 설명 |
|------|------|------|
| **핵심 모듈** | `supabase/functions/_shared/rate-limit.ts` | Rate Limiting 핵심 로직 |
| **마이그레이션** | `supabase/migrations/20251201000001_create_rate_limit_table.sql` | DB 테이블 생성 |
| **사용 예시** | `supabase/functions/_shared/rate-limit.examples.ts` | 8가지 적용 예시 |
| **패치 가이드** | `supabase/functions/_shared/rate-limit.patches.md` | 기존 엔드포인트 패치 |
| **상세 문서** | `supabase/functions/_shared/RATE_LIMIT_README.md` | 전체 사용 가이드 |

## Rate Limit 정책

| 엔드포인트 | 제한 | 키 기준 | 프리셋 |
|-----------|------|---------|--------|
| **OAuth** | 10 req/min | IP 주소 | `RATE_LIMIT_PRESETS.OAUTH` |
| **API** | 60 req/min | User ID | `RATE_LIMIT_PRESETS.API` |
| **Webhook** | 100 req/min | Client ID | `RATE_LIMIT_PRESETS.WEBHOOK` |

## 빠른 시작

### 1. 마이그레이션 실행

```bash
cd d:\GitHub\idea-on-action
supabase db push
```

### 2. Edge Function에 적용

```typescript
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
    return rateLimitResponse // 429 응답 자동 반환
  }

  // 정상 처리 로직...
})
```

### 3. 테스트

```bash
# 로컬 함수 실행
supabase functions serve

# Rate Limit 테스트 (11번 요청)
for i in {1..11}; do
  curl -X POST http://localhost:54321/functions/v1/oauth-token \
    -H "Content-Type: application/json" \
    -d '{"grant_type":"authorization_code"}'
done
```

11번째 요청에서 429 응답 확인:

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

## 적용 대상 엔드포인트

### 우선순위 1: OAuth 엔드포인트

- ✅ `oauth-token` - IP 기준, 10 req/min
- ✅ `oauth-authorize` - IP 기준, 10 req/min

### 우선순위 2: API 엔드포인트

- ✅ `subscription-api` - User ID 기준, 60 req/min
- ✅ `user-api` - User ID 기준, 60 req/min

### 우선순위 3: Webhook 엔드포인트

- ✅ `payment-webhook` - Client ID 기준, 100 req/min

## 핵심 기능

### 1. 슬라이딩 윈도우 알고리즘

- 고정 윈도우보다 정확한 Rate Limiting
- 시간대별 요청 분산 효과

### 2. Supabase 테이블 기반

- 추가 비용 없음 (무료 플랜 범위)
- Edge Function 간 공유 가능
- 영구 저장 (재시작 시에도 유지)

### 3. RFC 6585 준수

- 표준 429 응답
- `Retry-After` 헤더 포함
- `X-RateLimit-*` 헤더 포함

### 4. 자동 만료 처리 (TTL)

- pg_cron으로 5분마다 정리
- 수동 정리 함수 제공

## 응답 헤더

모든 요청에 포함:

```
X-RateLimit-Limit: 60          # 최대 요청 수
X-RateLimit-Remaining: 45      # 남은 요청 수
X-RateLimit-Reset: 1701234567  # 리셋 시간 (Unix timestamp)
```

Rate Limit 초과 시 추가:

```
Retry-After: 30  # 재시도 가능 시간 (초)
```

## 데이터베이스 구조

### rate_limit_entries 테이블

```sql
CREATE TABLE rate_limit_entries (
  id UUID PRIMARY KEY,
  key TEXT NOT NULL,              -- Rate Limit 키
  count INTEGER NOT NULL,         -- 현재 요청 수
  window_start TIMESTAMPTZ,       -- 윈도우 시작 시간
  expires_at TIMESTAMPTZ,         -- 만료 시간 (TTL)
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### 인덱스

- `idx_rate_limit_entries_key_window`: 키 + 윈도우 복합 인덱스
- `idx_rate_limit_entries_expires_at`: 만료 시간 인덱스
- `idx_rate_limit_entries_key`: 키 인덱스

## 모니터링

### 현재 상태 확인

```sql
SELECT key, count, window_start, expires_at
FROM rate_limit_entries
ORDER BY updated_at DESC
LIMIT 10;
```

### 키별 통계

```sql
SELECT
  substring(key from 1 for position(':' in key || ':') - 1) as prefix,
  COUNT(*) as total_entries,
  SUM(count) as total_requests
FROM rate_limit_entries
WHERE expires_at > now()
GROUP BY prefix;
```

### 만료된 엔트리 정리

```sql
SELECT cleanup_expired_rate_limit_entries();
```

## 문제 해결

### Rate Limit 초기화

특정 키:
```sql
DELETE FROM rate_limit_entries WHERE key = 'oauth:ip:127.0.0.1';
```

전체:
```sql
DELETE FROM rate_limit_entries;
```

### Rate Limit이 작동하지 않는 경우

1. 테이블 생성 확인
   ```sql
   SELECT * FROM rate_limit_entries LIMIT 1;
   ```

2. Service Role Key 확인
   ```typescript
   // SUPABASE_SERVICE_ROLE_KEY 사용 필요 (ANON_KEY는 RLS로 차단)
   const supabase = createClient(
     Deno.env.get('SUPABASE_URL')!,
     Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')! // 중요!
   )
   ```

3. RLS 정책 확인
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'rate_limit_entries';
   ```

## 성능 고려사항

### 1. 인덱스 최적화

모든 조회 쿼리가 인덱스를 활용하도록 설계:

- 키 + 윈도우 시간 복합 인덱스
- 만료 시간 인덱스

### 2. 자동 정리

pg_cron이 5분마다 만료된 엔트리 삭제:

```sql
-- 기존 스케줄 확인
SELECT * FROM cron.job WHERE jobname = 'cleanup-rate-limit-entries';
```

### 3. Fail-Open 전략

DB 오류 시 요청 허용 (가용성 우선):

```typescript
if (queryError) {
  console.error('Rate limit query error:', queryError)
  // 에러 시 요청 허용
  return { allowed: true, ... }
}
```

## 커스터마이징

### 커스텀 Rate Limit 정책

```typescript
const CUSTOM_RATE_LIMIT: RateLimitConfig = {
  windowMs: 5 * 60 * 1000, // 5분
  maxRequests: 100,
  keyGenerator: (req: Request) => {
    const apiKey = req.headers.get('x-api-key') || 'anonymous'
    return `custom:apikey:${apiKey}`
  },
}
```

### User ID 기반 커스텀 키

```typescript
import { createUserIdKeyGenerator } from '../_shared/rate-limit.ts'

const config: RateLimitConfig = {
  windowMs: 60 * 1000,
  maxRequests: 30,
  keyGenerator: createUserIdKeyGenerator('custom-api'),
}
```

## 배포

```bash
# 마이그레이션 적용
supabase db push

# 함수 배포
supabase functions deploy oauth-token
supabase functions deploy oauth-authorize
supabase functions deploy subscription-api
supabase functions deploy user-api
supabase functions deploy payment-webhook
```

## 관련 문서

- [RFC 6585: Additional HTTP Status Codes](https://datatracker.ietf.org/doc/html/rfc6585)
- [RFC 7807: Problem Details for HTTP APIs](https://datatracker.ietf.org/doc/html/rfc7807)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [상세 사용 가이드](../../supabase/functions/_shared/RATE_LIMIT_README.md)
- [패치 가이드](../../supabase/functions/_shared/rate-limit.patches.md)
- [예시 코드](../../supabase/functions/_shared/rate-limit.examples.ts)

## 변경 이력

- **v1.0.0** (2025-12-01): 초기 구현
  - 슬라이딩 윈도우 알고리즘
  - Supabase 테이블 기반 저장소
  - OAuth, API, Webhook 프리셋
  - RFC 6585 준수 응답
  - 자동 만료 처리 (TTL)
  - 8가지 사용 예시
  - 5개 엔드포인트 패치 가이드

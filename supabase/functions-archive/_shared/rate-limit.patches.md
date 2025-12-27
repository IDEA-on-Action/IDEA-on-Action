# Rate Limiting 적용 패치

기존 엔드포인트에 Rate Limiting을 적용하는 실제 코드 패치입니다.

## 1. oauth-token 엔드포인트

**파일**: `supabase/functions/oauth-token/index.ts`

### 변경 사항

```diff
 import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
 import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
 import * as jose from 'https://deno.land/x/jose@v5.2.0/index.ts'
 import { getCorsHeaders } from '../_shared/cors.ts'
+import { rateLimitMiddleware, RATE_LIMIT_PRESETS } from '../_shared/rate-limit.ts'

 // ... 기존 코드 ...

 serve(async (req) => {
   const origin = req.headers.get('origin');
   const corsHeaders = getCorsHeaders(origin);

   // CORS preflight
   if (req.method === 'OPTIONS') {
     return new Response(null, { headers: corsHeaders })
   }

+  // Supabase 클라이언트 생성 (Rate Limit용)
+  const supabaseUrl = Deno.env.get('SUPABASE_URL')
+  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
+
+  if (!supabaseUrl || !supabaseKey) {
+    console.error('Missing Supabase configuration')
+    return errorResponse('server_error', '서버 설정 오류입니다.', 500)
+  }
+
+  const supabase = createClient(supabaseUrl, supabaseKey)
+
+  // Rate Limit 체크 (IP 기준, 10 req/min)
+  const rateLimitResponse = await rateLimitMiddleware(
+    supabase,
+    req,
+    RATE_LIMIT_PRESETS.OAUTH
+  )
+
+  if (rateLimitResponse) {
+    return rateLimitResponse
+  }

   // POST만 허용
   if (req.method !== 'POST') {
     return errorResponse('method_not_allowed', 'POST 메서드만 허용됩니다.', 405)
   }

   // ... 나머지 기존 코드 ...
-
-  // Supabase 클라이언트 생성
-  const supabaseUrl = Deno.env.get('SUPABASE_URL')
-  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
-
-  if (!supabaseUrl || !supabaseKey) {
-    console.error('Missing Supabase configuration')
-    return errorResponse('server_error', '서버 설정 오류입니다.', 500)
-  }
-
-  const supabase = createClient(supabaseUrl, supabaseKey)

   // Grant Type별 처리
   if (grant_type === 'authorization_code') {
     return handleAuthorizationCodeGrant(supabase, request, req)
   } else if (grant_type === 'refresh_token') {
     return handleRefreshTokenGrant(supabase, request, req)
   }

   return errorResponse('unsupported_grant_type', '지원하지 않는 grant_type입니다.')
 })
```

## 2. oauth-authorize 엔드포인트

**파일**: `supabase/functions/oauth-authorize/index.ts`

### 변경 사항

```diff
 import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
 import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
 import { getCorsHeaders } from '../_shared/cors.ts'
+import { rateLimitMiddleware, RATE_LIMIT_PRESETS } from '../_shared/rate-limit.ts'

 // ... 기존 코드 ...

 serve(async (req) => {
   const origin = req.headers.get('origin');
   const corsHeaders = getCorsHeaders(origin);

   // CORS preflight
   if (req.method === 'OPTIONS') {
     return new Response(null, { headers: corsHeaders })
   }

+  // Supabase 클라이언트 생성
+  const supabaseUrl = Deno.env.get('SUPABASE_URL')
+  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
+
+  if (!supabaseUrl || !supabaseKey) {
+    console.error('Missing Supabase configuration')
+    return errorResponse('server_error', '서버 설정 오류입니다.', 500)
+  }
+
+  const supabase = createClient(supabaseUrl, supabaseKey)
+
+  // Rate Limit 체크 (IP 기준, 10 req/min)
+  const rateLimitResponse = await rateLimitMiddleware(
+    supabase,
+    req,
+    RATE_LIMIT_PRESETS.OAUTH
+  )
+
+  if (rateLimitResponse) {
+    return rateLimitResponse
+  }

   // ... 나머지 기존 코드 ...
 })
```

## 3. subscription-api 엔드포인트

**파일**: `supabase/functions/subscription-api/index.ts`

### 변경 사항

```diff
 import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
 import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
 import { getCorsHeaders } from '../_shared/cors.ts'
+import { rateLimitMiddleware, RATE_LIMIT_PRESETS } from '../_shared/rate-limit.ts'

-// Rate Limiting (분당 60회)
-const RATE_LIMIT_WINDOW_MS = 60 * 1000
-const RATE_LIMIT_MAX_REQUESTS = 60
-
-// ... 타입 정의 ...
-
-interface RateLimitInfo {
-  requests: number
-  window_start: number
-}
-
-// ============================================================================
-// Rate Limiting 저장소
-// ============================================================================
-
-const rateLimitStore = new Map<string, RateLimitInfo>()

 // ... 유틸리티 함수 ...

-function checkRateLimit(userId: string): { allowed: boolean; remaining: number; resetAt: number } {
-  const now = Date.now()
-  const info = rateLimitStore.get(userId)
-
-  if (!info || now - info.window_start >= RATE_LIMIT_WINDOW_MS) {
-    rateLimitStore.set(userId, { requests: 1, window_start: now })
-    return {
-      allowed: true,
-      remaining: RATE_LIMIT_MAX_REQUESTS - 1,
-      resetAt: now + RATE_LIMIT_WINDOW_MS,
-    }
-  }
-
-  if (info.requests >= RATE_LIMIT_MAX_REQUESTS) {
-    return {
-      allowed: false,
-      remaining: 0,
-      resetAt: info.window_start + RATE_LIMIT_WINDOW_MS,
-    }
-  }
-
-  info.requests++
-  rateLimitStore.set(userId, info)
-
-  return {
-    allowed: true,
-    remaining: RATE_LIMIT_MAX_REQUESTS - info.requests,
-    resetAt: info.window_start + RATE_LIMIT_WINDOW_MS,
-  }
-}

 // ... 핸들러 함수 ...

 serve(async (req) => {
   const origin = req.headers.get('origin');
   const corsHeaders = getCorsHeaders(origin);

   // CORS preflight
   if (req.method === 'OPTIONS') {
     return new Response(null, { headers: corsHeaders })
   }

   const requestId = req.headers.get('x-request-id') || generateUUID()

   // 인증 토큰 검증
   const token = extractBearerToken(req.headers.get('authorization'))
   if (!token) {
     return errorResponse('unauthorized', 'Authorization 헤더가 필요합니다.', 401, requestId)
   }

   // Supabase 클라이언트 생성
   const supabaseUrl = Deno.env.get('SUPABASE_URL')
   const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')

   if (!supabaseUrl || !supabaseKey) {
     console.error('Missing Supabase configuration')
     return errorResponse('server_error', '서버 설정 오류입니다.', 500, requestId)
   }

   const supabase = createClient(supabaseUrl, supabaseKey)

   // Supabase Auth 토큰 검증
   const authResult = await verifySupabaseAuth(token, supabase)
   if (!authResult.valid || !authResult.userId) {
     return errorResponse(
       authResult.error || 'invalid_token',
       '유효하지 않은 토큰입니다.',
       401,
       requestId
     )
   }

   const userId = authResult.userId

-  // Rate Limiting 체크
-  const rateLimitResult = checkRateLimit(userId)
-  if (!rateLimitResult.allowed) {
-    const retryAfter = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000)
-    return errorResponse(
-      'rate_limit_exceeded',
-      `요청 한도를 초과했습니다. ${retryAfter}초 후 다시 시도하세요.`,
-      429,
-      requestId,
-      {
-        'X-RateLimit-Limit': RATE_LIMIT_MAX_REQUESTS.toString(),
-        'X-RateLimit-Remaining': '0',
-        'X-RateLimit-Reset': Math.ceil(rateLimitResult.resetAt / 1000).toString(),
-        'Retry-After': retryAfter.toString(),
-      }
-    )
-  }
+  // Rate Limit 체크 (User ID 기준, 60 req/min)
+  const rateLimitResponse = await rateLimitMiddleware(
+    supabase,
+    req,
+    RATE_LIMIT_PRESETS.API
+  )
+
+  if (rateLimitResponse) {
+    return rateLimitResponse
+  }

   // URL 파싱
   const url = new URL(req.url)
   const pathParts = url.pathname.split('/').filter(Boolean)

   // ... 나머지 기존 코드 ...
 })
```

## 4. user-api 엔드포인트

**파일**: `supabase/functions/user-api/index.ts`

subscription-api와 동일한 패턴 적용:

```diff
 import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
 import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
 import { getCorsHeaders } from '../_shared/cors.ts'
+import { rateLimitMiddleware, RATE_LIMIT_PRESETS } from '../_shared/rate-limit.ts'

-// Rate Limiting (분당 60회)
-const RATE_LIMIT_WINDOW_MS = 60 * 1000
-const RATE_LIMIT_MAX_REQUESTS = 60
-
-// ... RateLimitInfo 인터페이스 및 rateLimitStore 제거 ...
-
-// ... checkRateLimit 함수 제거 ...

 serve(async (req) => {
   // ... CORS, 인증 코드 ...

   const userId = authResult.userId
   const email = authResult.email

-  // Rate Limiting 체크
-  const rateLimitResult = checkRateLimit(userId)
-  if (!rateLimitResult.allowed) {
-    const retryAfter = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000)
-    return errorResponse(
-      'rate_limit_exceeded',
-      `요청 한도를 초과했습니다. ${retryAfter}초 후 다시 시도하세요.`,
-      429,
-      requestId,
-      {
-        'X-RateLimit-Limit': RATE_LIMIT_MAX_REQUESTS.toString(),
-        'X-RateLimit-Remaining': '0',
-        'X-RateLimit-Reset': Math.ceil(rateLimitResult.resetAt / 1000).toString(),
-        'Retry-After': retryAfter.toString(),
-      }
-    )
-  }
+  // Rate Limit 체크 (User ID 기준, 60 req/min)
+  const rateLimitResponse = await rateLimitMiddleware(
+    supabase,
+    req,
+    RATE_LIMIT_PRESETS.API
+  )
+
+  if (rateLimitResponse) {
+    return rateLimitResponse
+  }

   // ... 나머지 기존 코드 ...
 })
```

## 5. payment-webhook 엔드포인트

**파일**: `supabase/functions/payment-webhook/index.ts`

### 변경 사항

```diff
 import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
 import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
 import { getCorsHeaders } from '../_shared/cors.ts'
 import { verifyWebhookSignature } from '../_shared/webhook-verify.ts'
+import { rateLimitMiddleware, RATE_LIMIT_PRESETS } from '../_shared/rate-limit.ts'

 // ... 기존 코드 ...

 serve(async (req) => {
   const origin = req.headers.get('origin');
   const corsHeaders = getCorsHeaders(origin);

   // CORS preflight
   if (req.method === 'OPTIONS') {
     return new Response(null, { headers: corsHeaders })
   }

+  // Supabase 클라이언트 생성
+  const supabaseUrl = Deno.env.get('SUPABASE_URL')
+  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
+
+  if (!supabaseUrl || !supabaseKey) {
+    console.error('Missing Supabase configuration')
+    return new Response(JSON.stringify({ error: 'Server configuration error' }), {
+      status: 500,
+      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
+    })
+  }
+
+  const supabase = createClient(supabaseUrl, supabaseKey)
+
+  // Rate Limit 체크 (Client ID 기준, 100 req/min)
+  const rateLimitResponse = await rateLimitMiddleware(
+    supabase,
+    req,
+    RATE_LIMIT_PRESETS.WEBHOOK
+  )
+
+  if (rateLimitResponse) {
+    return rateLimitResponse
+  }

   // POST만 허용
   if (req.method !== 'POST') {
     return new Response(JSON.stringify({ error: 'Method not allowed' }), {
       status: 405,
       headers: { ...corsHeaders, 'Content-Type': 'application/json' },
     })
   }

   // ... 나머지 기존 코드 ...
 })
```

## 적용 순서

1. **마이그레이션 실행**
   ```bash
   supabase db push
   ```

2. **각 엔드포인트 패치 적용** (우선순위 순)
   1. `oauth-token` (가장 중요)
   2. `oauth-authorize`
   3. `subscription-api`
   4. `user-api`
   5. `payment-webhook`

3. **테스트**
   ```bash
   # 로컬 테스트
   supabase functions serve

   # Rate Limit 테스트
   for i in {1..11}; do
     curl -X POST http://localhost:54321/functions/v1/oauth-token \
       -H "Content-Type: application/json" \
       -d '{"grant_type":"authorization_code"}'
   done
   ```

4. **배포**
   ```bash
   supabase functions deploy oauth-token
   supabase functions deploy oauth-authorize
   supabase functions deploy subscription-api
   supabase functions deploy user-api
   supabase functions deploy payment-webhook
   ```

## 주의사항

1. **Service Role Key 사용**: Rate Limit 체크 시 반드시 `SUPABASE_SERVICE_ROLE_KEY` 사용 (RLS 우회 필요)

2. **기존 인메모리 Rate Limit 제거**: subscription-api, user-api의 Map 기반 Rate Limit 코드 제거

3. **CORS 헤더 유지**: Rate Limit 응답에도 CORS 헤더가 포함되도록 자동 처리됨

4. **에러 응답 일관성**: 기존 `errorResponse` 함수와 통합 가능

## 롤백 계획

문제 발생 시:

1. **임시 조치**: Rate Limit 테이블 비우기
   ```sql
   DELETE FROM rate_limit_entries;
   ```

2. **완전 롤백**: 이전 버전으로 함수 재배포
   ```bash
   git revert HEAD
   supabase functions deploy [function-name]
   ```

3. **마이그레이션 롤백**
   ```sql
   DROP TABLE IF EXISTS rate_limit_entries CASCADE;
   ```

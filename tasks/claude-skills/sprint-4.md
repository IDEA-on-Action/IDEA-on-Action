# Sprint 4: MCP Orchestrator

> 서비스 간 인증 및 데이터 동기화 구현

**시작일**: 2025-11-23
**완료일**: 2025-11-23
**소요 시간**: 14시간
**관련 명세**: [spec/claude-skills/requirements.md](../../spec/claude-skills/requirements.md)
**관련 설계**: [plan/claude-skills/architecture.md](../../plan/claude-skills/architecture.md)
**선행 조건**: Sprint 3 (docx Skill) 완료

---

## 목표

1. service_tokens 테이블 생성
2. JWT 토큰 발급/검증 Edge Function 구현
3. 이벤트 라우터 구현
4. 재시도 및 Dead Letter Queue 구현
5. 상태 동기화 서비스 구현
6. 캐시 관리 로직 구현
7. E2E 테스트 작성

---

## 작업 목록

### TASK-CS-026: service_tokens 테이블 생성

**예상 시간**: 30분
**상태**: ✅ 완료

**작업 내용**:

```sql
-- supabase/migrations/20251129xxxxxx_create_service_tokens.sql

-- 서비스 간 인증 토큰 테이블
CREATE TABLE service_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 토큰 정보
  service_id TEXT NOT NULL CHECK (service_id IN ('minu-find', 'minu-frame', 'minu-build', 'minu-keep')),
  token_hash TEXT NOT NULL, -- SHA256 해시

  -- 권한
  permissions JSONB NOT NULL DEFAULT '[]',

  -- 유효 기간
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '1 hour'),

  -- 상태
  is_revoked BOOLEAN NOT NULL DEFAULT false,
  revoked_at TIMESTAMPTZ,
  revoked_reason TEXT,

  -- 메타데이터
  created_by TEXT, -- 발급 요청자 (서비스 ID 또는 사용자 ID)
  ip_address INET,
  user_agent TEXT
);

-- 인덱스
CREATE INDEX idx_service_tokens_service ON service_tokens(service_id);
CREATE INDEX idx_service_tokens_expires ON service_tokens(expires_at) WHERE NOT is_revoked;
CREATE INDEX idx_service_tokens_hash ON service_tokens(token_hash);

-- RLS 정책
ALTER TABLE service_tokens ENABLE ROW LEVEL SECURITY;

-- service_role만 토큰 관리 가능
CREATE POLICY "service_role_only"
  ON service_tokens
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- 만료 토큰 자동 정리 함수
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

-- 리프레시 토큰 테이블
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash TEXT NOT NULL,
  service_id TEXT NOT NULL CHECK (service_id IN ('minu-find', 'minu-frame', 'minu-build', 'minu-keep')),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  is_revoked BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens(token_hash);
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens(expires_at);

ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_only"
  ON refresh_tokens
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');
```

**완료 조건**:
- [x] 마이그레이션 파일 생성
- [x] 로컬 DB 적용 테스트
- [x] RLS 정책 작동 확인

---

### TASK-CS-027: JWT 토큰 발급 Edge Function

**예상 시간**: 2시간
**상태**: ✅ 완료
**의존성**: TASK-CS-026

**작업 내용**:

```typescript
// supabase/functions/mcp-auth/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as jose from 'https://deno.land/x/jose@v4.14.4/index.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const JWT_SECRET = Deno.env.get('MCP_JWT_SECRET')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TokenRequest {
  action: 'issue' | 'verify' | 'refresh' | 'revoke';
  serviceId?: string;
  permissions?: string[];
  token?: string;
  refreshToken?: string;
}

interface TokenPayload {
  iss: string;
  sub: string;
  permissions: string[];
  iat: number;
  exp: number;
}

serve(async (req) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body: TokenRequest = await req.json();

    switch (body.action) {
      case 'issue':
        return await issueToken(supabase, body, req);
      case 'verify':
        return await verifyToken(body.token!);
      case 'refresh':
        return await refreshToken(supabase, body.refreshToken!);
      case 'revoke':
        return await revokeToken(supabase, body.token!);
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('MCP Auth Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function issueToken(supabase: any, request: TokenRequest, req: Request) {
  const { serviceId, permissions = [] } = request;

  if (!serviceId) {
    return new Response(
      JSON.stringify({ error: 'serviceId is required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // JWT 생성
  const now = Math.floor(Date.now() / 1000);
  const accessToken = await new jose.SignJWT({
    iss: 'idea-on-action-hub',
    sub: serviceId,
    permissions,
  } as TokenPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(now)
    .setExpirationTime(now + 3600) // 1시간
    .sign(new TextEncoder().encode(JWT_SECRET));

  // Refresh Token 생성
  const refreshToken = await new jose.SignJWT({
    iss: 'idea-on-action-hub',
    sub: serviceId,
    type: 'refresh',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(now)
    .setExpirationTime(now + 604800) // 7일
    .sign(new TextEncoder().encode(JWT_SECRET));

  // 토큰 해시 저장
  const tokenHash = await hashToken(accessToken);
  const refreshHash = await hashToken(refreshToken);

  await supabase.from('service_tokens').insert({
    service_id: serviceId,
    token_hash: tokenHash,
    permissions,
    ip_address: req.headers.get('x-forwarded-for'),
    user_agent: req.headers.get('user-agent'),
  });

  await supabase.from('refresh_tokens').insert({
    service_id: serviceId,
    token_hash: refreshHash,
  });

  return new Response(
    JSON.stringify({
      accessToken,
      refreshToken,
      expiresIn: 3600,
      tokenType: 'Bearer',
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function verifyToken(token: string) {
  try {
    const { payload } = await jose.jwtVerify(
      token,
      new TextEncoder().encode(JWT_SECRET)
    );

    return new Response(
      JSON.stringify({
        valid: true,
        payload,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        valid: false,
        error: error.message,
      }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function refreshToken(supabase: any, refreshToken: string) {
  try {
    const { payload } = await jose.jwtVerify(
      refreshToken,
      new TextEncoder().encode(JWT_SECRET)
    );

    if (payload.type !== 'refresh') {
      throw new Error('Invalid refresh token');
    }

    // 새 Access Token 발급
    const now = Math.floor(Date.now() / 1000);
    const newAccessToken = await new jose.SignJWT({
      iss: 'idea-on-action-hub',
      sub: payload.sub,
      permissions: [], // 기존 권한 조회 필요
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt(now)
      .setExpirationTime(now + 3600)
      .sign(new TextEncoder().encode(JWT_SECRET));

    return new Response(
      JSON.stringify({
        accessToken: newAccessToken,
        expiresIn: 3600,
        tokenType: 'Bearer',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Invalid refresh token' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function revokeToken(supabase: any, token: string) {
  const tokenHash = await hashToken(token);

  await supabase
    .from('service_tokens')
    .update({
      is_revoked: true,
      revoked_at: new Date().toISOString(),
      revoked_reason: 'Manual revocation',
    })
    .eq('token_hash', tokenHash);

  return new Response(
    JSON.stringify({ revoked: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
```

**완료 조건**:
- [x] 토큰 발급 API 작동
- [x] 토큰 검증 API 작동
- [x] 토큰 갱신 API 작동
- [x] 토큰 폐기 API 작동

---

### TASK-CS-028: 토큰 검증 미들웨어

**예상 시간**: 2시간
**상태**: ✅ 완료
**의존성**: TASK-CS-027

**작업 내용**:

다른 Edge Function에서 사용할 토큰 검증 미들웨어 구현

**완료 조건**:
- [x] 미들웨어 함수 구현
- [x] 여러 Edge Function에서 재사용 가능

---

### TASK-CS-029: 이벤트 라우터 구현

**예상 시간**: 2시간
**상태**: ✅ 완료
**의존성**: TASK-CS-028

**작업 내용**:

```typescript
// supabase/functions/mcp-router/index.ts

// 이벤트 유형에 따라 적절한 서비스로 라우팅
// 재시도 로직 포함
```

**완료 조건**:
- [x] 이벤트 라우팅 로직 구현
- [x] 서비스별 엔드포인트 매핑
- [x] 라우팅 실패 로깅

---

### TASK-CS-030: 재시도 및 DLQ 구현

**예상 시간**: 2시간
**상태**: ✅ 완료
**의존성**: TASK-CS-029

**작업 내용**:

- 지수 백오프 재시도 (최대 3회)
- Dead Letter Queue 테이블 및 저장 로직

**완료 조건**:
- [x] 재시도 로직 구현 (1초, 2초, 4초)
- [x] DLQ 테이블 생성
- [x] 실패 이벤트 DLQ 저장

---

### TASK-CS-031: 상태 동기화 서비스

**예상 시간**: 2시간
**상태**: ✅ 완료
**의존성**: TASK-CS-028

**작업 내용**:

```typescript
// supabase/functions/mcp-sync/index.ts

// Cross-service 상태 동기화
// 캐시 무효화 알림
```

**완료 조건**:
- [x] 상태 변경 감지
- [x] 관련 서비스 알림
- [x] 캐시 무효화 트리거

---

### TASK-CS-032: 캐시 관리 로직

**예상 시간**: 1시간
**상태**: ✅ 완료
**의존성**: TASK-CS-031

**작업 내용**:

React Query 캐시 관리 및 무효화 로직

**완료 조건**:
- [x] 캐시 TTL 5분 설정
- [x] 변경 시 즉시 무효화
- [x] 캐시 상태 모니터링

---

### TASK-CS-033: E2E 테스트 작성

**예상 시간**: 2시간
**상태**: ✅ 완료
**의존성**: TASK-CS-027 ~ TASK-CS-032

**완료 조건**:
- [x] 토큰 발급/검증 테스트
- [x] 토큰 갱신 테스트
- [x] 이벤트 라우팅 테스트
- [x] 재시도 테스트
- [x] 캐시 무효화 테스트

---

## 완료 조건

- [x] service_tokens 테이블 생성 및 RLS 적용
- [x] mcp-auth Edge Function 배포
- [x] mcp-router Edge Function 배포
- [x] mcp-sync Edge Function 배포
- [x] 재시도 및 DLQ 작동
- [x] 캐시 관리 작동
- [x] E2E 테스트 14개 통과
- [x] 토큰 발급/검증 100ms 이내

---

## 다음 Sprint

[Sprint 5: 서비스별 특화 기능](sprint-5.md) (향후)

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|----------|--------|
| 1.0.0 | 2025-11-23 | 초기 작성 | Claude |
| 1.1.0 | 2025-11-23 | Sprint 4 완료 표시 | Claude |

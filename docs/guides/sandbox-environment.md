# Sandbox 환경 가이드

> Minu 서비스 테스트용 독립 환경 구축 및 운영 가이드

**버전**: 2.25.0 | **작성일**: 2025-12-01 | **환경**: Sandbox

---

## 목차

1. [개요](#개요)
2. [환경 구조](#환경-구조)
3. [설정 방법](#설정-방법)
4. [환경 전환](#환경-전환)
5. [데이터 격리](#데이터-격리)
6. [테스트 가이드](#테스트-가이드)
7. [주의사항](#주의사항)
8. [문제 해결](#문제-해결)

---

## 개요

### Sandbox 환경이란?

Sandbox 환경은 **Minu 서비스 테스트를 위한 독립적인 개발 환경**입니다. Production 환경과 완전히 분리되어 있어 안전하게 실험하고 테스트할 수 있습니다.

### 주요 특징

- **데이터 격리**: Production 데이터에 영향 없음
- **Mock 결제**: 실제 결제 없이 테스트 가능
- **상세 로깅**: 디버깅을 위한 자세한 로그
- **관대한 CORS**: 로컬 개발 편의성
- **자동 정리**: 테스트 데이터 자동 삭제

### 지원 환경

| 환경 | 설명 | 데이터베이스 | 사용 목적 |
|------|------|-------------|----------|
| **Production** | 운영 환경 | 실제 DB | 실제 서비스 운영 |
| **Staging** | 스테이징 환경 | 스테이징 DB | 배포 전 검증 |
| **Sandbox** | 테스트 환경 | Sandbox DB | Minu 서비스 테스트 |
| **Local** | 로컬 개발 환경 | 로컬 DB | 개발 |

---

## 환경 구조

### 데이터베이스 스키마

Sandbox 환경은 다음 테이블을 사용합니다:

#### 1. `sandbox_configs` - 환경별 설정

```sql
CREATE TABLE sandbox_configs (
  id UUID PRIMARY KEY,
  environment TEXT NOT NULL,        -- 'sandbox', 'staging', 'production'
  config_key TEXT NOT NULL,         -- 설정 키
  config_value JSONB NOT NULL,      -- 설정 값 (JSON)
  description TEXT,                 -- 설명
  is_active BOOLEAN DEFAULT true,   -- 활성화 여부
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

#### 2. `sandbox_test_data` - 테스트 데이터 격리

```sql
CREATE TABLE sandbox_test_data (
  id UUID PRIMARY KEY,
  environment TEXT NOT NULL,        -- 환경 ('sandbox', 'staging')
  data_type TEXT NOT NULL,          -- 데이터 타입 ('user', 'service', 'transaction' 등)
  entity_id UUID NOT NULL,          -- 엔티티 ID
  test_data JSONB NOT NULL,         -- 테스트 데이터
  tags TEXT[],                      -- 태그
  expires_at TIMESTAMPTZ,           -- 만료 시간
  is_active BOOLEAN DEFAULT true,   -- 활성화 여부
  metadata JSONB DEFAULT '{}'
);
```

### OAuth 클라이언트

Sandbox 환경용 OAuth 클라이언트가 자동 등록됩니다:

- `minu-find-sandbox` - Minu Find Sandbox
- `minu-frame-sandbox` - Minu Frame Sandbox
- `minu-build-sandbox` - Minu Build Sandbox
- `minu-keep-sandbox` - Minu Keep Sandbox

---

## 설정 방법

### 1. 환경 파일 생성

`.env.sandbox.example`을 복사하여 `.env.sandbox` 생성:

```bash
cp .env.sandbox.example .env.sandbox
```

### 2. 필수 환경 변수 설정

`.env.sandbox` 파일을 열고 다음 값을 설정:

```bash
# 환경 타입 (필수)
VITE_ENV=sandbox

# Supabase 설정 (Sandbox 프로젝트)
VITE_SUPABASE_URL=https://your-sandbox-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_sandbox_supabase_anon_key_here

# Sandbox 기능 플래그
VITE_SANDBOX_MODE=true
VITE_SANDBOX_DATA_ISOLATION=true
VITE_SANDBOX_MOCK_PAYMENTS=true
```

### 3. 데이터베이스 마이그레이션

Sandbox 전용 테이블 생성:

```bash
# Supabase CLI 사용
supabase db push

# 또는 직접 마이그레이션 실행
supabase migration up
```

마이그레이션 파일: `supabase/migrations/20251201100000_sandbox_isolation.sql`

### 4. 설정 검증

설정이 올바른지 확인:

```bash
npm run dev

# 콘솔에 다음 메시지가 출력되어야 함:
# [SANDBOX] Environment: sandbox
# [SANDBOX] Data Isolation: enabled
```

---

## 환경 전환

### 환경별 실행 방법

#### Sandbox 환경으로 실행

```bash
# 환경 변수로 지정
VITE_ENV=sandbox npm run dev

# 또는 .env.sandbox 파일 사용
cp .env.sandbox .env.local
npm run dev
```

#### 기본 개발 환경으로 복귀

```bash
# .env.example 복사
cp .env.example .env.local
npm run dev
```

### 환경 자동 감지

Edge Function은 다음 순서로 환경을 자동 감지합니다:

1. `VITE_ENV` 환경 변수
2. `VITE_MINU_ENV` 환경 변수
3. Supabase URL (sandbox, staging, production 키워드)
4. 기본값: `local`

---

## 데이터 격리

### RLS (Row Level Security) 정책

Sandbox 환경은 RLS를 통해 데이터를 격리합니다:

#### 사용자 데이터

- 사용자는 **자신의 테스트 데이터만** 읽기/쓰기 가능
- 관리자는 **모든 테스트 데이터** 접근 가능

#### 설정 데이터

- 관리자만 환경 설정 수정 가능
- 인증된 사용자는 설정 읽기 가능

### 데이터 자동 정리

테스트 데이터는 만료 시간 이후 자동 삭제됩니다:

```sql
-- 7일 후 자동 삭제되는 테스트 데이터 생성
INSERT INTO sandbox_test_data (
  environment,
  data_type,
  entity_id,
  test_data,
  expires_at
) VALUES (
  'sandbox',
  'user',
  gen_random_uuid(),
  '{"name": "Test User"}'::JSONB,
  NOW() + INTERVAL '7 days'  -- 7일 후 자동 삭제
);
```

수동으로 만료된 데이터 정리:

```sql
SELECT cleanup_expired_sandbox_data();
-- Returns: 삭제된 레코드 수
```

---

## 테스트 가이드

### Minu 서비스 테스트 절차

#### 1. Sandbox 환경 시작

```bash
VITE_ENV=sandbox npm run dev
```

#### 2. OAuth 인증 테스트

```typescript
// Minu Find 서비스 연동 테스트
const client = {
  clientId: 'minu-find-sandbox',
  redirectUri: 'http://localhost:3001/auth/callback/sandbox'
}

// OAuth 인증 URL 생성
const authUrl = `${OAUTH_AUTHORIZE_URL}?client_id=${client.clientId}&redirect_uri=${client.redirectUri}&response_type=code`
```

#### 3. API 호출 테스트

```typescript
// Edge Function에서 환경 감지
import { loadEnvironmentConfig, logger } from '../_shared/env-config.ts'

export default async function handler(req: Request) {
  const config = loadEnvironmentConfig()

  // Sandbox 모드 확인
  if (config.isSandbox) {
    logger.debug('Sandbox mode enabled')
    // Mock 데이터 반환
  }

  // 실제 로직...
}
```

#### 4. 결제 테스트

Sandbox 환경에서는 Mock 결제가 자동 승인됩니다:

```typescript
// 결제 요청
const payment = await processPayment({
  amount: 10000,
  orderId: 'test-order-123'
})

// Sandbox에서는 자동 승인됨
console.log(payment.status) // 'approved'
```

### 테스트 데이터 생성

```typescript
// 테스트 사용자 생성
const testUser = {
  environment: 'sandbox',
  data_type: 'user',
  entity_id: crypto.randomUUID(),
  test_data: {
    email: 'test@example.com',
    name: 'Test User'
  },
  tags: ['test', 'minu-find'],
  expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7일 후
}

await supabase.from('sandbox_test_data').insert(testUser)
```

### 로그 확인

Sandbox 환경은 상세한 로그를 제공합니다:

```bash
# 콘솔 출력 예시
[SANDBOX] [DEBUG] Environment: sandbox
[SANDBOX] [INFO] API: GET /api/services - 200
[SANDBOX] [SQL] SELECT * FROM services WHERE environment = $1
[SANDBOX] [DEBUG] Mock payment auto-approved: order-123
```

---

## 주의사항

### ⚠️ Production 데이터 보호

- **절대 Production 환경 변수를 Sandbox에서 사용하지 마세요**
- Sandbox는 반드시 별도의 Supabase 프로젝트 사용
- 환경 변수 파일 (`.env.sandbox`) 버전 관리에서 제외

### ⚠️ 데이터 보존

- Sandbox 데이터는 자동 삭제됩니다 (기본 7일)
- 영구 보존이 필요한 데이터는 `expires_at`을 `NULL`로 설정
- 정기적으로 중요 데이터 백업

### ⚠️ 성능 테스트

- Sandbox는 개발 목적이므로 성능이 제한될 수 있음
- 실제 성능 테스트는 Staging 환경 사용
- Rate Limit: 1000 req/min (Production은 100 req/min)

### ⚠️ 보안

- Sandbox OAuth Client Secret은 공개하지 마세요
- Sandbox에서도 HTTPS 사용 권장 (로컬은 HTTP 허용)
- CORS는 로컬 개발만 허용 (Production Origin 차단)

---

## 문제 해결

### Q1. 환경이 Sandbox로 감지되지 않아요

**확인 사항:**

1. `.env.sandbox` 파일 존재 확인
2. `VITE_ENV=sandbox` 설정 확인
3. 서버 재시작

```bash
# 환경 변수 확인
echo $VITE_ENV  # 'sandbox' 출력되어야 함

# 서버 재시작
npm run dev
```

### Q2. OAuth 인증이 실패해요

**확인 사항:**

1. OAuth 클라이언트 등록 확인

```sql
SELECT client_id, client_name, metadata->>'environment'
FROM oauth_clients
WHERE metadata->>'environment' = 'sandbox';
```

2. Redirect URI 일치 확인

```bash
# .env.sandbox
VITE_MINU_FIND_REDIRECT_URI=http://localhost:3001/auth/callback/sandbox

# oauth_clients 테이블
redirect_uris: ['http://localhost:3001/auth/callback/sandbox']
```

### Q3. 데이터가 자동 삭제되지 않아요

**해결 방법:**

1. 수동으로 정리 함수 실행

```sql
SELECT cleanup_expired_sandbox_data();
```

2. Cron Job 설정 (Supabase)

```sql
-- 매일 자정에 자동 정리
SELECT cron.schedule(
  'cleanup-sandbox-data',
  '0 0 * * *',  -- 매일 00:00
  $$
  SELECT cleanup_expired_sandbox_data();
  $$
);
```

### Q4. RLS 정책 오류가 발생해요

**확인 사항:**

1. 사용자가 인증되었는지 확인
2. 관리자 권한 확인

```sql
-- 현재 사용자 확인
SELECT auth.uid();

-- 관리자 여부 확인
SELECT * FROM admins WHERE user_id = auth.uid();
```

### Q5. Mock 결제가 작동하지 않아요

**확인 사항:**

1. Sandbox 모드 활성화 확인

```bash
# .env.sandbox
VITE_SANDBOX_MOCK_PAYMENTS=true
```

2. 환경 설정 확인

```sql
SELECT config_value
FROM sandbox_configs
WHERE environment = 'sandbox'
  AND config_key = 'mock_payments';
-- {"enabled": true, "auto_approve": true}
```

---

## 추가 리소스

### 관련 문서

- [개발 방법론](./methodology.md) - SSDD 개발 프로세스
- [프로젝트 구조](./project-structure.md) - 전체 디렉토리 구조
- [OAuth 통합 가이드](../integrations/oauth-guide.md) - OAuth 2.0 연동
- [Edge Functions](../api/edge-functions.md) - Supabase Edge Functions

### Edge Function 예제

환경 감지 및 설정 사용 예제:

```typescript
// supabase/functions/minu-test/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { loadEnvironmentConfig, logger } from '../_shared/env-config.ts'

serve(async (req) => {
  // 환경 설정 로드
  const config = loadEnvironmentConfig()

  logger.info(`Processing request in ${config.environment} environment`)

  // Sandbox 전용 로직
  if (config.isSandbox) {
    logger.debug('Using mock data for sandbox')
    return new Response(JSON.stringify({
      message: 'Sandbox mode - Mock data',
      mockPayment: config.features.mockPayments,
      dataIsolation: config.features.dataIsolation
    }), {
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // Production 로직
  // ...
})
```

### 헬퍼 함수 사용

```typescript
import {
  isSandboxMode,
  isFeatureEnabled,
  EnvironmentLogger
} from '../_shared/env-config.ts'

// Sandbox 모드 확인
if (isSandboxMode()) {
  console.log('Running in sandbox mode')
}

// 특정 기능 활성화 확인
if (isFeatureEnabled('mockPayments')) {
  // Mock 결제 로직
}

// 커스텀 로거
const logger = new EnvironmentLogger('sandbox')
logger.debug('Debug message')
logger.sql('SELECT * FROM users WHERE id = $1', [userId])
logger.api('GET', '/api/users', 200)
```

---

## 버전 히스토리

| 버전 | 날짜 | 변경 내용 |
|------|------|----------|
| 2.25.0 | 2025-12-01 | Sandbox 환경 초기 구축 |

---

**문의**: 개발팀 (sinclairseo@gmail.com)

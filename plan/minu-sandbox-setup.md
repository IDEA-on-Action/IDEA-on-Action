# Minu Sandbox 환경 구축 계획

> Minu 연동 Phase 3: 프로덕션 배포 전 통합 테스트 환경 구축

**작성일**: 2025-12-02
**참조**: [docs/guides/minu-integration-guidelines.md](../docs/guides/minu-integration-guidelines.md), [plan/minu-integration-phase2.md](./minu-integration-phase2.md)
**Phase 2 목표 완료일**: TBD

---

## 1. 목표

### 1.1 핵심 목표
- **프로덕션 배포 전 통합 테스트 환경 구축**: Minu 서비스와 ideaonaction.ai 간 안전한 연동 검증
- **Minu 서비스와의 E2E 테스트 자동화**: 실제 사용자 시나리오 기반 자동화된 테스트 수행
- **리스크 최소화**: 프로덕션 환경 장애 방지 및 빠른 롤백 체계 확립

### 1.2 성공 기준
- ✅ 모든 E2E 테스트 통과 (100% pass rate)
- ✅ 평균 API 응답 시간 < 500ms (p95)
- ✅ 에러율 < 1% (모든 엔드포인트)
- ✅ Sandbox 환경 독립 운영 (Production 영향 없음)

---

## 2. 환경 구성

### 2.1 인프라 구조

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Sandbox 환경 아키텍처                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Frontend (Vercel Preview)                                   │  │
│  │  - sandbox.ideaonaction.ai                                   │  │
│  │  - Git Branch: sandbox                                       │  │
│  └────────────────────┬─────────────────────────────────────────┘  │
│                       │                                             │
│  ┌────────────────────┴─────────────────────────────────────────┐  │
│  │  Supabase Sandbox Project                                    │  │
│  │  - 별도 프로젝트 또는 스키마 분리 (public_sandbox)             │  │
│  │  - Edge Functions: sandbox 환경 변수 사용                     │  │
│  │  - Database: 테스트 데이터 자동 시드                          │  │
│  └────────────────────┬─────────────────────────────────────────┘  │
│                       │                                             │
│  ┌────────────────────┴─────────────────────────────────────────┐  │
│  │  Minu Services (Sandbox Instances)                           │  │
│  │  - sandbox.find.minu.best                                    │  │
│  │  - sandbox.frame.minu.best                                   │  │
│  │  - sandbox.build.minu.best                                   │  │
│  │  - sandbox.keep.minu.best                                    │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 환경 분리 전략

| 항목 | Production | Sandbox | 차이점 |
|------|-----------|---------|--------|
| **도메인** | ideaonaction.ai | sandbox.ideaonaction.ai | 서브도메인 분리 |
| **Supabase 프로젝트** | 기존 프로젝트 | 신규 Sandbox 프로젝트 (권장) | 완전 격리 |
| **DB 스키마** | `public` | `public_sandbox` (대안) | 스키마 레벨 분리 |
| **OAuth 클라이언트** | Production 클라이언트 | Sandbox 전용 클라이언트 | 12개 추가 등록 |
| **Minu 서비스** | *.minu.best | sandbox.*.minu.best | 테스트 인스턴스 |
| **테스트 데이터** | 실제 사용자 데이터 | 자동 시드 데이터 | 완전 격리 |

### 2.3 Supabase 프로젝트 옵션

#### 옵션 1: 별도 Sandbox 프로젝트 생성 (권장)

**장점**:
- Production과 완전 격리
- 리소스 독립적 사용
- 데이터 오염 위험 없음

**단점**:
- 추가 비용 발생 (Free Tier 또는 Pro)
- 프로젝트 관리 복잡도 증가

**예상 비용**:
- Free Tier: $0/월 (500MB DB, 2GB Bandwidth)
- Pro Tier: $25/월 (8GB DB, 250GB Bandwidth)

#### 옵션 2: 스키마 분리

**장점**:
- 추가 비용 없음
- 단일 프로젝트 관리

**단점**:
- 리소스 공유로 인한 성능 영향 가능
- 실수로 Production 데이터 접근 위험

**구현 방법**:
```sql
-- 마이그레이션: 20251202000001_create_sandbox_schema.sql
CREATE SCHEMA public_sandbox;

-- 모든 테이블을 public_sandbox에 복제
-- RLS 정책도 동일하게 적용
```

**결정**: **옵션 1 (별도 프로젝트)** 선택 - 안정성 우선

---

## 3. OAuth 클라이언트 설정

### 3.1 Sandbox 전용 클라이언트 등록

| 서비스 | Client ID | Redirect URI | Scope |
|--------|-----------|--------------|-------|
| Find (Sandbox) | `minu-find-sandbox` | `https://sandbox.find.minu.best/callback` | `openid profile email offline_access` |
| Frame (Sandbox) | `minu-frame-sandbox` | `https://sandbox.frame.minu.best/callback` | `openid profile email offline_access` |
| Build (Sandbox) | `minu-build-sandbox` | `https://sandbox.build.minu.best/callback` | `openid profile email offline_access` |
| Keep (Sandbox) | `minu-keep-sandbox` | `https://sandbox.keep.minu.best/callback` | `openid profile email offline_access` |

### 3.2 마이그레이션

```sql
-- 파일: supabase/migrations/20251202000002_seed_oauth_clients_sandbox.sql
INSERT INTO oauth_clients (
  client_id,
  client_secret,
  client_name,
  redirect_uris,
  allowed_scopes,
  environment,
  created_at
) VALUES
  (
    'minu-find-sandbox',
    encode(gen_random_bytes(32), 'hex'),
    'Minu Find (Sandbox)',
    ARRAY['https://sandbox.find.minu.best/callback'],
    ARRAY['openid', 'profile', 'email', 'offline_access'],
    'sandbox',
    NOW()
  ),
  (
    'minu-frame-sandbox',
    encode(gen_random_bytes(32), 'hex'),
    'Minu Frame (Sandbox)',
    ARRAY['https://sandbox.frame.minu.best/callback'],
    ARRAY['openid', 'profile', 'email', 'offline_access'],
    'sandbox',
    NOW()
  ),
  (
    'minu-build-sandbox',
    encode(gen_random_bytes(32), 'hex'),
    'Minu Build (Sandbox)',
    ARRAY['https://sandbox.build.minu.best/callback'],
    ARRAY['openid', 'profile', 'email', 'offline_access'],
    'sandbox',
    NOW()
  ),
  (
    'minu-keep-sandbox',
    encode(gen_random_bytes(32), 'hex'),
    'Minu Keep (Sandbox)',
    ARRAY['https://sandbox.keep.minu.best/callback'],
    ARRAY['openid', 'profile', 'email', 'offline_access'],
    'sandbox',
    NOW()
  );
```

---

## 4. 테스트 계정 (5개)

### 4.1 테스트 계정 정의

| 계정 | 플랜 | 용도 | 구독 상태 | 서비스 접근 |
|------|------|------|-----------|------------|
| `test-free@ideaonaction.ai` | Free | 무료 플랜 기능 테스트 | Active | 없음 (제한된 기능만) |
| `test-basic@ideaonaction.ai` | Basic | 기본 플랜 기능 테스트 | Active | Find Basic |
| `test-pro@ideaonaction.ai` | Pro | 프로 플랜 전체 기능 테스트 | Active | Find Pro, Frame Pro |
| `test-expired@ideaonaction.ai` | Expired | 만료 상태 처리 테스트 | Expired | Find Basic (만료됨) |
| `test-enterprise@ideaonaction.ai` | Enterprise | 팀 관리 및 엔터프라이즈 기능 | Active | 모든 서비스 (Find, Frame, Build, Keep) |

### 4.2 테스트 데이터 시드

```sql
-- 파일: supabase/migrations/20251202000003_seed_sandbox_test_accounts.sql

-- 1. 테스트 사용자 생성 (auth.users)
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at
) VALUES
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'test-free@ideaonaction.ai',
    crypt('Test1234!', gen_salt('bf')),
    NOW(),
    NOW()
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'test-basic@ideaonaction.ai',
    crypt('Test1234!', gen_salt('bf')),
    NOW(),
    NOW()
  ),
  (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'test-pro@ideaonaction.ai',
    crypt('Test1234!', gen_salt('bf')),
    NOW(),
    NOW()
  ),
  (
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    'test-expired@ideaonaction.ai',
    crypt('Test1234!', gen_salt('bf')),
    NOW(),
    NOW()
  ),
  (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    'test-enterprise@ideaonaction.ai',
    crypt('Test1234!', gen_salt('bf')),
    NOW(),
    NOW()
  );

-- 2. 구독 생성
INSERT INTO subscriptions (
  user_id,
  plan_id,
  status,
  starts_at,
  expires_at
) VALUES
  -- Free: 구독 없음
  -- Basic
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    (SELECT id FROM plans WHERE slug = 'find-basic'),
    'active',
    NOW(),
    NOW() + INTERVAL '1 year'
  ),
  -- Pro
  (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    (SELECT id FROM plans WHERE slug = 'find-pro'),
    'active',
    NOW(),
    NOW() + INTERVAL '1 year'
  ),
  (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    (SELECT id FROM plans WHERE slug = 'frame-pro'),
    'active',
    NOW(),
    NOW() + INTERVAL '1 year'
  ),
  -- Expired
  (
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    (SELECT id FROM plans WHERE slug = 'find-basic'),
    'expired',
    NOW() - INTERVAL '1 year',
    NOW() - INTERVAL '1 day'
  ),
  -- Enterprise
  (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    (SELECT id FROM plans WHERE slug = 'find-enterprise'),
    'active',
    NOW(),
    NOW() + INTERVAL '1 year'
  ),
  (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    (SELECT id FROM plans WHERE slug = 'frame-enterprise'),
    'active',
    NOW(),
    NOW() + INTERVAL '1 year'
  );

-- 3. 프로필 생성
INSERT INTO profiles (
  id,
  email,
  full_name,
  avatar_url
) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'test-free@ideaonaction.ai', 'Test Free User', NULL),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'test-basic@ideaonaction.ai', 'Test Basic User', NULL),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'test-pro@ideaonaction.ai', 'Test Pro User', NULL),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'test-expired@ideaonaction.ai', 'Test Expired User', NULL),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'test-enterprise@ideaonaction.ai', 'Test Enterprise Admin', NULL);
```

### 4.3 테스트 계정 자동 초기화

```bash
# 스크립트: scripts/reset-sandbox.sh
#!/bin/bash

echo "🔄 Resetting Sandbox environment..."

# Supabase CLI를 사용하여 Sandbox 프로젝트 리셋
supabase db reset --project-ref <sandbox-project-ref>

# 시드 데이터 재적용
supabase db seed --project-ref <sandbox-project-ref>

echo "✅ Sandbox environment reset complete!"
```

---

## 5. E2E 테스트 케이스 (10개)

### 5.1 테스트 프레임워크

**선택**: Playwright (E2E)

**설정 파일**: `playwright.config.sandbox.ts`

```typescript
// playwright.config.sandbox.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e/sandbox',
  use: {
    baseURL: 'https://sandbox.ideaonaction.ai',
  },
  projects: [
    {
      name: 'OAuth Flow',
      testMatch: /oauth.*\.spec\.ts/,
    },
    {
      name: 'API Integration',
      testMatch: /api.*\.spec\.ts/,
    },
    {
      name: 'Subscription',
      testMatch: /subscription.*\.spec\.ts/,
    },
  ],
});
```

### 5.2 테스트 케이스 상세

#### Test 1: OAuth Authorization Code Flow

**파일**: `tests/e2e/sandbox/oauth-authorization-flow.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test('OAuth Authorization Code Flow - Full Cycle', async ({ page }) => {
  // 1. Minu Find 접속
  await page.goto('https://sandbox.find.minu.best');

  // 2. 로그인 버튼 클릭
  await page.click('text=로그인');

  // 3. ideaonaction.ai로 리다이렉트 확인
  await expect(page).toHaveURL(/sandbox\.ideaonaction\.ai\/oauth\/authorize/);

  // 4. 테스트 계정으로 로그인
  await page.fill('input[name="email"]', 'test-pro@ideaonaction.ai');
  await page.fill('input[name="password"]', 'Test1234!');
  await page.click('button[type="submit"]');

  // 5. 동의 화면 (선택)
  // await page.click('text=허용');

  // 6. Minu Find로 콜백 확인
  await expect(page).toHaveURL(/sandbox\.find\.minu\.best\/callback\?code=/);

  // 7. 로그인 완료 후 대시보드 접근 확인
  await expect(page).toHaveURL(/sandbox\.find\.minu\.best\/dashboard/);
});
```

#### Test 2: Token Exchange

**파일**: `tests/e2e/sandbox/oauth-token-exchange.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test('Token Exchange - Authorization Code to Access Token', async ({ request }) => {
  // 1. Authorization Code 획득 (사전 조건)
  const authCode = 'test-auth-code-12345';

  // 2. Token 엔드포인트 호출
  const response = await request.post(
    'https://sandbox.ideaonaction.ai/functions/v1/oauth-token',
    {
      data: {
        grant_type: 'authorization_code',
        code: authCode,
        redirect_uri: 'https://sandbox.find.minu.best/callback',
        client_id: 'minu-find-sandbox',
        client_secret: process.env.MINU_FIND_SANDBOX_SECRET,
        code_verifier: 'test-code-verifier',
      },
    }
  );

  // 3. 응답 검증
  expect(response.status()).toBe(200);

  const body = await response.json();
  expect(body).toHaveProperty('access_token');
  expect(body).toHaveProperty('refresh_token');
  expect(body).toHaveProperty('expires_in', 3600);
  expect(body).toHaveProperty('token_type', 'Bearer');
});
```

#### Test 3: Token Refresh

**파일**: `tests/e2e/sandbox/oauth-token-refresh.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test('Token Refresh - Refresh Token to New Access Token', async ({ request }) => {
  // 1. Refresh Token (사전 조건)
  const refreshToken = 'test-refresh-token-67890';

  // 2. Token 갱신 요청
  const response = await request.post(
    'https://sandbox.ideaonaction.ai/functions/v1/oauth-token',
    {
      data: {
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: 'minu-find-sandbox',
        client_secret: process.env.MINU_FIND_SANDBOX_SECRET,
      },
    }
  );

  // 3. 응답 검증
  expect(response.status()).toBe(200);

  const body = await response.json();
  expect(body).toHaveProperty('access_token');
  expect(body.access_token).not.toBe('old-access-token');
  expect(body).toHaveProperty('expires_in', 3600);
});
```

#### Test 4: Permission Check (역할별)

**파일**: `tests/e2e/sandbox/permission-check.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

const testCases = [
  {
    role: 'viewer',
    email: 'test-viewer@ideaonaction.ai',
    canRead: true,
    canWrite: false,
    canDelete: false,
  },
  {
    role: 'member',
    email: 'test-pro@ideaonaction.ai',
    canRead: true,
    canWrite: true,
    canDelete: false,
  },
  {
    role: 'admin',
    email: 'test-enterprise@ideaonaction.ai',
    canRead: true,
    canWrite: true,
    canDelete: true,
  },
];

testCases.forEach(({ role, email, canRead, canWrite, canDelete }) => {
  test(`Permission Check - ${role} role`, async ({ request }) => {
    // 로그인 후 Access Token 획득
    const token = await getAccessToken(email, 'Test1234!');

    // READ 권한 테스트
    const readResponse = await request.get(
      'https://sandbox.ideaonaction.ai/functions/v1/permission-api',
      {
        headers: { Authorization: `Bearer ${token}` },
        params: { resource: 'content', action: 'read' },
      }
    );
    expect(readResponse.status()).toBe(canRead ? 200 : 403);

    // WRITE 권한 테스트
    const writeResponse = await request.get(
      'https://sandbox.ideaonaction.ai/functions/v1/permission-api',
      {
        headers: { Authorization: `Bearer ${token}` },
        params: { resource: 'content', action: 'write' },
      }
    );
    expect(writeResponse.status()).toBe(canWrite ? 200 : 403);

    // DELETE 권한 테스트
    const deleteResponse = await request.get(
      'https://sandbox.ideaonaction.ai/functions/v1/permission-api',
      {
        headers: { Authorization: `Bearer ${token}` },
        params: { resource: 'content', action: 'delete' },
      }
    );
    expect(deleteResponse.status()).toBe(canDelete ? 200 : 403);
  });
});

async function getAccessToken(email: string, password: string): Promise<string> {
  // OAuth 플로우를 통해 Access Token 획득
  // 구현 세부 사항 생략
  return 'test-access-token';
}
```

#### Test 5: Session Management

**파일**: `tests/e2e/sandbox/session-management.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test('Session Management - Multiple Devices', async ({ request }) => {
  const email = 'test-pro@ideaonaction.ai';

  // 1. 첫 번째 기기에서 로그인
  const token1 = await loginAndGetToken(email, 'Test1234!', 'Device-1');

  // 2. 두 번째 기기에서 로그인
  const token2 = await loginAndGetToken(email, 'Test1234!', 'Device-2');

  // 3. 활성 세션 조회
  const sessionsResponse = await request.get(
    'https://sandbox.ideaonaction.ai/functions/v1/session-api',
    {
      headers: { Authorization: `Bearer ${token1}` },
    }
  );

  const sessions = await sessionsResponse.json();
  expect(sessions.length).toBe(2);

  // 4. 특정 세션 종료
  const sessionId = sessions[1].id;
  const deleteResponse = await request.delete(
    `https://sandbox.ideaonaction.ai/functions/v1/session-api/${sessionId}`,
    {
      headers: { Authorization: `Bearer ${token1}` },
    }
  );

  expect(deleteResponse.status()).toBe(200);

  // 5. 종료된 세션으로 API 호출 시 401 에러 확인
  const invalidResponse = await request.get(
    'https://sandbox.ideaonaction.ai/functions/v1/user-api',
    {
      headers: { Authorization: `Bearer ${token2}` },
    }
  );
  expect(invalidResponse.status()).toBe(401);
});
```

#### Test 6: Team Management

**파일**: `tests/e2e/sandbox/team-management.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test('Team Management - Create, Invite, Remove', async ({ request }) => {
  const adminToken = await getAccessToken('test-enterprise@ideaonaction.ai', 'Test1234!');

  // 1. 팀 생성
  const createTeamResponse = await request.post(
    'https://sandbox.ideaonaction.ai/functions/v1/team-api',
    {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        name: 'Test Team',
        description: 'Sandbox test team',
      },
    }
  );

  expect(createTeamResponse.status()).toBe(201);
  const team = await createTeamResponse.json();

  // 2. 멤버 초대
  const inviteResponse = await request.post(
    `https://sandbox.ideaonaction.ai/functions/v1/team-api/${team.id}/members`,
    {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        email: 'test-pro@ideaonaction.ai',
        role: 'member',
      },
    }
  );

  expect(inviteResponse.status()).toBe(200);

  // 3. 팀 멤버 목록 조회
  const membersResponse = await request.get(
    `https://sandbox.ideaonaction.ai/functions/v1/team-api/${team.id}/members`,
    {
      headers: { Authorization: `Bearer ${adminToken}` },
    }
  );

  const members = await membersResponse.json();
  expect(members.length).toBe(2); // admin + invited member

  // 4. 멤버 제거
  const memberToRemove = members.find((m: any) => m.email === 'test-pro@ideaonaction.ai');
  const removeResponse = await request.delete(
    `https://sandbox.ideaonaction.ai/functions/v1/team-api/${team.id}/members/${memberToRemove.user_id}`,
    {
      headers: { Authorization: `Bearer ${adminToken}` },
    }
  );

  expect(removeResponse.status()).toBe(200);
});
```

#### Test 7: Rate Limiting (429 응답)

**파일**: `tests/e2e/sandbox/rate-limiting.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test('Rate Limiting - Exceeding Request Limit', async ({ request }) => {
  const token = await getAccessToken('test-pro@ideaonaction.ai', 'Test1234!');

  // OAuth Token 엔드포인트는 10 req/min 제한
  const promises = [];

  // 15번 연속 요청 (제한 초과)
  for (let i = 0; i < 15; i++) {
    promises.push(
      request.post('https://sandbox.ideaonaction.ai/functions/v1/oauth-token', {
        data: {
          grant_type: 'refresh_token',
          refresh_token: 'dummy-token',
          client_id: 'minu-find-sandbox',
          client_secret: process.env.MINU_FIND_SANDBOX_SECRET,
        },
      })
    );
  }

  const responses = await Promise.all(promises);

  // 처음 10개는 성공 또는 실패 (유효성 문제)
  // 이후 5개는 429 Too Many Requests
  const rateLimitedResponses = responses.filter((r) => r.status() === 429);
  expect(rateLimitedResponses.length).toBeGreaterThan(0);

  // 429 응답에 Retry-After 헤더 포함 확인
  const rateLimitedResponse = rateLimitedResponses[0];
  expect(rateLimitedResponse.headers()['retry-after']).toBeDefined();
});
```

#### Test 8: Audit Log 기록

**파일**: `tests/e2e/sandbox/audit-log.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test('Audit Log - Critical Actions Logged', async ({ request }) => {
  const adminToken = await getAccessToken('test-enterprise@ideaonaction.ai', 'Test1234!');

  // 1. 중요 작업 수행 (팀 생성)
  await request.post(
    'https://sandbox.ideaonaction.ai/functions/v1/team-api',
    {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        name: 'Audit Test Team',
      },
    }
  );

  // 2. Audit Log 조회 API 호출
  const auditResponse = await request.get(
    'https://sandbox.ideaonaction.ai/functions/v1/audit-log',
    {
      headers: { Authorization: `Bearer ${adminToken}` },
      params: {
        event_type: 'team.created',
        limit: 10,
      },
    }
  );

  expect(auditResponse.status()).toBe(200);

  const logs = await auditResponse.json();
  expect(logs.length).toBeGreaterThan(0);

  const latestLog = logs[0];
  expect(latestLog.event_type).toBe('team.created');
  expect(latestLog.actor_id).toBeDefined();
  expect(latestLog.resource_type).toBe('team');
  expect(latestLog.action).toBe('create');
});
```

#### Test 9: 프로필 동기화

**파일**: `tests/e2e/sandbox/profile-sync.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test('Profile Sync - Update and Propagate', async ({ request }) => {
  const token = await getAccessToken('test-pro@ideaonaction.ai', 'Test1234!');

  // 1. ideaonaction.ai에서 프로필 업데이트
  const updateResponse = await request.put(
    'https://sandbox.ideaonaction.ai/functions/v1/user-api',
    {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        full_name: 'Updated Test User',
        avatar_url: 'https://example.com/avatar.jpg',
      },
    }
  );

  expect(updateResponse.status()).toBe(200);

  // 2. 새 Access Token 발급 (프로필 정보 포함 확인)
  const newToken = await refreshAccessToken(token);
  const decodedToken = decodeJWT(newToken);

  expect(decodedToken.name).toBe('Updated Test User');
  expect(decodedToken.picture).toBe('https://example.com/avatar.jpg');

  // 3. Minu 서비스에서 프로필 조회 시 동기화 확인
  // (Minu 팀이 구현하는 부분 - 여기서는 API 응답만 확인)
});
```

#### Test 10: Webhook 검증

**파일**: `tests/e2e/sandbox/webhook-verification.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import crypto from 'crypto';

test('Webhook Verification - HMAC Signature', async ({ request }) => {
  const webhookSecret = process.env.WEBHOOK_SECRET!;
  const payload = {
    event: 'subscription.updated',
    user_id: 'test-user-id',
    subscription: {
      plan: 'pro',
      status: 'active',
    },
  };

  const timestamp = Math.floor(Date.now() / 1000);
  const body = JSON.stringify(payload);

  // HMAC-SHA256 서명 생성
  const signature = crypto
    .createHmac('sha256', webhookSecret)
    .update(`${timestamp}.${body}`)
    .digest('hex');

  // Minu 서비스의 Webhook 엔드포인트로 전송
  const response = await request.post(
    'https://sandbox.find.minu.best/webhooks/subscription',
    {
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': `sha256=${signature}`,
        'X-Webhook-Timestamp': timestamp.toString(),
      },
      data: payload,
    }
  );

  // Minu 서비스가 서명 검증 후 200 응답
  expect(response.status()).toBe(200);

  // 잘못된 서명으로 재시도 시 401 에러
  const invalidResponse = await request.post(
    'https://sandbox.find.minu.best/webhooks/subscription',
    {
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': 'sha256=invalid-signature',
        'X-Webhook-Timestamp': timestamp.toString(),
      },
      data: payload,
    }
  );

  expect(invalidResponse.status()).toBe(401);
});
```

### 5.3 테스트 실행

```bash
# 전체 Sandbox 테스트 실행
npm run test:e2e:sandbox

# 특정 카테고리만 실행
npx playwright test --project="OAuth Flow" -c playwright.config.sandbox.ts

# CI/CD 통합
# .github/workflows/sandbox-e2e.yml 참조
```

---

## 6. 구현 단계

### Week 1: Supabase Sandbox 프로젝트 설정

**작업 목록**:

1. **Supabase 프로젝트 생성**
   - [ ] Supabase 대시보드에서 신규 프로젝트 생성 (`idea-on-action-sandbox`)
   - [ ] 프로젝트 설정: Region (Northeast Asia Seoul), Plan (Free or Pro)
   - [ ] 환경 변수 설정:
     - `VITE_SUPABASE_URL_SANDBOX`
     - `VITE_SUPABASE_ANON_KEY_SANDBOX`
     - `SUPABASE_SERVICE_ROLE_KEY_SANDBOX`

2. **DB 마이그레이션 적용**
   - [ ] Production 마이그레이션 파일 전체 복사 및 적용
   - [ ] Sandbox 전용 시드 데이터 마이그레이션 실행:
     - `20251202000002_seed_oauth_clients_sandbox.sql`
     - `20251202000003_seed_sandbox_test_accounts.sql`

3. **Edge Functions 배포**
   - [ ] 모든 Edge Functions를 Sandbox 프로젝트에 배포
   - [ ] 환경 변수 설정 (Supabase Secrets):
     ```bash
     supabase secrets set ENVIRONMENT=sandbox --project-ref <sandbox-ref>
     supabase secrets set JWT_SECRET=<sandbox-jwt-secret> --project-ref <sandbox-ref>
     supabase secrets set WEBHOOK_SECRET=<sandbox-webhook-secret> --project-ref <sandbox-ref>
     ```

4. **CORS 설정 업데이트**
   - [ ] `supabase/functions/_shared/cors.ts` 수정:
     - `sandbox.*.minu.best` 도메인 허용 추가

**산출물**:
- Sandbox Supabase 프로젝트 URL
- 환경 변수 문서 (`.env.sandbox.example`)

---

### Week 2: OAuth 클라이언트 등록 및 테스트 계정 생성

**작업 목록**:

1. **OAuth 클라이언트 등록**
   - [ ] 마이그레이션 실행: `20251202000002_seed_oauth_clients_sandbox.sql`
   - [ ] Client Secret 추출 및 Minu 팀에 전달
   - [ ] 클라이언트별 Redirect URI 검증

2. **테스트 계정 생성**
   - [ ] 마이그레이션 실행: `20251202000003_seed_sandbox_test_accounts.sql`
   - [ ] 각 계정 로그인 테스트:
     - `test-free@ideaonaction.ai`
     - `test-basic@ideaonaction.ai`
     - `test-pro@ideaonaction.ai`
     - `test-expired@ideaonaction.ai`
     - `test-enterprise@ideaonaction.ai`

3. **Vercel Preview 배포**
   - [ ] `sandbox` 브랜치 생성
   - [ ] Vercel 프로젝트 설정:
     - 도메인: `sandbox.ideaonaction.ai`
     - 환경 변수: Sandbox Supabase 프로젝트 정보
   - [ ] 배포 후 접속 확인

4. **문서화**
   - [ ] Sandbox 환경 접속 정보 문서 작성
   - [ ] 테스트 계정 정보 정리 (내부용)
   - [ ] OAuth Client ID/Secret 공유 (Minu 팀)

**산출물**:
- Sandbox 환경 접속 URL: `https://sandbox.ideaonaction.ai`
- 테스트 계정 문서: `docs/sandbox-test-accounts.md` (비공개)
- OAuth 클라이언트 정보: `docs/sandbox-oauth-clients.md` (Minu 팀 공유)

---

### Week 3: E2E 테스트 스크립트 작성

**작업 목록**:

1. **Playwright 설정**
   - [ ] `playwright.config.sandbox.ts` 생성
   - [ ] 테스트 디렉토리 구조 생성:
     ```
     tests/e2e/sandbox/
     ├── oauth-authorization-flow.spec.ts
     ├── oauth-token-exchange.spec.ts
     ├── oauth-token-refresh.spec.ts
     ├── permission-check.spec.ts
     ├── session-management.spec.ts
     ├── team-management.spec.ts
     ├── rate-limiting.spec.ts
     ├── audit-log.spec.ts
     ├── profile-sync.spec.ts
     └── webhook-verification.spec.ts
     ```

2. **헬퍼 함수 작성**
   - [ ] `tests/e2e/sandbox/helpers/auth.ts`:
     - `getAccessToken(email, password)`
     - `refreshAccessToken(token)`
     - `decodeJWT(token)`
   - [ ] `tests/e2e/sandbox/helpers/api.ts`:
     - API 호출 공통 로직

3. **테스트 작성 및 실행**
   - [ ] 10개 테스트 케이스 모두 구현
   - [ ] 로컬에서 전체 테스트 실행 및 통과 확인
   - [ ] CI/CD 파이프라인 연동:
     ```yaml
     # .github/workflows/sandbox-e2e.yml
     name: Sandbox E2E Tests

     on:
       push:
         branches: [sandbox]
       schedule:
         - cron: '0 */6 * * *'  # 6시간마다 실행

     jobs:
       test:
         runs-on: ubuntu-latest
         steps:
           - uses: actions/checkout@v3
           - uses: actions/setup-node@v3
           - run: npm ci
           - run: npx playwright install
           - run: npm run test:e2e:sandbox
           - uses: actions/upload-artifact@v3
             if: failure()
             with:
               name: playwright-report
               path: playwright-report/
     ```

4. **테스트 문서화**
   - [ ] 각 테스트 케이스 설명 문서
   - [ ] 실행 방법 가이드
   - [ ] 예상 결과 및 트러블슈팅

**산출물**:
- E2E 테스트 스크립트 10개
- CI/CD 워크플로우: `.github/workflows/sandbox-e2e.yml`
- 테스트 문서: `docs/testing/sandbox-e2e-guide.md`

---

## 7. 필요 리소스

### 7.1 인프라

| 항목 | 스펙 | 비용 | 비고 |
|------|------|------|------|
| **Supabase Sandbox 프로젝트** | Pro (8GB DB, 250GB Bandwidth) | $25/월 | Free Tier로 시작 가능 ($0/월) |
| **Vercel Preview** | Hobby (무제한 Preview) | $0/월 | 기존 플랜 활용 |
| **도메인** | sandbox.ideaonaction.ai | $0/월 | 기존 도메인 서브도메인 |
| **Upstash Redis** (선택) | Free (10,000 commands/day) | $0/월 | Rate Limiting 캐시용 |

**총 예상 비용**: $0~25/월

### 7.2 인력

| 역할 | 소요 시간 | 담당자 |
|------|----------|--------|
| **Backend 개발** | 1주 (Supabase 설정, Edge Functions) | TBD |
| **Frontend 개발** | 0.5주 (Vercel Preview 설정) | TBD |
| **QA/테스트** | 1주 (E2E 테스트 작성) | TBD |
| **DevOps** | 0.5주 (CI/CD 설정) | TBD |

**총 소요 시간**: 3주 (병렬 작업 시 2주 가능)

### 7.3 도구

- **Supabase CLI**: DB 마이그레이션, Edge Functions 배포
- **Playwright**: E2E 테스트
- **GitHub Actions**: CI/CD 자동화
- **Postman/Thunder Client**: API 수동 테스트

---

## 8. 성공 기준

### 8.1 기술적 기준

| 지표 | 목표 | 측정 방법 |
|------|------|-----------|
| **E2E 테스트 통과율** | 100% | Playwright 테스트 결과 |
| **API 응답 시간 (p95)** | < 500ms | Playwright 성능 메트릭 |
| **에러율** | < 1% | Supabase Logs, Sentry |
| **Edge Function 성공률** | > 99% | Supabase Dashboard |
| **Rate Limit 정상 작동** | 429 응답 확인 | 테스트 케이스 7 |

### 8.2 운영 기준

| 항목 | 기준 | 확인 방법 |
|------|------|-----------|
| **Sandbox 환경 독립성** | Production에 영향 없음 | 트래픽 모니터링 |
| **자동 리셋 가능** | 1일 1회 자동 리셋 | Cron Job 설정 |
| **문서 완성도** | 모든 API 문서화 | OpenAPI 스펙 100% 커버 |
| **Minu 팀 온보딩** | 1일 내 연동 개발 착수 | 협업 확인 |

### 8.3 검증 체크리스트

- [ ] 10개 E2E 테스트 모두 통과
- [ ] 모든 테스트 계정으로 로그인 성공
- [ ] OAuth 플로우 정상 작동 (모든 서비스)
- [ ] Webhook 서명 검증 성공
- [ ] Rate Limiting 정상 작동 (429 응답)
- [ ] Audit Log 기록 확인
- [ ] Production 환경 무영향 확인
- [ ] Minu 팀 OAuth Client Secret 전달 완료
- [ ] Sandbox 환경 문서 공유 완료

---

## 9. 리스크 및 완화 방안

### 9.1 리스크 분석

| 리스크 | 영향도 | 확률 | 완화 방안 |
|--------|--------|------|-----------|
| **Sandbox와 Production 혼동** | 높음 | 중간 | 환경 변수 명확히 분리, 도메인 구분 |
| **Supabase 비용 초과** | 중간 | 낮음 | Free Tier로 시작, 모니터링 알림 설정 |
| **테스트 데이터 오염** | 중간 | 중간 | 자동 리셋 스크립트, 격리된 프로젝트 |
| **Minu 팀 연동 지연** | 중간 | 중간 | 문서 사전 공유, 주간 싱크업 |
| **E2E 테스트 불안정** | 낮음 | 높음 | 재시도 로직, Flaky 테스트 격리 |

### 9.2 모니터링 및 알림

```yaml
# 알림 설정 (예시)
alerts:
  - name: Sandbox API Error Rate
    condition: error_rate > 5%
    channel: slack
    webhook: https://hooks.slack.com/services/xxx

  - name: Sandbox DB Connection Failure
    condition: db_connection_error
    channel: email
    recipients: [dev-team@ideaonaction.ai]

  - name: Supabase Bandwidth Usage
    condition: bandwidth_usage > 80%
    channel: slack
```

---

## 10. 다음 단계 (Phase 4)

Sandbox 환경 구축 완료 후 다음 단계:

1. **Minu 팀 연동 개발 지원** (Week 4-6)
   - OAuth 콜백 핸들러 구현 검증
   - JWT 검증 로직 통합 테스트
   - 구독 상태 확인 API 호출 검증

2. **Canary 배포** (Week 7)
   - 내부 사용자 대상 테스트
   - 성능 메트릭 수집
   - 롤백 절차 검증

3. **점진적 롤아웃** (Week 8-10)
   - 10% → 25% → 50% → 100%
   - 각 단계별 안정성 확인
   - 문제 발생 시 즉시 롤백

4. **Production 배포** (Week 11)
   - 전체 사용자 대상 배포
   - 24시간 모니터링
   - 사후 분석 및 문서화

---

## 11. 참고 문서

- [Minu 연동 가이드라인](../docs/guides/minu-integration-guidelines.md)
- [Minu 연동 Phase 2 계획](./minu-integration-phase2.md)
- [Supabase Edge Functions 문서](https://supabase.com/docs/guides/functions)
- [Playwright E2E 테스트 가이드](https://playwright.dev/docs/intro)
- [OAuth 2.0 RFC 6749](https://tools.ietf.org/html/rfc6749)

---

## 변경 이력

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|----------|
| 1.0.0 | 2025-12-02 | Claude | 초안 작성 |

---

**문서 상태**: ✅ 초안 완료 → 검토 대기
**승인자**: TBD
**다음 리뷰 일정**: TBD

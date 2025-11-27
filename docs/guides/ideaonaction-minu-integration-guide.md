# 생각과 행동 × Minu 서비스 연동 가이드

> ideaonaction.ai와 Minu 시리즈 서비스 간의 통합 인증 및 구독 연동 아키텍처

**작성일**: 2025-11-27
**적용 대상**: 생각과 행동 (ideaonaction.ai), Minu 시리즈 전체
**저장 위치**: `docs/guides/ideaonaction-minu-integration-guide.md`

---

## 📋 목차

1. [개요](#개요)
2. [서비스 구조](#서비스-구조)
3. [인증 연동](#인증-연동)
4. [구독/결제 연동](#구독결제-연동)
5. [API 연동](#api-연동)
6. [구현 가이드](#구현-가이드)
7. [환경 변수](#환경-변수)
8. [체크리스트](#체크리스트)

---

## 개요

### 서비스 관계

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        ideaonaction.ai                                  │
│                    (생각과 행동 - 부모 플랫폼)                            │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      핵심 기능                                   │   │
│  │  • 통합 인증 (OAuth 2.0 Provider)                               │   │
│  │  • 통합 구독/결제 관리                                           │   │
│  │  • 사용자 프로필 관리                                            │   │
│  │  • 서비스 간 SSO (Single Sign-On)                               │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                                │ OAuth 2.0 / JWT
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ▼                       ▼                       ▼
┌───────────────┐       ┌───────────────┐       ┌───────────────┐
│  Minu Find    │       │  Minu Frame   │       │  Minu Build   │
│ find.minu.best│       │frame.minu.best│       │build.minu.best│
└───────────────┘       └───────────────┘       └───────────────┘
        │                       │                       │
        └───────────────────────┼───────────────────────┘
                                │
                                ▼
                        ┌───────────────┐
                        │  Minu Keep    │
                        │keep.minu.best │
                        └───────────────┘
```

### 역할 정의

| 서비스 | 도메인 | 역할 |
|--------|--------|------|
| **생각과 행동** | ideaonaction.ai | 부모 플랫폼 - 인증, 구독, 결제 |
| **Minu Portal** | minu.best | 마케팅 랜딩 페이지 (정적) |
| **Minu Find** | find.minu.best | 프로젝트 기회 탐색 |
| **Minu Frame** | frame.minu.best | AI 제안서 작성 |
| **Minu Build** | build.minu.best | 프로젝트 진행 관리 |
| **Minu Keep** | keep.minu.best | 유지보수 운영 |

### 연동 원칙

1. **중앙 집중 인증**: 모든 인증은 ideaonaction.ai에서 처리
2. **독립 데이터베이스**: 각 Minu 서비스는 별도 Supabase 프로젝트 사용
3. **구독 동기화**: 구독 상태는 ideaonaction.ai에서 관리, 각 서비스에서 조회
4. **SSO 지원**: 한 번 로그인으로 모든 Minu 서비스 접근

---

## 서비스 구조

### 전체 아키텍처

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              사용자 (브라우저)                                │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    │                 │                 │
                    ▼                 ▼                 ▼
            ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
            │  minu.best  │   │ find.minu   │   │ frame.minu  │
            │  (Portal)   │   │   .best     │   │   .best     │
            │   정적 SSG   │   │  동적 앱    │   │  동적 앱    │
            └─────────────┘   └──────┬──────┘   └──────┬──────┘
                    │                │                 │
                    │         ┌──────┴──────┐   ┌──────┴──────┐
                    │         │  Supabase   │   │  Supabase   │
                    │         │  (Find DB)  │   │ (Frame DB)  │
                    │         └─────────────┘   └─────────────┘
                    │                │                 │
                    │                └────────┬────────┘
                    │                         │
                    │                         │ OAuth / API
                    │                         │
                    └─────────────────────────┼─────────────────────────────┐
                                              │                             │
                                              ▼                             │
                                    ┌─────────────────┐                     │
                                    │ ideaonaction.ai │                     │
                                    │   (부모 플랫폼)   │                     │
                                    ├─────────────────┤                     │
                                    │ • Auth Server   │                     │
                                    │ • User DB       │◄──────────────────┘
                                    │ • Billing       │
                                    │ • Subscription  │
                                    └─────────────────┘
```

### 데이터베이스 분리 전략

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           데이터베이스 구조                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ideaonaction.ai (PostgreSQL / Supabase)                                   │
│  ├── users                    # 사용자 기본 정보                             │
│  ├── profiles                 # 프로필 상세                                  │
│  ├── subscriptions            # 구독 정보 (모든 서비스)                       │
│  ├── payments                 # 결제 내역                                   │
│  └── oauth_clients            # OAuth 클라이언트 (Minu 서비스들)              │
│                                                                             │
│  find.minu.best (Supabase - 별도 프로젝트)                                  │
│  ├── projects                 # 프로젝트 공고                                │
│  ├── bookmarks                # 북마크 (user_id 참조)                        │
│  ├── alert_settings           # 알림 설정                                   │
│  └── search_history           # 검색 이력                                   │
│                                                                             │
│  frame.minu.best (Supabase - 별도 프로젝트)                                 │
│  ├── proposals                # 제안서                                      │
│  ├── templates                # 템플릿                                      │
│  └── proposal_versions        # 버전 히스토리                                │
│                                                                             │
│  ※ 각 서비스 DB의 user_id는 ideaonaction.ai의 user.id를 참조               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 인증 연동

### OAuth 2.0 플로우

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          OAuth 2.0 Authorization Code Flow                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. 사용자가 find.minu.best/login 클릭                                      │
│     │                                                                       │
│     ▼                                                                       │
│  2. ideaonaction.ai/oauth/authorize 리다이렉트                              │
│     ?client_id=minu-find                                                   │
│     &redirect_uri=https://find.minu.best/auth/callback                     │
│     &response_type=code                                                    │
│     &scope=profile,email,subscription                                      │
│     &state={random_state}                                                  │
│     │                                                                       │
│     ▼                                                                       │
│  3. 사용자 로그인 (ideaonaction.ai 로그인 페이지)                            │
│     │                                                                       │
│     ▼                                                                       │
│  4. 권한 승인 후 콜백                                                        │
│     https://find.minu.best/auth/callback?code={auth_code}&state={state}    │
│     │                                                                       │
│     ▼                                                                       │
│  5. find.minu.best 서버에서 토큰 교환                                        │
│     POST ideaonaction.ai/oauth/token                                       │
│     { code, client_id, client_secret, redirect_uri }                       │
│     │                                                                       │
│     ▼                                                                       │
│  6. Access Token + Refresh Token 수신                                       │
│     { access_token, refresh_token, expires_in, token_type }                │
│     │                                                                       │
│     ▼                                                                       │
│  7. 사용자 정보 조회                                                         │
│     GET ideaonaction.ai/api/user/me                                        │
│     Authorization: Bearer {access_token}                                   │
│     │                                                                       │
│     ▼                                                                       │
│  8. 로컬 세션 생성 및 서비스 이용                                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### ideaonaction.ai OAuth 엔드포인트

| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `/oauth/authorize` | GET | 인증 요청 (브라우저 리다이렉트) |
| `/oauth/token` | POST | 토큰 발급/갱신 |
| `/oauth/revoke` | POST | 토큰 폐기 |
| `/api/user/me` | GET | 현재 사용자 정보 |
| `/api/user/subscription` | GET | 구독 상태 조회 |

### JWT 토큰 구조

```json
{
  "header": {
    "alg": "RS256",
    "typ": "JWT"
  },
  "payload": {
    "sub": "user_uuid",
    "email": "user@example.com",
    "name": "사용자명",
    "iat": 1700000000,
    "exp": 1700003600,
    "iss": "ideaonaction.ai",
    "aud": ["minu-find", "minu-frame", "minu-build", "minu-keep"],
    "scope": ["profile", "email", "subscription"],
    "subscriptions": {
      "find": { "plan": "pro", "status": "active" },
      "frame": { "plan": "basic", "status": "active" }
    }
  }
}
```

### SSO (Single Sign-On) 구현

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SSO 플로우                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  시나리오: find.minu.best에 로그인한 사용자가 frame.minu.best 접근           │
│                                                                             │
│  1. frame.minu.best 접근                                                    │
│     │                                                                       │
│     ▼                                                                       │
│  2. 세션 없음 → ideaonaction.ai/oauth/authorize 리다이렉트                   │
│     │                                                                       │
│     ▼                                                                       │
│  3. ideaonaction.ai에 이미 세션 존재 (find에서 로그인됨)                      │
│     │                                                                       │
│     ▼                                                                       │
│  4. 자동으로 권한 승인 → frame.minu.best/auth/callback                       │
│     (사용자 인터랙션 없이 즉시 리다이렉트)                                    │
│     │                                                                       │
│     ▼                                                                       │
│  5. frame.minu.best 로그인 완료                                              │
│                                                                             │
│  ※ 사용자는 한 번 로그인으로 모든 Minu 서비스 이용 가능                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 구독/결제 연동

### 구독 모델

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           구독 관리 구조                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ideaonaction.ai/billing                                                   │
│  ├── 통합 결제 페이지                                                       │
│  │   ├── Minu Find 구독                                                    │
│  │   ├── Minu Frame 구독                                                   │
│  │   ├── Minu Build 구독                                                   │
│  │   └── Minu Keep 구독                                                    │
│  │                                                                          │
│  ├── 결제 수단 관리                                                         │
│  │   ├── 신용카드                                                           │
│  │   └── 계좌이체                                                           │
│  │                                                                          │
│  └── 구독 내역/인보이스                                                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 구독 데이터 스키마 (ideaonaction.ai)

```sql
-- 구독 테이블
subscriptions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  service TEXT NOT NULL,           -- 'find', 'frame', 'build', 'keep'
  plan TEXT NOT NULL,              -- 'free', 'basic', 'pro', 'enterprise'
  status TEXT NOT NULL,            -- 'active', 'canceled', 'past_due', 'trialing'
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  payment_provider TEXT,           -- 'stripe', 'toss', etc.
  provider_subscription_id TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)

-- 요금제 정의
plans (
  id UUID PRIMARY KEY,
  service TEXT NOT NULL,
  name TEXT NOT NULL,              -- 'Basic', 'Pro', 'Enterprise'
  price_monthly INT NOT NULL,
  price_yearly INT NOT NULL,
  features JSONB,
  limits JSONB,                    -- { searchCount: 50, proposalCount: 5, ... }
  created_at TIMESTAMPTZ
)
```

### 구독 상태 조회 API

```
GET ideaonaction.ai/api/user/subscription?service=find

Response:
{
  "service": "find",
  "plan": "pro",
  "status": "active",
  "currentPeriodEnd": "2025-12-27T00:00:00Z",
  "limits": {
    "searchCount": 300,
    "platforms": 6,
    "historyMonths": 6
  },
  "usage": {
    "searchCount": 45,
    "lastResetAt": "2025-11-01T00:00:00Z"
  }
}
```

### Minu 서비스에서 구독 확인

```typescript
// lib/subscription.ts (각 Minu 서비스)

import { getAccessToken } from './auth';

interface SubscriptionInfo {
  service: string;
  plan: 'free' | 'basic' | 'pro' | 'enterprise';
  status: 'active' | 'canceled' | 'past_due' | 'trialing';
  limits: Record<string, number>;
  usage: Record<string, number>;
}

export async function getSubscription(service: string): Promise<SubscriptionInfo> {
  const token = await getAccessToken();
  
  const response = await fetch(
    `${process.env.IDEAONACTION_API_URL}/api/user/subscription?service=${service}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );
  
  if (!response.ok) {
    throw new Error('Failed to fetch subscription');
  }
  
  return response.json();
}

export async function checkQuota(service: string, feature: string): Promise<boolean> {
  const subscription = await getSubscription(service);
  const limit = subscription.limits[feature];
  const usage = subscription.usage[feature];
  
  return usage < limit;
}
```

### 결제 페이지 리다이렉트

```typescript
// 구독하기 버튼 클릭 시
function handleSubscribe(service: string, plan: string) {
  const billingUrl = new URL('https://ideaonaction.ai/billing');
  billingUrl.searchParams.set('service', service);
  billingUrl.searchParams.set('plan', plan);
  billingUrl.searchParams.set('redirect', window.location.href);
  
  window.location.href = billingUrl.toString();
}

// 사용 예시
<button onClick={() => handleSubscribe('find', 'pro')}>
  Pro 플랜 구독하기
</button>
```

---

## API 연동

### ideaonaction.ai API 목록

| 엔드포인트 | 메서드 | 설명 | 인증 |
|-----------|--------|------|------|
| `/api/user/me` | GET | 사용자 정보 | Bearer Token |
| `/api/user/profile` | GET/PUT | 프로필 조회/수정 | Bearer Token |
| `/api/user/subscription` | GET | 구독 상태 | Bearer Token |
| `/api/user/subscriptions` | GET | 전체 구독 목록 | Bearer Token |
| `/api/user/usage` | GET | 사용량 조회 | Bearer Token |
| `/api/webhook/subscription` | POST | 구독 변경 웹훅 | Webhook Secret |

### 웹훅 연동

ideaonaction.ai에서 구독 상태 변경 시 각 Minu 서비스로 웹훅 전송:

```typescript
// app/api/webhook/subscription/route.ts (각 Minu 서비스)

import { headers } from 'next/headers';
import crypto from 'crypto';

export async function POST(request: Request) {
  const body = await request.text();
  const signature = headers().get('x-webhook-signature');
  
  // 서명 검증
  const expectedSignature = crypto
    .createHmac('sha256', process.env.WEBHOOK_SECRET!)
    .update(body)
    .digest('hex');
  
  if (signature !== expectedSignature) {
    return Response.json({ error: 'Invalid signature' }, { status: 401 });
  }
  
  const event = JSON.parse(body);
  
  switch (event.type) {
    case 'subscription.created':
    case 'subscription.updated':
      // 로컬 캐시 갱신
      await updateLocalSubscriptionCache(event.data);
      break;
      
    case 'subscription.canceled':
      // 접근 권한 제한 처리
      await handleSubscriptionCanceled(event.data);
      break;
      
    case 'subscription.past_due':
      // 결제 실패 알림
      await notifyPaymentFailed(event.data);
      break;
  }
  
  return Response.json({ received: true });
}
```

### 웹훅 이벤트 타입

| 이벤트 | 설명 |
|--------|------|
| `subscription.created` | 새 구독 생성 |
| `subscription.updated` | 구독 플랜 변경 |
| `subscription.canceled` | 구독 취소 |
| `subscription.past_due` | 결제 실패 |
| `subscription.renewed` | 구독 갱신 |

---

## 구현 가이드

### 1. ideaonaction.ai OAuth 클라이언트 등록

각 Minu 서비스를 OAuth 클라이언트로 등록:

```sql
-- ideaonaction.ai 관리자 패널 또는 직접 DB
INSERT INTO oauth_clients (
  client_id,
  client_secret,
  name,
  redirect_uris,
  allowed_scopes
) VALUES (
  'minu-find',
  'secret_xxx',
  'Minu Find',
  ARRAY['https://find.minu.best/auth/callback'],
  ARRAY['profile', 'email', 'subscription']
);
```

### 2. Minu 서비스 인증 구현

```typescript
// lib/auth.ts (각 Minu 서비스 공통)

const IDEAONACTION_URL = process.env.IDEAONACTION_URL || 'https://ideaonaction.ai';
const CLIENT_ID = process.env.OAUTH_CLIENT_ID!;
const CLIENT_SECRET = process.env.OAUTH_CLIENT_SECRET!;
const REDIRECT_URI = process.env.OAUTH_REDIRECT_URI!;

// 1. 로그인 URL 생성
export function getLoginUrl(state: string): string {
  const url = new URL(`${IDEAONACTION_URL}/oauth/authorize`);
  url.searchParams.set('client_id', CLIENT_ID);
  url.searchParams.set('redirect_uri', REDIRECT_URI);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'profile email subscription');
  url.searchParams.set('state', state);
  return url.toString();
}

// 2. 토큰 교환
export async function exchangeCodeForToken(code: string) {
  const response = await fetch(`${IDEAONACTION_URL}/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
    }),
  });
  
  if (!response.ok) {
    throw new Error('Token exchange failed');
  }
  
  return response.json();
}

// 3. 토큰 갱신
export async function refreshAccessToken(refreshToken: string) {
  const response = await fetch(`${IDEAONACTION_URL}/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
  });
  
  if (!response.ok) {
    throw new Error('Token refresh failed');
  }
  
  return response.json();
}

// 4. 사용자 정보 조회
export async function getUserInfo(accessToken: string) {
  const response = await fetch(`${IDEAONACTION_URL}/api/user/me`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch user info');
  }
  
  return response.json();
}
```

### 3. 콜백 핸들러

```typescript
// app/auth/callback/route.ts

import { cookies } from 'next/headers';
import { exchangeCodeForToken, getUserInfo } from '@/lib/auth';
import { createSession } from '@/lib/session';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  
  // 에러 처리
  if (error) {
    return Response.redirect(`/login?error=${error}`);
  }
  
  // state 검증 (CSRF 방지)
  const savedState = cookies().get('oauth_state')?.value;
  if (state !== savedState) {
    return Response.redirect('/login?error=invalid_state');
  }
  
  try {
    // 토큰 교환
    const tokens = await exchangeCodeForToken(code!);
    
    // 사용자 정보 조회
    const user = await getUserInfo(tokens.access_token);
    
    // 로컬 세션 생성
    await createSession({
      userId: user.id,
      email: user.email,
      name: user.name,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: Date.now() + tokens.expires_in * 1000,
    });
    
    // 대시보드로 리다이렉트
    return Response.redirect('/dashboard');
    
  } catch (error) {
    console.error('Auth callback error:', error);
    return Response.redirect('/login?error=auth_failed');
  }
}
```

### 4. 미들웨어 (인증 보호)

```typescript
// middleware.ts

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySession, refreshSessionIfNeeded } from '@/lib/session';

export async function middleware(request: NextRequest) {
  const session = await verifySession(request);
  
  // 보호된 경로 체크
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    if (!session) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }
    
    // 토큰 만료 임박 시 갱신
    await refreshSessionIfNeeded(session);
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/:path*'],
};
```

### 5. 구독 확인 훅

```typescript
// hooks/useSubscription.ts

import { useQuery } from '@tanstack/react-query';
import { getSubscription } from '@/lib/subscription';

export function useSubscription(service: string) {
  return useQuery({
    queryKey: ['subscription', service],
    queryFn: () => getSubscription(service),
    staleTime: 1000 * 60 * 5,  // 5분
    retry: 1,
  });
}

export function useCanAccess(service: string, feature: string) {
  const { data: subscription, isLoading } = useSubscription(service);
  
  if (isLoading || !subscription) {
    return { canAccess: false, isLoading };
  }
  
  const limit = subscription.limits[feature];
  const usage = subscription.usage[feature];
  
  return {
    canAccess: usage < limit,
    isLoading: false,
    remaining: limit - usage,
    limit,
    usage,
  };
}
```

### 6. 접근 제어 컴포넌트

```tsx
// components/SubscriptionGate.tsx

import { useSubscription } from '@/hooks/useSubscription';
import { UpgradePrompt } from './UpgradePrompt';

interface SubscriptionGateProps {
  service: string;
  requiredPlan?: string[];
  feature?: string;
  children: React.ReactNode;
}

export function SubscriptionGate({ 
  service, 
  requiredPlan, 
  feature,
  children 
}: SubscriptionGateProps) {
  const { data: subscription, isLoading } = useSubscription(service);
  
  if (isLoading) {
    return <div>로딩 중...</div>;
  }
  
  // 플랜 체크
  if (requiredPlan && !requiredPlan.includes(subscription?.plan)) {
    return (
      <UpgradePrompt 
        currentPlan={subscription?.plan}
        requiredPlans={requiredPlan}
        service={service}
      />
    );
  }
  
  // 사용량 체크
  if (feature) {
    const limit = subscription?.limits[feature] || 0;
    const usage = subscription?.usage[feature] || 0;
    
    if (usage >= limit) {
      return (
        <UpgradePrompt 
          feature={feature}
          service={service}
          message={`${feature} 한도에 도달했습니다.`}
        />
      );
    }
  }
  
  return <>{children}</>;
}

// 사용 예시
<SubscriptionGate service="find" requiredPlan={['pro', 'enterprise']}>
  <AIRecommendation />
</SubscriptionGate>

<SubscriptionGate service="find" feature="searchCount">
  <SearchResults />
</SubscriptionGate>
```

---

## 환경 변수

### ideaonaction.ai

```env
# 데이터베이스
DATABASE_URL=postgresql://...

# JWT
JWT_SECRET=your-jwt-secret
JWT_ISSUER=ideaonaction.ai
JWT_AUDIENCE=minu-find,minu-frame,minu-build,minu-keep

# 결제 (예: Stripe)
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# OAuth 클라이언트 관리
OAUTH_CLIENTS_CONFIG_PATH=./config/oauth-clients.json
```

### Minu 서비스 (공통)

```env
# OAuth 설정
IDEAONACTION_URL=https://ideaonaction.ai
OAUTH_CLIENT_ID=minu-{service}
OAUTH_CLIENT_SECRET=secret_xxx
OAUTH_REDIRECT_URI=https://{service}.minu.best/auth/callback

# Supabase (각 서비스별 프로젝트)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# 웹훅
WEBHOOK_SECRET=whsec_xxx

# 세션
SESSION_SECRET=your-session-secret
```

### Minu Portal (정적 사이트)

```env
# Portal은 인증 없음, CTA URL만 설정
NEXT_PUBLIC_IDEAONACTION_URL=https://ideaonaction.ai
NEXT_PUBLIC_FIND_URL=https://find.minu.best
NEXT_PUBLIC_FRAME_URL=https://frame.minu.best
```

---

## 체크리스트

### ideaonaction.ai 설정

- [ ] OAuth 서버 구현
- [ ] 사용자 인증 API 구현
- [ ] 구독 관리 API 구현
- [ ] 결제 연동 (Stripe/Toss 등)
- [ ] 웹훅 발송 구현
- [ ] JWT 발급/검증 구현
- [ ] OAuth 클라이언트 등록 (각 Minu 서비스)

### Minu 서비스 설정 (각각)

- [ ] OAuth 클라이언트 ID/Secret 발급
- [ ] 환경 변수 설정
- [ ] 인증 라이브러리 구현 (`lib/auth.ts`)
- [ ] 콜백 핸들러 구현 (`/auth/callback`)
- [ ] 미들웨어 설정
- [ ] 구독 확인 훅 구현
- [ ] 웹훅 수신 엔드포인트 구현
- [ ] 접근 제어 컴포넌트 구현

### 테스트

- [ ] OAuth 로그인 플로우 테스트
- [ ] SSO 테스트 (서비스 간 이동)
- [ ] 토큰 갱신 테스트
- [ ] 구독 상태 조회 테스트
- [ ] 웹훅 수신 테스트
- [ ] 접근 제어 테스트

---

---

## 🚀 OAuth 2.0 Edge Functions 구현 (2025-11-27 완료)

### 구현된 Edge Functions

IDEA on Action은 **RFC 6749 (OAuth 2.0)** + **RFC 7636 (PKCE)** + **RFC 7009 (Token Revocation)** 표준을 완전히 준수하는 OAuth 2.0 Authorization Server로 구현되었습니다.

#### 1. oauth-authorize (Authorization Endpoint)

**경로**: `GET /functions/v1/oauth-authorize`

**기능**:
- Authorization Code 발급 (PKCE 필수)
- 클라이언트 및 redirect_uri 검증
- 사용자 인증 확인 (Bearer Token)
- Scope 검증
- 10분 만료 코드 생성

**파라미터**:
```
response_type: code (고정)
client_id: OAuth 클라이언트 ID
redirect_uri: 콜백 URI (화이트리스트 검증)
scope: 요청 권한 (profile, subscription:read, subscription:write)
state: CSRF 방지용 랜덤 문자열
code_challenge: PKCE SHA256 해시
code_challenge_method: S256 (고정)
```

#### 2. oauth-token (Token Endpoint)

**경로**: `POST /functions/v1/oauth-token`

**Grant Types**:
- `authorization_code`: Authorization Code → Access Token + Refresh Token
- `refresh_token`: Refresh Token → 새 Access Token

**기능**:
- PKCE code_verifier 검증
- JWT 생성 (RS256 서명, 사용자 구독 정보 포함)
- Refresh Token SHA256 해시 저장
- 토큰 만료: Access Token 1시간, Refresh Token 30일

**JWT Payload 예시**:
```json
{
  "sub": "user-id-uuid",
  "iss": "https://www.ideaonaction.ai",
  "aud": ["minu.best"],
  "exp": 1700000000,
  "iat": 1699996400,
  "scope": "profile subscription:read",
  "subscription": {
    "plan_id": "plan-uuid",
    "plan_name": "Pro",
    "status": "active"
  }
}
```

#### 3. oauth-revoke (Token Revocation Endpoint)

**경로**: `POST /functions/v1/oauth-revoke`

**기능**:
- Refresh Token 폐기 (DB is_revoked = true)
- RFC 7009 준수: 항상 200 OK 응답
- Access Token은 JWT이므로 클라이언트가 삭제

### 데이터베이스 스키마

#### oauth_clients
- OAuth 클라이언트 정보
- 초기 등록: minu-find-prod, minu-frame-prod, minu-build-prod, minu-keep-prod
- PKCE 필수 설정 (require_pkce: true)

#### authorization_codes
- Authorization Code 임시 저장 (10분 만료)
- 1회용 코드 (is_used 플래그)
- PKCE code_challenge 저장

#### oauth_refresh_tokens
- Refresh Token 저장 (30일 만료)
- SHA256 해시 저장
- 폐기 관리 (is_revoked, revoked_at, revoked_reason)

#### oauth_audit_log
- 모든 OAuth 요청 감사 로그
- IP, User-Agent, 요청/응답 상태 기록

### 보안 기능

1. **PKCE 필수**: Authorization Code Interception Attack 방지
2. **Redirect URI 화이트리스트**: Open Redirect 공격 방지
3. **SHA256 해시 저장**: Refresh Token 안전 저장
4. **RS256 JWT 서명**: 공개키 기반 검증
5. **토큰 만료**: Authorization Code 10분, Access Token 1시간, Refresh Token 30일
6. **감사 로그**: 모든 요청 추적

### 배포 가이드

#### 1. 데이터베이스 마이그레이션
```bash
supabase db push
```

**마이그레이션 파일**: `supabase/migrations/20251127000000_create_oauth_tables.sql`

#### 2. Edge Functions 배포
```bash
supabase functions deploy oauth-authorize
supabase functions deploy oauth-token
supabase functions deploy oauth-revoke
```

#### 3. 환경 변수 설정
```bash
supabase secrets set OAUTH_JWT_SECRET="your-256bit-secret-key"
supabase secrets set OAUTH_LOGIN_PAGE_URL="https://www.ideaonaction.ai/login"
```

#### 4. OAuth 클라이언트 Secret 업데이트 (프로덕션)
```sql
-- bcrypt 해시 생성 후 업데이트
UPDATE oauth_clients
SET client_secret = '$2a$10$...' -- bcrypt 해시
WHERE client_id = 'minu-find-prod';
```

### 테스트 가이드

#### PKCE 코드 생성 (클라이언트)
```javascript
// 1. code_verifier 생성
const codeVerifier = crypto.randomBytes(32).toString('base64url')

// 2. code_challenge 생성 (SHA256)
const codeChallenge = crypto
  .createHash('sha256')
  .update(codeVerifier)
  .digest('base64url')
```

#### Authorization Request
```bash
curl -X GET "https://zykjdneewbzyazfukzyg.supabase.co/functions/v1/oauth-authorize?response_type=code&client_id=minu-find-prod&redirect_uri=http://localhost:3001/auth/callback&scope=profile+subscription:read&state=test-state&code_challenge=$CODE_CHALLENGE&code_challenge_method=S256" \
  -H "Authorization: Bearer YOUR_USER_ACCESS_TOKEN"
```

#### Token Request
```bash
curl -X POST "https://zykjdneewbzyazfukzyg.supabase.co/functions/v1/oauth-token" \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "authorization_code",
    "code": "ac_XXXXXXXX",
    "redirect_uri": "http://localhost:3001/auth/callback",
    "client_id": "minu-find-prod",
    "client_secret": "your-client-secret",
    "code_verifier": "original-code-verifier"
  }'
```

### 파일 구조

```
supabase/
├── migrations/
│   └── 20251127000000_create_oauth_tables.sql
└── functions/
    ├── oauth-authorize/
    │   └── index.ts (458 lines)
    ├── oauth-token/
    │   └── index.ts (526 lines)
    └── oauth-revoke/
        └── index.ts (282 lines)
```

### 상태: ✅ 완료

- [x] OAuth 2.0 표준 준수 (RFC 6749, RFC 7636, RFC 7009)
- [x] 데이터베이스 마이그레이션 (4개 테이블)
- [x] Edge Functions 구현 (3개)
- [x] PKCE 필수 적용
- [x] JWT 생성 (구독 정보 포함)
- [x] 감사 로그 시스템
- [x] Minu 서비스 4개 초기 클라이언트 등록

---

## 관련 문서

- [OAuth 2.0 RFC 6749](https://tools.ietf.org/html/rfc6749)
- [PKCE RFC 7636](https://datatracker.ietf.org/doc/html/rfc7636)
- [Token Revocation RFC 7009](https://datatracker.ietf.org/doc/html/rfc7009)
- [JWT RFC 7519](https://tools.ietf.org/html/rfc7519)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Minu-Shared Claude Skills](https://github.com/IDEA-on-Action/Minu-Shared)

---

**최종 업데이트**: 2025-11-27
**OAuth 구현**: ✅ 완료 (v1.0.0)
**작성자**: Claude & Sinclair Seo

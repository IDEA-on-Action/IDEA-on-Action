# IDEA on Action API 가이드

> Minu 서비스 연동을 위한 공식 API 문서

**API 버전**: 2.36.0
**OpenAPI 스펙**: [openapi.yaml](./openapi.yaml)
**베이스 URL**: `https://zykjdneewbzyazfukzyg.supabase.co/functions/v1`

---

## 📚 목차

1. [빠른 시작](#빠른-시작)
2. [인증 플로우](#인증-플로우)
3. [API 엔드포인트](#api-엔드포인트)
4. [에러 처리](#에러-처리)
5. [Rate Limiting](#rate-limiting)
6. [보안 가이드](#보안-가이드)
7. [예제 코드](#예제-코드)

---

## 🚀 빠른 시작

### 1. OAuth 클라이언트 등록

먼저 IDEA on Action 관리자에게 OAuth 클라이언트 등록을 요청하세요.

**필요 정보**:
- 서비스 이름 (예: Find, Frame)
- 환경 (local, dev, staging, prod)
- Redirect URIs (예: `https://find.minu.best/auth/callback`)
- 요청 Scope (예: `profile`, `subscription:read`)

**발급받는 정보**:
- `client_id`: OAuth 클라이언트 ID
- `allowed_scopes`: 허용된 권한 범위
- `redirect_uris`: 등록된 리다이렉트 URI 목록

### 2. Authorization Code 발급

```javascript
// PKCE code_verifier 생성
function generateCodeVerifier() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64URLEncode(array);
}

// PKCE code_challenge 생성
async function generateCodeChallenge(verifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64URLEncode(digest);
}

// 사용자를 인증 URL로 리다이렉트
const codeVerifier = generateCodeVerifier();
sessionStorage.setItem('code_verifier', codeVerifier);

const codeChallenge = await generateCodeChallenge(codeVerifier);
const state = generateRandomString();
sessionStorage.setItem('oauth_state', state);

const authUrl = new URL('https://zykjdneewbzyazfukzyg.supabase.co/functions/v1/oauth-authorize');
authUrl.searchParams.set('response_type', 'code');
authUrl.searchParams.set('client_id', 'minu-find-prod');
authUrl.searchParams.set('redirect_uri', 'https://find.minu.best/auth/callback');
authUrl.searchParams.set('scope', 'profile subscription:read');
authUrl.searchParams.set('state', state);
authUrl.searchParams.set('code_challenge', codeChallenge);
authUrl.searchParams.set('code_challenge_method', 'S256');

window.location.href = authUrl.toString();
```

### 3. Access Token 교환

```javascript
// 콜백 페이지에서 Authorization Code 처리
const urlParams = new URLSearchParams(window.location.search);
const code = urlParams.get('code');
const state = urlParams.get('state');

// State 검증
if (state !== sessionStorage.getItem('oauth_state')) {
  throw new Error('State mismatch - CSRF attack?');
}

// Access Token 발급
const codeVerifier = sessionStorage.getItem('code_verifier');

const response = await fetch('https://zykjdneewbzyazfukzyg.supabase.co/functions/v1/oauth-token', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: 'https://find.minu.best/auth/callback',
    client_id: 'minu-find-prod',
    code_verifier: codeVerifier,
  }),
});

const data = await response.json();

// 토큰 저장 (HttpOnly Cookie 권장)
localStorage.setItem('access_token', data.access_token);
localStorage.setItem('refresh_token', data.refresh_token);
```

### 4. API 호출

```javascript
// 사용자 프로필 조회
const response = await fetch('https://zykjdneewbzyazfukzyg.supabase.co/functions/v1/user-api/me', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
  },
});

const userProfile = await response.json();
console.log(userProfile);
```

---

## 🔐 인증 플로우

### OAuth 2.0 Authorization Code Flow + PKCE

```
┌─────────┐                                ┌──────────────┐
│  Minu   │                                │ IDEA on      │
│ Client  │                                │ Action       │
└────┬────┘                                └──────┬───────┘
     │                                            │
     │ 1. GET /oauth-authorize                    │
     │    ?client_id=...                          │
     │    &redirect_uri=...                       │
     │    &code_challenge=...                     │
     │ ──────────────────────────────────────────>│
     │                                            │
     │ 2. 사용자 로그인 & 동의                     │
     │ <──────────────────────────────────────────│
     │                                            │
     │ 3. 302 Redirect                            │
     │    ?code=AUTH_CODE&state=...               │
     │ <──────────────────────────────────────────│
     │                                            │
     │ 4. POST /oauth-token                       │
     │    { code, code_verifier, ... }            │
     │ ──────────────────────────────────────────>│
     │                                            │
     │ 5. { access_token, refresh_token }         │
     │ <──────────────────────────────────────────│
     │                                            │
     │ 6. GET /user-api/me                        │
     │    Authorization: Bearer {token}           │
     │ ──────────────────────────────────────────>│
     │                                            │
     │ 7. { user profile }                        │
     │ <──────────────────────────────────────────│
     │                                            │
```

### JWT 토큰 구조

```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "sub": "user_123",
    "iss": "https://www.ideaonaction.ai",
    "aud": ["minu.best"],
    "exp": 1735689600,
    "iat": 1735686000,
    "scope": "profile subscription:read",
    "subscription": {
      "plan_id": "uuid",
      "plan_name": "Pro",
      "status": "active",
      "expires_at": "2026-12-31T23:59:59Z",
      "services": ["find", "frame"]
    }
  }
}
```

---

## 📡 API 엔드포인트

### OAuth API

| 메서드 | 엔드포인트 | 설명 |
|--------|-----------|------|
| GET | `/oauth-authorize` | Authorization Code 발급 |
| POST | `/oauth-token` | Access Token 발급 |
| POST | `/oauth-revoke` | Token 폐기 |

### User API

| 메서드 | 엔드포인트 | 설명 | 인증 필요 |
|--------|-----------|------|-----------|
| GET | `/user-api/me` | 사용자 프로필 조회 | ✅ |
| GET | `/user-api/subscription` | 구독 상세 정보 | ✅ |

**응답 예시** (`/user-api/me`):
```json
{
  "id": "user_123",
  "email": "user@example.com",
  "full_name": "홍길동",
  "avatar_url": "https://...",
  "created_at": "2025-01-01T00:00:00Z",
  "subscription": {
    "id": "sub_456",
    "service_name": "Find",
    "plan_name": "Pro",
    "status": "active",
    "billing_cycle": "monthly",
    "price": 49000,
    "current_period_end": "2026-01-01T00:00:00Z"
  }
}
```

### Subscription API

| 메서드 | 엔드포인트 | 설명 | 인증 필요 |
|--------|-----------|------|-----------|
| GET | `/subscription-api/features?plan_id={id}` | 플랜 기능 목록 | ✅ |
| GET | `/subscription-api/usage` | 현재 사용량 | ✅ |
| GET | `/subscription-api/can-access?feature_key={key}` | 기능 접근 가능 여부 | ✅ |
| POST | `/subscription-api/usage/increment` | 사용량 증가 | ✅ |

**사용 예시** (기능 제한 확인):
```javascript
// 기능 접근 가능 여부 확인
const response = await fetch(
  'https://zykjdneewbzyazfukzyg.supabase.co/functions/v1/subscription-api/can-access?feature_key=monthly_analyses',
  {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  }
);

const { can_access, remaining } = await response.json();

if (!can_access) {
  alert(`월간 분석 제한에 도달했습니다. (남은 횟수: ${remaining})`);
  return;
}

// 기능 실행 후 사용량 증가
await fetch('https://zykjdneewbzyazfukzyg.supabase.co/functions/v1/subscription-api/usage/increment', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    feature_key: 'monthly_analyses',
  }),
});
```

### Health API

| 메서드 | 엔드포인트 | 설명 | 인증 필요 |
|--------|-----------|------|-----------|
| GET | `/api-v1-health` | 기본 헬스체크 (빠른 응답) | ❌ |
| GET | `/api-v1-health/detailed` | 상세 컴포넌트 상태 | ❌ |
| GET | `/api-v1-health/metrics` | 성능 메트릭 조회 | ❌ |
| GET | `/api-v1-health/ready` | Kubernetes Readiness Probe | ❌ |
| GET | `/api-v1-health/live` | Kubernetes Liveness Probe | ❌ |

**응답 예시** (기본):
```json
{
  "status": "healthy",
  "version": "2.36.0",
  "timestamp": "2025-11-30T12:00:00Z",
  "components": {
    "database": {
      "status": "healthy",
      "latency_ms": 45
    }
  },
  "response_time_ms": 52
}
```

**응답 예시** (상세):
```json
{
  "status": "healthy",
  "version": "2.36.0",
  "timestamp": "2025-11-30T12:00:00Z",
  "uptime_seconds": 86400,
  "components": {
    "database": {
      "status": "healthy",
      "latency_ms": 45,
      "details": {
        "last_migration": "20251201000005"
      }
    },
    "auth": {
      "status": "healthy",
      "latency_ms": 120
    },
    "storage": {
      "status": "healthy",
      "latency_ms": 180
    },
    "edge_functions": {
      "status": "healthy",
      "latency_ms": 0,
      "details": {
        "active_count": 22
      }
    }
  },
  "checks": {
    "oauth_token": {
      "status": "pass",
      "latency_ms": 35
    },
    "subscription_api": {
      "status": "pass",
      "latency_ms": 42
    }
  },
  "response_time_ms": 278
}
```

**응답 예시** (메트릭):
```json
{
  "timestamp": "2025-11-30T12:00:00Z",
  "period": "1h",
  "requests": {
    "total": 15420,
    "success": 15234,
    "error": 186,
    "success_rate": 98.8
  },
  "latency": {
    "p50_ms": 120,
    "p95_ms": 450,
    "p99_ms": 820,
    "avg_ms": 156
  },
  "rate_limits": {
    "total_blocked": 23,
    "top_blocked_ips": ["1.2.3.4", "5.6.7.8"]
  },
  "errors": {
    "by_code": {
      "401": 145,
      "429": 23,
      "500": 18
    }
  }
}
```

---

## ⚠️ 에러 처리

### OAuth 에러 (RFC 6749)

```json
{
  "error": "invalid_grant",
  "error_description": "인증 코드가 유효하지 않습니다."
}
```

**에러 코드**:
- `invalid_request`: 필수 파라미터 누락
- `invalid_client`: 클라이언트 인증 실패
- `invalid_grant`: Authorization Code 또는 Refresh Token 무효
- `unauthorized_client`: 권한 없는 클라이언트
- `unsupported_grant_type`: 지원하지 않는 grant_type
- `invalid_scope`: 유효하지 않은 scope
- `server_error`: 서버 내부 오류

### API 에러 (RFC 7807 스타일)

```json
{
  "error": {
    "code": "unauthorized",
    "message": "유효하지 않은 토큰입니다.",
    "request_id": "req_abc123",
    "timestamp": "2025-11-30T12:00:00Z"
  }
}
```

**HTTP 상태 코드**:
- `400 Bad Request`: 잘못된 요청
- `401 Unauthorized`: 인증 실패
- `403 Forbidden`: 권한 없음 (예: 사용 제한 초과)
- `404 Not Found`: 리소스 없음
- `429 Too Many Requests`: Rate Limit 초과
- `500 Internal Server Error`: 서버 오류
- `503 Service Unavailable`: 서비스 이용 불가

### 에러 처리 예시

```javascript
async function fetchUserProfile(accessToken) {
  try {
    const response = await fetch(
      'https://zykjdneewbzyazfukzyg.supabase.co/functions/v1/user-api/me',
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        // 토큰 만료 - Refresh Token으로 재발급
        const newToken = await refreshAccessToken();
        return fetchUserProfile(newToken);
      } else if (response.status === 429) {
        // Rate Limit - Retry-After 헤더 확인
        const retryAfter = response.headers.get('Retry-After');
        throw new Error(`Rate limit exceeded. Retry after ${retryAfter}s`);
      } else {
        const error = await response.json();
        throw new Error(error.error.message);
      }
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to fetch user profile:', error);
    throw error;
  }
}
```

---

## 🚦 Rate Limiting

### 제한 정책

| 엔드포인트 | 제한 | 윈도우 |
|-----------|------|--------|
| `/user-api/*` | 60 req/min | 1분 |
| `/subscription-api/*` | 60 req/min | 1분 |
| `/oauth-token` | (무제한) | - |

### 헤더

응답 헤더에서 현재 상태를 확인할 수 있습니다:

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1735689600
```

Rate Limit 초과 시:

```
HTTP/1.1 429 Too Many Requests
Retry-After: 30
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1735689630
```

---

## 🔒 보안 가이드

### 1. PKCE 필수 사용

PKCE(Proof Key for Code Exchange)는 Authorization Code 탈취를 방지합니다.

```javascript
// ❌ 잘못된 방법 (PKCE 없음)
const authUrl = `https://.../oauth-authorize?client_id=...&redirect_uri=...`;

// ✅ 올바른 방법 (PKCE S256)
const codeVerifier = generateCodeVerifier();
const codeChallenge = await generateCodeChallenge(codeVerifier);
const authUrl = `https://.../oauth-authorize?client_id=...&code_challenge=${codeChallenge}&code_challenge_method=S256`;
```

### 2. State 파라미터로 CSRF 방지

```javascript
// State 생성 및 검증
const state = crypto.randomUUID();
sessionStorage.setItem('oauth_state', state);

// 콜백에서 검증
if (urlParams.get('state') !== sessionStorage.getItem('oauth_state')) {
  throw new Error('CSRF attack detected');
}
```

### 3. 토큰 저장

**권장 방법**:
- **HttpOnly Cookie**: XSS 공격 방지
- **Secure Flag**: HTTPS only
- **SameSite=Strict**: CSRF 방지

```javascript
// ✅ 권장: HttpOnly Cookie (백엔드에서 설정)
res.cookie('access_token', token, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  maxAge: 3600000, // 1시간
});

// ⚠️ 주의: localStorage (XSS 취약)
localStorage.setItem('access_token', token);
```

### 4. Refresh Token 갱신

Access Token 만료 시 Refresh Token으로 재발급:

```javascript
async function refreshAccessToken() {
  const refreshToken = getRefreshToken(); // HttpOnly Cookie 또는 Secure Storage

  const response = await fetch('https://zykjdneewbzyazfukzyg.supabase.co/functions/v1/oauth-token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: 'minu-find-prod',
    }),
  });

  const data = await response.json();
  saveAccessToken(data.access_token);
  return data.access_token;
}
```

### 5. HTTPS Only

**모든 API 호출은 HTTPS를 사용해야 합니다.**

```javascript
// ❌ 잘못된 방법
fetch('http://zykjdneewbzyazfukzyg.supabase.co/...');

// ✅ 올바른 방법
fetch('https://zykjdneewbzyazfukzyg.supabase.co/...');
```

---

## 💻 예제 코드

### React + TypeScript

```typescript
import { useState, useEffect } from 'react';

const API_BASE_URL = 'https://zykjdneewbzyazfukzyg.supabase.co/functions/v1';

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  subscription: SubscriptionInfo | null;
}

export function useAuth() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  async function fetchUserProfile() {
    try {
      const token = getAccessToken();
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/user-api/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        // 토큰 만료 - 재로그인 필요
        handleLogout();
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch user profile');
      }

      const data = await response.json();
      setUser(data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleLogin() {
    const codeVerifier = generateCodeVerifier();
    sessionStorage.setItem('code_verifier', codeVerifier);

    const codeChallenge = generateCodeChallenge(codeVerifier);
    const state = crypto.randomUUID();
    sessionStorage.setItem('oauth_state', state);

    const authUrl = new URL(`${API_BASE_URL}/oauth-authorize`);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', process.env.REACT_APP_OAUTH_CLIENT_ID!);
    authUrl.searchParams.set('redirect_uri', `${window.location.origin}/auth/callback`);
    authUrl.searchParams.set('scope', 'profile subscription:read');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');

    window.location.href = authUrl.toString();
  }

  function handleLogout() {
    removeAccessToken();
    setUser(null);
  }

  return { user, loading, handleLogin, handleLogout };
}

// 구독 제한 확인 훅
export function useSubscriptionLimit(featureKey: string) {
  const [canAccess, setCanAccess] = useState(true);
  const [remaining, setRemaining] = useState(0);

  async function checkLimit() {
    const token = getAccessToken();
    if (!token) return false;

    const response = await fetch(
      `${API_BASE_URL}/subscription-api/can-access?feature_key=${featureKey}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();
    setCanAccess(data.can_access);
    setRemaining(data.remaining);
    return data.can_access;
  }

  async function incrementUsage() {
    const token = getAccessToken();
    if (!token) return;

    await fetch(`${API_BASE_URL}/subscription-api/usage/increment`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ feature_key: featureKey }),
    });

    // 사용량 재확인
    await checkLimit();
  }

  return { canAccess, remaining, checkLimit, incrementUsage };
}
```

---

## 📝 참고 문서

- [OpenAPI 스펙](./openapi.yaml)
- [Minu 연동 가이드라인](../guides/minu-integration-guidelines.md)
- [OAuth 2.0 RFC 6749](https://tools.ietf.org/html/rfc6749)
- [PKCE RFC 7636](https://tools.ietf.org/html/rfc7636)
- [JWT RFC 7519](https://tools.ietf.org/html/rfc7519)
- [RFC 7807 Problem Details](https://tools.ietf.org/html/rfc7807)

---

## 🆘 지원

**기술 문의**:
- 이메일: sinclairseo@gmail.com
- GitHub Issues: [프로젝트 저장소](https://github.com/ideaonaction/idea-on-action)

**긴급 문제**:
- Slack: #minu-integration (내부 채널)

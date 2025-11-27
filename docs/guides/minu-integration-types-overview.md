# Minu 통합 TypeScript 타입 가이드

## 개요

Minu 서비스 통합을 위한 TypeScript 타입 정의를 완료했습니다. 이 문서는 생성된 타입 파일들의 구조와 사용 방법을 설명합니다.

**작성일**: 2025-11-27
**버전**: 2.19.0
**총 라인 수**: 1,517 lines

---

## 📁 생성된 파일

### 1. `src/types/oauth.types.ts` (436 lines)

OAuth 2.0 인증 프로토콜 관련 타입 정의

#### 주요 타입

**Database Types**:
- `OAuthClient` - OAuth 클라이언트 정보
- `AuthorizationCode` - 인가 코드 (10분 수명)
- `OAuthAccessToken` - 액세스 토큰 (1시간 수명)
- `OAuthRefreshToken` - 리프레시 토큰 (30일 수명)

**Request/Response Types**:
- `OAuthAuthorizationRequest` - 인가 요청 (GET /oauth/authorize)
- `OAuthAuthorizationResponse` - 인가 응답 (redirect with code)
- `OAuthTokenRequest` - 토큰 요청 (POST /oauth/token)
- `OAuthTokenResponse` - 토큰 응답 (RFC 6749)
- `OAuthTokenRevokeRequest` - 토큰 폐기 요청 (RFC 7009)

**JWT**:
- `OAuthJWTPayload` - JWT 디코딩 결과 (구독 정보 포함)

**Error Handling**:
- `OAuthErrorCode` - RFC 6749 표준 에러 코드
- `OAuthErrorResponse` - 에러 응답

**Scopes** (23개):
```typescript
type OAuthScope =
  | 'find:market:read'        // 시장 데이터 조회
  | 'frame:document:write'    // 문서 생성/수정
  | 'build:project:read'      // 프로젝트 조회
  | 'keep:monitoring:write'   // 모니터링 설정
  | 'profile:read'            // 프로필 조회
  // ... 총 23개
```

**Helper Types**:
- `PKCECodeVerifier` - RFC 7636 PKCE 지원
- `CreateOAuthClientRequest/Response` - 클라이언트 생성

#### 사용 예시

```typescript
import { OAuthTokenRequest, OAuthTokenResponse } from '@/types/oauth.types'

// 토큰 요청
const tokenRequest: OAuthTokenRequest = {
  grant_type: 'authorization_code',
  code: 'AUTH_CODE_HERE',
  redirect_uri: 'https://app.ideaonaction.ai/oauth/callback',
  client_id: 'minu_find_client',
  client_secret: 'SECRET',
  code_verifier: 'VERIFIER_STRING'
}

// Edge Function 호출
const response = await fetch('/oauth/token', {
  method: 'POST',
  body: JSON.stringify(tokenRequest)
})

const tokenResponse: OAuthTokenResponse = await response.json()
// { access_token, token_type: 'Bearer', expires_in, refresh_token, scope }
```

---

### 2. `src/types/subscription-usage.types.ts` (510 lines)

구독 사용량 추적 및 기능 제한 관련 타입 정의

#### 주요 타입

**Enums**:
- `LimitType` - 'count' | 'boolean' | 'size' | 'duration'
- `FeatureCategory` - 'find' | 'frame' | 'build' | 'keep' | 'common'
- `UsagePeriod` - 'daily' | 'weekly' | 'monthly' | 'yearly'

**Feature Keys** (38개):
```typescript
type FeatureKey =
  // Minu Find (7개)
  | 'find_market_search'
  | 'find_competitor_analysis'
  | 'find_ai_insights'
  // Minu Frame (7개)
  | 'frame_document_generate'
  | 'frame_rfp_create'
  | 'frame_collaboration'
  // Minu Build (8개)
  | 'build_project_create'
  | 'build_sprint_manage'
  | 'build_integration_github'
  // Minu Keep (7개)
  | 'keep_monitoring_service'
  | 'keep_alert_rule'
  | 'keep_sla_monitoring'
  // Common (9개)
  | 'common_storage_gb'
  | 'common_api_calls_per_day'
  | 'common_sso'
```

**Database Types**:
- `PlanFeature` - 플랜별 기능 제한 정의
- `SubscriptionUsage` - 사용량 추적 레코드
- `UsageEvent` - 개별 사용 이벤트 로그

**Request/Response Types**:
- `GetUsageRequest/Response` - 사용량 조회
- `IncrementUsageRequest/Response` - 사용량 증가
- `CheckFeatureAvailabilityRequest/Response` - 기능 사용 가능 여부 확인

**Extended Types**:
- `UsageDashboardData` - 대시보드용 집계 데이터
- `UsageStatistics` - 기간별 통계

**UI Helper**:
- `UsageStatusColor` - 'success' | 'warning' | 'danger' | 'blocked'
- `getUsageStatusColor()` - 사용률에 따른 색상 판단

#### 사용 예시

```typescript
import {
  FeatureKey,
  CheckFeatureAvailabilityRequest,
  CheckFeatureAvailabilityResponse
} from '@/types/subscription-usage.types'

// 기능 사용 가능 여부 확인
const checkRequest: CheckFeatureAvailabilityRequest = {
  subscription_id: 'sub_12345',
  feature_key: 'find_market_search',
  required_count: 1
}

const { data } = await supabase
  .rpc('check_feature_availability', checkRequest)

const result: CheckFeatureAvailabilityResponse = data
// { available: true, current_usage: 45, limit_value: 100, remaining: 55 }

if (!result.available) {
  console.error(`사용 제한 도달: ${result.reason}`)
  console.log(`추천 플랜: ${result.suggested_plan?.plan_name}`)
}
```

---

### 3. `src/types/minu-integration.types.ts` (571 lines)

Minu 서비스 통합 및 SSO 관련 타입 정의

#### 주요 타입

**Service Definitions**:
```typescript
type MinuService = 'find' | 'frame' | 'build' | 'keep'

const MINU_DOMAINS: Record<MinuService, string> = {
  find: 'find.minu.best',
  frame: 'frame.minu.best',
  build: 'build.minu.best',
  keep: 'keep.minu.best',
}
```

**SSO Types**:
- `SSOState` - SSO 인증 상태
- `MinuUser` - Minu 사용자 정보
- `MinuSubscription` - Minu 구독 정보
- `SSOLoginRequest/Response` - SSO 로그인
- `SSOCallbackRequest/Response` - OAuth 콜백 처리

**Webhook Types**:
- `WebhookEventType` - 15개 이벤트 타입
  - `subscription.created/updated/cancelled`
  - `payment.success/failed/refunded`
  - `usage.limit_reached/exceeded`
  - `user.updated/deleted`
  - `feature.enabled/disabled`
- `WebhookPayload` - 웹훅 페이로드 (HMAC 서명 포함)
- `SubscriptionEventData` - 구독 이벤트 데이터
- `PaymentEventData` - 결제 이벤트 데이터
- `UsageEventData` - 사용량 이벤트 데이터

**Service-to-Service Communication**:
- `ServiceToServiceRequest/Response` - 서비스 간 통신

**Feature Flags**:
- `FeatureFlag` - 기능 플래그 정의
- `CheckFeatureFlagRequest/Response` - 플래그 확인

**Analytics**:
- `MinuAnalyticsData` - 분석 이벤트
- `ServiceUsageStatistics` - 서비스 사용 통계

**Error Handling**:
- `MinuIntegrationErrorCode` - MINU_001 ~ MINU_010
- `MinuIntegrationError` - 에러 객체

**Hook Types**:
- `UseMinuSSOResult` - useMinuSSO 훅 반환 타입

#### 사용 예시

**SSO 로그인**:
```typescript
import { MinuService, SSOLoginRequest } from '@/types/minu-integration.types'

const loginRequest: SSOLoginRequest = {
  service: 'find',
  redirect_uri: 'https://find.minu.best/dashboard',
  state: 'random_csrf_token'
}

const { data } = await supabase.functions.invoke('mcp-auth/sso-login', {
  body: loginRequest
})

// 사용자를 인가 URL로 리디렉션
window.location.href = data.authorization_url
```

**웹훅 처리**:
```typescript
import { WebhookPayload, SubscriptionEventData } from '@/types/minu-integration.types'

export async function POST(request: Request) {
  const payload: WebhookPayload = await request.json()

  // HMAC 서명 검증
  const isValid = verifyWebhookSignature(payload)
  if (!isValid) {
    return new Response('Invalid signature', { status: 401 })
  }

  // 이벤트 타입별 처리
  switch (payload.event_type) {
    case 'subscription.updated':
      const data = payload.data as SubscriptionEventData
      await handleSubscriptionUpdate(data)
      break
    case 'usage.limit_reached':
      const usageData = payload.data as UsageEventData
      await sendLimitReachedNotification(usageData)
      break
  }

  return new Response('OK', { status: 200 })
}
```

**useMinuSSO 훅**:
```typescript
import { useMinuSSO } from '@/hooks/useMinuSSO'

function MinuFindPage() {
  const {
    state,
    isLoading,
    login,
    logout,
    canAccessService,
    canUseFeature
  } = useMinuSSO()

  if (!state.isAuthenticated) {
    return <button onClick={() => login('find')}>Login to Minu Find</button>
  }

  if (!canAccessService('find')) {
    return <UpgradePrompt />
  }

  if (!canUseFeature('find_market_search')) {
    return <UsageLimitReached feature="find_market_search" />
  }

  return <MinuFindDashboard />
}
```

---

## 🔗 타입 간 관계

```
subscription.types.ts (기존)
  ↓
subscription-usage.types.ts (신규)
  - SubscriptionStatus 참조
  - PlanFeature → FeatureKey
  ↓
oauth.types.ts (신규)
  - SubscriptionStatus 참조
  - OAuthJWTPayload에 구독 정보 포함
  ↓
minu-integration.types.ts (신규)
  - SubscriptionStatus, PlanFeature, FeatureKey 참조
  - OAuthScope 참조
  - SSO, Webhook, Service Communication 통합
```

---

## 📦 Import 방법

**개별 Import**:
```typescript
import { OAuthTokenResponse } from '@/types/oauth.types'
import { FeatureKey, CheckFeatureAvailabilityRequest } from '@/types/subscription-usage.types'
import { MinuService, SSOState, WebhookPayload } from '@/types/minu-integration.types'
```

**Barrel Export** (권장):
```typescript
// src/types/index.ts에서 모두 재내보내기
import {
  OAuthTokenResponse,
  FeatureKey,
  MinuService,
  SSOState
} from '@/types'
```

---

## 🎯 다음 단계

### 1. Edge Functions 구현
- `supabase/functions/oauth/authorize.ts`
- `supabase/functions/oauth/token.ts`
- `supabase/functions/oauth/revoke.ts`
- `supabase/functions/mcp-auth/sso-login.ts`
- `supabase/functions/mcp-auth/sso-callback.ts`

### 2. React 훅 구현
- `useOAuth` - OAuth 2.0 플로우
- `useMinuSSO` - SSO 로그인/로그아웃
- `useFeatureUsage` - 사용량 추적
- `useFeatureAvailability` - 기능 사용 가능 여부

### 3. Database 마이그레이션
- `oauth_clients` 테이블
- `authorization_codes` 테이블
- `plan_features` 테이블
- `subscription_usage` 테이블
- `usage_events` 테이블

### 4. UI 컴포넌트
- `OAuthLoginButton` - OAuth 로그인 버튼
- `MinuServiceCard` - Minu 서비스 카드
- `UsageMeter` - 사용량 미터
- `FeatureLimitBadge` - 제한 배지

---

## 🧪 테스트

**타입 검증**:
```bash
npm run build  # TypeScript 컴파일 성공 (26.57s)
```

**테스트 작성 예정**:
- `oauth.spec.ts` - OAuth 2.0 플로우 E2E
- `subscription-usage.spec.ts` - 사용량 추적
- `minu-integration.spec.ts` - SSO 및 웹훅

---

## 📚 참고 문서

- [RFC 6749: OAuth 2.0 Authorization Framework](https://datatracker.ietf.org/doc/html/rfc6749)
- [RFC 7636: PKCE for OAuth Public Clients](https://datatracker.ietf.org/doc/html/rfc7636)
- [RFC 7009: OAuth 2.0 Token Revocation](https://datatracker.ietf.org/doc/html/rfc7009)
- [Supabase Edge Functions 문서](https://supabase.com/docs/guides/functions)
- [JWT.io](https://jwt.io/) - JWT 디버거

---

## 📝 변경 이력

| 날짜 | 버전 | 변경 내용 |
|------|------|-----------|
| 2025-11-27 | 2.19.0 | 초기 타입 정의 완료 (3개 파일, 1517 lines) |

---

**작성자**: Claude Code Agent
**문서 경로**: `docs/guides/minu-integration-types-overview.md`

# ideaonaction.ai ↔ Minu 서비스 연동 가이드라인

> 생각과 행동(ideaonaction.ai) 플랫폼과 Minu 시리즈 서비스 연동을 위한 검토 및 확인사항

**문서 버전**: 1.0.0  
**작성일**: 2025-11-27  
**대상**: 개발팀, 인프라팀, 보안팀

---

## 1. 연동 개요

### 1.1 시스템 구조

```
┌─────────────────────────────────────────────────────────────────────┐
│                      ideaonaction.ai                                │
│                   (부모 플랫폼 - 통합 인증/구독)                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────────┐  │
│  │ Auth Server │  │ Billing API │  │ User Management             │  │
│  │ (OAuth 2.0) │  │ (구독/결제) │  │ (프로필/권한)                │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────────┬──────────────┘  │
└─────────┼────────────────┼────────────────────────┼─────────────────┘
          │                │                        │
          │    JWT/OAuth   │   API 호출             │   사용자 정보
          │                │                        │
    ┌─────┴────────────────┴────────────────────────┴─────┐
    │                                                      │
    ▼                    ▼                    ▼            ▼
┌────────┐         ┌────────┐          ┌────────┐    ┌────────┐
│ Find   │         │ Frame  │          │ Build  │    │ Keep   │
│ .minu  │         │ .minu  │          │ .minu  │    │ .minu  │
│ .best  │         │ .best  │          │ .best  │    │ .best  │
└────────┘         └────────┘          └────────┘    └────────┘
```

### 1.2 연동 범위

| 연동 항목 | 방향 | 설명 |
|----------|------|------|
| **인증 (Authentication)** | ideaonaction → Minu | OAuth 2.0 기반 SSO |
| **구독/결제 (Billing)** | ideaonaction → Minu | 구독 상태 확인, 플랜 정보 |
| **사용자 정보 (Profile)** | ideaonaction ↔ Minu | 프로필 동기화 |
| **권한 관리 (Authorization)** | ideaonaction → Minu | 서비스별 접근 권한 |

---

## 2. 인증 연동 (Authentication)

### 2.1 OAuth 2.0 플로우

#### 2.1.1 Authorization Code Flow (권장)

```
┌──────────┐                              ┌──────────────────┐
│  사용자  │                              │ ideaonaction.ai  │
│ (Browser)│                              │   Auth Server    │
└────┬─────┘                              └────────┬─────────┘
     │                                             │
     │  1. find.minu.best 접속                     │
     │ ─────────────────────────────────────────▶ │
     │                                             │
     │  2. 로그인 필요 → ideaonaction.ai 리다이렉트 │
     │ ◀───────────────────────────────────────── │
     │                                             │
     │  3. ideaonaction.ai/oauth/authorize         │
     │     ?client_id=minu-find                    │
     │     &redirect_uri=find.minu.best/callback   │
     │     &response_type=code                     │
     │     &scope=openid profile email subscription│
     │ ─────────────────────────────────────────▶ │
     │                                             │
     │  4. 사용자 로그인 & 동의                    │
     │ ◀───────────────────────────────────────── │
     │                                             │
     │  5. find.minu.best/callback?code=AUTH_CODE │
     │ ◀───────────────────────────────────────── │
     │                                             │
     │  6. 백엔드에서 code → token 교환            │
     │     POST /oauth/token                       │
     │ ─────────────────────────────────────────▶ │
     │                                             │
     │  7. Access Token + Refresh Token 반환       │
     │ ◀───────────────────────────────────────── │
     │                                             │
```

#### 2.1.2 검토 사항

| 항목 | 확인 내용 | 담당 | 상태 |
|------|----------|------|------|
| **Client 등록** | 각 Minu 서비스별 OAuth Client 등록 | ideaonaction 팀 | ✅ Find, Frame, Build, Keep × 3환경 = 12개 클라이언트 |
| **Redirect URI** | 허용된 콜백 URL 목록 등록 | ideaonaction 팀 | ✅ 환경별 redirect_uris 화이트리스트 구현 |
| **Scope 정의** | 필요한 scope 목록 정의 및 승인 | 양측 협의 | ✅ openid, profile, email, offline_access |
| **Token 유효기간** | Access Token / Refresh Token 만료 정책 | ideaonaction 팀 | ✅ Access: 1시간, Refresh: 30일 |
| **PKCE 지원** | 보안 강화를 위한 PKCE 적용 여부 | 양측 협의 | ✅ S256 방식 필수 적용 |

### 2.2 JWT 토큰 구조

#### 2.2.1 Access Token Payload (예상)

```json
{
  "iss": "https://ideaonaction.ai",
  "sub": "user_123456789",
  "aud": ["minu-find", "minu-frame", "minu-build", "minu-keep"],
  "exp": 1735689600,
  "iat": 1735686000,
  "scope": "openid profile email subscription",
  "email": "user@example.com",
  "name": "홍길동",
  "subscription": {
    "plan": "pro",
    "services": ["find", "frame"],
    "expires_at": "2026-12-31T23:59:59Z"
  }
}
```

#### 2.2.2 검토 사항

| 항목 | 확인 내용 | 담당 | 상태 |
|------|----------|------|------|
| **JWT 서명 알고리즘** | RS256 / ES256 권장 | ideaonaction 팀 | 🟡 HS256 구현됨 (향후 RS256 전환 권장) |
| **Public Key 배포** | JWKS 엔드포인트 제공 | ideaonaction 팀 | ⬜ HS256 사용으로 불필요 |
| **Claims 표준화** | 필수 claims 목록 합의 | 양측 협의 | ✅ sub, iss, aud, exp, iat, scope, subscription |
| **구독 정보 포함** | JWT에 구독 상태 포함 여부 | 양측 협의 | ✅ subscription 클레임에 포함 |

### 2.3 세션 관리

#### 2.3.1 검토 사항

| 항목 | 확인 내용 | 담당 | 상태 |
|------|----------|------|------|
| **세션 타임아웃** | 비활성 세션 만료 시간 | 양측 협의 | ⬜ |
| **동시 로그인** | 다중 기기 로그인 정책 | ideaonaction 팀 | ⬜ |
| **강제 로그아웃** | 전체 세션 무효화 API | ideaonaction 팀 | ⬜ |
| **Remember Me** | 장기 세션 유지 정책 | 양측 협의 | ⬜ |

---

## 3. 구독/결제 연동 (Billing)

### 3.1 구독 상태 확인 플로우

```
┌────────────┐         ┌────────────┐         ┌──────────────────┐
│ Minu Find  │         │ Minu API   │         │ ideaonaction.ai  │
│ Frontend   │         │ Backend    │         │ Billing API      │
└─────┬──────┘         └─────┬──────┘         └────────┬─────────┘
      │                      │                         │
      │ 1. 유료 기능 요청     │                         │
      │ ────────────────────▶│                         │
      │                      │                         │
      │                      │ 2. 구독 상태 확인        │
      │                      │ GET /api/subscriptions  │
      │                      │     /user/{user_id}     │
      │                      │ ───────────────────────▶│
      │                      │                         │
      │                      │ 3. 구독 정보 반환        │
      │                      │ ◀───────────────────────│
      │                      │                         │
      │ 4. 기능 제공/제한     │                         │
      │ ◀────────────────────│                         │
      │                      │                         │
```

### 3.2 API 엔드포인트 (예상)

#### 3.2.1 구독 상태 조회

```
GET /api/v1/subscriptions/user/{user_id}
Authorization: Bearer {service_api_key}

Response:
{
  "user_id": "user_123456789",
  "subscriptions": [
    {
      "service": "find",
      "plan": "pro",
      "status": "active",
      "started_at": "2025-01-01T00:00:00Z",
      "expires_at": "2026-01-01T00:00:00Z",
      "features": {
        "platforms": 6,
        "monthly_analyses": 300,
        "ai_analysis": true,
        "history_months": 6
      }
    }
  ],
  "billing": {
    "next_billing_date": "2026-01-01",
    "payment_method": "card_****1234"
  }
}
```

#### 3.2.2 검토 사항

| 항목 | 확인 내용 | 담당 | 상태 |
|------|----------|------|------|
| **API 인증 방식** | Service API Key / OAuth | ideaonaction 팀 | ⬜ |
| **Rate Limiting** | 호출 제한 정책 | ideaonaction 팀 | ⬜ |
| **캐싱 정책** | 구독 정보 캐싱 허용 시간 | 양측 협의 | ⬜ |
| **Webhook** | 구독 변경 이벤트 알림 | ideaonaction 팀 | ✅ HMAC-SHA256 서명 구현 완료 |
| **플랜 변경 처리** | 업/다운그레이드 시 처리 | 양측 협의 | ⬜ |

### 3.3 결제 리다이렉트

#### 3.3.1 검토 사항

| 항목 | 확인 내용 | 담당 | 상태 |
|------|----------|------|------|
| **결제 페이지 URL** | 정확한 URL 및 파라미터 | ideaonaction 팀 | ⬜ |
| **리턴 URL** | 결제 완료 후 복귀 URL 처리 | Minu 팀 | ⬜ |
| **취소 URL** | 결제 취소 시 복귀 URL | Minu 팀 | ⬜ |
| **딥링크** | 서비스+플랜 지정 결제 링크 | ideaonaction 팀 | ⬜ |

```
# 예상 결제 리다이렉트 URL 형식
https://ideaonaction.ai/billing
  ?service=find
  &plan=pro
  &period=yearly
  &return_url=https://find.minu.best/subscription/success
  &cancel_url=https://find.minu.best/pricing
```

---

## 4. 사용자 정보 연동 (Profile)

### 4.1 동기화 데이터

| 필드 | 방향 | 설명 | 필수 |
|------|------|------|------|
| `user_id` | ideaonaction → Minu | 고유 사용자 ID | ✅ |
| `email` | ideaonaction → Minu | 이메일 주소 | ✅ |
| `name` | ideaonaction → Minu | 표시 이름 | ✅ |
| `avatar_url` | ideaonaction → Minu | 프로필 이미지 | ⬜ |
| `locale` | ideaonaction → Minu | 언어/지역 설정 | ⬜ |
| `timezone` | ideaonaction → Minu | 시간대 | ⬜ |
| `company` | ideaonaction ↔ Minu | 소속 회사 | ⬜ |
| `job_title` | ideaonaction ↔ Minu | 직책 | ⬜ |

### 4.2 검토 사항

| 항목 | 확인 내용 | 담당 | 상태 |
|------|----------|------|------|
| **프로필 API** | 사용자 정보 조회 API | ideaonaction 팀 | ⬜ |
| **양방향 동기화** | Minu에서 변경한 정보 반영 | 양측 협의 | ⬜ |
| **프로필 변경 알림** | Webhook 또는 폴링 | ideaonaction 팀 | ⬜ |
| **계정 삭제 처리** | 연동 데이터 삭제 정책 | 양측 협의 | ⬜ |

---

## 5. 권한 관리 (Authorization)

### 5.1 권한 모델

```
┌─────────────────────────────────────────────────────────────────┐
│                        권한 계층 구조                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Organization (조직)                                            │
│  └── Team (팀)                                                  │
│      └── User (사용자)                                          │
│          └── Service Role (서비스별 역할)                        │
│                                                                 │
│  역할 예시:                                                      │
│  ┌─────────┬───────────────────────────────────────────┐        │
│  │ 역할    │ 권한                                      │        │
│  ├─────────┼───────────────────────────────────────────┤        │
│  │ owner   │ 모든 권한 + 팀 관리 + 결제               │        │
│  │ admin   │ 모든 기능 + 멤버 관리                    │        │
│  │ member  │ 구독 플랜 범위 내 기능                   │        │
│  │ viewer  │ 읽기 전용                                │        │
│  └─────────┴───────────────────────────────────────────┘        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 검토 사항

| 항목 | 확인 내용 | 담당 | 상태 |
|------|----------|------|------|
| **역할 정의** | 서비스별 역할 및 권한 매핑 | 양측 협의 | ⬜ |
| **팀 관리 API** | 팀 생성/멤버 초대 API | ideaonaction 팀 | ⬜ |
| **권한 체크 API** | 특정 기능 접근 권한 확인 | ideaonaction 팀 | ⬜ |
| **JWT 권한 포함** | 토큰에 역할 정보 포함 | 양측 협의 | ⬜ |

---

## 6. 기술적 요구사항

### 6.1 API 통신

| 항목 | 요구사항 | 비고 |
|------|----------|------|
| **프로토콜** | HTTPS only (TLS 1.2+) | 필수 |
| **포맷** | JSON (UTF-8) | 표준 |
| **인증** | Bearer Token / API Key | 용도별 구분 |
| **버전 관리** | URL Path versioning (/api/v1/) | 권장 |
| **에러 포맷** | RFC 7807 Problem Details | 권장 |

### 6.2 에러 응답 형식 (권장)

```json
{
  "type": "https://ideaonaction.ai/errors/subscription-expired",
  "title": "Subscription Expired",
  "status": 403,
  "detail": "Your Find Pro subscription expired on 2025-12-31",
  "instance": "/api/v1/find/analyses/123",
  "extensions": {
    "expired_at": "2025-12-31T23:59:59Z",
    "renewal_url": "https://ideaonaction.ai/billing?service=find"
  }
}
```

### 6.3 검토 사항

| 항목 | 확인 내용 | 담당 | 상태 |
|------|----------|------|------|
| **API 문서** | OpenAPI/Swagger 스펙 제공 | ideaonaction 팀 | ⬜ |
| **Sandbox 환경** | 테스트용 API 환경 | ideaonaction 팀 | ⬜ |
| **SDK 제공** | JavaScript/TypeScript SDK | ideaonaction 팀 | ⬜ |
| **Webhook 보안** | 서명 검증 방식 | ideaonaction 팀 | ✅ HMAC-SHA256 서명 구현 |

---

## 7. 보안 요구사항

### 7.1 체크리스트

| 항목 | 요구사항 | 담당 | 상태 |
|------|----------|------|------|
| **HTTPS 강제** | 모든 통신 TLS 암호화 | 양측 | ✅ Production 환경 HTTPS 적용 |
| **CORS 설정** | 허용 Origin 목록 관리 | 양측 | ✅ 동적 Origin 검증 구현 (*.minu.best) |
| **CSP 헤더** | Content-Security-Policy 적용 | Minu 팀 | ⬜ |
| **Token 저장** | HttpOnly Cookie 권장 | Minu 팀 | ⬜ |
| **API Key 관리** | 환경 변수, Vault 사용 | 양측 | ✅ Supabase Secrets 사용 |
| **Rate Limiting** | 무차별 대입 공격 방지 | ideaonaction 팀 | 🟡 Edge Function 레벨 구현 필요 |
| **Audit Log** | 인증/권한 변경 로깅 | 양측 | ⬜ |

### 7.2 CORS 허용 도메인

```
# ideaonaction.ai에서 허용해야 할 도메인
- https://minu.best
- https://find.minu.best
- https://frame.minu.best
- https://build.minu.best
- https://keep.minu.best
- https://*.vercel.app (개발 환경)
- http://localhost:3000 (로컬 개발)
```

### 7.3 Webhook 보안

```
# Webhook 요청 검증 (예시)
X-Webhook-Signature: sha256=xxxxxxxxxxxxxxxx
X-Webhook-Timestamp: 1735689600

# 서명 생성 방식
signature = HMAC-SHA256(
  secret_key,
  timestamp + "." + request_body
)
```

---

## 8. 테스트 환경

### 8.1 환경 구성

| 환경 | ideaonaction URL | Minu URL | 용도 |
|------|-----------------|----------|------|
| **Local** | localhost:8080 | localhost:3000 | 로컬 개발 |
| **Development** | dev.ideaonaction.ai | dev.minu.best | 개발 테스트 |
| **Staging** | staging.ideaonaction.ai | canary.minu.best | 통합 테스트 |
| **Production** | ideaonaction.ai | *.minu.best | 프로덕션 |

### 8.2 테스트 계정

| 용도 | 이메일 | 구독 상태 | 비고 |
|------|--------|----------|------|
| 무료 사용자 | test-free@example.com | 없음 | 기본 기능 테스트 |
| Basic 구독자 | test-basic@example.com | Find Basic | 제한 기능 테스트 |
| Pro 구독자 | test-pro@example.com | Find Pro | 전체 기능 테스트 |
| 만료 구독자 | test-expired@example.com | 만료됨 | 만료 처리 테스트 |
| 팀 관리자 | test-admin@example.com | Enterprise | 팀 기능 테스트 |

### 8.3 검토 사항

| 항목 | 확인 내용 | 담당 | 상태 |
|------|----------|------|------|
| **테스트 환경 제공** | 독립된 테스트 인프라 | ideaonaction 팀 | ⬜ |
| **테스트 데이터** | 시드 데이터 제공 | ideaonaction 팀 | ⬜ |
| **환경 리셋** | 테스트 데이터 초기화 API | ideaonaction 팀 | ⬜ |
| **Mock 서버** | 로컬 개발용 Mock | Minu 팀 | ⬜ |

---

## 9. 모니터링 및 운영

### 9.1 헬스체크

```
# ideaonaction.ai 헬스체크 엔드포인트 (예상)
GET /api/health
Response: { "status": "healthy", "version": "1.0.0" }

# 각 Minu 서비스에서 주기적 호출
- 간격: 30초
- 타임아웃: 5초
- 실패 임계값: 3회 연속
```

### 9.2 알림 설정

| 이벤트 | 알림 채널 | 담당 |
|--------|----------|------|
| Auth API 장애 | Slack, PagerDuty | 양측 |
| Billing API 장애 | Slack, PagerDuty | 양측 |
| 높은 에러율 (>5%) | Slack | 양측 |
| 토큰 갱신 실패 급증 | Slack | Minu 팀 |
| Webhook 전달 실패 | Email | ideaonaction 팀 |

### 9.3 검토 사항

| 항목 | 확인 내용 | 담당 | 상태 |
|------|----------|------|------|
| **상태 페이지** | 서비스 상태 공개 페이지 | ideaonaction 팀 | ⬜ |
| **인시던트 프로세스** | 장애 대응 프로세스 합의 | 양측 협의 | ⬜ |
| **연락처 교환** | 긴급 연락처 공유 | 양측 | ⬜ |
| **SLA 정의** | 가용성 목표 합의 | 양측 협의 | ⬜ |

---

## 10. 마이그레이션 및 롤아웃

### 10.1 단계별 롤아웃 계획

```
┌─────────────────────────────────────────────────────────────────┐
│                      롤아웃 단계                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Phase 1: 개발 환경 연동 (Week 1-2)                              │
│  ├── OAuth 클라이언트 설정                                       │
│  ├── 기본 인증 플로우 구현                                       │
│  └── 로컬 테스트 완료                                           │
│                                                                 │
│  Phase 2: 스테이징 테스트 (Week 3-4)                             │
│  ├── 전체 플로우 E2E 테스트                                      │
│  ├── 에러 케이스 테스트                                         │
│  └── 성능 테스트                                                │
│                                                                 │
│  Phase 3: Canary 배포 (Week 5)                                  │
│  ├── 내부 사용자 대상 테스트                                     │
│  ├── 모니터링 설정                                              │
│  └── 롤백 절차 확인                                             │
│                                                                 │
│  Phase 4: 점진적 롤아웃 (Week 6-8)                               │
│  ├── 10% → 25% → 50% → 100%                                    │
│  ├── 각 단계별 안정성 확인                                       │
│  └── 문제 발생 시 즉시 롤백                                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 10.2 롤백 계획

| 시나리오 | 조치 | 소요 시간 |
|----------|------|----------|
| 인증 장애 | 이전 인증 방식으로 전환 | < 5분 |
| 구독 확인 장애 | 캐시된 구독 정보 사용 | 즉시 |
| 전체 연동 장애 | 독립 운영 모드 전환 | < 15분 |

---

## 11. 체크리스트 요약

### 11.1 사전 준비 (ideaonaction.ai 측)

- [x] OAuth 2.0 클라이언트 등록 (Find, Frame, Build, Keep)
  - ✅ Local, Dev, Staging 환경별 클라이언트 생성 완료
  - 마이그레이션: `20251128000001_seed_oauth_clients_multi_env.sql`
- [ ] JWKS 엔드포인트 제공
  - ⚠️ HS256 사용으로 불필요 (대칭키 방식)
  - 향후 RS256 전환 시 필요
- [ ] API 문서 (OpenAPI/Swagger) 제공
- [x] 테스트 환경 및 계정 제공
  - ✅ Free, Basic, Pro, Expired, Enterprise 플랜 테스트 계정 생성
  - 마이그레이션: `20251128000002_seed_minu_test_accounts.sql`
- [x] Webhook 설정 및 문서화
  - ✅ HMAC-SHA256 서명 검증 구현
  - Edge Function: `webhook-send/index.ts`
- [x] CORS 허용 도메인 등록
  - ✅ Minu 도메인 (*.minu.best) 허용 설정 완료
  - 공유 모듈: `supabase/functions/_shared/cors.ts`
- [ ] Rate Limit 정책 공유
- [ ] 상태 페이지 URL 공유

### 11.2 사전 준비 (Minu 측)

- [ ] OAuth 콜백 핸들러 구현
- [ ] JWT 검증 로직 구현
- [ ] 토큰 갱신 로직 구현
- [ ] 구독 상태 확인 로직 구현
- [ ] 에러 핸들링 및 사용자 안내
- [ ] 로컬 개발용 Mock 서버
- [ ] 모니터링 설정
- [ ] 롤백 절차 문서화

### 11.3 양측 협의 필요

- [ ] JWT Claims 표준화
- [ ] 구독 정보 캐싱 정책
- [ ] 역할 및 권한 매핑
- [ ] 인시던트 대응 프로세스
- [ ] SLA 목표 합의
- [ ] 개인정보 처리 정책

---

## 12. 연락처 및 지원

### 12.1 기술 연락처

| 역할 | 담당 | 연락처 | 비고 |
|------|------|--------|------|
| ideaonaction 기술 리드 | TBD | TBD | API 관련 |
| ideaonaction 인프라 | TBD | TBD | 인프라/보안 |
| Minu 기술 리드 | TBD | TBD | 연동 구현 |
| Minu 프론트엔드 | TBD | TBD | UI/UX |

### 12.2 커뮤니케이션 채널

| 용도 | 채널 | 비고 |
|------|------|------|
| 일상 커뮤니케이션 | Slack #minu-integration | 빠른 질문 |
| 기술 논의 | GitHub Issues | 기술적 결정 |
| 긴급 연락 | 전화 | 장애 상황 |
| 정기 미팅 | 주간 싱크 | 진행 상황 공유 |

---

## 변경 이력

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|----------|
| 1.0.0 | 2025-11-27 | - | 초안 작성 |

---

## 참고 자료

- [OAuth 2.0 RFC 6749](https://tools.ietf.org/html/rfc6749)
- [JWT RFC 7519](https://tools.ietf.org/html/rfc7519)
- [RFC 7807 Problem Details](https://tools.ietf.org/html/rfc7807)
- [OpenID Connect](https://openid.net/connect/)

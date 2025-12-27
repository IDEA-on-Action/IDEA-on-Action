# User API Edge Function

사용자 정보 및 구독 정보 조회 REST API

## 엔드포인트

### GET /api/user/me

현재 로그인한 사용자의 프로필 및 구독 정보를 반환합니다.

**요청 헤더:**
```
Authorization: Bearer <ACCESS_TOKEN>
```

**응답 예시 (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "full_name": "홍길동",
  "avatar_url": "https://example.com/avatar.jpg",
  "created_at": "2025-01-01T00:00:00Z",
  "subscription": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "service_id": "770e8400-e29b-41d4-a716-446655440002",
    "service_name": "Minu Find",
    "plan_id": "880e8400-e29b-41d4-a716-446655440003",
    "plan_name": "Pro",
    "billing_cycle": "monthly",
    "price": 49000,
    "status": "active",
    "trial_end_date": null,
    "current_period_start": "2025-01-01T00:00:00Z",
    "current_period_end": "2025-02-01T00:00:00Z",
    "next_billing_date": "2025-02-01T00:00:00Z",
    "cancel_at_period_end": false,
    "created_at": "2025-01-01T00:00:00Z"
  }
}
```

---

### GET /api/user/subscription

현재 사용자의 구독 상세 정보 (결제 히스토리, 플랜 기능 목록 포함)

**요청 헤더:**
```
Authorization: Bearer <ACCESS_TOKEN>
```

**응답 예시 (200 OK):**
```json
{
  "subscription": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "service_id": "770e8400-e29b-41d4-a716-446655440002",
    "service_name": "Minu Find",
    "plan_id": "880e8400-e29b-41d4-a716-446655440003",
    "plan_name": "Pro",
    "billing_cycle": "monthly",
    "price": 49000,
    "status": "active",
    "trial_end_date": null,
    "current_period_start": "2025-01-01T00:00:00Z",
    "current_period_end": "2025-02-01T00:00:00Z",
    "next_billing_date": "2025-02-01T00:00:00Z",
    "cancel_at_period_end": false,
    "created_at": "2025-01-01T00:00:00Z"
  },
  "usage": {
    "total_payments": 5,
    "last_payment_date": "2025-01-01T00:00:00Z",
    "total_amount_paid": 245000
  },
  "features": [
    "시장 조사 검색 (무제한)",
    "경쟁사 분석 (무제한)",
    "트렌드 리포트 생성 (무제한)",
    "Excel 내보내기 (고급)"
  ],
  "next_payment": {
    "amount": 49000,
    "date": "2025-02-01T00:00:00Z"
  }
}
```

---

## 에러 응답

**401 Unauthorized:**
```json
{
  "error": {
    "code": "unauthorized",
    "message": "Authorization 헤더가 필요합니다.",
    "request_id": "req_abc123",
    "timestamp": "2025-01-01T00:00:00Z"
  }
}
```

**404 Not Found:**
```json
{
  "error": {
    "code": "not_found",
    "message": "활성 구독이 없습니다.",
    "request_id": "req_abc123",
    "timestamp": "2025-01-01T00:00:00Z"
  }
}
```

**429 Too Many Requests:**
```json
{
  "error": {
    "code": "rate_limit_exceeded",
    "message": "요청 한도를 초과했습니다. 45초 후 다시 시도하세요.",
    "request_id": "req_abc123",
    "timestamp": "2025-01-01T00:00:00Z"
  }
}
```

헤더:
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1735689600
Retry-After: 45
```

---

## Rate Limiting

- **제한**: 분당 60회
- **윈도우**: 60초 (고정 윈도우)
- **사용자별**: IP 또는 User ID 기준

---

## 로컬 테스트

```bash
# 서버 실행
supabase functions serve user-api --env-file supabase/.env.local

# GET /api/user/me 테스트
curl -X GET "http://localhost:54321/functions/v1/user-api/me" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# GET /api/user/subscription 테스트
curl -X GET "http://localhost:54321/functions/v1/user-api/subscription" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## 프로덕션 배포

```bash
# 배포
supabase functions deploy user-api

# 로그 확인
supabase functions logs user-api
```

---

## 환경 변수

- `SUPABASE_URL`: Supabase 프로젝트 URL
- `SUPABASE_ANON_KEY`: Supabase Anon Key (클라이언트 인증용)

---

## 의존성

- Deno 런타임
- `@supabase/supabase-js@2`

---

## 보안

- ✅ JWT 토큰 검증 (Supabase Auth)
- ✅ Rate Limiting (분당 60회)
- ✅ RLS (Row Level Security) 적용
- ✅ CORS 헤더 설정

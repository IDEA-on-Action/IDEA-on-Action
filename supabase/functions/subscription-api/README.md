# Subscription API Edge Function

구독 기능 제한 및 사용량 관리 REST API

## 엔드포인트

### GET /api/subscription/features

플랜의 기능 목록 및 제한 정보를 조회합니다.

**쿼리 파라미터:**
- `plan_id` (required): 플랜 ID

**요청 헤더:**
```
Authorization: Bearer <ACCESS_TOKEN>
```

**응답 예시 (200 OK):**
```json
{
  "plan_id": "880e8400-e29b-41d4-a716-446655440003",
  "plan_name": "Pro",
  "billing_cycle": "monthly",
  "features": [
    {
      "icon": "Search",
      "text": "시장 조사 검색",
      "limit": null
    },
    {
      "icon": "TrendingUp",
      "text": "경쟁사 분석",
      "limit": null
    },
    {
      "icon": "FileText",
      "text": "트렌드 리포트 생성",
      "limit": 50
    }
  ]
}
```

---

### GET /api/subscription/usage

현재 구독의 기능별 사용량을 조회합니다.

**요청 헤더:**
```
Authorization: Bearer <ACCESS_TOKEN>
```

**응답 예시 (200 OK):**
```json
{
  "subscription_id": "660e8400-e29b-41d4-a716-446655440001",
  "plan_name": "Pro",
  "billing_cycle": "monthly",
  "current_period_start": "2025-01-01T00:00:00Z",
  "current_period_end": "2025-02-01T00:00:00Z",
  "features": [
    {
      "feature_key": "find_market_search",
      "used_count": 32,
      "limit": 50,
      "remaining": 18,
      "period_start": "2025-01-01",
      "period_end": "2025-01-31"
    },
    {
      "feature_key": "find_competitor_analysis",
      "used_count": 15,
      "limit": -1,
      "remaining": -1,
      "period_start": "2025-01-01",
      "period_end": "2025-01-31"
    }
  ]
}
```

**참고**: `limit`과 `remaining`이 `-1`이면 무제한을 의미합니다.

---

### POST /api/subscription/usage/increment

기능 사용량을 1 증가시킵니다. 제한 초과 시 에러를 반환합니다.

**요청 헤더:**
```
Authorization: Bearer <ACCESS_TOKEN>
Content-Type: application/json
```

**요청 본문:**
```json
{
  "feature_key": "find_market_search"
}
```

**응답 예시 (200 OK):**
```json
{
  "success": true,
  "feature_key": "find_market_search",
  "used_count": 33,
  "remaining": 17
}
```

**에러 응답 (403 Forbidden):**
```json
{
  "error": {
    "code": "limit_exceeded",
    "message": "기능 사용 제한을 초과했습니다.",
    "request_id": "req_abc123",
    "timestamp": "2025-01-01T00:00:00Z"
  }
}
```

---

### GET /api/subscription/can-access

기능 사용 가능 여부를 확인합니다 (사용량 증가 없이 체크만).

**쿼리 파라미터:**
- `feature_key` (required): 기능 식별자

**요청 헤더:**
```
Authorization: Bearer <ACCESS_TOKEN>
```

**응답 예시 (200 OK):**
```json
{
  "can_access": true,
  "feature_key": "find_market_search",
  "used_count": 33,
  "limit": 50,
  "remaining": 17
}
```

**사용 불가 응답:**
```json
{
  "can_access": false,
  "feature_key": "find_market_search",
  "used_count": 50,
  "limit": 50,
  "remaining": 0
}
```

---

## 기능 키 (Feature Keys)

### Minu Find (사업기회 탐색)
- `find_market_search` - 시장 조사 검색
- `find_competitor_analysis` - 경쟁사 분석
- `find_trend_report` - 트렌드 리포트 생성
- `find_export_excel` - Excel 내보내기

### Minu Frame (문제정의 & RFP)
- `frame_document_generate` - 문서 생성
- `frame_rfp_template` - RFP 템플릿
- `frame_requirement_analysis` - 요구사항 분석
- `frame_export_docx` - DOCX 내보내기

### Minu Build (프로젝트 진행)
- `build_project_create` - 프로젝트 생성
- `build_task_limit` - 작업 개수 제한
- `build_sprint_planning` - 스프린트 계획
- `build_report_generate` - 프로젝트 리포트

### Minu Keep (운영/유지보수)
- `keep_monitoring_service` - 모니터링 서비스
- `keep_alert_limit` - 알림 개수 제한
- `keep_sla_tracking` - SLA 추적
- `keep_operations_report` - 운영 보고서

---

## 에러 응답

**400 Bad Request:**
```json
{
  "error": {
    "code": "missing_parameter",
    "message": "feature_key 쿼리 파라미터가 필요합니다.",
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
    "message": "요청 한도를 초과했습니다.",
    "request_id": "req_abc123",
    "timestamp": "2025-01-01T00:00:00Z"
  }
}
```

---

## Rate Limiting

- **제한**: 분당 60회
- **윈도우**: 60초 (고정 윈도우)
- **사용자별**: User ID 기준

---

## 로컬 테스트

```bash
# 서버 실행
supabase functions serve subscription-api --env-file supabase/.env.local

# GET /api/subscription/features
curl -X GET "http://localhost:54321/functions/v1/subscription-api/features?plan_id=PLAN_ID" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# GET /api/subscription/usage
curl -X GET "http://localhost:54321/functions/v1/subscription-api/usage" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# POST /api/subscription/usage/increment
curl -X POST "http://localhost:54321/functions/v1/subscription-api/usage/increment" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"feature_key": "find_market_search"}'

# GET /api/subscription/can-access
curl -X GET "http://localhost:54321/functions/v1/subscription-api/can-access?feature_key=find_market_search" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## 프로덕션 배포

```bash
# 배포
supabase functions deploy subscription-api

# 로그 확인
supabase functions logs subscription-api
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

## 데이터베이스 함수

이 API는 다음 Postgres 함수를 사용합니다:

- `get_current_usage(p_subscription_id, p_feature_key)` - 현재 기간 사용량 조회
- `increment_subscription_usage(p_subscription_id, p_feature_key, p_increment)` - 사용량 증가 (원자적)
- `check_feature_limit(p_subscription_id, p_feature_key)` - 기능 제한 체크

---

## 보안

- ✅ JWT 토큰 검증 (Supabase Auth)
- ✅ Rate Limiting (분당 60회)
- ✅ RLS (Row Level Security) 적용
- ✅ 원자적 사용량 증가 (Race Condition 방지)
- ✅ CORS 헤더 설정

# Webhook Send Edge Function

HMAC-SHA256 서명과 함께 타겟 URL로 웹훅 이벤트를 전송하는 내부 전용 API

## 엔드포인트

### POST /webhooks/send

웹훅 이벤트를 여러 타겟 URL로 전송합니다.

**보안**: 이 엔드포인트는 **내부 전용**입니다. `service_role` 키로만 접근 가능합니다.

**요청 헤더:**
```
Authorization: Bearer <SERVICE_ROLE_KEY>
Content-Type: application/json
```

**요청 본문:**
```json
{
  "event_type": "subscription.created",
  "payload": {
    "subscription_id": "660e8400-e29b-41d4-a716-446655440001",
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "plan_name": "Pro",
    "status": "active",
    "timestamp": "2025-01-01T00:00:00Z"
  },
  "target_urls": [
    "https://webhook.site/unique-id",
    "https://api.example.com/webhooks/subscription"
  ],
  "webhook_secret": "optional_custom_secret"
}
```

**필드 설명:**
- `event_type`: 이벤트 타입 (예: `subscription.created`, `payment.succeeded`)
- `payload`: 전송할 JSON 데이터
- `target_urls`: 웹훅을 받을 URL 목록 (배열)
- `webhook_secret`: (선택) 커스텀 HMAC 시크릿 (없으면 `WEBHOOK_SECRET` 환경 변수 사용)

**응답 예시 (200 OK):**
```json
{
  "success": true,
  "sent_count": 2,
  "failed_count": 0,
  "results": [
    {
      "target_url": "https://webhook.site/unique-id",
      "success": true,
      "status_code": 200,
      "retry_count": 0
    },
    {
      "target_url": "https://api.example.com/webhooks/subscription",
      "success": true,
      "status_code": 200,
      "retry_count": 0
    }
  ]
}
```

**부분 실패 응답 (200 OK):**
```json
{
  "success": false,
  "sent_count": 1,
  "failed_count": 1,
  "results": [
    {
      "target_url": "https://webhook.site/unique-id",
      "success": true,
      "status_code": 200,
      "retry_count": 0
    },
    {
      "target_url": "https://api.example.com/webhooks/subscription",
      "success": false,
      "status_code": 500,
      "error": "HTTP 500: Server error",
      "retry_count": 3
    }
  ]
}
```

---

## 웹훅 수신 측 구현 가이드

### 1. HMAC-SHA256 서명 검증

수신 측에서는 `X-Signature` 헤더를 검증해야 합니다.

**헤더:**
- `X-Signature`: HMAC-SHA256 서명 (`sha256=<hex>` 형식)
- `X-Event-Type`: 이벤트 타입
- `X-Request-Id`: 요청 ID (디버깅용)
- `User-Agent`: `IdeaOnAction-Webhook/1.0`

**검증 예시 (Node.js):**
```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const expectedSignature = 'sha256=' + hmac.digest('hex');

  // Timing-safe 비교
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// Express 예시
app.post('/webhooks/subscription', (req, res) => {
  const signature = req.headers['x-signature'];
  const payload = JSON.stringify(req.body);

  if (!verifyWebhookSignature(payload, signature, process.env.WEBHOOK_SECRET)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // 웹훅 처리
  const eventType = req.headers['x-event-type'];
  console.log('Received webhook:', eventType, req.body);

  res.status(200).json({ received: true });
});
```

**검증 예시 (Python FastAPI):**
```python
import hmac
import hashlib
from fastapi import FastAPI, Request, HTTPException

app = FastAPI()

def verify_webhook_signature(payload: str, signature: str, secret: str) -> bool:
    expected_signature = 'sha256=' + hmac.new(
        secret.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(signature, expected_signature)

@app.post("/webhooks/subscription")
async def receive_webhook(request: Request):
    signature = request.headers.get('x-signature')
    payload = await request.body()

    if not verify_webhook_signature(payload.decode(), signature, WEBHOOK_SECRET):
        raise HTTPException(status_code=401, detail="Invalid signature")

    # 웹훅 처리
    event_type = request.headers.get('x-event-type')
    data = await request.json()
    print(f"Received webhook: {event_type}", data)

    return {"received": True}
```

### 2. 재시도 처리

- **최대 재시도**: 3회
- **재시도 간격**: 1초, 2초, 3초 (지수 백오프)
- **타임아웃**: 10초
- **재시도 조건**:
  - 5xx 서버 에러
  - 네트워크 타임아웃
  - 연결 실패
- **재시도 안 함**:
  - 4xx 클라이언트 에러 (잘못된 요청)

### 3. Dead Letter Queue

실패한 웹훅은 `dead_letter_queue` 테이블에 기록됩니다.

**스키마:**
```sql
CREATE TABLE dead_letter_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  target_url TEXT NOT NULL,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  request_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
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

**403 Forbidden:**
```json
{
  "error": {
    "code": "forbidden",
    "message": "이 엔드포인트는 내부 전용입니다.",
    "request_id": "req_abc123",
    "timestamp": "2025-01-01T00:00:00Z"
  }
}
```

**400 Bad Request:**
```json
{
  "error": {
    "code": "invalid_url",
    "message": "유효하지 않은 URL: https://invalid",
    "request_id": "req_abc123",
    "timestamp": "2025-01-01T00:00:00Z"
  }
}
```

---

## 이벤트 타입

### 구독 이벤트
- `subscription.created` - 구독 생성
- `subscription.updated` - 구독 업데이트
- `subscription.cancelled` - 구독 취소
- `subscription.expired` - 구독 만료
- `subscription.renewed` - 구독 갱신

### 결제 이벤트
- `payment.succeeded` - 결제 성공
- `payment.failed` - 결제 실패
- `payment.refunded` - 환불 처리

### 사용량 이벤트
- `usage.limit_exceeded` - 사용량 제한 초과
- `usage.limit_warning` - 사용량 80% 경고

---

## 로컬 테스트

```bash
# 서버 실행
supabase functions serve webhook-send --env-file supabase/.env.local

# 웹훅 전송 테스트
curl -X POST "http://localhost:54321/functions/v1/webhook-send" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "subscription.created",
    "payload": {
      "subscription_id": "660e8400-e29b-41d4-a716-446655440001",
      "user_id": "550e8400-e29b-41d4-a716-446655440000",
      "plan_name": "Pro",
      "status": "active"
    },
    "target_urls": ["https://webhook.site/your-unique-id"]
  }'
```

**웹훅 수신 테스트:**
1. https://webhook.site 에서 무료 테스트 URL 생성
2. 생성된 URL을 `target_urls`에 추가
3. 웹훅 전송 후 webhook.site에서 수신 확인
4. `X-Signature` 헤더 검증

---

## 프로덕션 배포

```bash
# 배포
supabase functions deploy webhook-send

# Secret 설정
supabase secrets set WEBHOOK_SECRET=your_secret_key

# 로그 확인
supabase functions logs webhook-send
```

---

## 환경 변수

- `SUPABASE_URL`: Supabase 프로젝트 URL
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase Service Role Key (내부 전용)
- `WEBHOOK_SECRET`: HMAC 서명 시크릿 (기본값)

---

## 의존성

- Deno 런타임
- `@supabase/supabase-js@2`

---

## 보안

- ✅ Service Role Key 검증 (내부 전용)
- ✅ HMAC-SHA256 서명 (메시지 무결성)
- ✅ 타임아웃 설정 (10초)
- ✅ 재시도 제한 (최대 3회)
- ✅ Dead Letter Queue (실패 기록)
- ✅ URL 유효성 검증
- ✅ CORS 헤더 설정

---

## 주의사항

⚠️ **이 엔드포인트는 내부 전용입니다.** 클라이언트 애플리케이션에서 직접 호출하지 마세요.

⚠️ **Service Role Key는 절대 클라이언트에 노출하지 마세요.**

⚠️ **웹훅 수신 측에서 반드시 HMAC 서명을 검증하세요.**

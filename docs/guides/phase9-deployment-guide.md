# Phase 9 배포 가이드

> 토스페이먼츠 결제 시스템 및 Edge Functions 배포 가이드

**작성일**: 2025-11-28
**대상**: Phase 9 전자상거래 기능 배포

---

## 목차

1. [사전 준비](#1-사전-준비)
2. [Supabase Staging 마이그레이션](#2-supabase-staging-마이그레이션)
3. [Edge Functions 배포](#3-edge-functions-배포)
4. [환경 변수 설정](#4-환경-변수-설정)
5. [검증 및 테스트](#5-검증-및-테스트)
6. [트러블슈팅](#6-트러블슈팅)

---

## 1. 사전 준비

### 1.1 필수 도구 설치

```bash
# Supabase CLI 설치 (npm)
npm install -g supabase

# 또는 Windows (Scoop)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# 버전 확인
supabase --version
```

### 1.2 Supabase 로그인

```bash
# Supabase 로그인
supabase login

# 프로젝트 연결 (Staging)
cd d:\GitHub\idea-on-action
supabase link --project-ref <STAGING_PROJECT_REF>
```

**프로젝트 Reference 찾기**:
1. [Supabase Dashboard](https://supabase.com/dashboard) 접속
2. 프로젝트 선택 → Settings → General
3. `Reference ID` 복사

### 1.3 토스페이먼츠 계정 준비

1. [토스페이먼츠 개발자센터](https://developers.tosspayments.com/) 접속
2. 테스트 상점 생성 또는 기존 상점 사용
3. API 키 확인:
   - **Client Key**: `test_ck_...` (프론트엔드용)
   - **Secret Key**: `test_sk_...` (서버용, 절대 노출 금지!)

---

## 2. Supabase Staging 마이그레이션

### 2.1 마이그레이션 파일 확인

```bash
# 새로 추가된 마이그레이션 파일 목록
ls supabase/migrations/ | grep 20251128
```

**새 마이그레이션 파일**:
- `20251128200001_create_beta_invitations.sql` - Beta 초대 시스템
- `20251128200002_create_webhook_events.sql` - 웹훅 이벤트 기록

### 2.2 마이그레이션 적용

```bash
# Staging 환경에 마이그레이션 적용
supabase db push

# 또는 특정 환경 지정
supabase db push --linked
```

### 2.3 마이그레이션 확인

```bash
# 적용된 마이그레이션 목록 확인
supabase migration list
```

**Supabase Dashboard에서 확인**:
1. Dashboard → Database → Tables
2. 다음 테이블 존재 확인:
   - `beta_invitations`
   - `beta_invitation_uses`
   - `webhook_events`

### 2.4 RLS 정책 확인

```sql
-- Supabase SQL Editor에서 실행
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename IN ('beta_invitations', 'webhook_events');
```

---

## 3. Edge Functions 배포

### 3.1 Edge Functions 파일 구조

```
supabase/functions/
├── _shared/
│   ├── cors.ts          # CORS 헤더 공통 모듈
│   └── response.ts      # 표준 응답 형식
├── toss-payment/
│   └── index.ts         # 토스페이먼츠 결제 API
└── payment-webhook/
    └── index.ts         # 웹훅 핸들러
```

### 3.2 환경 변수 설정 (Edge Functions용)

```bash
# 토스페이먼츠 Secret Key 설정
supabase secrets set TOSS_SECRET_KEY=test_sk_xxxxxxxxxxxxxxxx

# 웹훅 Secret 설정 (토스페이먼츠 대시보드에서 발급)
supabase secrets set TOSS_WEBHOOK_SECRET=your_webhook_secret

# 설정된 secrets 확인
supabase secrets list
```

### 3.3 Edge Functions 배포

```bash
# 개별 함수 배포
supabase functions deploy toss-payment
supabase functions deploy payment-webhook

# 또는 모든 함수 한 번에 배포
supabase functions deploy
```

### 3.4 배포 확인

```bash
# 배포된 함수 목록
supabase functions list
```

**Edge Functions URL 형식**:
```
https://<PROJECT_REF>.supabase.co/functions/v1/toss-payment
https://<PROJECT_REF>.supabase.co/functions/v1/payment-webhook
```

### 3.5 웹훅 URL 등록 (토스페이먼츠)

1. [토스페이먼츠 개발자센터](https://developers.tosspayments.com/) 접속
2. 상점 관리 → 웹훅 설정
3. 웹훅 URL 등록:
   ```
   https://<PROJECT_REF>.supabase.co/functions/v1/payment-webhook
   ```
4. 이벤트 선택:
   - `PAYMENT_STATUS_CHANGED` ✅
   - `DEPOSIT_CALLBACK` ✅ (가상계좌 사용 시)
   - `VIRTUAL_ACCOUNT_ISSUED` ✅ (가상계좌 사용 시)

---

## 4. 환경 변수 설정

### 4.1 로컬 개발 환경 (.env.local)

```bash
# 프론트엔드 환경 변수 (Vite)
VITE_SUPABASE_URL=https://zykjdneewbzyazfukzyg.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_TOSS_CLIENT_KEY=test_ck_xxxxxxxxxxxxxxxx
```

### 4.2 Vercel 환경 변수

**Vercel Dashboard에서 설정**:
1. [Vercel Dashboard](https://vercel.com) → 프로젝트 선택
2. Settings → Environment Variables
3. 다음 변수 추가:

| 변수명 | 환경 | 설명 |
|--------|------|------|
| `VITE_SUPABASE_URL` | All | Supabase 프로젝트 URL |
| `VITE_SUPABASE_ANON_KEY` | All | Supabase Anonymous Key |
| `VITE_TOSS_CLIENT_KEY` | Preview | 테스트 Client Key (`test_ck_...`) |
| `VITE_TOSS_CLIENT_KEY` | Production | 실제 Client Key (`live_ck_...`) |

**CLI로 설정** (선택):
```bash
# Vercel CLI 설치
npm i -g vercel

# 환경 변수 설정
vercel env add VITE_TOSS_CLIENT_KEY
```

### 4.3 Supabase Edge Functions 환경 변수

```bash
# Staging 환경
supabase secrets set TOSS_SECRET_KEY=test_sk_xxxxxxxxxxxxxxxx
supabase secrets set TOSS_WEBHOOK_SECRET=test_webhook_secret

# Production 환경 (프로젝트 전환 후)
supabase link --project-ref <PRODUCTION_PROJECT_REF>
supabase secrets set TOSS_SECRET_KEY=live_sk_xxxxxxxxxxxxxxxx
supabase secrets set TOSS_WEBHOOK_SECRET=live_webhook_secret
```

### 4.4 환경 변수 체크리스트

| 환경 | 변수 | 위치 | 상태 |
|------|------|------|------|
| 프론트엔드 | `VITE_SUPABASE_URL` | Vercel | ✅ |
| 프론트엔드 | `VITE_SUPABASE_ANON_KEY` | Vercel | ✅ |
| 프론트엔드 | `VITE_TOSS_CLIENT_KEY` | Vercel | ⬜ |
| Edge Function | `TOSS_SECRET_KEY` | Supabase Secrets | ⬜ |
| Edge Function | `TOSS_WEBHOOK_SECRET` | Supabase Secrets | ⬜ |

---

## 5. 검증 및 테스트

### 5.1 Edge Function 테스트

```bash
# toss-payment 함수 테스트 (인증 필요)
curl -X POST \
  'https://<PROJECT_REF>.supabase.co/functions/v1/toss-payment' \
  -H 'Authorization: Bearer <USER_ACCESS_TOKEN>' \
  -H 'Content-Type: application/json' \
  -d '{
    "action": "ready",
    "orderId": "test-order-123",
    "amount": 10000,
    "orderName": "테스트 상품"
  }'
```

### 5.2 웹훅 테스트

```bash
# payment-webhook 테스트 (시그니처 검증 필요)
# 토스페이먼츠 대시보드의 "테스트 웹훅 전송" 기능 사용 권장
```

### 5.3 프론트엔드 결제 플로우 테스트

1. 로컬 개발 서버 실행:
   ```bash
   npm run dev
   ```

2. 테스트 결제 진행:
   - 서비스 선택 → 장바구니 → 주문 → 결제
   - 토스페이먼츠 테스트 카드 정보 사용

**테스트 카드 정보** (토스페이먼츠 Sandbox):
- 카드번호: `4330000000000003`
- 유효기간: 미래 날짜
- CVC: 아무 3자리
- 비밀번호: 아무 2자리

### 5.4 데이터베이스 확인

```sql
-- 주문 확인
SELECT * FROM orders ORDER BY created_at DESC LIMIT 5;

-- 결제 확인
SELECT * FROM payments ORDER BY created_at DESC LIMIT 5;

-- 웹훅 이벤트 확인
SELECT * FROM webhook_events ORDER BY received_at DESC LIMIT 5;
```

---

## 6. 트러블슈팅

### 6.1 Edge Function 배포 실패

**증상**: `supabase functions deploy` 실패

**해결**:
```bash
# Docker 실행 확인
docker ps

# Supabase CLI 재로그인
supabase logout
supabase login

# 프로젝트 재연결
supabase link --project-ref <PROJECT_REF>
```

### 6.2 CORS 에러

**증상**: 프론트엔드에서 Edge Function 호출 시 CORS 에러

**해결**:
- `supabase/functions/_shared/cors.ts`의 `ALLOWED_ORIGINS` 확인
- 허용된 도메인:
  - Production: `ideaonaction.ai`, `minu.best` 등
  - Development: `localhost:5173`, `localhost:3000` 등
  - Preview: `*.vercel.app`

### 6.3 웹훅 시그니처 검증 실패

**증상**: 웹훅 수신 시 401 Unauthorized

**해결**:
1. `TOSS_WEBHOOK_SECRET` 값 확인
2. 토스페이먼츠 대시보드에서 웹훅 Secret 재발급
3. Supabase Secrets 업데이트:
   ```bash
   supabase secrets set TOSS_WEBHOOK_SECRET=new_secret
   supabase functions deploy payment-webhook
   ```

### 6.4 결제 승인 실패

**증상**: 결제 후 confirm 실패

**원인 및 해결**:
1. **금액 불일치**: 주문 금액과 결제 요청 금액 확인
2. **API Key 오류**: `TOSS_SECRET_KEY` 확인
3. **주문 상태 오류**: 주문이 이미 처리되었는지 확인

```sql
-- 주문 상태 확인
SELECT id, status, total_amount FROM orders WHERE id = '<ORDER_ID>';
```

### 6.5 환경 변수 미설정

**증상**: `VITE_TOSS_CLIENT_KEY is not defined`

**해결**:
1. `.env.local` 파일 확인
2. Vercel 환경 변수 확인
3. 개발 서버 재시작:
   ```bash
   npm run dev
   ```

---

## 참고 문서

- [토스페이먼츠 개발자 문서](https://docs.tosspayments.com/)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)
- [프로젝트 CLAUDE.md](../../CLAUDE.md)

---

**문의**: sinclairseo@gmail.com

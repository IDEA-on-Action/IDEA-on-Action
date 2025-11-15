# Supabase Edge Function 배포 가이드

**작성일**: 2025-11-15
**대상**: Work with Us 이메일 발송 Edge Function
**목적**: 보안 강화 (Resend API 키를 서버 사이드로 이동)

## 📋 개요

**문제**: Work with Us 페이지에서 Resend API 키가 클라이언트 코드에 노출되어 보안 취약
**해결**: Supabase Edge Function으로 이메일 발송 로직을 서버 사이드로 이동

**보안 개선**:
- ✅ API 키가 클라이언트 코드에서 완전히 제거됨
- ✅ Supabase Secret으로 안전하게 관리
- ✅ CORS 헤더로 접근 제어
- ✅ 요청 검증 및 에러 처리

## 🚀 배포 단계

### 1단계: Supabase CLI 설치 확인

```bash
# Supabase CLI 버전 확인
supabase --version

# 설치되지 않았다면
npm install -g supabase
```

### 2단계: Supabase 프로젝트 연결

```bash
# Supabase 로그인
supabase login

# 프로젝트 연결 (이미 연결되어 있다면 스킵)
supabase link --project-ref zykjdneewbzyazfukzyg

# 연결 확인
supabase status
```

**예상 출력**:
```
Linked to project: zykjdneewbzyazfukzyg
API URL: https://zykjdneewbzyazfukzyg.supabase.co
DB URL: postgresql://...
```

### 3단계: Supabase Secret 설정

Edge Function에서 사용할 환경 변수를 Supabase Secret으로 설정합니다.

```bash
# RESEND_API_KEY 설정 (필수)
supabase secrets set RESEND_API_KEY=re_5hKuP6b8_J9euhEqP7pgQVvkSCPtoXhBB

# RESEND_FROM_EMAIL 설정 (선택, 기본값: noreply@ideaonaction.ai)
supabase secrets set RESEND_FROM_EMAIL=noreply@ideaonaction.ai

# WORK_INQUIRY_TO_EMAIL 설정 (선택, 기본값: sinclairseo@gmail.com)
supabase secrets set WORK_INQUIRY_TO_EMAIL=sinclairseo@gmail.com
```

**Secret 확인**:
```bash
supabase secrets list
```

**예상 출력**:
```
RESEND_API_KEY            re_***
RESEND_FROM_EMAIL         noreply@ideaonaction.ai
WORK_INQUIRY_TO_EMAIL     sinclairseo@gmail.com
```

### 4단계: Edge Function 배포

```bash
# send-work-inquiry-email Edge Function 배포
supabase functions deploy send-work-inquiry-email --project-ref zykjdneewbzyazfukzyg

# 배포 확인
supabase functions list
```

**예상 출력**:
```
✓ Deployed Function send-work-inquiry-email
  URL: https://zykjdneewbzyazfukzyg.supabase.co/functions/v1/send-work-inquiry-email
  Version: 1
  Created At: 2025-11-15T10:30:00Z
```

### 5단계: 로컬 테스트 (선택)

배포 전에 로컬에서 Edge Function을 테스트할 수 있습니다.

```bash
# .env 파일 생성 (로컬 테스트용)
cat > supabase/.env.local <<EOF
RESEND_API_KEY=re_5hKuP6b8_J9euhEqP7pgQVvkSCPtoXhBB
RESEND_FROM_EMAIL=noreply@ideaonaction.ai
WORK_INQUIRY_TO_EMAIL=sinclairseo@gmail.com
EOF

# Edge Function 로컬 실행
supabase functions serve send-work-inquiry-email --env-file supabase/.env.local

# 다른 터미널에서 테스트 요청
curl -X POST http://localhost:54321/functions/v1/send-work-inquiry-email \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "name": "테스트 사용자",
    "email": "test@example.com",
    "package": "MVP",
    "brief": "테스트 문의입니다. 최소 50자 이상 입력해야 합니다. 추가 텍스트를 입력합니다."
  }'
```

**예상 응답**:
```json
{
  "success": true,
  "data": {
    "id": "re_xxx",
    "from": "noreply@ideaonaction.ai",
    "to": ["sinclairseo@gmail.com"],
    "created_at": "2025-11-15T10:30:00Z"
  }
}
```

### 6단계: Vercel 환경 변수 제거

이제 클라이언트에서 Resend API 키가 필요 없으므로 Vercel 환경 변수를 제거합니다.

**Vercel Dashboard에서**:
1. https://vercel.com/your-account/idea-on-action/settings/environment-variables
2. 다음 환경 변수 **삭제**:
   - `VITE_RESEND_API_KEY`
   - `RESEND_API_KEY` (있다면)
   - `RESEND_DOMAIN_KEY` (사용하지 않음)

**참고**: `VITE_RESEND_FROM_EMAIL`은 남겨둬도 되지만, 실제로는 Edge Function에서만 사용됩니다.

### 7단계: 프로덕션 재배포

```bash
# main 브랜치에 푸시 (GitHub Actions가 자동 배포)
git push origin main
```

Vercel이 자동으로 재배포하면서 클라이언트 번들에서 Resend import가 제거됩니다.

### 8단계: 프로덕션 테스트

1. https://www.ideaonaction.ai/work-with-us 접속
2. Work with Us 폼 제출
3. 이메일 수신 확인 (sinclairseo@gmail.com)
4. 브라우저 콘솔에서 에러 없는지 확인

**기대 결과**:
- ✅ "Missing API key" 에러 사라짐
- ✅ 폼 제출 성공 토스트 표시
- ✅ 이메일 정상 수신

## 🔍 문제 해결

### Edge Function 로그 확인

```bash
# Edge Function 로그 조회
supabase functions logs send-work-inquiry-email --project-ref zykjdneewbzyazfukzyg

# 실시간 로그 스트리밍
supabase functions logs send-work-inquiry-email --project-ref zykjdneewbzyazfukzyg --follow
```

### 일반적인 에러

#### 1. "RESEND_API_KEY is not set"
**원인**: Supabase Secret이 설정되지 않음
**해결**: `supabase secrets set RESEND_API_KEY=re_xxx`

#### 2. "Missing required fields"
**원인**: 클라이언트에서 필수 필드 누락
**해결**: name, email, package, brief 필드 확인

#### 3. "Resend API error: 401 Unauthorized"
**원인**: Resend API 키가 잘못됨
**해결**: .env.local에서 올바른 API 키 확인 후 재설정

#### 4. CORS 에러
**원인**: Access-Control-Allow-Origin 헤더 누락
**해결**: Edge Function에서 corsHeaders 확인 (이미 설정됨)

## 📊 모니터링

### Supabase Dashboard

1. https://supabase.com/dashboard/project/zykjdneewbzyazfukzyg/functions
2. **send-work-inquiry-email** 함수 선택
3. **Metrics** 탭:
   - 요청 수
   - 성공률
   - 평균 응답 시간
   - 에러율

### Resend Dashboard

1. https://resend.com/emails
2. 발송된 이메일 목록 확인
3. 각 이메일의 상태 (delivered, bounced, etc.)

## 🔐 보안 체크리스트

- [x] Resend API 키가 클라이언트 코드에서 제거됨
- [x] Supabase Secret으로 API 키 관리
- [x] CORS 헤더 설정 (`Access-Control-Allow-Origin: *`)
- [x] 요청 검증 (필수 필드, 이메일 형식)
- [x] 에러 메시지에 민감 정보 포함하지 않음
- [x] Vercel 환경 변수에서 API 키 제거

## 📚 참고 자료

- [Supabase Edge Functions 문서](https://supabase.com/docs/guides/functions)
- [Resend API 문서](https://resend.com/docs/send-with-nodejs)
- [Deno Deploy 문서](https://deno.com/deploy/docs)

## 🎯 다음 단계

1. ✅ Edge Function 배포 완료
2. ✅ 프로덕션 테스트 완료
3. ⏳ Analytics 401 에러 수정 (RLS 정책)
4. ⏳ Unit Tests 개선 (DB mock)

---

**작성자**: Claude Code
**마지막 업데이트**: 2025-11-15

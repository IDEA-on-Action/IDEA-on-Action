# OAuth 설정 가이드

**마지막 업데이트**: 2025-10-17
**버전**: 1.5.0

---

## 📋 개요

Google, GitHub, Kakao OAuth 로그인을 위한 설정 가이드입니다.

**Redirect URL (공통)**:
```
https://zykjdneewbzyazfukzyg.supabase.co/auth/v1/callback
```

---

## 1️⃣ Google OAuth 설정

### 1. Google Cloud Console 설정

1. **Google Cloud Console** 접속
   - URL: https://console.cloud.google.com/

2. **프로젝트 선택 또는 생성**
   - 프로젝트 이름: `VIBE WORKING` (또는 원하는 이름)

3. **API 및 서비스 → 사용자 인증 정보** 메뉴
   - "사용자 인증 정보 만들기" 클릭
   - "OAuth 2.0 클라이언트 ID" 선택

4. **OAuth 동의 화면 구성** (처음인 경우)
   - User Type: **외부** 선택
   - 앱 정보:
     - 앱 이름: `VIBE WORKING`
     - 사용자 지원 이메일: `sinclairseo@gmail.com`
     - 개발자 연락처 이메일: `sinclairseo@gmail.com`
   - 범위: `email`, `profile` (기본값)
   - 저장 후 계속

5. **OAuth 2.0 클라이언트 ID 만들기**
   - 애플리케이션 유형: **웹 애플리케이션**
   - 이름: `VIBE WORKING - Production`
   - 승인된 자바스크립트 원본:
     ```
     https://www.ideaonaction.ai
     http://localhost:5173
     ```
   - 승인된 리디렉션 URI:
     ```
     https://zykjdneewbzyazfukzyg.supabase.co/auth/v1/callback
     ```
   - 만들기 클릭

6. **Client ID & Secret 복사**
   - Client ID: `123456789-xxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com`
   - Client Secret: `GOCSPX-xxxxxxxxxxxxxxxxxxxx`

### 2. Supabase 설정

1. **Supabase Dashboard** 접속
   - URL: https://supabase.com/dashboard/project/zykjdneewbzyazfukzyg

2. **Authentication → Providers** 메뉴

3. **Google** 찾아서 클릭

4. **설정 입력**:
   - Enabled: ✅ **체크**
   - Client ID: `[복사한 Client ID]`
   - Client Secret: `[복사한 Client Secret]`
   - Redirect URL: (자동 입력됨)
     ```
     https://zykjdneewbzyazfukzyg.supabase.co/auth/v1/callback
     ```
   - Save 클릭

### 3. 테스트

1. `/login` 페이지 접속
2. "Google로 계속하기" 버튼 클릭
3. Google 계정 선택
4. 앱 권한 동의
5. 홈페이지로 리다이렉트 확인

---

## 2️⃣ GitHub OAuth 설정

### 1. GitHub 설정

1. **GitHub** 로그인
   - URL: https://github.com/

2. **Settings → Developer settings** 메뉴
   - URL: https://github.com/settings/developers

3. **OAuth Apps → New OAuth App** 클릭

4. **앱 정보 입력**:
   - Application name: `VIBE WORKING`
   - Homepage URL: `https://www.ideaonaction.ai`
   - Application description: `AI 기반 워킹 솔루션` (선택사항)
   - Authorization callback URL:
     ```
     https://zykjdneewbzyazfukzyg.supabase.co/auth/v1/callback
     ```
   - Register application 클릭

5. **Client ID & Secret 생성**
   - Client ID: `Iv1.xxxxxxxxxxxxxxxx` (자동 생성됨)
   - "Generate a new client secret" 클릭
   - Client Secret: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxx` (복사)

### 2. Supabase 설정

1. **Supabase Dashboard** → Authentication → Providers

2. **GitHub** 찾아서 클릭

3. **설정 입력**:
   - Enabled: ✅ **체크**
   - Client ID: `[복사한 Client ID]`
   - Client Secret: `[복사한 Client Secret]`
   - Redirect URL: (자동 입력됨)
   - Save 클릭

### 3. 테스트

1. `/login` 페이지 접속
2. "GitHub로 계속하기" 버튼 클릭
3. GitHub 계정 인증
4. 앱 권한 승인
5. 홈페이지로 리다이렉트 확인

---

## 3️⃣ Kakao OAuth 설정

### 1. Kakao Developers 설정

1. **Kakao Developers** 접속
   - URL: https://developers.kakao.com/

2. **내 애플리케이션** → **애플리케이션 추가하기**
   - 앱 이름: `VIBE WORKING`
   - 사업자명: `생각과행동`
   - 저장

3. **앱 설정 → 플랫폼** 메뉴
   - Web 플랫폼 등록
   - 사이트 도메인: `https://www.ideaonaction.ai`
   - 저장

4. **제품 설정 → 카카오 로그인** 메뉴
   - 카카오 로그인 활성화: **ON**
   - Redirect URI 등록:
     ```
     https://zykjdneewbzyazfukzyg.supabase.co/auth/v1/callback
     ```
   - 저장

5. **동의항목** 설정
   - 카카오 로그인 → 동의항목
   - 필수 동의:
     - 닉네임: ✅
     - 프로필 사진: ✅
     - 카카오계정(이메일): ✅
   - 저장

6. **앱 키 확인**
   - 앱 설정 → 요약 정보
   - REST API 키: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` (복사)

### 2. Supabase 설정

⚠️ **주의**: Supabase는 Kakao를 기본 Provider로 제공하지 않습니다.
대신 **Custom OAuth** 또는 **백엔드 처리** 필요.

#### 방법 A: Supabase Functions 사용 (권장)

```typescript
// supabase/functions/kakao-auth/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const { code } = await req.json()

  // 1. Kakao에서 Access Token 가져오기
  const tokenResponse = await fetch('https://kauth.kakao.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: Deno.env.get('KAKAO_REST_API_KEY')!,
      redirect_uri: 'https://zykjdneewbzyazfukzyg.supabase.co/auth/v1/callback',
      code,
    }),
  })

  const { access_token } = await tokenResponse.json()

  // 2. Kakao에서 사용자 정보 가져오기
  const userResponse = await fetch('https://kapi.kakao.com/v2/user/me', {
    headers: { Authorization: `Bearer ${access_token}` },
  })

  const kakaoUser = await userResponse.json()

  // 3. Supabase에 사용자 등록
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data, error } = await supabase.auth.admin.createUser({
    email: kakaoUser.kakao_account.email,
    email_confirm: true,
    user_metadata: {
      provider: 'kakao',
      name: kakaoUser.properties.nickname,
      avatar_url: kakaoUser.properties.profile_image,
    },
  })

  return new Response(JSON.stringify({ user: data.user }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
```

#### 방법 B: 간단한 방법 (현재 구현)

현재 코드는 Kakao OAuth를 위한 플레이스홀더입니다.
실제 동작을 위해서는 위 Supabase Function 구현이 필요합니다.

**임시 조치**:
```typescript
// src/hooks/useAuth.ts
const signInWithKakao = async () => {
  toast({
    title: 'Kakao 로그인',
    description: '준비 중입니다. Google 또는 GitHub을 사용해주세요.',
    variant: 'default',
  })
}
```

### 3. 테스트 (구현 후)

1. `/login` 페이지 접속
2. "Kakao로 계속하기" 버튼 클릭
3. Kakao 계정 인증
4. 앱 권한 동의
5. 홈페이지로 리다이렉트 확인

---

## ✅ 설정 검증

### 체크리스트

**Google OAuth**:
- [ ] Google Cloud Console에서 OAuth 클라이언트 생성
- [ ] Redirect URI 확인
- [ ] Supabase에 Client ID/Secret 입력
- [ ] 로그인 테스트 성공

**GitHub OAuth**:
- [ ] GitHub OAuth App 생성
- [ ] Callback URL 확인
- [ ] Supabase에 Client ID/Secret 입력
- [ ] 로그인 테스트 성공

**Kakao OAuth** (선택):
- [ ] Kakao Developers 앱 생성
- [ ] Redirect URI 등록
- [ ] Supabase Function 배포
- [ ] 로그인 테스트 성공

### 확인 SQL

```sql
-- OAuth 로그인한 사용자 확인
SELECT
  id,
  email,
  raw_user_meta_data->>'provider' as provider,
  raw_user_meta_data->>'full_name' as name,
  created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;
```

---

## 🐛 문제 해결

### 문제: "Redirect URI mismatch"
**원인**: OAuth 앱의 Redirect URI와 Supabase Callback URL 불일치

**해결**:
1. Supabase Dashboard → Settings → API → URL 확인
2. OAuth 앱 설정에서 정확한 URL 입력:
   ```
   https://zykjdneewbzyazfukzyg.supabase.co/auth/v1/callback
   ```
3. 끝에 `/` 없는지 확인
4. HTTPS 확인

### 문제: "Invalid client ID or secret"
**원인**: 잘못된 Client ID/Secret

**해결**:
1. OAuth 앱에서 Client ID 재확인
2. Client Secret 재생성
3. Supabase에 정확히 복사/붙여넣기
4. 공백 없는지 확인

### 문제: 로그인 후 "Email not confirmed"
**원인**: 이메일 인증 필요

**해결**:
```sql
-- 이메일 인증 강제 활성화 (개발용)
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email = 'user@example.com';
```

또는 Supabase Dashboard → Authentication → Settings:
- Email confirmation required: **OFF** (개발 중)

### 문제: Kakao 로그인 안 됨
**원인**: Supabase Function 미구현

**해결**:
1. 위 "방법 A" 참고하여 Supabase Function 작성
2. 배포: `supabase functions deploy kakao-auth`
3. 환경 변수 설정:
   ```bash
   supabase secrets set KAKAO_REST_API_KEY=your_key
   ```

---

## 🔒 보안 고려사항

### 1. Client Secret 보호
- ❌ 절대 Git에 커밋 금지
- ✅ 환경 변수 또는 Supabase Secrets 사용
- ✅ `.env.local` 파일은 `.gitignore`에 추가됨

### 2. Redirect URI 제한
- ✅ Production URL만 허용
- ✅ 개발용은 `localhost:5173` 별도 등록
- ❌ Wildcard (`*`) 사용 금지

### 3. Scope 최소화
- ✅ Google: `email`, `profile`만 요청
- ✅ GitHub: 기본 scope만 사용
- ✅ Kakao: 필수 동의 항목만 설정

---

## 📊 사용 통계 확인

```sql
-- Provider별 사용자 수
SELECT
  raw_user_meta_data->>'provider' as provider,
  COUNT(*) as user_count
FROM auth.users
GROUP BY provider
ORDER BY user_count DESC;

-- 최근 7일간 OAuth 로그인
SELECT
  DATE(created_at) as date,
  raw_user_meta_data->>'provider' as provider,
  COUNT(*) as logins
FROM auth.users
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY date, provider
ORDER BY date DESC, logins DESC;
```

---

## 🎯 다음 단계

1. ✅ Google OAuth 설정
2. ✅ GitHub OAuth 설정
3. 📝 Kakao OAuth 구현 (Supabase Function)
4. 📝 Apple Sign-In 추가 (Phase 10)
5. 📝 소셜 로그인 분석 대시보드

---

## 📚 참고 자료

- [Google OAuth 문서](https://developers.google.com/identity/protocols/oauth2)
- [GitHub OAuth 문서](https://docs.github.com/en/developers/apps/building-oauth-apps)
- [Kakao OAuth 문서](https://developers.kakao.com/docs/latest/ko/kakaologin/rest-api)
- [Supabase Auth 문서](https://supabase.com/docs/guides/auth/social-login)

---

**End of Guide**

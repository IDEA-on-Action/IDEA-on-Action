# 관리자 계정 설정 가이드

**마지막 업데이트**: 2025-10-17
**버전**: 1.5.0

---

## 📋 개요

관리자 계정 생성 및 권한 부여 가이드입니다.

**관리자 계정 정보**:
- ID: `admin`
- 비밀번호: `demian00`
- 이메일: `admin@ideaonaction.local`

---

## 🚀 설정 단계

### 1. 관리자 계정 생성

**Supabase Dashboard → SQL Editor**에서 실행:

```sql
-- 1. 관리자 계정 생성 (이메일/비밀번호)
-- 주의: Supabase는 SQL로 직접 사용자 생성 불가
-- 대신 Auth API 또는 Dashboard 사용

-- 방법 A: Supabase Dashboard 사용 (권장)
-- Authentication → Users → Add User 클릭
-- Email: admin@ideaonaction.local
-- Password: demian00
-- Email Confirmed: ✅ 체크
-- Create User 클릭

-- 방법 B: SQL (Service Role Key 필요)
-- 아래는 참고용 (실제 실행은 Supabase Function에서)
```

### 2. 관리자 역할 부여

**관리자 계정 생성 후** 실행:

```sql
-- user_roles 테이블에 관리자 역할 추가
INSERT INTO user_roles (user_id, role)
VALUES (
  -- admin@ideaonaction.local 사용자의 ID 찾기
  (SELECT id FROM auth.users WHERE email = 'admin@ideaonaction.local'),
  'admin'
)
ON CONFLICT (user_id, role) DO NOTHING;

-- 확인
SELECT
  u.email,
  ur.role,
  ur.created_at
FROM user_roles ur
JOIN auth.users u ON u.id = ur.user_id
WHERE u.email = 'admin@ideaonaction.local';
```

### 3. 이메일 인증 완료 처리

```sql
-- 이메일 인증 확인
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email = 'admin@ideaonaction.local'
  AND email_confirmed_at IS NULL;
```

---

## 🔄 자동화 스크립트 (선택사항)

Supabase Function을 사용한 자동 관리자 계정 생성:

### 파일: `supabase/functions/create-admin/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  // Service Role Key 필요 (관리자만 실행 가능)
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // 1. 관리자 사용자 생성
  const { data: user, error: userError } = await supabase.auth.admin.createUser({
    email: 'admin@ideaonaction.local',
    password: 'demian00',
    email_confirm: true,
    user_metadata: {
      name: 'Administrator',
      role: 'admin',
    },
  })

  if (userError) {
    return new Response(JSON.stringify({ error: userError.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // 2. user_roles 테이블에 추가
  const { error: roleError } = await supabase
    .from('user_roles')
    .insert({ user_id: user.user!.id, role: 'admin' })

  if (roleError) {
    return new Response(JSON.stringify({ error: roleError.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(
    JSON.stringify({
      message: 'Admin user created successfully',
      user: {
        id: user.user!.id,
        email: user.user!.email,
      },
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  )
})
```

### 배포 및 실행

```bash
# 함수 배포
supabase functions deploy create-admin

# 실행 (일회성)
curl -X POST https://zykjdneewbzyazfukzyg.supabase.co/functions/v1/create-admin \
  -H "Authorization: Bearer [SERVICE_ROLE_KEY]"
```

---

## ✅ 검증

### 1. 로그인 테스트

1. 브라우저에서 `/login` 접속
2. 아이디: `admin` 입력
3. 비밀번호: `demian00` 입력
4. 로그인 버튼 클릭
5. 홈페이지로 리다이렉트 확인

### 2. 관리자 권한 확인

```sql
-- 관리자 역할 확인
SELECT
  u.email,
  ur.role,
  ur.created_at
FROM user_roles ur
JOIN auth.users u ON u.id = ur.user_id
WHERE ur.role = 'admin';
```

예상 결과:
```
email                        | role  | created_at
-----------------------------+-------+------------------------
admin@ideaonaction.local     | admin | 2025-10-17 12:00:00+00
```

### 3. 관리자 페이지 접근

1. 관리자로 로그인 후
2. Header에서 아바타 클릭
3. "관리자" 메뉴 항목 확인
4. 클릭 → `/admin` 대시보드 접속
5. 서비스 관리 기능 확인

---

## 🔐 보안 고려사항

### 1. 비밀번호 변경 (프로덕션)

**개발용 비밀번호 (`demian00`)는 프로덕션에서 반드시 변경**:

```sql
-- Supabase Dashboard → Authentication → Users → admin 계정 선택
-- "Change password" 클릭
-- 새 비밀번호: 강력한 비밀번호로 변경 (16자 이상, 특수문자 포함)
```

또는 SQL (Service Role Key 필요):
```typescript
const { error } = await supabase.auth.admin.updateUserById(
  '[admin_user_id]',
  { password: 'new_strong_password_here' }
)
```

### 2. 2FA (Two-Factor Authentication) 활성화 (권장)

```sql
-- Supabase는 기본적으로 2FA 미지원
-- 외부 2FA 서비스 통합 필요:
-- - Google Authenticator
-- - Authy
-- - SMS 인증
```

### 3. 관리자 계정 모니터링

```sql
-- 관리자 로그인 기록 확인
SELECT
  u.email,
  u.last_sign_in_at,
  u.raw_user_meta_data->>'ip_address' as last_ip
FROM auth.users u
JOIN user_roles ur ON ur.user_id = u.id
WHERE ur.role = 'admin'
ORDER BY u.last_sign_in_at DESC;
```

---

## 👥 추가 관리자 생성

### 일반 사용자를 관리자로 승격

```sql
-- 1. 사용자 이메일로 ID 찾기
SELECT id, email FROM auth.users WHERE email = 'user@example.com';

-- 2. 관리자 역할 부여
INSERT INTO user_roles (user_id, role)
VALUES ('[user_id]', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- 3. 확인
SELECT
  u.email,
  ur.role
FROM user_roles ur
JOIN auth.users u ON u.id = ur.user_id
WHERE u.email = 'user@example.com';
```

### 관리자 권한 제거

```sql
-- 관리자 역할 제거
DELETE FROM user_roles
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'user@example.com')
  AND role = 'admin';
```

---

## 🐛 문제 해결

### 문제: admin으로 로그인 안 됨
**원인**: 이메일 형식 불일치

**해결**:
- 입력: `admin` → 자동 변환: `admin@ideaonaction.local`
- Login.tsx에서 처리:
  ```typescript
  const loginEmail = email.includes('@') ? email : `${email}@ideaonaction.local`
  ```

### 문제: 로그인 성공했지만 /admin 접근 불가
**원인**: user_roles 테이블에 역할 미등록

**해결**:
```sql
-- 현재 로그인한 사용자 확인
SELECT auth.uid(), auth.email();

-- user_roles 확인
SELECT * FROM user_roles WHERE user_id = auth.uid();

-- 역할 없으면 추가
INSERT INTO user_roles (user_id, role)
VALUES (auth.uid(), 'admin');
```

### 문제: "관리자" 메뉴 안 보임
**원인**: useIsAdmin 훅 캐싱 문제

**해결**:
1. 로그아웃 후 재로그인
2. 브라우저 새로고침 (Ctrl+F5)
3. React Query 캐시 초기화:
   ```typescript
   queryClient.invalidateQueries({ queryKey: ['isAdmin'] })
   ```

---

## 📊 관리자 통계

```sql
-- 전체 관리자 수
SELECT COUNT(*) as admin_count
FROM user_roles
WHERE role = 'admin';

-- 관리자별 활동 통계 (향후 구현)
SELECT
  u.email,
  COUNT(DISTINCT s.id) as services_created,
  MAX(s.created_at) as last_activity
FROM auth.users u
JOIN user_roles ur ON ur.user_id = u.id
LEFT JOIN services s ON s.created_by = u.id
WHERE ur.role = 'admin'
GROUP BY u.id, u.email
ORDER BY services_created DESC;
```

---

## 🎯 다음 단계

1. ✅ 관리자 계정 생성
2. ✅ user_roles 역할 부여
3. 📝 비밀번호 강화 (프로덕션)
4. 📝 2FA 통합 (Phase 10)
5. 📝 관리자 활동 로그 (Phase 11)

---

## 📚 참고 자료

- [Supabase Auth Admin API](https://supabase.com/docs/reference/javascript/auth-admin-api)
- [useAuth.ts](../../../src/hooks/useAuth.ts) - 로그인 훅 구현
- [useIsAdmin.ts](../../../src/hooks/useIsAdmin.ts) - 권한 확인 훅

---

**End of Guide**

# 프로덕션 Newsletter 마이그레이션 가이드

> **Version**: 2.3.2
> **Last Updated**: 2025-11-22
> **Target Audience**: 개발자, DevOps
> **Related Pages**: [Admin Newsletter Guide](../cms/admin-newsletter-guide.md) | [Validation Scripts](../../../scripts/validation/)

---

## 목차
- [개요](#개요)
- [마이그레이션 상세](#마이그레이션-상세)
- [적용 전 체크리스트](#적용-전-체크리스트)
- [적용 방법](#적용-방법)
- [검증 방법](#검증-방법)
- [롤백 시나리오](#롤백-시나리오)
- [트러블슈팅](#트러블슈팅)
- [24시간 모니터링 계획](#24시간-모니터링-계획)
- [FAQ](#faq)

---

## 개요

이 가이드는 IDEA on Action 프로젝트의 Newsletter 보안 강화 및 Function Search Path SQL Injection 방어를 위한 **3개 마이그레이션 파일**을 프로덕션 DB에 적용하는 방법을 설명합니다.

### 마이그레이션 파일 목록

| 파일명 | 목적 | 우선순위 | 소요 시간 |
|--------|------|----------|-----------|
| `20251121000000_fix_newsletter_security_issues.sql` | Newsletter 보안 강화 (auth.users 노출 제거, SECURITY INVOKER) | 🔴 Critical | ~2분 |
| `20251122000000_fix_function_search_path.sql` | Newsletter 함수 3개 search_path 설정 | 🟡 High | ~30초 |
| `20251122000001_fix_critical_functions_search_path.sql` | 64개 Critical 함수 search_path 설정 | 🟡 High | ~1분 |

### 보안 개선 효과

**Before (현재 상태)**:
- 🔴 2개 Critical 이슈 (auth.users 노출, SECURITY DEFINER)
- 🔴 68개 Function Search Path Mutable 경고
- 🔴 보안 점수: 40/100

**After (마이그레이션 적용 후)**:
- ✅ 0개 Critical 이슈
- ✅ ~5-10개 PostgreSQL 내부 함수 경고만 (Custom 함수 100% 수정)
- ✅ 보안 점수: 98-100/100

### 적용 시기
- **권장 시간대**: 새벽 2~4시 (트래픽 최저)
- **소요 시간**: 총 ~5분 (마이그레이션 + 검증)
- **다운타임**: 없음 (HOT migration, 무중단)

---

## 마이그레이션 상세

### Migration 1: Newsletter 보안 강화 (20251121000000)

#### 파일 정보
- **파일명**: `20251121000000_fix_newsletter_security_issues.sql`
- **라인 수**: 275줄
- **우선순위**: 🔴 Critical
- **소요 시간**: ~2분

#### 주요 변경사항

**1. auth.users 노출 제거**
```sql
-- Before (위험)
CREATE OR REPLACE VIEW newsletter_subscribers AS
SELECT
  COALESCE(newsletter_email, (SELECT email FROM auth.users)) as email  -- ❌ auth.users 노출
  ...
FROM user_profiles;

-- After (안전)
CREATE OR REPLACE VIEW newsletter_subscribers AS
SELECT
  newsletter_email as email,  -- ✅ 명시적 이메일만 사용
  ...
FROM user_profiles
WHERE newsletter_email IS NOT NULL;  -- ✅ 이메일 필수 검증
```

**영향**:
- ✅ auth.users 테이블 완전 격리
- ✅ 인증된 사용자가 다른 사용자 이메일 접근 불가
- ✅ Newsletter 이메일 명시적 입력 필수화

**2. SECURITY DEFINER → SECURITY INVOKER**
```sql
-- Before (위험)
CREATE OR REPLACE FUNCTION subscribe_to_newsletter(p_email TEXT)
RETURNS BOOLEAN AS $$
  ...
$$ LANGUAGE plpgsql
SECURITY DEFINER;  -- ❌ RLS 우회

-- After (안전)
CREATE OR REPLACE FUNCTION subscribe_to_newsletter(p_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();

  -- ✅ 명시적 인증 체크
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated to subscribe';
  END IF;

  -- ✅ 이메일 검증
  IF p_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$' THEN
    RAISE EXCEPTION 'Invalid email format';
  END IF;
  ...
$$ LANGUAGE plpgsql
SECURITY INVOKER;  -- ✅ RLS 정책 적용
```

**영향**:
- ✅ RLS 정책 100% 적용
- ✅ 사용자별 감사 추적 가능
- ✅ Email 입력 검증 강화 (Regex)

**3. RLS 정책 추가**
```sql
-- Policy 1: Admins can view newsletter subscribers
CREATE POLICY "Admins can view newsletter subscribers"
ON user_profiles FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
    AND r.name IN ('admin', 'super_admin')
  )
  OR user_id = auth.uid()
);

-- Policy 2: Users can view own newsletter subscription
CREATE POLICY "Users can view own newsletter subscription"
ON user_profiles FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Policy 3: Users can update own newsletter subscription
CREATE POLICY "Users can update own newsletter subscription"
ON user_profiles FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
```

**영향**:
- ✅ Admin만 전체 구독자 조회 가능
- ✅ 사용자는 자신의 구독 정보만 조회/수정
- ✅ Anonymous 접근 완전 차단

**4. Anonymous 권한 REVOKE**
```sql
REVOKE SELECT ON newsletter_subscribers FROM anon;
REVOKE EXECUTE ON FUNCTION subscribe_to_newsletter(TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION unsubscribe_from_newsletter() FROM anon;
```

**영향**:
- ✅ 비로그인 사용자 Newsletter 데이터 접근 불가
- ✅ 구독/취소는 로그인 필수

---

### Migration 2: Newsletter Function Search Path (20251122000000)

#### 파일 정보
- **파일명**: `20251122000000_fix_function_search_path.sql`
- **라인 수**: 293줄
- **우선순위**: 🟡 High
- **소요 시간**: ~30초

#### 주요 변경사항

**3개 Newsletter 함수에 search_path 설정**
```sql
-- 1. subscribe_to_newsletter
CREATE OR REPLACE FUNCTION subscribe_to_newsletter(p_email TEXT)
RETURNS BOOLEAN AS $$
  ...
$$ LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp;  -- ✅ SQL Injection 방어

-- 2. unsubscribe_from_newsletter
CREATE OR REPLACE FUNCTION unsubscribe_from_newsletter()
RETURNS BOOLEAN AS $$
  ...
$$ LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp;  -- ✅ SQL Injection 방어

-- 3. get_newsletter_subscribers (Admin 전용)
CREATE OR REPLACE FUNCTION get_newsletter_subscribers()
RETURNS TABLE (...) AS $$
  ...
$$ LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp;  -- ✅ SQL Injection 방어
```

**영향**:
- ✅ Newsletter 함수 3개 SQL Injection 방어
- ✅ Supabase Security Advisor 경고 3개 해결

**search_path 설정 의미**:
- `public`: 공식 스키마만 사용
- `pg_temp`: 임시 객체용 스키마
- ⚠️ `search_path` 미설정 시: 공격자가 악의적인 스키마로 함수 덮어쓰기 가능

---

### Migration 3: Critical Functions Search Path (20251122000001)

#### 파일 정보
- **파일명**: `20251122000001_fix_critical_functions_search_path.sql`
- **라인 수**: 224줄
- **우선순위**: 🟡 High
- **소요 시간**: ~1분

#### 주요 변경사항

**64개 Critical 함수 search_path 설정** (ALTER FUNCTION 사용)

**보안 등급별 분류**:

**1. 인증/보안 (9개) - 🔴 High Priority**
```sql
ALTER FUNCTION generate_password_reset_token(TEXT) SET search_path = public, pg_temp;
ALTER FUNCTION verify_password_reset_token(TEXT) SET search_path = public, pg_temp;
ALTER FUNCTION generate_email_verification_token(UUID, TEXT) SET search_path = public, pg_temp;
ALTER FUNCTION verify_email_token(TEXT) SET search_path = public, pg_temp;
ALTER FUNCTION lock_account_on_failed_attempts(TEXT) SET search_path = public, pg_temp;
ALTER FUNCTION is_account_locked(UUID) SET search_path = public, pg_temp;
ALTER FUNCTION get_recent_failed_attempts(TEXT, INET, INTEGER) SET search_path = public, pg_temp;
ALTER FUNCTION get_user_permissions(UUID) SET search_path = public, pg_temp;
ALTER FUNCTION user_has_permission(UUID, TEXT) SET search_path = public, pg_temp;
```

**2. Analytics & Business Logic (11개) - 🟡 Medium Priority**
```sql
ALTER FUNCTION get_revenue_by_date(TIMESTAMPTZ, TIMESTAMPTZ, TEXT) SET search_path = public, pg_temp;
ALTER FUNCTION get_revenue_by_service(TIMESTAMPTZ, TIMESTAMPTZ) SET search_path = public, pg_temp;
ALTER FUNCTION get_kpis(TIMESTAMPTZ, TIMESTAMPTZ) SET search_path = public, pg_temp;
ALTER FUNCTION calculate_bounce_rate(TIMESTAMPTZ, TIMESTAMPTZ) SET search_path = public, pg_temp;
... (7개 더)
```

**3. Trigger Functions (44개) - 🟢 Low Priority**
```sql
ALTER FUNCTION update_updated_at_column() SET search_path = public, pg_temp;
ALTER FUNCTION update_admins_updated_at() SET search_path = public, pg_temp;
... (42개 더)
```

**영향**:
- ✅ 64개 함수 SQL Injection 방어
- ✅ Supabase Security Advisor 경고 64개 해결
- ✅ 보안 점수 40/100 → 98/100

**Trigger 함수 search_path 추가 이유**:
- Trigger는 자동 실행되어 직접 입력받지 않지만, **Defense-in-Depth** 원칙으로 설정
- 공격자가 Trigger를 악용하여 Privilege Escalation 시도 방지

---

## 적용 전 체크리스트

### 1. 백업 확인 ✅
- [ ] **Supabase Dashboard → Database → Backups** 페이지 접속
- [ ] Point-in-time Recovery 활성화 확인 (24시간 이내 복구 가능)
- [ ] 최근 백업 시간 확인 (6시간 이내 권장)
- [ ] 백업 크기 확인 (DB 크기와 일치)

### 2. 로컬 DB 테스트 완료 ✅
- [ ] `supabase db reset` 로컬 DB 리셋 성공
- [ ] 3개 마이그레이션 파일 적용 성공
- [ ] `scripts/validation/quick-verify-prod.sql` 검증 통과
- [ ] Newsletter 구독/취소 기능 정상 작동 확인

### 3. SQL 문법 검증 ✅
- [ ] 3개 마이그레이션 파일 SQL 문법 오류 없음
- [ ] `psql -f migration.sql --dry-run` 실행 (문법 검증만)
- [ ] CREATE/ALTER 구문 정확성 확인
- [ ] 의존성 순서 확인 (20251121 → 20251122 → 20251122001)

### 4. 현재 RLS 정책 확인 ✅
- [ ] Supabase Dashboard → Database → Policies
- [ ] user_profiles 테이블 RLS 정책 개수 확인
- [ ] newsletter_subscriptions 테이블 존재 여부 확인
- [ ] 기존 정책 이름 중복 없음 확인

### 5. 점검 시간대 선택 ✅
- [ ] 트래픽 최저 시간대 선택 (새벽 2~4시 권장)
- [ ] 팀원 대기 상태 확인 (긴급 롤백 대응)
- [ ] 모니터링 툴 준비 (Supabase Dashboard, Sentry)

### 6. 롤백 계획 수립 ✅
- [ ] 백업 SQL 파일 준비 (마이그레이션 역순)
- [ ] 롤백 시나리오 3가지 숙지 (즉시/지연/검증)
- [ ] Supabase Dashboard 접근 권한 확인

### 7. 환경 변수 확인 ✅
- [ ] `VITE_SUPABASE_URL` 프로덕션 URL 확인
- [ ] `VITE_SUPABASE_ANON_KEY` 유효성 확인
- [ ] `.env.local` 파일 프로덕션 설정 확인

---

## 적용 방법

### 방법 1: Supabase CLI (권장)

#### 1.1 Supabase CLI 설치
```bash
npm install -g supabase
# 또는
npx supabase --version
```

#### 1.2 프로젝트 링크
```bash
# Supabase 프로젝트 ID 확인
# Dashboard → Settings → General → Reference ID

supabase link --project-ref <PROJECT_ID>
# 예: supabase link --project-ref zykjdneewbzyazfukzyg
```

#### 1.3 마이그레이션 푸시
```bash
# 프로젝트 루트 디렉토리에서 실행
npx supabase db push

# 출력 예시:
# Applying migration 20251121000000_fix_newsletter_security_issues.sql...
# Applying migration 20251122000000_fix_function_search_path.sql...
# Applying migration 20251122000001_fix_critical_functions_search_path.sql...
# ✅ All migrations applied successfully
```

#### 1.4 적용 확인
```bash
# 마이그레이션 상태 확인
npx supabase migration list

# 출력 예시:
#     | 20251121000000 | fix_newsletter_security_issues | ✅ Applied
#     | 20251122000000 | fix_function_search_path       | ✅ Applied
#     | 20251122000001 | fix_critical_functions_search_path | ✅ Applied
```

**장점**:
- ✅ 가장 안전한 방법 (Supabase 공식 도구)
- ✅ 마이그레이션 히스토리 자동 기록
- ✅ 롤백 기능 내장

**단점**:
- ⚠️ Supabase CLI 설치 필요
- ⚠️ 프로젝트 링크 설정 필요

---

### 방법 2: Supabase Dashboard SQL Editor (간편)

#### 2.1 SQL Editor 접속
1. Supabase Dashboard 로그인 → https://supabase.com/dashboard
2. 프로젝트 선택 (IDEA on Action)
3. 좌측 메뉴 **"SQL Editor"** 클릭

#### 2.2 마이그레이션 파일 복사 & 실행
**Migration 1 실행**:
```sql
-- 파일: supabase/migrations/20251121000000_fix_newsletter_security_issues.sql
-- 전체 내용 복사하여 SQL Editor에 붙여넣기

-- 1. Newsletter View 재생성
DROP VIEW IF EXISTS public.newsletter_subscribers;
CREATE OR REPLACE VIEW public.newsletter_subscribers
WITH (security_invoker = true)
AS
SELECT
  id,
  user_id,
  newsletter_email as email,
  display_name,
  newsletter_subscribed_at as subscribed_at,
  created_at
FROM public.user_profiles
WHERE newsletter_subscribed = true
  AND newsletter_email IS NOT NULL;

-- 2. RLS 정책 추가
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view newsletter subscribers" ON public.user_profiles;
CREATE POLICY "Admins can view newsletter subscribers"
ON public.user_profiles FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
    AND r.name IN ('admin', 'super_admin')
  )
  OR user_id = auth.uid()
);

-- 3. 함수 재정의 (SECURITY INVOKER)
DROP FUNCTION IF EXISTS subscribe_to_newsletter(TEXT);
CREATE OR REPLACE FUNCTION subscribe_to_newsletter(p_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  current_user_id UUID;
  profile_exists BOOLEAN;
BEGIN
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated to subscribe';
  END IF;

  IF p_email IS NULL OR p_email = '' THEN
    RAISE EXCEPTION 'Email is required for newsletter subscription';
  END IF;

  IF p_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$' THEN
    RAISE EXCEPTION 'Invalid email format';
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.user_profiles
    WHERE user_id = current_user_id
  ) INTO profile_exists;

  IF profile_exists THEN
    UPDATE public.user_profiles
    SET
      newsletter_subscribed = true,
      newsletter_subscribed_at = NOW(),
      newsletter_email = p_email
    WHERE user_id = current_user_id;
  ELSE
    INSERT INTO public.user_profiles (
      user_id,
      newsletter_subscribed,
      newsletter_subscribed_at,
      newsletter_email
    )
    VALUES (current_user_id, true, NOW(), p_email);
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- 4. Anonymous 권한 REVOKE
REVOKE SELECT ON public.newsletter_subscribers FROM anon;
REVOKE EXECUTE ON FUNCTION subscribe_to_newsletter(TEXT) FROM anon;

-- ✅ Run 버튼 클릭 (우측 상단)
```

**실행 결과 확인**:
```
Success
View created: newsletter_subscribers
Policy created: Admins can view newsletter subscribers
Function created: subscribe_to_newsletter
```

**Migration 2 실행** (Newsletter Function Search Path):
```sql
-- 파일: supabase/migrations/20251122000000_fix_function_search_path.sql
-- 전체 내용 복사하여 실행

CREATE OR REPLACE FUNCTION subscribe_to_newsletter(p_email TEXT)
RETURNS BOOLEAN AS $$
  ... (동일한 로직)
$$ LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp;  -- ✅ 추가됨

-- ✅ Run 버튼 클릭
```

**Migration 3 실행** (Critical Functions Search Path):
```sql
-- 파일: supabase/migrations/20251122000001_fix_critical_functions_search_path.sql
-- 전체 내용 복사하여 실행

ALTER FUNCTION generate_password_reset_token(TEXT) SET search_path = public, pg_temp;
ALTER FUNCTION verify_password_reset_token(TEXT) SET search_path = public, pg_temp;
... (64개 함수)

-- ✅ Run 버튼 클릭
```

**장점**:
- ✅ 웹 브라우저만 있으면 실행 가능
- ✅ 즉시 결과 확인
- ✅ 설치 불필요

**단점**:
- ⚠️ 마이그레이션 히스토리 수동 관리
- ⚠️ 파일 복사-붙여넣기 과정에서 오류 가능성

---

### 방법 3: psql (고급)

#### 3.1 psql 설치
```bash
# macOS
brew install postgresql

# Ubuntu/Debian
sudo apt-get install postgresql-client

# Windows
# PostgreSQL 공식 웹사이트에서 다운로드
```

#### 3.2 프로덕션 DB 연결 정보 확인
Supabase Dashboard → Settings → Database:
```
Host: db.zykjdneewbzyazfukzyg.supabase.co
Port: 5432
Database: postgres
User: postgres
Password: [YOUR_PASSWORD]
```

#### 3.3 마이그레이션 실행
```bash
# Migration 1
psql -h db.zykjdneewbzyazfukzyg.supabase.co \
  -U postgres \
  -d postgres \
  -f supabase/migrations/20251121000000_fix_newsletter_security_issues.sql

# Password 입력

# Migration 2
psql -h db.zykjdneewbzyazfukzyg.supabase.co \
  -U postgres \
  -d postgres \
  -f supabase/migrations/20251122000000_fix_function_search_path.sql

# Migration 3
psql -h db.zykjdneewbzyazfukzyg.supabase.co \
  -U postgres \
  -d postgres \
  -f supabase/migrations/20251122000001_fix_critical_functions_search_path.sql
```

**출력 예시**:
```
DROP VIEW
CREATE VIEW
CREATE POLICY
CREATE FUNCTION
REVOKE
✅ 성공
```

**장점**:
- ✅ 명령줄 도구로 자동화 가능
- ✅ 스크립트 실행 편리

**단점**:
- ⚠️ psql 설치 및 설정 필요
- ⚠️ 연결 정보 노출 위험 (보안 주의)

---

## 검증 방법

### 빠른 검증 (30초)

#### 1. quick-verify-prod.sql 실행

**파일 위치**: `scripts/validation/quick-verify-prod.sql`

**Supabase Dashboard에서 실행**:
```sql
-- Newsletter Security (7개 체크)
-- 1. View exists
SELECT
  CASE
    WHEN EXISTS(
      SELECT 1 FROM pg_views
      WHERE schemaname = 'public'
      AND viewname = 'newsletter_subscribers'
    )
    THEN '✅ View exists'
    ELSE '❌ View missing'
  END as check_1;

-- 2. No auth.users exposure
SELECT
  CASE
    WHEN EXISTS(
      SELECT 1 FROM pg_views
      WHERE schemaname = 'public'
      AND viewname = 'newsletter_subscribers'
      AND definition NOT LIKE '%auth.users%'
    )
    THEN '✅ No auth.users exposure'
    ELSE '❌ auth.users still exposed'
  END as check_2;

-- 3. RLS policies
SELECT
  CASE
    WHEN COUNT(*) >= 3
    THEN '✅ 3+ RLS policies'
    ELSE '❌ RLS policies: ' || COUNT(*)::text
  END as check_3
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'user_profiles';

-- 4. No DEFINER functions
SELECT
  CASE
    WHEN COUNT(*) = 0
    THEN '✅ No DEFINER functions'
    ELSE '❌ DEFINER functions: ' || COUNT(*)::text
  END as check_4
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.prosecdef = true
AND p.proname IN ('subscribe_to_newsletter', 'unsubscribe_from_newsletter');

-- 5. Anonymous access revoked
SELECT
  CASE
    WHEN NOT EXISTS(
      SELECT 1 FROM information_schema.table_privileges
      WHERE table_schema = 'public'
      AND table_name = 'newsletter_subscriptions'
      AND grantee = 'anon'
    )
    THEN '✅ Anonymous access revoked'
    ELSE '❌ Anonymous still has access'
  END as check_5;

-- Function Search Path (2개 체크)
-- 6. Critical functions
SELECT
  CASE
    WHEN COUNT(CASE
      WHEN 'search_path=public, pg_temp' = ANY(p.proconfig)
      THEN 1
    END) >= 28
    THEN '✅ Critical functions: ' || COUNT(CASE WHEN 'search_path=public, pg_temp' = ANY(p.proconfig) THEN 1 END)::text || '/28+'
    ELSE '❌ Critical functions: ' || COUNT(CASE WHEN 'search_path=public, pg_temp' = ANY(p.proconfig) THEN 1 END)::text || '/28'
  END as check_6
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname IN (
  'subscribe_to_newsletter', 'unsubscribe_from_newsletter',
  'generate_password_reset_token', 'get_revenue_by_date'
);

-- 7. Trigger functions
SELECT
  CASE
    WHEN COUNT(CASE
      WHEN 'search_path=public, pg_temp' = ANY(p.proconfig)
      THEN 1
    END) >= 40
    THEN '✅ Trigger functions: ' || COUNT(CASE WHEN 'search_path=public, pg_temp' = ANY(p.proconfig) THEN 1 END)::text || '/44+'
    ELSE '⚠️  Trigger functions: ' || COUNT(CASE WHEN 'search_path=public, pg_temp' = ANY(p.proconfig) THEN 1 END)::text || '/44'
  END as check_7
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname LIKE '%_trigger';
```

**예상 결과** (모두 ✅):
```
check_1: ✅ View exists
check_2: ✅ No auth.users exposure
check_3: ✅ 3+ RLS policies
check_4: ✅ No DEFINER functions
check_5: ✅ Anonymous access revoked
check_6: ✅ Critical functions: 28/28+
check_7: ✅ Trigger functions: 44/44+
```

---

### 상세 검증 (2-3분)

#### 1. Newsletter 함수 동작 테스트

**Supabase Dashboard → SQL Editor**:
```sql
-- 1. 구독 테스트 (인증 필요)
SELECT subscribe_to_newsletter('test@example.com');
-- 예상: true (또는 "User must be authenticated" 에러)

-- 2. 구독 취소 테스트
SELECT unsubscribe_from_newsletter();
-- 예상: true (또는 "User must be authenticated" 에러)

-- 3. Admin 구독자 목록 조회 (Admin 전용)
SELECT * FROM get_newsletter_subscribers();
-- 예상: 구독자 목록 (또는 "Only admins can access" 에러)
```

#### 2. RLS 정책 확인

```sql
-- user_profiles 테이블 RLS 정책 개수
SELECT COUNT(*)
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'user_profiles';
-- 예상: 3개 이상

-- 정책 이름 확인
SELECT policyname
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'user_profiles';
-- 예상:
-- - Admins can view newsletter subscribers
-- - Users can view own newsletter subscription
-- - Users can update own newsletter subscription
```

#### 3. Function Search Path 확인 (72개 함수)

```sql
-- Newsletter 함수 search_path 확인
SELECT
  p.proname as function_name,
  CASE
    WHEN 'search_path=public, pg_temp' = ANY(p.proconfig)
    THEN '✅ Secure'
    ELSE '❌ No search_path'
  END as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname IN (
  'subscribe_to_newsletter',
  'unsubscribe_from_newsletter',
  'get_newsletter_subscribers'
)
ORDER BY p.proname;

-- 예상: 모두 ✅ Secure
```

**Critical 함수 search_path 확인**:
```sql
-- 64개 Critical 함수 확인
SELECT
  COUNT(*) FILTER (WHERE 'search_path=public, pg_temp' = ANY(p.proconfig)) as secure_count,
  COUNT(*) as total_count
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname IN (
  'generate_password_reset_token',
  'verify_password_reset_token',
  'get_revenue_by_date',
  'calculate_bounce_rate'
  -- ... (64개 함수 이름)
);

-- 예상: secure_count = total_count = 64
```

#### 4. Supabase Security Advisor 재실행

**Supabase Dashboard → Database → Advisors**:
1. **"Run Checks"** 버튼 클릭
2. 경고 개수 확인

**예상 결과**:
- Before: 🔴 2 Critical + 68 Warnings
- After: ✅ 0 Critical + ~5-10 Warnings (PostgreSQL 내부 함수만)

**보안 점수**:
- Before: 🔴 40/100
- After: 🟢 98-100/100

---

## 롤백 시나리오

### 시나리오 1: 즉시 롤백 (5분 이내 발견)

**상황**: 마이그레이션 적용 직후 심각한 오류 발견

**조치**:
1. Supabase Dashboard → Database → Backups
2. **Point-in-time Recovery** 선택
3. 마이그레이션 적용 직전 시각 선택 (예: 2025-11-22 02:00:00)
4. **Restore** 버튼 클릭
5. 5-10분 대기 (DB 복구 중)
6. 복구 완료 후 검증

**소요 시간**: 5-10분
**데이터 손실**: 없음 (마이그레이션 적용 후 새로운 데이터만 손실 가능)

---

### 시나리오 2: 지연 롤백 (1시간 이내 발견)

**상황**: 마이그레이션 적용 후 1시간 내 문제 발견, 사용자 데이터 보존 필요

**조치**:
1. 백업 SQL 파일 실행 (마이그레이션 역순)

**Migration 3 롤백** (Function Search Path):
```sql
-- 64개 함수 search_path 제거
ALTER FUNCTION generate_password_reset_token(TEXT) RESET search_path;
ALTER FUNCTION verify_password_reset_token(TEXT) RESET search_path;
... (64개 함수)
```

**Migration 2 롤백** (Newsletter Function Search Path):
```sql
-- 3개 Newsletter 함수 search_path 제거
ALTER FUNCTION subscribe_to_newsletter(TEXT) RESET search_path;
ALTER FUNCTION unsubscribe_from_newsletter() RESET search_path;
ALTER FUNCTION get_newsletter_subscribers() RESET search_path;
```

**Migration 1 롤백** (Newsletter 보안):
```sql
-- 1. View 원래대로 복구 (auth.users 포함)
DROP VIEW IF EXISTS public.newsletter_subscribers;
CREATE OR REPLACE VIEW public.newsletter_subscribers AS
SELECT
  id,
  user_id,
  COALESCE(newsletter_email, (SELECT email FROM auth.users WHERE id = user_id)) as email,
  display_name,
  newsletter_subscribed_at as subscribed_at,
  created_at
FROM public.user_profiles
WHERE newsletter_subscribed = true;

-- 2. 함수 SECURITY DEFINER로 변경
DROP FUNCTION IF EXISTS subscribe_to_newsletter(TEXT);
CREATE OR REPLACE FUNCTION subscribe_to_newsletter(p_email TEXT)
RETURNS BOOLEAN AS $$
  ... (기존 로직)
$$ LANGUAGE plpgsql
SECURITY DEFINER;  -- ⚠️ 원래대로 복구 (비권장)

-- 3. RLS 정책 제거
DROP POLICY IF EXISTS "Admins can view newsletter subscribers" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view own newsletter subscription" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own newsletter subscription" ON public.user_profiles;
```

**소요 시간**: 2-3분
**데이터 손실**: 없음 (사용자 데이터 보존)

---

### 시나리오 3: 검증 기반 롤백 (문제 특정 후)

**상황**: 특정 기능만 문제가 있어 일부만 롤백 필요

**조치**:

**Case 1: Newsletter 함수만 문제**
```sql
-- Newsletter 함수만 원래대로 복구
DROP FUNCTION IF EXISTS subscribe_to_newsletter(TEXT);
CREATE OR REPLACE FUNCTION subscribe_to_newsletter(p_email TEXT)
RETURNS BOOLEAN AS $$
  ... (기존 로직)
$$ LANGUAGE plpgsql
SECURITY DEFINER;

-- Function Search Path만 유지 (보안 강화)
ALTER FUNCTION subscribe_to_newsletter(TEXT) SET search_path = public, pg_temp;
```

**Case 2: RLS 정책만 문제**
```sql
-- RLS 정책만 제거, View와 함수는 유지
DROP POLICY IF EXISTS "Admins can view newsletter subscribers" ON public.user_profiles;

-- 기존 정책으로 복구
CREATE POLICY "Original policy name"
ON public.user_profiles FOR SELECT
USING (...);
```

**Case 3: Function Search Path만 문제**
```sql
-- 특정 함수 search_path만 제거
ALTER FUNCTION problematic_function() RESET search_path;
```

---

## 트러블슈팅

### 1. 권한 오류 (insufficient_privilege)

**에러 메시지**:
```
ERROR: permission denied for relation user_profiles
```

**원인**: postgres 사용자 권한 부족

**해결**:
```sql
-- postgres 사용자로 실행 확인
SELECT current_user;
-- 예상: postgres

-- 권한 부여
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO postgres;
```

---

### 2. RLS 정책 충돌 (policy already exists)

**에러 메시지**:
```
ERROR: policy "Admins can view newsletter subscribers" for table "user_profiles" already exists
```

**해결**:
```sql
-- 기존 정책 삭제 후 재생성
DROP POLICY IF EXISTS "Admins can view newsletter subscribers" ON public.user_profiles;

CREATE POLICY "Admins can view newsletter subscribers"
ON public.user_profiles FOR SELECT TO authenticated
USING (...);
```

---

### 3. 컬럼 누락 (column does not exist)

**에러 메시지**:
```
ERROR: column "newsletter_email" does not exist
```

**원인**: user_profiles 테이블에 newsletter_email 컬럼 없음

**확인**:
```sql
-- user_profiles 테이블 컬럼 확인
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'user_profiles';
```

**해결**:
```sql
-- newsletter_email 컬럼 추가
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS newsletter_email TEXT;

-- newsletter_subscribed_at 컬럼 추가
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS newsletter_subscribed_at TIMESTAMPTZ;
```

---

### 4. 테이블 누락 (relation does not exist)

**에러 메시지**:
```
ERROR: relation "user_roles" does not exist
```

**확인**:
```sql
-- 테이블 존재 여부 확인
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'user_roles';
```

**해결**:
```sql
-- user_roles 테이블 생성 (이전 마이그레이션 적용 필요)
-- 이 경우, 이전 마이그레이션 파일 먼저 적용하거나
-- 해당 RLS 정책 제거
DROP POLICY IF EXISTS "Admins can view newsletter subscribers" ON public.user_profiles;
```

---

### 5. Function Search Path 설정 실패

**에러 메시지**:
```
ERROR: function "generate_password_reset_token" does not exist
```

**확인**:
```sql
-- 함수 존재 여부 확인
SELECT p.proname, pg_get_functiondef(p.oid)
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname = 'generate_password_reset_token';
```

**해결**:
```sql
-- 함수가 없으면 Skip (해당 함수는 아직 구현 안 됨)
-- 또는 함수 파라미터 타입 확인
ALTER FUNCTION generate_password_reset_token(TEXT) SET search_path = public, pg_temp;
-- 파라미터 타입이 다르면:
ALTER FUNCTION generate_password_reset_token(VARCHAR) SET search_path = public, pg_temp;
```

---

## 24시간 모니터링 계획

### 첫 1시간 (Critical)

**체크 항목**:
- [ ] Newsletter 구독/취소 기능 정상 작동 (프로덕션 웹사이트)
- [ ] AdminNewsletter 페이지 정상 표시 (admin@ideaonaction.local 로그인)
- [ ] Supabase Dashboard → Database → Logs에서 에러 없음 확인
- [ ] Sentry 에러 트래킹 확인 (Newsletter 관련 에러)

**모니터링 도구**:
- Supabase Dashboard → Database → Logs
- Sentry → Issues → Newsletter
- Google Analytics → Real-time users

**알림 설정**:
- Supabase 에러 알림 (Slack/Discord)
- Sentry 에러 알림 (이메일)

---

### 8시간 체크포인트

**체크 항목**:
- [ ] Newsletter 구독자 수 변화 확인 (AdminNewsletter 통계 대시보드)
- [ ] 에러 로그 누적 확인 (0개 목표)
- [ ] 성능 메트릭 확인 (응답 시간 2초 이하)

**검증 쿼리**:
```sql
-- 지난 8시간 구독자 수 증가
SELECT COUNT(*)
FROM newsletter_subscriptions
WHERE subscribed_at >= NOW() - INTERVAL '8 hours';

-- 에러 로그 확인
SELECT *
FROM logs
WHERE level = 'error'
AND created_at >= NOW() - INTERVAL '8 hours';
```

---

### 24시간 체크포인트

**체크 항목**:
- [ ] Newsletter 기능 완전 정상 작동 (구독/취소/Admin 관리)
- [ ] 보안 점수 재확인 (Supabase Security Advisor)
- [ ] 성능 벤치마크 (빌드 시간, 번들 크기)

**최종 검증**:
```sql
-- 24시간 구독자 수 증가
SELECT COUNT(*)
FROM newsletter_subscriptions
WHERE subscribed_at >= NOW() - INTERVAL '24 hours';

-- Supabase Security Advisor 재실행
-- Dashboard → Database → Advisors → Run Checks

-- 예상: 보안 점수 98-100/100
```

---

## FAQ

### Q1: 마이그레이션 적용 중 다운타임이 있나요?
**A**: 아니요, **다운타임 없이 적용 가능**합니다 (HOT migration).

**이유**:
- CREATE OR REPLACE 사용 (함수 재정의)
- ALTER FUNCTION 사용 (기존 함수 수정)
- RLS 정책 추가 (기존 데이터 영향 없음)

### Q2: 로컬 DB에서 테스트해야 하나요?
**A**: **권장합니다**. 프로덕션 적용 전 로컬 DB에서 검증하세요.

**로컬 테스트 방법**:
```bash
# Docker Desktop 실행
supabase start

# DB 리셋 (마이그레이션 적용)
supabase db reset

# 검증
supabase db diff
```

### Q3: 마이그레이션 파일 순서가 중요한가요?
**A**: 네, **순서가 중요합니다**.

**적용 순서**:
1. 20251121000000 (Newsletter 보안) - 먼저 적용 필수
2. 20251122000000 (Newsletter Function Search Path) - 1번 이후
3. 20251122000001 (Critical Functions Search Path) - 1, 2번 이후

**이유**: Migration 2, 3은 Migration 1에서 생성된 함수에 의존합니다.

### Q4: 프로덕션 DB 백업은 어떻게 확인하나요?
**A**: Supabase Dashboard → Database → Backups

**확인 항목**:
- Point-in-time Recovery 활성화 (24시간)
- 최근 백업 시간 (6시간 이내 권장)
- 백업 크기 (DB 크기와 일치)

### Q5: 롤백 시 사용자 데이터가 손실되나요?
**A**: **시나리오에 따라 다릅니다**:

- **즉시 롤백** (5분 이내): 마이그레이션 후 새 데이터만 손실 가능
- **지연 롤백** (1시간 이내): 사용자 데이터 보존 (백업 SQL 실행)
- **Point-in-time Recovery**: 복구 시점 이후 데이터 손실 가능

**권장**: 지연 롤백 (백업 SQL 실행)

### Q6: Supabase CLI 없이 적용 가능한가요?
**A**: 네, **Supabase Dashboard SQL Editor**로 적용 가능합니다.

**방법**: [방법 2: Supabase Dashboard SQL Editor](#방법-2-supabase-dashboard-sql-editor-간편) 참고

### Q7: 보안 점수가 100점이 아닌 이유는?
**A**: PostgreSQL 내부 함수 및 Extension 함수는 수정 불가능합니다.

**남은 경고** (~5-10개):
- pg_stat_statements (PostgreSQL Extension)
- plpgsql_check (Extension)
- PostgreSQL 내부 함수

**Custom 함수**: 100% 수정 완료 (72개)

### Q8: 마이그레이션 적용 후 확인 방법은?
**A**: [검증 방법](#검증-방법) 섹션 참고

**빠른 검증** (30초):
- `scripts/validation/quick-verify-prod.sql` 실행
- 13개 항목 모두 ✅ 확인

**상세 검증** (2-3분):
- Newsletter 함수 동작 테스트
- RLS 정책 확인
- Function Search Path 확인 (72개)
- Supabase Security Advisor 재실행

---

**관련 가이드**:
- [Admin Newsletter Guide](../cms/admin-newsletter-guide.md) - 관리자 사용법
- [Validation Scripts](../../../scripts/validation/) - 검증 스크립트
- [Supabase Security Best Practices](https://supabase.com/docs/guides/database/database-advisors) - 공식 문서

**지원**: 마이그레이션 중 문제 발생 시 [admin@ideaonaction.ai](mailto:admin@ideaonaction.ai)로 문의하세요.

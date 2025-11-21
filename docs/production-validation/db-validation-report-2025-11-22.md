# 프로덕션 DB 검증 보고서

**작성일**: 2025-11-22
**작성자**: Claude (Agent 1)
**목적**: Newsletter 보안 및 Function Search Path 마이그레이션 프로덕션 적용 검증

---

## Executive Summary

### 검증 개요
- **총 검증 항목**: 13개 (Newsletter 8개 + Function Search Path 3개 + 추가 보안 2개)
- **예상 소요 시간**:
  - 빠른 검증: 30초 (7개 핵심 항목)
  - 상세 검증: 2-3분 (13개 전체 항목)
- **우선순위**: **HIGH** (보안 취약점 해결 검증)
- **권장 실행 주기**: 배포 후 즉시, 그 후 매주 1회

### 검증 대상 마이그레이션
1. **Newsletter 보안 마이그레이션** (20251121000000)
   - auth.users 노출 제거
   - SECURITY DEFINER → SECURITY INVOKER 변경
   - Email 검증 강화
   - RLS 정책 재구성
   - Anonymous 권한 제한

2. **Function Search Path 수정** (20251122000001)
   - Critical 함수 28개: 인증, 결제, 분석, 뉴스레터 등
   - Trigger 함수 44개: updated_at, created_by, 기타
   - 총 72개 함수 SQL Injection 방어

### 예상 결과 요약
| 카테고리 | 검증 항목 | 통과 기준 | 우선순위 |
|---------|---------|---------|---------|
| Newsletter 보안 | 8개 | 8/8 PASS | 🔴 Critical |
| Function Search Path | 3개 | 3/3 PASS | 🟠 High |
| 추가 보안 검사 | 2개 | 2/2 PASS | 🟡 Medium |

---

## 빠른 검증 (30초)

### 실행 방법

#### Option 1: Supabase Dashboard (권장)
```sql
-- Supabase Dashboard → SQL Editor에서 실행
-- 파일: scripts/validation/quick-verify-prod.sql
```

1. Supabase Dashboard 접속: https://supabase.com/dashboard
2. 프로젝트 선택: `idea-on-action` (Production)
3. 좌측 메뉴 → **SQL Editor**
4. 새 쿼리 → `quick-verify-prod.sql` 파일 내용 복사/붙여넣기
5. **Run** 버튼 클릭
6. 결과 확인 (30초 이내)

#### Option 2: psql CLI
```bash
# psql 접속 (프로덕션 DB)
psql "postgresql://postgres:[PASSWORD]@db.zykjdneewbzyazfukzyg.supabase.co:5432/postgres"

# 검증 스크립트 실행
\i scripts/validation/quick-verify-prod.sql
```

### 예상 결과 (7개 체크)

```
🔍 Quick Production Migration Verification
===========================================

📧 Newsletter Security:
✅ View exists
✅ No auth.users exposure
✅ 3 RLS policies
✅ No DEFINER functions
✅ Anonymous access revoked

🔧 Function Search Path:
✅ Critical functions: 28/28+
✅ Trigger functions: 44/44+

📊 Overall Status:
✅ ALL MIGRATIONS VERIFIED

===========================================
```

### 통과 기준

| 체크 번호 | 항목 | 통과 조건 | 실패 시 조치 |
|---------|------|---------|------------|
| check_1 | View exists | ✅ View exists | 👉 [조치 1](#조치-1-view-missing) |
| check_2 | No auth.users | ✅ No auth.users exposure | 👉 [조치 2](#조치-2-autousers-exposure) |
| check_3 | RLS policies | ✅ 3 RLS policies | 👉 [조치 3](#조치-3-rls-policies) |
| check_4 | No DEFINER | ✅ No DEFINER functions | 👉 [조치 4](#조치-4-security-definer) |
| check_5 | Anonymous revoked | ✅ Anonymous access revoked | 👉 [조치 5](#조치-5-anonymous-access) |
| check_6 | Critical functions | ✅ Critical functions: 28/28+ | 👉 [조치 6](#조치-6-critical-functions) |
| check_7 | Trigger functions | ✅ Trigger functions: 44/44+ | 👉 [조치 7](#조치-7-trigger-functions) |

---

## 상세 검증 (2-3분)

### 실행 방법
```bash
# Supabase Dashboard → SQL Editor
# 파일: scripts/validation/verify-production-migrations.sql
```

### Part 1: Newsletter 보안 검증 (8개 체크)

#### Check 1/8: newsletter_subscribers 뷰 존재 확인
```sql
-- 검증 쿼리
SELECT EXISTS(
  SELECT 1 FROM pg_views
  WHERE schemaname = 'public'
  AND viewname = 'newsletter_subscribers'
) as view_exists;
```

**통과 기준**: `TRUE`

**예상 결과**:
```
✅ PASS: newsletter_subscribers view exists
```

**실패 시 조치**: 👉 [조치 1](#조치-1-view-missing)

---

#### Check 2/8: View security_invoker 설정 확인
```sql
-- 검증 쿼리
SELECT EXISTS(
  SELECT 1 FROM pg_views
  WHERE schemaname = 'public'
  AND viewname = 'newsletter_subscribers'
  AND definition LIKE '%security_invoker%'
) as has_security_invoker;
```

**통과 기준**: `TRUE`

**예상 결과**:
```
✅ PASS: View has security_invoker = true
```

**실패 시 조치**:
- View가 SECURITY DEFINER로 실행되어 RLS 우회 가능
- 마이그레이션 재실행 필요

---

#### Check 3/8: auth.users 참조 제거 확인
```sql
-- 검증 쿼리
SELECT EXISTS(
  SELECT 1 FROM pg_views
  WHERE schemaname = 'public'
  AND viewname = 'newsletter_subscribers'
  AND definition LIKE '%auth.users%'
) as has_auth_users_ref;
```

**통과 기준**: `FALSE` (auth.users 참조 없음)

**예상 결과**:
```
✅ PASS: View does not reference auth.users
```

**실패 시 조치**: 👉 [조치 2](#조치-2-autousers-exposure)

---

#### Check 4/8: RLS 정책 개수 확인
```sql
-- 검증 쿼리
SELECT COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'newsletter_subscriptions';
```

**통과 기준**: `3`

**예상 결과**:
```
✅ PASS: Found 3 RLS policies
```

**RLS 정책 상세**:
1. `newsletter_select_own` - 사용자가 자기 구독만 조회
2. `newsletter_insert_own` - 사용자가 자기 구독만 생성
3. `admin_all_newsletter` - 관리자 전체 접근

**실패 시 조치**: 👉 [조치 3](#조치-3-rls-policies)

---

#### Check 5/8: Anonymous 권한 제거 확인
```sql
-- 검증 쿼리
SELECT NOT EXISTS(
  SELECT 1 FROM information_schema.table_privileges
  WHERE table_schema = 'public'
  AND table_name = 'newsletter_subscriptions'
  AND grantee = 'anon'
  AND privilege_type IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
) as anon_revoked;
```

**통과 기준**: `TRUE`

**예상 결과**:
```
✅ PASS: Anonymous role privileges revoked
```

**실패 시 조치**: 👉 [조치 5](#조치-5-anonymous-access)

---

#### Check 6/8: subscribe_to_newsletter SECURITY INVOKER
```sql
-- 검증 쿼리
SELECT prosecdef = false as is_invoker
FROM pg_proc
WHERE proname = 'subscribe_to_newsletter'
AND pronamespace = 'public'::regnamespace;
```

**통과 기준**: `TRUE` (prosecdef = false)

**예상 결과**:
```
✅ PASS: subscribe_to_newsletter uses SECURITY INVOKER
```

**실패 시 조치**: 👉 [조치 4](#조치-4-security-definer)

---

#### Check 7/8: unsubscribe_from_newsletter SECURITY INVOKER
```sql
-- 검증 쿼리
SELECT prosecdef = false as is_invoker
FROM pg_proc
WHERE proname = 'unsubscribe_from_newsletter'
AND pronamespace = 'public'::regnamespace;
```

**통과 기준**: `TRUE`

**예상 결과**:
```
✅ PASS: unsubscribe_from_newsletter uses SECURITY INVOKER
```

---

#### Check 8/8: admin_get_newsletter_count SECURITY INVOKER
```sql
-- 검증 쿼리
SELECT prosecdef = false as is_invoker
FROM pg_proc
WHERE proname = 'admin_get_newsletter_count'
AND pronamespace = 'public'::regnamespace;
```

**통과 기준**: `TRUE`

**예상 결과**:
```
✅ PASS: admin_get_newsletter_count uses SECURITY INVOKER
```

---

### Part 2: Function Search Path 검증 (3개 체크)

#### Check 1/3: Critical 함수 (28개) search_path 설정
```sql
-- 검증 쿼리
SELECT
  COUNT(*) as total,
  COUNT(CASE
    WHEN 'search_path=public, pg_temp' = ANY(p.proconfig)
    THEN 1
  END) as with_path
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname IN (
  'is_admin_user', 'can_admin_delete', 'check_admin_access',
  'handle_new_user', 'assign_user_role', 'update_user_profile',
  'get_total_revenue', 'get_monthly_revenue', 'get_revenue_by_service',
  'subscribe_to_newsletter', 'unsubscribe_from_newsletter',
  'admin_get_newsletter_count', 'increment_service_view_count',
  'get_service_analytics', 'get_featured_projects',
  'increment_project_view_count', 'get_active_roadmap_items',
  'update_roadmap_progress'
  -- ... (총 28개)
);
```

**통과 기준**: `28/28` (100%)

**예상 결과**:
```
✅ PASS: All 28 critical functions have search_path
```

**Critical 함수 카테고리**:
1. **Admin** (3개): is_admin_user, can_admin_delete, check_admin_access
2. **Auth** (3개): handle_new_user, assign_user_role, update_user_profile
3. **Revenue** (10개): get_total_revenue, get_monthly_revenue, ...
4. **Newsletter** (3개): subscribe, unsubscribe, admin_get_count
5. **Analytics** (9개): service, project, roadmap 관련

**실패 시 조치**: 👉 [조치 6](#조치-6-critical-functions)

---

#### Check 2/3: Trigger 함수 (44개) search_path 설정
```sql
-- 검증 쿼리
SELECT
  COUNT(*) as total,
  COUNT(CASE
    WHEN 'search_path=public, pg_temp' = ANY(p.proconfig)
    THEN 1
  END) as with_path
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname LIKE '%_trigger';
```

**통과 기준**: `44/44` (100%)

**예상 결과**:
```
✅ PASS: All 44/44 trigger functions have search_path
```

**Trigger 함수 카테고리**:
1. **updated_at** (22개): 테이블 업데이트 시각 자동 설정
2. **created_by** (7개): 생성자 ID 자동 설정
3. **기타** (15개): 상태 검증, 로깅, 통계 업데이트

**실패 시 조치**: 👉 [조치 7](#조치-7-trigger-functions)

---

#### Check 3/3: 전체 함수 통계
```sql
-- 검증 쿼리
SELECT
  COUNT(CASE
    WHEN 'search_path=public, pg_temp' = ANY(p.proconfig)
    THEN 1
  END) as total_with_path
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public';
```

**통과 기준**: `≥ 72` (28 Critical + 44 Trigger)

**예상 결과**:
```
✅ Function Search Path Migration: VERIFIED
Total: 72/72 functions have search_path
```

**실패 시 조치**:
- 72개 미만: 일부 함수 누락 → 마이그레이션 재실행
- 72개 초과: 정상 (추가 함수 존재)

---

### Part 3: 추가 보안 검사 (2개 체크)

#### Check 1/2: 남은 SECURITY DEFINER 함수 확인
```sql
-- 검증 쿼리
SELECT
  COUNT(*) as definer_count,
  array_agg(p.proname) as function_names
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.prosecdef = true;
```

**통과 기준**: `0` (SECURITY DEFINER 함수 없음)

**예상 결과**:
```
✅ PASS: No SECURITY DEFINER functions
```

**실패 시**:
- ⚠️ 일부 함수가 SECURITY DEFINER 사용 중
- 영향: RLS 정책 우회 가능, 감사 추적 불가
- 조치: 각 함수별로 SECURITY INVOKER 필요 여부 검토

---

#### Check 2/2: 모든 View security_invoker 확인
```sql
-- 검증 쿼리
SELECT
  COUNT(*) as total_views,
  COUNT(CASE
    WHEN definition LIKE '%security_invoker%'
    THEN 1
  END) as secure_views
FROM pg_views
WHERE schemaname = 'public';
```

**통과 기준**: `total_views = secure_views`

**예상 결과**:
```
✅ PASS: All views have security_invoker
```

**실패 시**:
- ⚠️ 일부 View가 security_invoker 없이 실행
- 영향: RLS 정책 미적용 가능
- 조치: 각 View에 `WITH (security_invoker = true)` 추가

---

## 실행 가이드

### 1단계: 환경 준비

#### Supabase Dashboard (권장)
```bash
# 1. 브라우저에서 Supabase Dashboard 접속
https://supabase.com/dashboard

# 2. 프로젝트 선택
idea-on-action (Production)

# 3. SQL Editor 열기
Left Menu → SQL Editor → New Query
```

#### psql CLI (고급 사용자)
```bash
# 1. 환경 변수 설정
export SUPABASE_DB_PASSWORD="[YOUR_PASSWORD]"
export SUPABASE_PROJECT_REF="zykjdneewbzyazfukzyg"

# 2. psql 접속
psql "postgresql://postgres:${SUPABASE_DB_PASSWORD}@db.${SUPABASE_PROJECT_REF}.supabase.co:5432/postgres"

# 3. 검증 스크립트 경로 확인
\i scripts/validation/quick-verify-prod.sql
```

---

### 2단계: 빠른 검증 실행 (30초)

#### Supabase Dashboard
1. SQL Editor 새 쿼리 열기
2. `scripts/validation/quick-verify-prod.sql` 파일 내용 복사
3. **Run** 버튼 클릭
4. 결과 확인 (7개 체크)

#### psql CLI
```bash
# 검증 스크립트 실행
\i scripts/validation/quick-verify-prod.sql

# 출력 예시:
# ✅ View exists
# ✅ No auth.users exposure
# ✅ 3 RLS policies
# ✅ No DEFINER functions
# ✅ Anonymous access revoked
# ✅ Critical functions: 28/28+
# ✅ Trigger functions: 44/44+
# ✅ ALL MIGRATIONS VERIFIED
```

---

### 3단계: 상세 검증 실행 (2-3분)

#### Supabase Dashboard
1. SQL Editor 새 쿼리 열기
2. `scripts/validation/verify-production-migrations.sql` 파일 내용 복사
3. **Run** 버튼 클릭
4. 결과 확인 (13개 체크)

#### psql CLI
```bash
# 상세 검증 실행
\i scripts/validation/verify-production-migrations.sql

# 출력 예시:
# 1. Newsletter Security Migration (20251121000000)
#    Check 1/8: newsletter_subscribers view exists
#    ✅ PASS: newsletter_subscribers view exists
#    Check 2/8: View has security_invoker = true
#    ✅ PASS: View has security_invoker = true
#    ...
#    Summary: 8/8 checks passed
#    ✅ Newsletter Security Migration: VERIFIED
#
# 2. Function Search Path Migration (20251122000001)
#    Check 1/3: Critical functions (28 expected)
#    ✅ PASS: All 28 critical functions have search_path
#    ...
#    ✅ Function Search Path Migration: VERIFIED
#
# 3. Additional Security Checks
#    Check 1/2: Remaining SECURITY DEFINER functions
#    ✅ PASS: No SECURITY DEFINER functions
#    ...
```

---

### 4단계: 결과 해석

#### 모든 체크 통과 (13/13 PASS)
```
✅ Newsletter Security Migration: VERIFIED (8/8)
✅ Function Search Path Migration: VERIFIED (3/3)
✅ Additional Security Checks: VERIFIED (2/2)
```

**조치**: 없음. 프로덕션 DB가 최신 보안 설정 적용됨.

---

#### 일부 체크 실패 (예: 10/13 PASS)
```
❌ Newsletter Security Migration: FAILED (6/8)
   ❌ FAIL: View still references auth.users
   ❌ FAIL: subscribe_to_newsletter uses SECURITY DEFINER
✅ Function Search Path Migration: VERIFIED (3/3)
✅ Additional Security Checks: VERIFIED (2/2)
```

**조치**: 실패한 항목에 대해 [트러블슈팅](#트러블슈팅) 참조

---

## 트러블슈팅

### 조치 1: View Missing

**증상**:
```
❌ FAIL: newsletter_subscribers view does not exist
```

**원인**: 마이그레이션이 프로덕션에 적용되지 않음

**해결 방법**:
```bash
# Supabase Dashboard → SQL Editor
# 마이그레이션 파일 실행
supabase/migrations/20251121000000_fix_newsletter_security_issues.sql
```

**검증**:
```sql
SELECT COUNT(*) FROM pg_views
WHERE schemaname = 'public'
AND viewname = 'newsletter_subscribers';
-- 기대값: 1
```

---

### 조치 2: auth.users Exposure

**증상**:
```
❌ FAIL: View still references auth.users
```

**원인**: 뷰 정의가 이전 버전 (auth.users 참조)

**해결 방법**:
```sql
-- 기존 뷰 삭제
DROP VIEW IF EXISTS public.newsletter_subscribers CASCADE;

-- 새 뷰 생성 (auth.users 참조 제거)
CREATE VIEW public.newsletter_subscribers
WITH (security_invoker = true)
AS
SELECT
  id,
  newsletter_email as email,
  status,
  created_at,
  confirmed_at,
  unsubscribed_at
FROM public.newsletter_subscriptions
WHERE newsletter_email IS NOT NULL;
```

**검증**:
```sql
SELECT definition
FROM pg_views
WHERE schemaname = 'public'
AND viewname = 'newsletter_subscribers';
-- auth.users가 없어야 함
```

---

### 조치 3: RLS Policies

**증상**:
```
❌ FAIL: Found 2 RLS policies (expected 3)
```

**원인**: RLS 정책이 누락되었거나 삭제됨

**해결 방법**:
```sql
-- 1. 기존 정책 확인
SELECT policyname FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'newsletter_subscriptions';

-- 2. 누락된 정책 생성 (3개 필요)
-- (a) newsletter_select_own
CREATE POLICY newsletter_select_own
ON newsletter_subscriptions FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- (b) newsletter_insert_own
CREATE POLICY newsletter_insert_own
ON newsletter_subscriptions FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- (c) admin_all_newsletter
CREATE POLICY admin_all_newsletter
ON newsletter_subscriptions FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
  )
);
```

**검증**:
```sql
SELECT COUNT(*) FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'newsletter_subscriptions';
-- 기대값: 3
```

---

### 조치 4: SECURITY DEFINER

**증상**:
```
❌ FAIL: subscribe_to_newsletter uses SECURITY DEFINER
```

**원인**: 함수가 SECURITY DEFINER로 정의됨 (RLS 우회)

**해결 방법**:
```sql
-- 함수 재생성 (SECURITY INVOKER)
CREATE OR REPLACE FUNCTION subscribe_to_newsletter(
  p_email TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER  -- ← 중요!
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_result JSONB;
BEGIN
  -- 명시적 인증 체크
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Email 검증
  IF p_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid email format');
  END IF;

  -- 구독 추가 로직
  INSERT INTO newsletter_subscriptions (user_id, newsletter_email, status)
  VALUES (v_user_id, LOWER(p_email), 'pending')
  ON CONFLICT (user_id) DO UPDATE
  SET newsletter_email = EXCLUDED.newsletter_email,
      status = 'pending',
      updated_at = NOW();

  RETURN jsonb_build_object('success', true);
END;
$$;
```

**검증**:
```sql
SELECT prosecdef FROM pg_proc
WHERE proname = 'subscribe_to_newsletter'
AND pronamespace = 'public'::regnamespace;
-- 기대값: false (SECURITY INVOKER)
```

---

### 조치 5: Anonymous Access

**증상**:
```
❌ FAIL: Anonymous role still has privileges
```

**원인**: anon 역할에 newsletter_subscriptions 테이블 권한 부여됨

**해결 방법**:
```sql
-- 모든 권한 제거
REVOKE ALL ON newsletter_subscriptions FROM anon;
REVOKE ALL ON newsletter_subscriptions FROM authenticated;

-- authenticated 역할만 RLS를 통해 접근 가능
GRANT SELECT, INSERT, UPDATE, DELETE ON newsletter_subscriptions TO authenticated;
```

**검증**:
```sql
SELECT grantee, privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public'
AND table_name = 'newsletter_subscriptions'
AND grantee = 'anon';
-- 기대값: 0 rows (anon은 권한 없음)
```

---

### 조치 6: Critical Functions

**증상**:
```
❌ FAIL: Critical functions: 20/28 have search_path (expected 28/28)
```

**원인**: 일부 Critical 함수에 search_path 설정 누락

**해결 방법**:
```sql
-- 누락된 함수 확인
SELECT p.proname
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname IN (
  'is_admin_user', 'can_admin_delete', 'check_admin_access',
  'handle_new_user', 'assign_user_role', 'update_user_profile',
  'get_total_revenue', 'get_monthly_revenue', 'get_revenue_by_service',
  -- ... (총 28개)
)
AND NOT ('search_path=public, pg_temp' = ANY(p.proconfig));

-- 각 함수에 search_path 추가
ALTER FUNCTION is_admin_user(UUID) SET search_path = public, pg_temp;
ALTER FUNCTION can_admin_delete(UUID) SET search_path = public, pg_temp;
-- ... (누락된 함수 모두 추가)
```

**일괄 처리** (선택):
```sql
-- 마이그레이션 파일 재실행
-- supabase/migrations/20251122000001_fix_critical_functions_search_path.sql
```

**검증**:
```sql
SELECT COUNT(CASE WHEN 'search_path=public, pg_temp' = ANY(p.proconfig) THEN 1 END) as with_path
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname IN ('is_admin_user', 'can_admin_delete', ...);
-- 기대값: 28
```

---

### 조치 7: Trigger Functions

**증상**:
```
⚠️  WARN: Trigger functions: 35/44 have search_path
```

**원인**: 일부 Trigger 함수에 search_path 설정 누락

**해결 방법**:
```sql
-- 누락된 Trigger 함수 확인
SELECT p.proname
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname LIKE '%_trigger'
AND NOT ('search_path=public, pg_temp' = ANY(p.proconfig));

-- 각 Trigger 함수에 search_path 추가
ALTER FUNCTION update_updated_at_trigger() SET search_path = public, pg_temp;
ALTER FUNCTION set_created_by_trigger() SET search_path = public, pg_temp;
-- ... (누락된 Trigger 함수 모두 추가)
```

**일괄 처리** (선택):
```bash
# 마이그레이션 파일 재실행
supabase/migrations/20251122000001_fix_critical_functions_search_path.sql
```

**검증**:
```sql
SELECT COUNT(CASE WHEN 'search_path=public, pg_temp' = ANY(p.proconfig) THEN 1 END) as with_path
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname LIKE '%_trigger';
-- 기대값: 44
```

---

## 보안 점수 평가

### 점수 계산 기준
| 카테고리 | 체크 항목 | 가중치 | 만점 |
|---------|---------|--------|------|
| Newsletter 보안 | 8개 | 10점 | 80점 |
| Function Search Path | 3개 | 5점 | 15점 |
| 추가 보안 검사 | 2개 | 2.5점 | 5점 |
| **Total** | **13개** | - | **100점** |

### 점수 등급
- **95-100점**: 🟢 Excellent (프로덕션 준비 완료)
- **85-94점**: 🟡 Good (경미한 이슈, 배포 가능)
- **70-84점**: 🟠 Fair (보안 이슈 일부, 수정 권장)
- **0-69점**: 🔴 Poor (심각한 보안 이슈, 배포 보류)

### 예시: 모든 체크 통과 (100점)
```
Newsletter 보안: 8/8 PASS → 80점
Function Search Path: 3/3 PASS → 15점
추가 보안 검사: 2/2 PASS → 5점
-----------------------------------
Total: 100점 (🟢 Excellent)
```

### 예시: 일부 체크 실패 (80점)
```
Newsletter 보안: 6/8 PASS → 60점
  ❌ auth.users 참조 존재 (-10점)
  ❌ SECURITY DEFINER 사용 (-10점)
Function Search Path: 3/3 PASS → 15점
추가 보안 검사: 2/2 PASS → 5점
-----------------------------------
Total: 80점 (🟠 Fair)
```

---

## 후속 조치

### 1. 정기 검증 일정
- **주간 검증**: 매주 월요일 오전 9시 (빠른 검증 30초)
- **월간 검증**: 매월 1일 오전 10시 (상세 검증 2-3분)
- **배포 후 검증**: 프로덕션 배포 즉시 (필수)

### 2. 모니터링 설정
```sql
-- Supabase Dashboard → Database → Webhooks
-- Newsletter 보안 이벤트 알림 설정
CREATE OR REPLACE FUNCTION notify_security_violation()
RETURNS TRIGGER AS $$
BEGIN
  -- Slack/Discord 웹훅으로 알림 전송
  PERFORM net.http_post(
    url := 'https://hooks.slack.com/services/YOUR_WEBHOOK',
    body := jsonb_build_object(
      'text', format('Security violation detected: %s', TG_TABLE_NAME)
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger 설정 (예: newsletter_subscriptions 테이블)
CREATE TRIGGER security_violation_alert
AFTER INSERT OR UPDATE OR DELETE ON newsletter_subscriptions
FOR EACH ROW
WHEN (pg_trigger_depth() = 0)  -- 무한 루프 방지
EXECUTE FUNCTION notify_security_violation();
```

### 3. 문서 업데이트
- **검증 이력 기록**: 각 검증 실행 시 결과를 `docs/production-validation/history/` 폴더에 저장
- **변경 로그 업데이트**: `docs/project/changelog.md`에 보안 패치 기록

### 4. 팀 공유
- 검증 결과를 팀 전체에 공유 (Slack/Discord)
- 실패한 체크가 있을 경우 즉시 알림
- 매월 보안 점수 트렌드 리포트 작성

---

## 부록

### A. 관련 마이그레이션 파일
1. **Newsletter 보안**:
   - `supabase/migrations/20251121000000_fix_newsletter_security_issues.sql`
   - 크기: ~275줄
   - 변경 내용: auth.users 제거, SECURITY INVOKER, RLS 재구성

2. **Function Search Path**:
   - `supabase/migrations/20251122000001_fix_critical_functions_search_path.sql`
   - 크기: ~224줄
   - 변경 내용: 64개 함수 ALTER FUNCTION 수정

### B. 검증 스크립트 위치
- **빠른 검증** (30초): `scripts/validation/quick-verify-prod.sql`
- **상세 검증** (2-3분): `scripts/validation/verify-production-migrations.sql`

### C. 추가 문서
- **Newsletter 보안 가이드**: `docs/guides/security/newsletter-security-quick-ref.md`
- **Function Search Path 가이드**: `docs/guides/security/function-search-path-validation.md`
- **마이그레이션 가이드**: `docs/guides/security/apply-newsletter-security-migration.md`

### D. 연락처
문제 발생 시:
1. GitHub Issue 생성: https://github.com/IDEA-on-Action/idea-on-action/issues
2. 개발팀 이메일: dev@ideaonaction.ai
3. 긴급 Slack: #production-alerts 채널

---

## 최종 체크리스트

### 실행 전
- [ ] Supabase Dashboard 접속 확인
- [ ] 프로덕션 DB 접근 권한 확인
- [ ] 검증 스크립트 파일 위치 확인

### 실행 중
- [ ] 빠른 검증 (30초) 실행
- [ ] 결과 7개 체크 확인
- [ ] 상세 검증 (2-3분) 실행 (선택)
- [ ] 결과 13개 체크 확인 (선택)

### 실행 후
- [ ] 보안 점수 계산 (0-100점)
- [ ] 실패한 체크 트러블슈팅
- [ ] 검증 결과 팀 공유
- [ ] 이력 파일 생성 (선택)
- [ ] 다음 검증 일정 예약

---

**보고서 종료**

작성일: 2025-11-22
작성자: Claude (Agent 1)
버전: 1.0
상태: Production Ready

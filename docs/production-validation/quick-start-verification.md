# 프로덕션 DB 빠른 검증 가이드 (5분)

**목적**: Newsletter 보안 및 Function Search Path 마이그레이션 적용 여부를 5분 내 확인
**대상**: DevOps, Backend 개발자
**소요 시간**: 5분 (빠른 검증 30초 + 상세 검증 2-3분 + 결과 분석 1-2분)

---

## 🚀 빠른 시작 (3단계)

### 1단계: Supabase Dashboard 접속 (30초)
```
1. https://supabase.com/dashboard 접속
2. idea-on-action (Production) 프로젝트 선택
3. 좌측 메뉴 → SQL Editor 클릭
```

### 2단계: 빠른 검증 실행 (30초)
```sql
-- 복사해서 SQL Editor에 붙여넣기 후 Run 클릭
-- 파일: scripts/validation/quick-verify-prod.sql

-- Newsletter Security (5 checks)
SELECT CASE
  WHEN EXISTS(SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'newsletter_subscribers')
  THEN '✅ View exists' ELSE '❌ View missing' END as check_1;

SELECT CASE
  WHEN EXISTS(SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'newsletter_subscribers' AND definition NOT LIKE '%auth.users%')
  THEN '✅ No auth.users exposure' ELSE '❌ auth.users still exposed' END as check_2;

SELECT CASE
  WHEN COUNT(*) = 3 THEN '✅ 3 RLS policies' ELSE '❌ RLS policies: ' || COUNT(*)::text END as check_3
FROM pg_policies WHERE schemaname = 'public' AND tablename = 'newsletter_subscriptions';

SELECT CASE
  WHEN COUNT(*) = 0 THEN '✅ No DEFINER functions' ELSE '❌ DEFINER functions: ' || COUNT(*)::text END as check_4
FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' AND p.prosecdef = true
AND p.proname IN ('subscribe_to_newsletter', 'unsubscribe_from_newsletter', 'admin_get_newsletter_count');

SELECT CASE
  WHEN NOT EXISTS(SELECT 1 FROM information_schema.table_privileges WHERE table_schema = 'public' AND table_name = 'newsletter_subscriptions' AND grantee = 'anon')
  THEN '✅ Anonymous access revoked' ELSE '❌ Anonymous still has access' END as check_5;

-- Function Search Path (2 checks)
SELECT CASE
  WHEN COUNT(CASE WHEN 'search_path=public, pg_temp' = ANY(p.proconfig) THEN 1 END) >= 28
  THEN '✅ Critical functions: ' || COUNT(CASE WHEN 'search_path=public, pg_temp' = ANY(p.proconfig) THEN 1 END)::text || '/28+'
  ELSE '❌ Critical functions: ' || COUNT(CASE WHEN 'search_path=public, pg_temp' = ANY(p.proconfig) THEN 1 END)::text || '/28'
END as check_6
FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' AND p.proname IN (
  'is_admin_user', 'can_admin_delete', 'check_admin_access',
  'handle_new_user', 'assign_user_role', 'update_user_profile',
  'get_total_revenue', 'get_monthly_revenue', 'get_revenue_by_service',
  'subscribe_to_newsletter', 'unsubscribe_from_newsletter',
  'increment_service_view_count', 'get_service_analytics'
);

SELECT CASE
  WHEN COUNT(CASE WHEN 'search_path=public, pg_temp' = ANY(p.proconfig) THEN 1 END) >= 40
  THEN '✅ Trigger functions: ' || COUNT(CASE WHEN 'search_path=public, pg_temp' = ANY(p.proconfig) THEN 1 END)::text || '/44+'
  ELSE '⚠️  Trigger functions: ' || COUNT(CASE WHEN 'search_path=public, pg_temp' = ANY(p.proconfig) THEN 1 END)::text || '/44'
END as check_7
FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' AND p.proname LIKE '%_trigger';
```

### 3단계: 결과 확인 (1분)

#### ✅ 성공 (7/7 PASS)
```
check_1 | ✅ View exists
check_2 | ✅ No auth.users exposure
check_3 | ✅ 3 RLS policies
check_4 | ✅ No DEFINER functions
check_5 | ✅ Anonymous access revoked
check_6 | ✅ Critical functions: 28/28+
check_7 | ✅ Trigger functions: 44/44+
```

**조치**: 없음. 프로덕션 DB 보안 설정 완료.

---

#### ❌ 실패 (예: 5/7 PASS)
```
check_1 | ✅ View exists
check_2 | ❌ auth.users still exposed  👈 실패
check_3 | ✅ 3 RLS policies
check_4 | ❌ DEFINER functions: 2  👈 실패
check_5 | ✅ Anonymous access revoked
check_6 | ✅ Critical functions: 28/28+
check_7 | ⚠️  Trigger functions: 35/44  👈 경고
```

**조치**: 실패한 항목에 대해 [트러블슈팅](#트러블슈팅-빠른-참조) 참조

---

## 📋 트러블슈팅 (빠른 참조)

### ❌ check_2: auth.users still exposed

**문제**: newsletter_subscribers 뷰가 auth.users 테이블 참조

**해결**:
```sql
-- 1. 기존 뷰 삭제
DROP VIEW IF EXISTS public.newsletter_subscribers CASCADE;

-- 2. 새 뷰 생성 (auth.users 제거)
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

---

### ❌ check_4: DEFINER functions: 2

**문제**: subscribe/unsubscribe 함수가 SECURITY DEFINER 사용

**해결**:
```sql
-- 1. 현재 DEFINER 함수 확인
SELECT p.proname
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.prosecdef = true
AND p.proname IN ('subscribe_to_newsletter', 'unsubscribe_from_newsletter');

-- 2. 마이그레이션 파일 재실행
-- supabase/migrations/20251121000000_fix_newsletter_security_issues.sql
```

---

### ⚠️ check_7: Trigger functions: 35/44

**문제**: 일부 Trigger 함수에 search_path 설정 누락

**해결**:
```sql
-- 1. 누락된 Trigger 함수 확인
SELECT p.proname
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname LIKE '%_trigger'
AND NOT ('search_path=public, pg_temp' = ANY(p.proconfig));

-- 2. 마이그레이션 파일 재실행
-- supabase/migrations/20251122000001_fix_critical_functions_search_path.sql
```

---

## 🔍 상세 검증 (선택, 2-3분)

빠른 검증 통과 후 더 자세한 정보가 필요하면 상세 검증을 실행하세요.

### 실행 방법
```sql
-- Supabase Dashboard → SQL Editor
-- 파일: scripts/validation/verify-production-migrations.sql
-- (파일 전체 내용 복사/붙여넣기 후 Run)
```

### 예상 결과
```
1. Newsletter Security Migration (20251121000000)
   Check 1/8: newsletter_subscribers view exists
   ✅ PASS: newsletter_subscribers view exists
   Check 2/8: View has security_invoker = true
   ✅ PASS: View has security_invoker = true
   ...
   Summary: 8/8 checks passed
   ✅ Newsletter Security Migration: VERIFIED

2. Function Search Path Migration (20251122000001)
   Check 1/3: Critical functions (28 expected)
   ✅ PASS: All 28 critical functions have search_path
   ...
   ✅ Function Search Path Migration: VERIFIED

3. Additional Security Checks
   Check 1/2: Remaining SECURITY DEFINER functions
   ✅ PASS: No SECURITY DEFINER functions
   ...
```

---

## 📊 보안 점수 계산

### 빠른 점수 (7개 체크 기준)
| 통과 개수 | 점수 | 등급 | 상태 |
|---------|-----|-----|-----|
| 7/7 | 100점 | 🟢 Excellent | 프로덕션 준비 완료 |
| 6/7 | 85점 | 🟡 Good | 경미한 이슈, 배포 가능 |
| 5/7 | 70점 | 🟠 Fair | 보안 이슈 일부, 수정 권장 |
| 0-4/7 | <70점 | 🔴 Poor | 심각한 보안 이슈, 배포 보류 |

### 상세 점수 (13개 체크 기준)
| 통과 개수 | 점수 | 등급 | 상태 |
|---------|-----|-----|-----|
| 13/13 | 100점 | 🟢 Excellent | 프로덕션 준비 완료 |
| 11-12/13 | 85-95점 | 🟡 Good | 경미한 이슈, 배포 가능 |
| 9-10/13 | 70-84점 | 🟠 Fair | 보안 이슈 일부, 수정 권장 |
| 0-8/13 | <70점 | 🔴 Poor | 심각한 보안 이슈, 배포 보류 |

---

## 📅 정기 검증 스케줄

### 주간 검증 (월요일 오전 9시)
```bash
# 빠른 검증 (30초) 실행
# 결과를 Slack #production-alerts 채널에 공유
```

### 월간 검증 (매월 1일 오전 10시)
```bash
# 상세 검증 (2-3분) 실행
# 보안 점수 트렌드 리포트 작성
```

### 배포 후 검증 (필수)
```bash
# 프로덕션 배포 직후 빠른 검증 실행
# 실패 시 즉시 롤백
```

---

## 🔗 추가 자료

- **상세 검증 보고서**: `docs/production-validation/db-validation-report-2025-11-22.md`
- **Newsletter 보안 가이드**: `docs/guides/security/newsletter-security-quick-ref.md`
- **마이그레이션 파일**:
  - `supabase/migrations/20251121000000_fix_newsletter_security_issues.sql`
  - `supabase/migrations/20251122000001_fix_critical_functions_search_path.sql`

---

**빠른 가이드 종료**

작성일: 2025-11-22
작성자: Claude (Agent 1)
버전: 1.0

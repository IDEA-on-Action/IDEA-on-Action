# 📚 Supabase Migration Guide

> VIBE WORKING 프로젝트 데이터베이스 마이그레이션 가이드

**작성일**: 2025-11-02
**버전**: 1.0.0
**상태**: ✅ Ready for Production

---

## 🎯 개요

이 가이드는 Supabase 데이터베이스를 초기화하고 전체 스키마를 재적용하는 방법을 안내합니다.

### 마이그레이션 파일 구조

```
supabase/
├── reset-database.sql                              # 스키마 초기화 스크립트
├── migrations/
│   ├── 20251020000000_create_services_tables.sql       # Phase 8: Services & Categories
│   ├── 20251020000001_create_user_management_tables.sql # Phase 10 Week 1: User Profiles & 2FA
│   ├── 20251020000002_create_rbac_and_audit.sql         # Phase 10 Week 3: RBAC & Audit
│   ├── 20251020000003_create_cart_tables.sql            # Phase 9 Week 1: Shopping Cart
│   ├── 20251020000004_create_order_tables.sql           # Phase 9 Week 2: Orders
│   ├── 20251020000005_create_payment_tables.sql         # Phase 9 Week 3: Payments
│   ├── 20251020000006_create_blog_tables.sql            # Phase 11 Week 1: Blog System
│   ├── 20251020000007_create_notices_table.sql          # Phase 11 Week 2: Notices
│   └── 20251020000008_create_security_tables.sql        # Phase 10 Week 2: Security Enhancement
└── MIGRATION_GUIDE.md                              # 이 파일
```

---

## ⚠️ 중요 사항

### 데이터 손실 경고

- **이 프로세스는 모든 데이터를 삭제합니다!**
- **프로덕션 환경에서는 절대 실행하지 마세요!**
- **로컬 개발 환경에서만 사용하세요!**

### 백업 필수

```sql
-- Supabase Dashboard → Settings → Database → Backups → Create Backup
```

---

## 🚀 빠른 시작 (로컬 Supabase CLI)

### 1. Supabase CLI 설치

```bash
# Node.js 프로젝트에서
npm install -g supabase

# 또는 Homebrew (macOS)
brew install supabase/tap/supabase
```

### 2. 로컬 Supabase 시작

```bash
cd D:\GitHub\idea-on-action

# 로컬 Supabase 초기화 (최초 1회)
supabase init

# 로컬 Supabase 시작 (Docker 필요)
supabase start
```

### 3. 마이그레이션 적용

```bash
# 방법 1: 전체 리셋 + 재적용
supabase db reset

# 방법 2: 마이그레이션만 적용 (이미 시작된 경우)
supabase db push
```

### 4. 적용 확인

```bash
# 데이터베이스 상태 확인
supabase db diff

# 테이블 목록 조회
supabase db inspect
```

---

## 🖥️ 수동 적용 (Supabase Dashboard)

### Step 1: 스키마 초기화

1. **Supabase Dashboard 접속**
   - URL: https://supabase.com/dashboard/project/zykjdneewbzyazfukzyg
   - SQL Editor 메뉴로 이동

2. **reset-database.sql 실행**
   ```bash
   # 로컬 파일 열기
   cat supabase/reset-database.sql
   ```
   - 내용 복사 → SQL Editor 붙여넣기
   - **RUN** 버튼 클릭
   - 결과 확인: "Database Reset Complete" 메시지

### Step 2: 마이그레이션 순차 실행

**⚠️ 반드시 순서대로 실행하세요!**

#### 2-1. Phase 8: Services & Categories (기본)

```bash
# 파일: 20251020000000_create_services_tables.sql
```

**생성되는 테이블**:
- `service_categories` (4 rows) - 서비스 카테고리
- `services` (3 rows) - 서비스 목록

**샘플 데이터**:
- AI 워크플로우 자동화 도구
- 스마트 데이터 분석 플랫폼
- 비즈니스 컨설팅 패키지

**검증 쿼리**:
```sql
SELECT COUNT(*) FROM service_categories; -- Expected: 4
SELECT COUNT(*) FROM services WHERE status = 'active'; -- Expected: 3
```

---

#### 2-2. Phase 10 Week 1: User Management (인증)

```bash
# 파일: 20251020000001_create_user_management_tables.sql
```

**생성되는 테이블**:
- `user_profiles` - 사용자 프로필
- `connected_accounts` - OAuth 연결 계정
- `two_factor_auth` - 2FA 설정
- `login_attempts` - 로그인 시도 기록

**검증 쿼리**:
```sql
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('user_profiles', 'connected_accounts', 'two_factor_auth', 'login_attempts');
-- Expected: 4 rows
```

---

#### 2-3. Phase 10 Week 3: RBAC & Audit (권한 관리)

```bash
# 파일: 20251020000002_create_rbac_and_audit.sql
```

**생성되는 테이블**:
- `roles` (4 roles) - 역할 정의
- `permissions` (25 permissions) - 권한 정의
- `role_permissions` - 역할-권한 매핑
- `user_roles` - 사용자-역할 매핑
- `audit_logs` - 감사 로그

**샘플 데이터**:
- Roles: admin, manager, user, viewer
- Permissions: service:*, blog:*, notice:*, user:*, order:*, system:*

**검증 쿼리**:
```sql
SELECT name FROM roles; -- Expected: admin, manager, user, viewer
SELECT COUNT(*) FROM permissions; -- Expected: 25
SELECT public.user_has_permission(
  (SELECT id FROM auth.users WHERE email = 'admin@ideaonaction.local'),
  'service:manage'
); -- Expected: true
```

---

#### 2-4. Phase 9 Week 1: Shopping Cart (전자상거래)

```bash
# 파일: 20251020000003_create_cart_tables.sql
```

**생성되는 테이블**:
- `carts` - 장바구니 (1 per user)
- `cart_items` - 장바구니 항목

**검증 쿼리**:
```sql
SELECT COUNT(*) FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('carts', 'cart_items');
-- Expected: 2
```

---

#### 2-5. Phase 9 Week 2: Orders (주문 관리)

```bash
# 파일: 20251020000004_create_order_tables.sql
```

**생성되는 테이블**:
- `orders` - 주문 헤더
- `order_items` - 주문 항목

**헬퍼 함수**:
- `generate_order_number()` - 주문번호 생성 (ORD-YYYYMMDD-XXXX)

**검증 쿼리**:
```sql
SELECT public.generate_order_number(); -- Expected: ORD-20251102-0001
```

---

#### 2-6. Phase 9 Week 3: Payments (결제)

```bash
# 파일: 20251020000005_create_payment_tables.sql
```

**생성되는 테이블**:
- `payments` - 결제 트랜잭션

**검증 쿼리**:
```sql
SELECT COUNT(*) FROM information_schema.columns
WHERE table_name = 'payments'; -- Expected: 14 columns
```

---

#### 2-7. Phase 11 Week 1: Blog System (블로그)

```bash
# 파일: 20251020000006_create_blog_tables.sql
```

**생성되는 테이블**:
- `post_categories` (3 rows) - 블로그 카테고리
- `post_tags` (6 rows) - 태그
- `blog_posts` (3 posts) - 블로그 글
- `post_tag_relations` - 글-태그 매핑

**샘플 데이터**:
- 2 published posts (AI, Productivity)
- 1 draft post (Company News)

**검증 쿼리**:
```sql
SELECT COUNT(*) FROM blog_posts WHERE status = 'published'; -- Expected: 2
SELECT COUNT(*) FROM post_tags; -- Expected: 6
```

---

#### 2-8. Phase 11 Week 2: Notices (공지사항)

```bash
# 파일: 20251020000007_create_notices_table.sql
```

**생성되는 테이블**:
- `notices` (2 rows) - 시스템 공지사항

**샘플 데이터**:
- Welcome notice (pinned)
- Maintenance notice (expires in 5 days)

**검증 쿼리**:
```sql
SELECT COUNT(*) FROM notices WHERE status = 'published'; -- Expected: 2
SELECT title FROM notices WHERE is_pinned = true; -- Expected: 'Welcome to VIBE WORKING!'
```

---

#### 2-9. Phase 10 Week 2: Security Enhancement (보안)

```bash
# 파일: 20251020000008_create_security_tables.sql
```

**생성되는 테이블**:
- `account_locks` - 계정 잠금 (브루트 포스 방지)
- `password_reset_tokens` - 비밀번호 재설정 토큰
- `email_verifications` - 이메일 인증 토큰

**헬퍼 함수**:
- `is_account_locked(user_id)` - 계정 잠금 확인
- `lock_account_on_failed_attempts(email)` - 자동 잠금 (5회 실패 시)
- `generate_password_reset_token(email)` - 재설정 토큰 생성
- `verify_password_reset_token(token)` - 토큰 검증
- `generate_email_verification_token(user_id, email)` - 이메일 인증 토큰 생성
- `verify_email_token(token)` - 이메일 인증 토큰 검증

**검증 쿼리**:
```sql
SELECT public.is_account_locked(
  (SELECT id FROM auth.users WHERE email = 'admin@ideaonaction.local')
); -- Expected: false
```

---

### Step 3: 전체 검증

#### 3-1. 테이블 개수 확인

```sql
SELECT COUNT(*) FROM information_schema.tables
WHERE table_schema = 'public';
-- Expected: 24 tables
```

#### 3-2. 테이블 목록 확인

```sql
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

**예상 결과 (24개)**:
```
account_locks
audit_logs
blog_posts
cart_items
carts
connected_accounts
email_verifications
login_attempts
notices
order_items
orders
password_reset_tokens
payments
permissions
post_categories
post_tag_relations
post_tags
role_permissions
roles
service_categories
services
two_factor_auth
user_profiles
user_roles
```

#### 3-3. RLS 정책 확인

```sql
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
-- Expected: 50+ policies
```

#### 3-4. 함수 확인

```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_type = 'FUNCTION'
ORDER BY routine_name;
```

**예상 함수**:
- `generate_email_verification_token`
- `generate_order_number`
- `generate_password_reset_token`
- `get_recent_failed_attempts`
- `get_user_permissions`
- `is_account_locked`
- `lock_account_on_failed_attempts`
- `log_action`
- `update_order_payment_id`
- `update_updated_at_column`
- `user_has_permission`
- `verify_email_token`
- `verify_password_reset_token`

---

## 🔍 트러블슈팅

### 문제 1: "relation already exists" 에러

**원인**: 테이블이 이미 존재함

**해결**:
```sql
-- 해당 테이블 삭제 후 재실행
DROP TABLE IF EXISTS <table_name> CASCADE;
```

### 문제 2: "function does not exist" 에러

**원인**: 함수가 먼저 실행되지 않음

**해결**:
- 마이그레이션 순서 확인
- `20251020000001_create_user_management_tables.sql`이 먼저 실행되었는지 확인 (update_updated_at_column 함수 포함)
- `20251020000002_create_rbac_and_audit.sql`이 먼저 실행되었는지 확인 (user_has_permission 함수 포함)

### 문제 3: RLS 정책 에러 "permission denied"

**원인**: RLS 정책이 활성화되어 있지만 정책이 없음

**해결**:
```sql
-- RLS 비활성화 (임시)
ALTER TABLE <table_name> DISABLE ROW LEVEL SECURITY;

-- 또는 정책 재생성
-- 해당 마이그레이션 파일의 RLS 섹션 재실행
```

### 문제 4: 외래 키 제약 조건 에러

**원인**: 참조되는 테이블이 먼저 생성되지 않음

**해결**:
- 마이그레이션 순서 확인
- `service_categories` → `services` 순서 유지
- `carts` → `cart_items` 순서 유지
- `orders` → `order_items` 순서 유지

---

## 📊 마이그레이션 의존성 다이어그램

```
20251020000000 (services_tables)
    ↓ (참조: service_categories.id)
20251020000003 (cart_tables)
    ↓ (참조: services.id)
20251020000004 (order_tables)
    ↓ (참조: orders.id)
20251020000005 (payment_tables)

20251020000001 (user_management_tables)
    ↓ (함수: update_updated_at_column)
20251020000002 (rbac_and_audit)
    ↓ (함수: user_has_permission)
20251020000006 (blog_tables)
20251020000007 (notices_table)

20251020000008 (security_tables)
    ↓ (참조: user_profiles, login_attempts)
```

---

## 📞 지원

### 문제 발생 시

1. **GitHub Issues**: https://github.com/IDEA-on-Action/IdeaonAction-Homepage/issues
2. **이메일**: sinclairseo@gmail.com
3. **Discord**: VIBE WORKING 개발자 채널

### 관련 문서

- [프로젝트 메인 문서](../CLAUDE.md)
- [데이터베이스 문서](../docs/database/README.md)
- [Phase별 구현 가이드](../docs/project/roadmap.md)

---

**마이그레이션 성공을 기원합니다! 🚀**

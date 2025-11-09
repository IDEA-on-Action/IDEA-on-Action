# Supabase RLS 정책 수정 및 마이그레이션 가이드

> VIBE WORKING 프로젝트 데이터베이스 권한 문제 해결 가이드

**작성일**: 2025-11-04  
**버전**: 1.0.0  
**대상**: notifications, carts, user_roles 테이블

---

## 📋 문제 상황

현재 다음 에러가 발생하고 있습니다:

1. **notifications 테이블 404**: 테이블이 존재하지 않음
2. **carts 테이블 403**: 권한 거부 (RLS 정책 문제)
3. **user_roles 테이블 403**: 권한 거부 (RLS 정책 문제)

---

## 🎯 해결 방법

### 방법 1: Supabase Dashboard (권장)

가장 간단하고 안전한 방법입니다.

#### Step 1: Supabase Dashboard 접속

1. **Supabase Dashboard** 접속
   - URL: https://supabase.com/dashboard/project/zykjdneewbzyazfukzyg
2. **SQL Editor** 메뉴 클릭
3. **New query** 버튼 클릭

#### Step 2: notifications 테이블 생성

**파일**: `supabase/migrations/20251104000001_create_notifications.sql`

1. 파일 내용 복사:
```sql
-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('order', 'comment', 'system', 'announcement')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  read BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);

-- Enable Row Level Security
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;

-- Create RLS policies
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
  ON notifications FOR DELETE
  USING (auth.uid() = user_id);

-- Allow service role to insert notifications
CREATE POLICY "Service role can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- Add comment
COMMENT ON TABLE notifications IS 'User notifications for orders, comments, system messages, and announcements';
```

2. SQL Editor에 붙여넣기
3. **Run** 버튼 클릭
4. 결과 확인: "Success. No rows returned"

#### Step 3: carts 테이블 RLS 정책 확인 및 수정

**현재 문제**: 사용자가 자신의 장바구니에 접근할 수 없음

**해결 방법**: RLS 정책이 올바르게 설정되어 있는지 확인하고, 필요시 재생성

1. **현재 정책 확인**:
```sql
-- 현재 RLS 정책 확인
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'carts';
```

2. **정책이 없거나 잘못된 경우, 다음 SQL 실행**:
```sql
-- carts 테이블 RLS 정책 재생성
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 (있다면)
DROP POLICY IF EXISTS "Users can view own cart" ON public.carts;
DROP POLICY IF EXISTS "Users can insert own cart" ON public.carts;
DROP POLICY IF EXISTS "Users can update own cart" ON public.carts;
DROP POLICY IF EXISTS "Users can delete own cart" ON public.carts;

-- 새 정책 생성
CREATE POLICY "Users can view own cart"
  ON public.carts FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own cart"
  ON public.carts FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own cart"
  ON public.carts FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own cart"
  ON public.carts FOR DELETE
  USING (user_id = auth.uid());
```

3. **cart_items 테이블도 확인**:
```sql
-- cart_items 테이블 RLS 정책 확인
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'cart_items';

-- 정책이 없으면 재생성
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Users can insert own cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Users can update own cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Users can delete own cart items" ON public.cart_items;

CREATE POLICY "Users can view own cart items"
  ON public.cart_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.carts
      WHERE carts.id = cart_items.cart_id
        AND carts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own cart items"
  ON public.cart_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.carts
      WHERE carts.id = cart_id
        AND carts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own cart items"
  ON public.cart_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.carts
      WHERE carts.id = cart_items.cart_id
        AND carts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own cart items"
  ON public.cart_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.carts
      WHERE carts.id = cart_items.cart_id
        AND carts.user_id = auth.uid()
    )
  );
```

#### Step 4: user_roles 테이블 RLS 정책 확인 및 수정

**현재 문제**: 사용자가 자신의 역할을 조회할 수 없음 (조인 포함)

**해결 방법**: RLS 정책 확인 및 roles 테이블 조인 허용

1. **현재 정책 확인**:
```sql
-- user_roles 테이블 RLS 정책 확인
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'user_roles';
```

2. **정책이 없거나 잘못된 경우, 다음 SQL 실행**:
```sql
-- user_roles 테이블 RLS 정책 재생성
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 (있다면)
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can assign roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can revoke roles" ON public.user_roles;

-- 새 정책 생성
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (user_id = auth.uid());

-- 관리자는 모든 사용자 역할 조회 가능 (임시로 모든 사용자 허용)
-- 주의: 프로덕션에서는 더 엄격한 정책 필요
CREATE POLICY "Users can view roles for admin check"
  ON public.user_roles FOR SELECT
  USING (true); -- 임시: 모든 사용자가 조회 가능하도록 설정

-- 관리자만 역할 할당 가능 (임시로 비활성화)
-- CREATE POLICY "Admins can assign roles"
--   ON public.user_roles FOR INSERT
--   WITH CHECK (
--     EXISTS (
--       SELECT 1 FROM public.user_roles ur
--       JOIN public.roles r ON r.id = ur.role_id
--       WHERE ur.user_id = auth.uid()
--         AND r.name = 'admin'
--     )
--   );
```

3. **roles 테이블 정책 확인** (이미 공개되어 있어야 함):
```sql
-- roles 테이블 정책 확인
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'roles';

-- 정책이 없으면 생성
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Roles are viewable by everyone" ON public.roles;

CREATE POLICY "Roles are viewable by everyone"
  ON public.roles FOR SELECT
  USING (true);
```

---

## 🔍 검증 방법

### 1. notifications 테이블 확인

```sql
-- 테이블 존재 확인
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
    AND table_name = 'notifications'
);

-- RLS 정책 확인
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'notifications';
```

**예상 결과**:
- 테이블 존재: `true`
- 정책 개수: 4개 (SELECT, UPDATE, DELETE, INSERT)

### 2. carts 테이블 확인

```sql
-- RLS 활성화 확인
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'carts';

-- 정책 확인
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'carts';
```

**예상 결과**:
- RLS 활성화: `true`
- 정책 개수: 4개 (SELECT, INSERT, UPDATE, DELETE)

### 3. user_roles 테이블 확인

```sql
-- RLS 활성화 확인
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'user_roles';

-- 정책 확인
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'user_roles';
```

**예상 결과**:
- RLS 활성화: `true`
- 정책 개수: 최소 1개 (SELECT)

### 4. 실제 테스트

**앱에서 테스트**:
1. 브라우저 콘솔 열기 (F12)
2. 로그인 후 다음 확인:
   - 장바구니 조회 성공 (403 에러 없음)
   - 알림 조회 성공 (404 에러 없음)
   - 관리자 권한 확인 성공 (403 에러 없음)

---

## ⚠️ 주의사항

### 보안 고려사항

1. **user_roles 임시 정책**: 
   - 현재 모든 사용자가 역할을 조회할 수 있도록 설정했습니다
   - 프로덕션 환경에서는 더 엄격한 정책으로 변경해야 합니다
   - 예: 관리자만 모든 역할 조회 가능

2. **notifications INSERT 정책**:
   - 현재 `WITH CHECK (true)`로 설정되어 있어 모든 사용자가 알림을 생성할 수 있습니다
   - 프로덕션에서는 서비스 역할만 INSERT 가능하도록 변경해야 합니다

### 백업 필수

마이그레이션 실행 전 반드시 백업을 생성하세요:

1. Supabase Dashboard → **Settings** → **Database**
2. **Backups** 탭 클릭
3. **Create a new backup** 클릭

---

## 🚀 방법 2: Supabase CLI (고급)

로컬 개발 환경에서 Supabase CLI를 사용하는 방법입니다.

### 전제 조건

```bash
# Supabase CLI 설치 확인
supabase --version

# 로컬 Supabase 시작
supabase start
```

### 마이그레이션 실행

```bash
# 프로젝트 디렉토리로 이동
cd D:\GitHub\idea-on-action

# 마이그레이션 파일 확인
ls supabase/migrations/

# 원격 Supabase에 마이그레이션 적용
supabase db push

# 또는 특정 마이그레이션만 실행
supabase migration up 20251104000001_create_notifications
```

### RLS 정책 수정

```bash
# SQL 파일 생성
cat > supabase/migrations/$(date +%Y%m%d%H%M%S)_fix_rls_policies.sql << 'EOF'
-- RLS 정책 수정 SQL (위 Step 3, 4 내용)
EOF

# 마이그레이션 적용
supabase db push
```

---

## 📚 참고 자료

- [Supabase RLS 가이드](https://supabase.com/docs/guides/auth/row-level-security)
- [프로젝트 마이그레이션 가이드](../supabase/MIGRATION_GUIDE.md)
- [데이터베이스 문서](../../database/README.md)

---

## ✅ 체크리스트

마이그레이션 완료 후 확인:

- [ ] notifications 테이블 생성 확인
- [ ] notifications RLS 정책 4개 확인
- [ ] carts 테이블 RLS 정책 4개 확인
- [ ] cart_items 테이블 RLS 정책 4개 확인
- [ ] user_roles 테이블 RLS 정책 확인
- [ ] roles 테이블 RLS 정책 확인
- [ ] 앱에서 403/404 에러 없음 확인
- [ ] 장바구니 기능 정상 작동 확인
- [ ] 알림 기능 정상 작동 확인
- [ ] 관리자 권한 확인 정상 작동 확인

---

**문제 발생 시**: Supabase Dashboard → **Database** → **Logs**에서 에러 로그 확인


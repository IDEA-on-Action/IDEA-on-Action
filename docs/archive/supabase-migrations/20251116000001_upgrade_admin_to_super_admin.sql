-- 20251116000001_upgrade_admin_to_super_admin.sql
-- Admin 계정을 super_admin으로 업그레이드

-- AdminUsers 페이지 접근을 위해 admin@ideaonaction.local 계정의 role을 'super_admin'으로 변경
-- AdminUsers.tsx Line 297: if (adminRole !== 'super_admin') 체크
-- 영향: admin-users.spec.ts 18개 테스트 통과 예상

UPDATE public.admins
SET
  role = 'super_admin',
  updated_at = NOW()
WHERE user_id = (
  SELECT id
  FROM auth.users
  WHERE email = 'admin@ideaonaction.local'
);

-- Verification: 업그레이드 결과 확인
SELECT
  u.email,
  a.role,
  a.created_at,
  a.updated_at
FROM auth.users u
JOIN public.admins a ON a.user_id = u.id
WHERE u.email = 'admin@ideaonaction.local';

-- Expected output:
-- email                    | role         | created_at          | updated_at
-- -------------------------|--------------|---------------------|-------------------
-- admin@ideaonaction.local | super_admin  | 2025-11-15 17:03:00 | 2025-11-16 00:00:00

-- Note: 이 마이그레이션은 Supabase Dashboard SQL Editor에서 수동으로 실행되어야 합니다.
-- CLI: supabase db reset (로컬) 또는 Dashboard SQL Editor (프로덕션)

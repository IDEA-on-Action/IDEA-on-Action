# Newsletter E2E 테스트 - 사전 준비

> AdminNewsletter E2E 테스트를 위한 환경 설정 가이드

**마지막 업데이트**: 2025-12-22
**관련 문서**: [메인 가이드](../run-newsletter-e2e-tests.md)

---

## 1. 환경 설정

### 필수 도구 설치

```bash
# 1. Docker Desktop 실행 (Windows)
# - Docker Desktop 아이콘을 더블클릭하여 실행
# - Docker Engine이 시작될 때까지 대기 (1-2분)

# 2. Supabase 로컬 DB 시작
supabase start

# 출력 예시:
# Started supabase local development setup.
#
#          API URL: http://localhost:54321
#      GraphQL URL: http://localhost:54321/graphql/v1
#           DB URL: postgresql://postgres:postgres@localhost:54322/postgres
#       Studio URL: http://localhost:54323
#     Inbucket URL: http://localhost:54324
#       JWT secret: super-secret-jwt-token-with-at-least-32-characters-long
#         anon key: eyJhbGci...

# 3. 개발 서버 실행 (별도 터미널)
npm run dev

# 4. Playwright 설치 (최초 1회만)
npx playwright install
```

### 환경 변수 확인

`.env.local` 파일이 존재하는지 확인합니다:

```bash
# 파일 존재 여부 확인
ls .env.local

# 내용 확인 (필수 변수들)
cat .env.local | grep VITE_SUPABASE
```

**필수 환경 변수**:
```env
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

---

## 2. 테스트 데이터 준비

### Admin 계정 생성

```sql
-- Supabase Studio 접속: http://localhost:54323
-- SQL Editor 탭 선택 후 아래 쿼리 실행

-- 1. Admin 계정 확인 (이미 존재하면 Skip)
SELECT id, email FROM auth.users WHERE email = 'admin@ideaonaction.local';

-- 2. Admin 계정 생성 (없을 경우)
-- 수동으로 회원가입 후 아래 쿼리 실행
INSERT INTO user_roles (user_id, role)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'admin@ideaonaction.local'),
  'admin'
);
```

### Newsletter 구독자 생성

```sql
-- 테스트용 구독자 5개 생성 (다양한 상태)

-- 1. Pending 상태 (확인 대기)
INSERT INTO user_profiles (user_id, newsletter_email, newsletter_subscribed, newsletter_subscribed_at)
VALUES (gen_random_uuid(), 'pending@test.com', true, NOW() - INTERVAL '1 day');

-- 2. Confirmed 상태 (확인 완료)
INSERT INTO user_profiles (user_id, newsletter_email, newsletter_subscribed, newsletter_subscribed_at, newsletter_confirmed_at)
VALUES (gen_random_uuid(), 'confirmed@test.com', true, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days');

-- 3. Unsubscribed 상태 (구독 취소)
INSERT INTO user_profiles (user_id, newsletter_email, newsletter_subscribed, newsletter_unsubscribed_at)
VALUES (gen_random_uuid(), 'unsubscribed@test.com', false, NOW() - INTERVAL '3 days');

-- 4. 추가 테스트 데이터 (검색용)
INSERT INTO user_profiles (user_id, newsletter_email, newsletter_subscribed, newsletter_subscribed_at)
VALUES
  (gen_random_uuid(), 'test1@example.com', true, NOW() - INTERVAL '4 days'),
  (gen_random_uuid(), 'test2@example.com', true, NOW() - INTERVAL '5 days');
```

### 데이터 검증

```sql
-- 구독자 목록 확인
SELECT
  newsletter_email,
  newsletter_subscribed,
  newsletter_subscribed_at,
  newsletter_confirmed_at,
  newsletter_unsubscribed_at
FROM user_profiles
WHERE newsletter_email IS NOT NULL
ORDER BY newsletter_subscribed_at DESC;

-- 예상 결과: 5개 행 (pending, confirmed, unsubscribed, test1, test2)
```

---

## 다음 단계

- [테스트 실행 방법](./execution.md)
- [테스트 스위트 목록](./test-suites.md)

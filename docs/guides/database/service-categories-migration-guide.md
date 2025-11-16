# Service Categories RLS 마이그레이션 가이드

## 목적 및 배경

### 문제 상황
`service_categories` 테이블에서 익명 사용자(anon)가 데이터를 조회할 수 없는 문제가 발생했습니다.

**증상**:
- 서비스 페이지(`/services`)에서 카테고리 목록이 표시되지 않음
- 브라우저 콘솔에서 403 Forbidden 에러 발생
- 인증된 사용자는 정상 조회 가능

**원인 분석**:
1. **RLS 정책 충돌**: 기존 마이그레이션에서 중복된 RLS 정책이 존재
   - `20251020000000_create_services_tables.sql`: `is_active = true` 조건부 정책
   - `fix-service-categories-rls.sql`: `USING (true)` 무조건 허용 정책
2. **권한 누락**: `anon` 역할에 대한 `GRANT SELECT` 권한이 일부 환경에서 누락
3. **display_order 컬럼 불일치**: 일부 환경에서 `display_order` 컬럼이 누락됨

### 해결 방안
두 개의 새로운 마이그레이션 파일을 통해 문제를 해결합니다:

1. **check-service-categories-schema.sql**: 현재 상태 진단용 쿼리
2. **fix-service-categories-complete.sql**: 완전한 수정 및 검증

---

## 마이그레이션 파일 분석

### 1. check-service-categories-schema.sql

**목적**: 현재 테이블 상태를 진단하는 쿼리 모음

**SQL 문법 검증**: ✅ 정확
- PostgreSQL 표준 `information_schema` 뷰 사용
- `pg_policies` 시스템 카탈로그 조회
- 읽기 전용 쿼리로 안전

**쿼리 구성**:
```sql
-- 1. 컬럼 스키마 확인
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'service_categories'
ORDER BY ordinal_position;

-- 2. RLS 정책 확인
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'service_categories';

-- 3. 권한 확인
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'service_categories'
  AND grantee IN ('anon', 'authenticated', 'public');
```

**사용 시나리오**:
- 프로덕션 적용 **전** 현재 상태 확인
- 문제 재발 시 디버깅용

---

### 2. fix-service-categories-complete.sql

**목적**: service_categories 테이블의 RLS 정책, 권한, 스키마를 완전히 수정

**SQL 문법 검증**: ✅ 정확
- 모든 명령문 PostgreSQL 표준 준수
- 안전한 `IF NOT EXISTS` / `DROP ... IF EXISTS` 패턴 사용
- DO 블록을 통한 조건부 스키마 변경

**작업 단계**:

#### Step 1: 권한 부여 (라인 5-7)
```sql
GRANT SELECT ON service_categories TO anon;
GRANT SELECT ON service_categories TO authenticated;
```
- ✅ 안전: GRANT는 멱등성(idempotent) 보장 (이미 있어도 에러 없음)
- ✅ 최소 권한 원칙: SELECT만 부여 (INSERT/UPDATE/DELETE 제외)

#### Step 2: RLS 활성화 (라인 10)
```sql
ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;
```
- ✅ 안전: 이미 활성화되어 있어도 에러 없음

#### Step 3: 기존 정책 삭제 (라인 13-15)
```sql
DROP POLICY IF EXISTS "Allow anon to read service categories" ON service_categories;
DROP POLICY IF EXISTS "Allow authenticated to read service categories" ON service_categories;
DROP POLICY IF EXISTS "Public read access" ON service_categories;
```
- ✅ 안전: `IF EXISTS` 사용으로 정책이 없어도 에러 없음
- ✅ 충돌 방지: 기존의 모든 읽기 정책 제거 후 재생성

#### Step 4: 새로운 RLS 정책 생성 (라인 18-30)
```sql
-- 익명 사용자 정책
CREATE POLICY "service_categories_anon_select"
  ON service_categories
  FOR SELECT
  TO anon
  USING (true);

-- 인증된 사용자 정책
CREATE POLICY "service_categories_authenticated_select"
  ON service_categories
  FOR SELECT
  TO authenticated
  USING (true);
```

**정책 분석**:
- ✅ 명확한 이름: `{테이블}_{역할}_{명령}` 패턴
- ✅ 무조건 허용: `USING (true)` (모든 행 조회 가능)
- ✅ 역할 분리: anon과 authenticated를 별도 정책으로 관리
- ⚠️ **주의**: `is_active = true` 조건 제거됨 (비활성 카테고리도 조회 가능)

**기존 정책과의 차이**:
| 항목 | 기존 (20251020000000) | 신규 (fix-complete) |
|------|----------------------|-------------------|
| anon 정책 | `is_active = true` | `true` (모든 행) |
| authenticated 정책 | `true` (모든 행) | `true` (모든 행) |
| 정책 수 | 5개 (SELECT 2개 + INSERT/UPDATE/DELETE 3개) | 2개 (SELECT만) |

**Trade-off 분석**:
- ✅ 장점: 더 단순하고 예측 가능한 동작
- ⚠️ 단점: 비활성 카테고리도 노출됨 → 애플리케이션 레벨에서 필터링 필요

#### Step 5: display_order 컬럼 검증 (라인 33-56)
```sql
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'service_categories'
      AND column_name = 'display_order'
  ) THEN
    ALTER TABLE service_categories ADD COLUMN display_order INTEGER DEFAULT 0;

    -- Set display_order for existing categories
    UPDATE service_categories
    SET display_order = (
      CASE name
        WHEN '개발 서비스' THEN 1
        WHEN 'AI 솔루션' THEN 2
        WHEN '데이터 분석' THEN 3
        WHEN '컨설팅' THEN 4
        WHEN '교육 & 트레이닝' THEN 5
        ELSE 99
      END
    );
  END IF;
END $$;
```

**로직 분석**:
- ✅ 안전: 컬럼 존재 여부를 먼저 확인
- ✅ 기본값 설정: `DEFAULT 0` (누락 시 0으로 설정)
- ✅ 기존 데이터 마이그레이션: CASE 문으로 우선순위 설정
- ⚠️ **주의**: `ELSE 99`로 알 수 없는 카테고리는 맨 뒤로 보냄

**기존 카테고리 우선순위**:
1. 개발 서비스 (display_order: 1)
2. AI 솔루션 (display_order: 2)
3. 데이터 분석 (display_order: 3)
4. 컨설팅 (display_order: 4)
5. 교육 & 트레이닝 (display_order: 5)
6. 기타 (display_order: 99)

#### Step 6: 검증 쿼리 (라인 59-84)
```sql
-- 컬럼 확인
SELECT 'Columns' as check_type, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'service_categories'
ORDER BY ordinal_position;

-- 정책 확인
SELECT 'Policies' as check_type, policyname, roles::text, cmd, qual::text
FROM pg_policies
WHERE tablename = 'service_categories';

-- 권한 확인
SELECT 'Grants' as check_type, grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'service_categories'
  AND grantee IN ('anon', 'authenticated')
ORDER BY grantee, privilege_type;
```

**검증 항목**:
- ✅ 컬럼 스키마: `display_order` 컬럼 존재 확인
- ✅ RLS 정책: 2개의 SELECT 정책 확인
- ✅ 권한: anon과 authenticated의 SELECT 권한 확인

---

## 기존 마이그레이션과의 호환성

### 1. 20251020000000_create_services_tables.sql (초기 생성)

**충돌 여부**: ⚠️ 부분 충돌

**충돌 항목**:
- RLS 정책: 기존 5개 정책 → 신규 2개 정책으로 교체
- 조건: `is_active = true` → `true`로 완화

**해결 방안**:
- `fix-service-categories-complete.sql`이 기존 정책을 모두 삭제 후 재생성
- 멱등성 보장: 여러 번 실행해도 동일한 결과

### 2. fix-service-categories-rls.sql (기존 수정)

**충돌 여부**: ⚠️ 부분 충돌

**충돌 항목**:
- 정책 이름: `"Allow anon to read service categories"` → `"service_categories_anon_select"`로 변경
- 정책 수: 1개 (anon만) → 2개 (anon + authenticated)

**해결 방안**:
- `fix-service-categories-complete.sql`에서 `DROP POLICY IF EXISTS`로 기존 정책 제거
- 더 명확한 네이밍 규칙 적용

### 3. 마이그레이션 순서

**권장 순서**:
```
1. 20251020000000_create_services_tables.sql (초기 생성)
2. fix-service-categories-rls.sql (1차 수정) - SKIP 가능
3. fix-service-categories-complete.sql (완전 수정) ← 최종 적용
```

**주의사항**:
- `fix-service-categories-complete.sql`을 적용하면 기존 수정본(`fix-service-categories-rls.sql`)은 불필요
- 프로덕션에서는 `fix-service-categories-complete.sql`만 적용 권장

---

## 프로덕션 적용 전 체크리스트

### 1. 환경 확인
- [ ] Supabase CLI 설치 확인: `supabase --version`
- [ ] 프로젝트 연결 확인: `supabase link --project-ref <PROJECT_ID>`
- [ ] 로컬 DB 동기화: `supabase db pull`

### 2. 백업
- [ ] 프로덕션 DB 스냅샷 생성 (Supabase 대시보드)
- [ ] 현재 스키마 백업:
  ```bash
  supabase db dump --schema public > backup-$(date +%Y%m%d-%H%M%S).sql
  ```

### 3. 현재 상태 확인
- [ ] `check-service-categories-schema.sql` 실행:
  ```bash
  supabase db execute --file supabase/migrations/check-service-categories-schema.sql
  ```
- [ ] 결과를 저장 (롤백 시 참고용)

### 4. 영향 범위 확인
- [ ] 현재 카테고리 수: `SELECT COUNT(*) FROM service_categories;`
- [ ] 비활성 카테고리 수: `SELECT COUNT(*) FROM service_categories WHERE is_active = false;`
- [ ] 관련 서비스 수: `SELECT COUNT(*) FROM services WHERE category_id IS NOT NULL;`

### 5. 테스트 환경 검증
- [ ] 로컬/스테이징에서 마이그레이션 테스트
- [ ] 익명 사용자 조회 테스트: `/services` 페이지 접근
- [ ] 인증 사용자 조회 테스트: 로그인 후 `/services` 접근
- [ ] 관리자 권한 테스트: 카테고리 CRUD 작업

---

## 적용 방법

### Option 1: Supabase CLI (권장)

#### 1-1. 로컬 환경에서 테스트
```bash
# 1. 로컬 DB 리셋 (개발용)
supabase db reset

# 2. 마이그레이션 상태 확인
supabase migration list

# 3. 특정 마이그레이션 적용
supabase db execute --file supabase/migrations/fix-service-categories-complete.sql

# 4. 검증
supabase db execute --file supabase/migrations/check-service-categories-schema.sql
```

#### 1-2. 프로덕션 적용
```bash
# 1. 프로덕션 연결 확인
supabase link --project-ref <PROJECT_ID>

# 2. 마이그레이션 적용
supabase db push

# 또는 특정 파일만 적용
supabase db execute --remote --file supabase/migrations/fix-service-categories-complete.sql

# 3. 검증
supabase db execute --remote --file supabase/migrations/check-service-categories-schema.sql
```

### Option 2: Supabase 대시보드 (GUI)

1. **Supabase 대시보드** 접속: https://app.supabase.com/
2. **프로젝트 선택** → **SQL Editor** 탭
3. **파일 내용 복사-붙여넣기**:
   - `fix-service-categories-complete.sql` 전체 내용 복사
4. **RUN** 버튼 클릭
5. **검증 쿼리 실행**:
   - `check-service-categories-schema.sql` 내용 복사하여 실행
   - 결과를 확인하여 정상 적용 여부 검증

### Option 3: psql CLI (고급)

```bash
# 1. Supabase DB 연결 정보 확인 (대시보드에서 복사)
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT_ID].supabase.co:5432/postgres"

# 2. 마이그레이션 실행
\i supabase/migrations/fix-service-categories-complete.sql

# 3. 검증
\i supabase/migrations/check-service-categories-schema.sql

# 4. 종료
\q
```

---

## 검증 방법

### 1. SQL 쿼리 검증

#### 1-1. 컬럼 스키마 확인
```sql
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'service_categories'
ORDER BY ordinal_position;
```

**기대 결과**:
| column_name | data_type | is_nullable | column_default |
|------------|-----------|-------------|----------------|
| id | uuid | NO | gen_random_uuid() |
| name | text | NO | NULL |
| slug | text | NO | NULL |
| description | text | YES | NULL |
| icon | text | YES | NULL |
| display_order | integer | NO | 0 |
| is_active | boolean | NO | true |
| created_at | timestamp with time zone | NO | now() |
| updated_at | timestamp with time zone | NO | now() |

#### 1-2. RLS 정책 확인
```sql
SELECT
  policyname,
  roles::text,
  cmd,
  qual::text
FROM pg_policies
WHERE tablename = 'service_categories'
ORDER BY policyname;
```

**기대 결과**:
| policyname | roles | cmd | qual |
|-----------|-------|-----|------|
| service_categories_anon_select | {anon} | SELECT | true |
| service_categories_authenticated_select | {authenticated} | SELECT | true |

#### 1-3. 권한 확인
```sql
SELECT
  grantee,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'service_categories'
  AND grantee IN ('anon', 'authenticated')
ORDER BY grantee, privilege_type;
```

**기대 결과**:
| grantee | privilege_type |
|---------|---------------|
| anon | SELECT |
| authenticated | SELECT |

#### 1-4. 데이터 확인
```sql
SELECT
  name,
  slug,
  display_order,
  is_active
FROM service_categories
ORDER BY display_order, name;
```

**기대 결과**:
| name | slug | display_order | is_active |
|------|------|--------------|-----------|
| 개발 서비스 | development-services | 1 | true |
| AI 솔루션 | ai-solutions | 2 | true |
| 데이터 분석 | data-analytics | 3 | true |
| 컨설팅 | consulting | 4 | true |
| 교육 & 트레이닝 | education-training | 5 | true |

### 2. 애플리케이션 레벨 검증

#### 2-1. 익명 사용자 테스트
```bash
# 1. 로그아웃 상태에서 서비스 페이지 접속
# URL: https://www.ideaonaction.ai/services

# 2. 브라우저 개발자 도구 → Network 탭
# - service_categories 요청이 200 OK인지 확인
# - Response에 카테고리 목록이 포함되어 있는지 확인

# 3. 페이지에서 카테고리 탭이 표시되는지 확인
```

#### 2-2. 인증 사용자 테스트
```bash
# 1. 로그인 후 서비스 페이지 접속
# 2. 카테고리 필터링 동작 확인
# 3. 비활성 카테고리 표시 여부 확인 (애플리케이션 로직에 따라 다름)
```

#### 2-3. 관리자 권한 테스트
```bash
# 1. 관리자 로그인 (admin@ideaonaction.local)
# 2. Admin 페이지에서 카테고리 CRUD 작업 테스트
# - INSERT: 새 카테고리 생성
# - UPDATE: 기존 카테고리 수정
# - DELETE: 카테고리 삭제
# 3. RLS 정책이 관리자 작업을 차단하지 않는지 확인
```

### 3. E2E 테스트 실행

```bash
# Playwright E2E 테스트 실행
npm run test:e2e

# 특정 테스트만 실행
npx playwright test tests/e2e/public/services.spec.ts
```

---

## 롤백 시나리오

### 1. 즉시 롤백 (마이그레이션 직후 문제 발견)

#### Option A: 이전 정책 복원
```sql
-- 1. 새 정책 삭제
DROP POLICY IF EXISTS "service_categories_anon_select" ON service_categories;
DROP POLICY IF EXISTS "service_categories_authenticated_select" ON service_categories;

-- 2. 기존 정책 복원 (20251020000000 기준)
CREATE POLICY "Active categories are viewable by everyone"
  ON public.service_categories FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "Authenticated users can view all categories"
  ON public.service_categories FOR SELECT
  TO authenticated
  USING (true);

-- 3. 권한 유지 (롤백해도 필요)
GRANT SELECT ON service_categories TO anon;
GRANT SELECT ON service_categories TO authenticated;
```

#### Option B: DB 스냅샷 복원 (Supabase 대시보드)
1. **Settings** → **Database** → **Backups**
2. 마이그레이션 직전 스냅샷 선택
3. **Restore** 클릭
4. ⚠️ **주의**: 마이그레이션 이후 생성된 데이터도 함께 롤백됨

### 2. 지연 롤백 (며칠 후 문제 발견)

#### Option A: 선택적 정책 수정
```sql
-- 비활성 카테고리를 숨기고 싶은 경우
DROP POLICY IF EXISTS "service_categories_anon_select" ON service_categories;
CREATE POLICY "service_categories_anon_select"
  ON service_categories
  FOR SELECT
  TO anon
  USING (is_active = true);  -- 조건 추가
```

#### Option B: 애플리케이션 레벨 필터링
```typescript
// src/hooks/useServiceCategories.ts
const { data: categories } = useQuery({
  queryKey: ['service-categories'],
  queryFn: async () => {
    const { data } = await supabase
      .from('service_categories')
      .select('*')
      .eq('is_active', true)  // 애플리케이션에서 필터링
      .order('display_order');
    return data;
  }
});
```

### 3. 롤백 후 검증
```sql
-- 정책 확인
SELECT policyname, roles::text, cmd, qual::text
FROM pg_policies
WHERE tablename = 'service_categories';

-- 권한 확인
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'service_categories'
  AND grantee IN ('anon', 'authenticated');
```

---

## 트러블슈팅

### 문제 1: "permission denied for table service_categories"

**증상**:
```
Error: permission denied for table service_categories
```

**원인**:
- `GRANT SELECT` 권한이 누락됨

**해결**:
```sql
-- anon 역할에 SELECT 권한 부여
GRANT SELECT ON service_categories TO anon;

-- 검증
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'service_categories'
  AND grantee = 'anon';
```

### 문제 2: "new row violates row-level security policy"

**증상**:
```
Error: new row violates row-level security policy for table "service_categories"
```

**원인**:
- RLS 정책이 너무 제한적임 (예: `is_active = true`만 허용)

**해결**:
```sql
-- 정책 확인
SELECT policyname, qual::text
FROM pg_policies
WHERE tablename = 'service_categories';

-- 정책 수정 (필요시)
DROP POLICY IF EXISTS "service_categories_anon_select" ON service_categories;
CREATE POLICY "service_categories_anon_select"
  ON service_categories
  FOR SELECT
  TO anon
  USING (true);  -- 모든 행 허용
```

### 문제 3: "column display_order does not exist"

**증상**:
```
Error: column "display_order" does not exist
```

**원인**:
- `display_order` 컬럼이 생성되지 않음

**해결**:
```sql
-- 컬럼 수동 추가
ALTER TABLE service_categories ADD COLUMN display_order INTEGER DEFAULT 0;

-- 기존 데이터 마이그레이션
UPDATE service_categories
SET display_order = (
  CASE name
    WHEN '개발 서비스' THEN 1
    WHEN 'AI 솔루션' THEN 2
    WHEN '데이터 분석' THEN 3
    WHEN '컨설팅' THEN 4
    WHEN '교육 & 트레이닝' THEN 5
    ELSE 99
  END
);
```

### 문제 4: "relation service_categories does not exist"

**증상**:
```
Error: relation "service_categories" does not exist
```

**원인**:
- 테이블이 아직 생성되지 않음 (초기 마이그레이션 미실행)

**해결**:
```sql
-- 1. 초기 마이그레이션 먼저 실행
\i supabase/migrations/20251020000000_create_services_tables.sql

-- 2. 그 다음 수정 마이그레이션 실행
\i supabase/migrations/fix-service-categories-complete.sql
```

### 문제 5: 정책 충돌 (multiple policies)

**증상**:
```
Warning: Multiple SELECT policies found for anon role
```

**원인**:
- 기존 정책이 삭제되지 않고 새 정책이 추가됨

**해결**:
```sql
-- 모든 SELECT 정책 삭제
DROP POLICY IF EXISTS "Active categories are viewable by everyone" ON service_categories;
DROP POLICY IF EXISTS "Authenticated users can view all categories" ON service_categories;
DROP POLICY IF EXISTS "Allow anon to read service categories" ON service_categories;
DROP POLICY IF EXISTS "Allow authenticated to read service categories" ON service_categories;
DROP POLICY IF EXISTS "Public read access" ON service_categories;

-- 새 정책만 생성
CREATE POLICY "service_categories_anon_select"
  ON service_categories
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "service_categories_authenticated_select"
  ON service_categories
  FOR SELECT
  TO authenticated
  USING (true);
```

---

## 추가 권장사항

### 1. 모니터링 설정

#### Sentry 에러 추적
```typescript
// src/hooks/useServiceCategories.ts
import * as Sentry from '@sentry/react';

const { data, error } = useQuery({
  queryKey: ['service-categories'],
  queryFn: async () => {
    try {
      const { data, error } = await supabase
        .from('service_categories')
        .select('*')
        .order('display_order');

      if (error) throw error;
      return data;
    } catch (err) {
      Sentry.captureException(err, {
        tags: { category: 'database', table: 'service_categories' }
      });
      throw err;
    }
  }
});
```

#### Supabase 로그 확인
```bash
# Supabase CLI로 로그 확인
supabase logs db

# 특정 테이블 쿼리 로그
supabase logs db --filter "service_categories"
```

### 2. 성능 최적화

#### 인덱스 확인
```sql
-- 현재 인덱스 확인
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'service_categories';
```

**기대 인덱스**:
- `idx_service_categories_slug` (slug 조회용)
- `idx_service_categories_active` (is_active 필터용)
- `idx_service_categories_display_order` (정렬용)

#### 쿼리 플랜 분석
```sql
EXPLAIN ANALYZE
SELECT * FROM service_categories
WHERE is_active = true
ORDER BY display_order;
```

### 3. 보안 강화

#### RLS 정책 감사
```sql
-- 모든 테이블의 RLS 상태 확인
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

#### 역할별 권한 확인
```sql
-- anon 역할 권한 전체 확인
SELECT
  table_name,
  privilege_type
FROM information_schema.role_table_grants
WHERE grantee = 'anon'
ORDER BY table_name, privilege_type;
```

---

## 참고 문서

### 내부 문서
- [Phase 9 Migration Guide](./phase-9-migration-guide.md)
- [RLS Fix Instructions](./rls-fix-instructions.md)
- [Fix RLS Policies Guide](./fix-rls-policies-guide.md)

### 외부 문서
- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli/introduction)

---

## 변경 이력

| 날짜 | 작성자 | 변경 내용 |
|------|--------|----------|
| 2025-11-16 | Claude AI | 초안 작성 |

---

## 라이선스

이 문서는 IDEA on Action 프로젝트의 일부이며, 프로젝트와 동일한 라이선스를 따릅니다.

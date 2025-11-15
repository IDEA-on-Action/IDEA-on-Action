# Toss Payments 심사용 서비스 마이그레이션 가이드

**문서 작성일**: 2025-11-16
**마이그레이션 파일**: `supabase/migrations/20251116100001_add_toss_review_services_fixed.sql`
**상태**: 준비 완료 ✅

---

## 📋 목차

1. [개요](#개요)
2. [마이그레이션 파일 설명](#마이그레이션-파일-설명)
3. [Supabase 적용 방법](#supabase-적용-방법)
4. [적용 후 검증](#적용-후-검증)
5. [주의사항 및 롤백](#주의사항-및-롤백)
6. [FAQ](#faq)

---

## 개요

### 목적
Toss Payments 결제 시스템 심사를 위한 4개 서비스를 Supabase `services` 테이블에 추가합니다.

### 추가되는 서비스

| 순번 | 서비스명 | slug | 카테고리 | 가격 | URL |
|------|---------|------|---------|------|-----|
| 1 | MVP 개발 서비스 | `mvp` | Development | ₩2,000,000 | https://www.ideaonaction.ai/services/mvp |
| 2 | Fullstack 개발 서비스 | `fullstack` | Development | ₩10,000,000 | https://www.ideaonaction.ai/services/fullstack |
| 3 | Design System 서비스 | `design` | Design | ₩3,000,000 | https://www.ideaonaction.ai/services/design |
| 4 | Operations 관리 서비스 | `operations` | Operations | ₩5,000,000 | https://www.ideaonaction.ai/services/operations |

### 마이그레이션 타입
- **INSERT OR UPDATE**: 기존 서비스가 있으면 업데이트, 없으면 신규 생성
- **안전성**: 기존 데이터 손실 없음 (ON CONFLICT 사용)

### 예상 시간
- Supabase 적용: **2-3분**
- 검증: **5분**
- 총 소요 시간: **약 10분**

---

## 마이그레이션 파일 설명

### 파일 정보
```
파일명: 20251116100001_add_toss_review_services_fixed.sql
위치: supabase/migrations/
크기: ~7.8 KB
라인 수: 269줄
```

### 주요 변경사항

#### 1. 4개 서비스 데이터 INSERT/UPDATE
```sql
INSERT INTO public.services (
  id, slug, title, description, category_id, price, status, created_at, updated_at
)
VALUES (...)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  category_id = EXCLUDED.category_id,
  price = EXCLUDED.price,
  status = EXCLUDED.status,
  updated_at = NOW()
```

**특징**:
- `ON CONFLICT`: 중복 ID 방지
- `DO UPDATE`: 기존 서비스 업데이트
- `updated_at = NOW()`: 변경 시간 자동 갱신

#### 2. 각 서비스별 상세 정보

**MVP 개발 서비스**
- ID: `mvp-development-service`
- Slug: `mvp`
- 가격: ₩2,000,000 (기본)
- 제공: 웹/앱 프로토타입, 핵심 기능 3-5개, 소스코드, 4주 유지보수
- 개발 기간: 4-8주 (Standard/Premium)

**Fullstack 개발 서비스**
- ID: `fullstack-development-service`
- Slug: `fullstack`
- 가격: ₩10,000,000 (기본)
- 제공: 완전한 웹/앱, 관리자 대시보드, CI/CD, 12주 유지보수
- 개발 기간: 12-24주 (Standard/Enterprise)

**Design System 서비스**
- ID: `design-system-service`
- Slug: `design`
- 가격: ₩3,000,000 (기본)
- 제공: 브랜드 아이덴티티, UI/UX, Figma/Storybook
- 개발 기간: 4-8주 (Basic/Premium)

**Operations 관리 서비스**
- ID: `operations-management-service`
- Slug: `operations`
- 가격: ₩5,000,000 (기본)
- 제공: 인프라 구축, CI/CD, 모니터링, 성능 최적화, 보안
- 개발 기간: 4-12주 (Standard/Enterprise)

#### 3. 인덱스 생성
```sql
CREATE INDEX IF NOT EXISTS idx_services_slug ON public.services(slug);
```

**목적**: `slug` 필드로 서비스 조회 시 성능 향상 (빠른 검색)

#### 4. 검증 블록 (PL/pgSQL)
```sql
DO $$
  -- 생성된 서비스 개수 확인
  -- 각 서비스의 URL 출력
  -- 가격 및 환불정책 페이지 안내
$$;
```

**목적**: 마이그레이션 실행 후 정상 적용 확인

---

## Supabase 적용 방법

### 전제 조건

#### 필수
- [ ] Supabase 계정 (프로젝트: ideaonaction-prod)
- [ ] SQL Editor 접근 권한
- [ ] `services` 테이블 및 `service_categories` 테이블 존재 확인

#### 권장
- [ ] 마이그레이션 적용 전 백업 수행
- [ ] 프로덕션 환경에서 테스트 완료

### 단계별 적용 방법

#### Step 1: Supabase 대시보드 접근

1. Supabase 콘솔 열기
   - URL: https://app.supabase.com/
   - 로그인 (Google/GitHub 계정)

2. 프로젝트 선택
   - 프로젝트: `ideaonaction-prod`
   - 또는 개발 환경: `ideaonaction-dev`

#### Step 2: SQL Editor 열기

1. 왼쪽 사이드바에서 **SQL Editor** 클릭
2. **New Query** 버튼 클릭
3. 쿼리 편집 창이 열림

#### Step 3: SQL 코드 입력

1. 마이그레이션 파일의 전체 SQL 복사
   ```bash
   # 터미널에서 파일 내용 복사
   cat supabase/migrations/20251116100001_add_toss_review_services_fixed.sql
   ```

2. Supabase SQL Editor에 붙여넣기
   - 편집 창에 마우스 클릭
   - `Ctrl + A` (모두 선택)
   - `Ctrl + V` (붙여넣기)

3. 코드 확인
   - 4개 `INSERT INTO` 블록 존재 확인
   - `CREATE INDEX` 문 존재 확인
   - 검증 블록(`DO $$`) 존재 확인

#### Step 4: 실행 전 확인 (중요 ⚠️)

**다음 항목을 반드시 확인하세요:**

1. **테이블 존재 확인**
   ```sql
   -- 이 쿼리를 먼저 실행하여 테이블 존재 확인
   SELECT table_name
   FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_name IN ('services', 'service_categories');
   ```

   **예상 결과**:
   ```
   services
   service_categories
   ```

2. **카테고리 확인**
   ```sql
   -- Development, Design, Operations 카테고리 존재 확인
   SELECT id, slug, name
   FROM public.service_categories
   WHERE slug IN ('development', 'design', 'operations');
   ```

   **예상 결과**: 3개 행 반환

3. **기존 서비스 확인**
   ```sql
   -- 기존 서비스 개수 확인 (선택사항)
   SELECT COUNT(*) as total_services FROM public.services;
   ```

#### Step 5: 마이그레이션 실행

1. SQL Editor에서 **Run** 버튼 클릭
   - 또는 `Ctrl + Enter` 단축키

2. 실행 완료 대기
   - 진행률 바 표시
   - 일반적으로 **2-3초** 소요

3. 결과 확인
   - 성공 메시지: `Query completed successfully`
   - 또는 오류 메시지 (오류 발생 시 [주의사항](#주의사항-및-롤백) 참고)

4. 검증 메시지 확인
   ```
   === Toss Payments Review Services Created ===
   Total services with required slugs: 4

   URLs:
     - MVP: https://www.ideaonaction.ai/services/mvp
     - Fullstack: https://www.ideaonaction.ai/services/fullstack
     - Design: https://www.ideaonaction.ai/services/design
     - Operations: https://www.ideaonaction.ai/services/operations

   Pricing: https://www.ideaonaction.ai/pricing
   Refund Policy: https://www.ideaonaction.ai/refund-policy
   ```

### 스크린샷 가이드

**SQL Editor 위치**:
1. Supabase 대시보드 좌측 메뉴
2. `SQL Editor` 아이콘 클릭
3. `New Query` 버튼으로 새 쿼리 생성

**쿼리 실행 버튼**:
- 편집 창 우상단의 **▶ Run** 버튼
- 또는 `Ctrl + Enter` 단축키

---

## 적용 후 검증

### 1. 서비스 데이터 조회 (필수)

#### 쿼리: 4개 서비스 존재 확인
```sql
SELECT
  id,
  slug,
  title,
  price,
  status,
  created_at
FROM public.services
WHERE slug IN ('mvp', 'fullstack', 'design', 'operations')
ORDER BY slug;
```

**예상 결과**:
```
ID                              | slug      | title                    | price      | status | created_at
mvp-development-service         | mvp       | MVP 개발 서비스          | 2000000    | active | 2025-11-16...
fullstack-development-service   | fullstack | Fullstack 개발 서비스    | 10000000   | active | 2025-11-16...
design-system-service           | design    | Design System 서비스     | 3000000    | active | 2025-11-16...
operations-management-service   | operations| Operations 관리 서비스   | 5000000    | active | 2025-11-16...
```

**확인 사항**:
- [ ] 4개 행 반환
- [ ] 모든 `slug` 값 정확 (mvp, fullstack, design, operations)
- [ ] 모든 `status` = `active`
- [ ] 가격 정확성 확인

#### 쿼리: 설명(description) 길이 확인
```sql
SELECT
  slug,
  title,
  LENGTH(description) as description_length
FROM public.services
WHERE slug IN ('mvp', 'fullstack', 'design', 'operations')
ORDER BY slug;
```

**예상 결과**: 각 서비스마다 500자 이상의 설명

### 2. 웹사이트 URL 확인 (최종 검증)

각 URL을 브라우저에서 열어 정상 작동 확인:

#### MVP 개발 서비스
- **URL**: https://www.ideaonaction.ai/services/mvp
- **확인 사항**:
  - [ ] 페이지 로딩 (404 에러 없음)
  - [ ] 제목: "MVP 개발 서비스"
  - [ ] 가격: "₩2,000,000"
  - [ ] 설명 내용 정상 표시
  - [ ] 환불정책 링크 정상 작동

#### Fullstack 개발 서비스
- **URL**: https://www.ideaonaction.ai/services/fullstack
- **확인 사항**:
  - [ ] 페이지 로딩 (404 에러 없음)
  - [ ] 제목: "Fullstack 개발 서비스"
  - [ ] 가격: "₩10,000,000"

#### Design System 서비스
- **URL**: https://www.ideaonaction.ai/services/design
- **확인 사항**:
  - [ ] 페이지 로딩 (404 에러 없음)
  - [ ] 제목: "Design System 서비스"
  - [ ] 가격: "₩3,000,000"

#### Operations 관리 서비스
- **URL**: https://www.ideaonaction.ai/services/operations
- **확인 사항**:
  - [ ] 페이지 로딩 (404 에러 없음)
  - [ ] 제목: "Operations 관리 서비스"
  - [ ] 가격: "₩5,000,000"

### 3. 가격 페이지 확인 (선택사항)

- **URL**: https://www.ideaonaction.ai/pricing
- **확인 사항**:
  - [ ] 4개 서비스 모두 목록에 표시됨
  - [ ] 가격 정확성
  - [ ] 서비스 상세 링크 정상 작동

### 4. 데이터베이스 통계 확인 (선택사항)

```sql
-- 전체 서비스 현황
SELECT
  COUNT(*) as total_services,
  COUNT(CASE WHEN status = 'active' THEN 1 END) as active_services,
  COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_services
FROM public.services;

-- 카테고리별 서비스 수
SELECT
  sc.slug as category_slug,
  sc.name as category_name,
  COUNT(s.id) as service_count
FROM public.service_categories sc
LEFT JOIN public.services s ON s.category_id = sc.id
GROUP BY sc.id, sc.slug, sc.name
ORDER BY sc.slug;
```

---

## 주의사항 및 롤백

### 적용 전 주의사항

#### 1. 기존 데이터 확인 (중요 ⚠️)

마이그레이션 실행 전에 반드시 다음을 확인하세요:

```sql
-- 기존에 추가할 서비스와 동일한 ID가 있는지 확인
SELECT id, slug, title
FROM public.services
WHERE id IN (
  'mvp-development-service',
  'fullstack-development-service',
  'design-system-service',
  'operations-management-service'
);
```

**결과가 있으면**:
- 기존 데이터가 덮어씌워집니다 (내용 업데이트)
- 문제 없으면 계속 진행
- 문제 있으면 기존 데이터 확인 후 수정

#### 2. 카테고리 확인

각 서비스가 참조할 카테고리가 존재해야 합니다:

```sql
-- 필수 카테고리 확인
SELECT id, slug, name
FROM public.service_categories
WHERE slug IN ('development', 'design', 'operations');
```

**모두 존재해야 함**:
- [ ] `development` 카테고리
- [ ] `design` 카테고리
- [ ] `operations` 카테고리

**카테고리가 없으면**:

개발 카테고리 먼저 생성:

```sql
INSERT INTO public.service_categories (slug, name, description)
VALUES
  ('development', 'Development', 'Web/App Development Services'),
  ('design', 'Design', 'Design & UX Services'),
  ('operations', 'Operations', 'Operations & DevOps Services')
ON CONFLICT (slug) DO NOTHING;
```

### 적용 후 확인 사항

#### 1. 검증 메시지 확인

SQL 실행 후 메시지 확인:
```
=== Toss Payments Review Services Created ===
Total services with required slugs: 4
```

**만약 4가 아니면**:
- [ ] 마이그레이션 파일 재확인
- [ ] 데이터베이스 권한 확인
- [ ] Supabase 상태 확인

#### 2. 성능 영향 확인

```sql
-- 인덱스 정상 생성 확인
SELECT
  schemaname,
  tablename,
  indexname
FROM pg_indexes
WHERE tablename = 'services' AND indexname LIKE '%slug%';
```

**예상 결과**:
```
idx_services_slug | CREATE INDEX idx_services_slug ON public.services(slug)
```

### 롤백 방법

만약 마이그레이션을 되돌려야 한다면:

#### 방법 1: 마이그레이션 파일로 롤백 (Supabase CLI 사용)

```bash
# Supabase CLI 설치 (처음 한 번만)
npm install -g supabase

# 로그인
supabase login

# 마이그레이션 목록 확인
supabase db pull

# 최신 마이그레이션 취소
# (참고: Supabase는 마이그레이션 원복을 지원하지 않음)
```

#### 방법 2: 수동 SQL로 롤백

Supabase SQL Editor에서 다음 쿼리 실행:

```sql
-- 추가된 서비스 삭제 (되돌리기)
DELETE FROM public.services
WHERE id IN (
  'mvp-development-service',
  'fullstack-development-service',
  'design-system-service',
  'operations-management-service'
);

-- 인덱스 삭제 (선택사항)
DROP INDEX IF EXISTS idx_services_slug;
```

#### 방법 3: 데이터베이스 복원 (최후의 수단)

Supabase 대시보드에서:
1. 왼쪽 메뉴 → **Backups**
2. 마이그레이션 전 백업 선택
3. **Restore** 클릭

**주의**: 복원 후 모든 변경사항 손실됨

### 에러 발생 시 대처

#### 에러: "relation 'public.services' does not exist"
```
Error: relation 'public.services' does not exist
```

**원인**: `services` 테이블 없음

**해결**:
```sql
-- 테이블 구조 확인
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public';
```

#### 에러: "duplicate key value violates unique constraint"
```
Error: duplicate key value violates unique constraint "services_pkey"
```

**원인**: 동일한 ID를 가진 서비스가 이미 존재

**해결**:
```sql
-- 기존 서비스 확인 및 삭제/수정
DELETE FROM public.services
WHERE id IN ('mvp-development-service', 'fullstack-development-service', ...);

-- 마이그레이션 재실행
```

#### 에러: "undefined_function: service_categories"
```
Error: function (SELECT id FROM public.service_categories WHERE slug = 'development' LIMIT 1) ... undefined
```

**원인**: 카테고리 테이블 없음 또는 권한 없음

**해결**:
```sql
-- 카테고리 테이블 확인
SELECT * FROM public.service_categories LIMIT 1;

-- 카테고리 생성 (필요시)
INSERT INTO public.service_categories (slug, name)
VALUES ('development', 'Development'), ('design', 'Design'), ('operations', 'Operations');
```

---

## FAQ

### Q1: 기존 서비스는 어떻게 되나요?

**A**: 기존 서비스는 영향을 받지 않습니다.
- 마이그레이션은 **4개 서비스만** 추가/업데이트합니다
- 다른 서비스는 그대로 유지됩니다
- `ON CONFLICT` 절로 인해 안전합니다

### Q2: 같은 마이그레이션을 여러 번 실행해도 괜찮나요?

**A**: 네, 괜찮습니다.
- `ON CONFLICT ... DO UPDATE` 사용
- 동일한 ID는 덮어씌웁니다 (최신 정보로 갱신)
- 중복 생성되지 않습니다

### Q3: 어느 환경(Dev/Prod)에 적용해야 하나요?

**A**: 프로젝트 요구사항에 따릅니다:

| 환경 | 추천 | 설명 |
|------|------|------|
| **Dev** | ⭐ 먼저 | 테스트 및 검증용 |
| **Prod** | ✅ 검증 후 | 실제 사용자에게 노출될 환경 |

**권장 절차**:
1. Dev 환경에 먼저 적용
2. 모든 검증 완료
3. Prod 환경에 적용

### Q4: 서비스 설명(description)을 수정하고 싶어요.

**A**: SQL Editor에서 직접 수정 가능:

```sql
UPDATE public.services
SET description = '새로운 설명'
WHERE slug = 'mvp';
```

또는 마이그레이션 파일의 설명 부분을 수정 후 재실행.

### Q5: 서비스 가격을 변경하려면?

**A**: 두 가지 방법:

**방법 1: 즉시 변경 (SQL)**
```sql
UPDATE public.services
SET price = 2500000
WHERE slug = 'mvp';
```

**방법 2: 마이그레이션 파일 수정 후 재실행**
```sql
-- 파일의 price 값 변경
-- price = 2000000 → price = 2500000
```

### Q6: 서비스를 비활성화하려면?

**A**:
```sql
UPDATE public.services
SET status = 'inactive'
WHERE slug = 'mvp';
```

또는
```sql
UPDATE public.services
SET status = 'active'
WHERE slug = 'mvp';
```

### Q7: 인덱스는 왜 필요한가요?

**A**: 성능 최적화 때문입니다:
- `slug` 필드로 검색할 때 속도 향상
- 대규모 데이터에서 중요
- 현재는 작지만, 나중을 대비해 생성

### Q8: 마이그레이션 파일을 Git에 커밋해야 하나요?

**A**: 네, 반드시 커밋하세요:

```bash
# 마이그레이션 파일 확인
git status

# 파일 추가
git add supabase/migrations/20251116100001_add_toss_review_services_fixed.sql

# 커밋
git commit -m "feat: Toss Payments 심사용 4개 서비스 마이그레이션 추가"

# 푸시
git push origin main
```

### Q9: Vercel 배포 후 서비스가 보이지 않아요.

**A**: 다음을 확인하세요:

1. **캐시 삭제**
   - 브라우저 캐시 비우기 (Ctrl + Shift + Delete)
   - CDN 캐시 갱신 (Vercel 대시보드에서 재배포)

2. **서비스 데이터 확인**
   ```sql
   SELECT * FROM public.services WHERE slug = 'mvp';
   ```

3. **프론트엔드 코드 확인**
   - `src/pages/ServiceDetail.tsx` 확인
   - `useService` 훅 동작 확인

4. **네트워크 요청 확인**
   - 브라우저 개발자 도구 → Network 탭
   - `/rest/v1/services?slug=eq.mvp` 요청 확인

### Q10: 여러 마이그레이션을 동시에 적용할 수 있나요?

**A**: Supabase는 마이그레이션을 순서대로 실행합니다:

```
20251116100000 → 20251116100001 → 20251116100002 → ...
```

따라서 여러 마이그레이션을 동시에 실행해도 순서대로 진행되므로 안전합니다.

---

## 체크리스트

마이그레이션 적용 전/후 확인 사항:

### 적용 전
- [ ] 마이그레이션 파일 준비 (`20251116100001_add_toss_review_services_fixed.sql`)
- [ ] Supabase 계정 접근 확인
- [ ] 필수 카테고리(development, design, operations) 존재 확인
- [ ] 기존 서비스 ID 충돌 확인
- [ ] 백업 계획 수립

### 적용 중
- [ ] SQL Editor에서 쿼리 입력
- [ ] 코드 문법 확인
- [ ] Run 버튼으로 실행
- [ ] 실행 완료 메시지 확인

### 적용 후
- [ ] 4개 서비스 데이터 조회 확인
- [ ] 각 서비스 URL 방문 (404 에러 없음)
- [ ] 가격/설명 정확성 확인
- [ ] 환불정책 링크 정상 작동
- [ ] Vercel 캐시 갱신 (필요시)
- [ ] 검증 메시지 기록 (문제 발생 시 참고)

---

## 연락처 및 지원

**문제 발생 시**:
- GitHub Issues: https://github.com/IDEA-on-Action/idea-on-action/issues
- Email: sinclairseo@gmail.com

**참고 자료**:
- Supabase 문서: https://supabase.com/docs
- 마이그레이션 파일: `supabase/migrations/20251116100001_add_toss_review_services_fixed.sql`
- 프로젝트 CLAUDE.md: `CLAUDE.md`

---

**마지막 업데이트**: 2025-11-16
**작성자**: Claude Code
**상태**: Ready for Production ✅

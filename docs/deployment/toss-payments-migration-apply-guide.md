# Toss Payments 서비스 마이그레이션 적용 가이드

> **작성일**: 2025-11-16
> **대상 파일**: `supabase/migrations/20251116100002_add_toss_review_services_final.sql`
> **목적**: 토스페이먼츠 심사용 4개 서비스(MVP, Fullstack, Design, Operations) 추가

---

## 1. 개요

이 가이드는 토스페이먼츠 심사를 위한 4개 서비스를 Supabase 데이터베이스에 추가하는 방법을 설명합니다.

### 추가될 서비스

| 서비스명 | Slug | 가격 (시작) | 개발 기간 | URL |
|---------|------|------------|----------|-----|
| MVP 개발 서비스 | `mvp` | ₩2,000,000 | 4-6주 | https://www.ideaonaction.ai/services/mvp |
| Fullstack 개발 서비스 | `fullstack` | ₩10,000,000 | 12-16주 | https://www.ideaonaction.ai/services/fullstack |
| Design System 서비스 | `design` | ₩3,000,000 | 4-6주 | https://www.ideaonaction.ai/services/design |
| Operations 관리 서비스 | `operations` | ₩5,000,000 | 4-8주 | https://www.ideaonaction.ai/services/operations |

### 주요 특징

- **ON CONFLICT 처리**: 기존 동일 slug 서비스가 있으면 자동 업데이트
- **환불 정책 포함**: 각 서비스 description에 환불 정책 명시
- **인덱스 추가**: `idx_services_slug` 인덱스 자동 생성 (조회 성능 향상)
- **검증 스크립트**: 마이그레이션 완료 후 자동 확인

---

## 2. 전제조건

### 2.1. 필수 테이블

이 마이그레이션은 다음 테이블이 존재해야 합니다:

- **`public.services`**: 서비스 데이터 저장 테이블
- **`public.service_categories`**: 서비스 카테고리 테이블

테이블 생성 마이그레이션: `20251020000000_create_services_tables.sql` (이미 적용됨)

### 2.2. 필수 카테고리 Slug

다음 카테고리 slug가 `service_categories` 테이블에 존재해야 합니다:

- `development` - MVP, Fullstack 서비스에서 사용
- `design` - Design System 서비스에서 사용
- `operations` - Operations 관리 서비스에서 사용

### 2.3. Supabase 접근 권한

- Supabase Dashboard 접근 권한 (SQL Editor 사용)
- 또는 Supabase CLI 설치 및 로그인

---

## 3. 적용 전 체크리스트

마이그레이션을 실행하기 전에 다음을 확인하세요:

### 3.1. Supabase 연결 확인

```bash
# Supabase CLI가 설치되어 있는 경우
supabase status
```

예상 출력:
```
API URL: https://zykjdneewbzyazfukzyg.supabase.co
```

### 3.2. 필수 카테고리 확인

Supabase Dashboard → SQL Editor에서 실행:

```sql
-- 필수 카테고리 존재 여부 확인
SELECT slug, name, id
FROM public.service_categories
WHERE slug IN ('development', 'design', 'operations');
```

**예상 결과**: 3개 행이 반환되어야 함

만약 카테고리가 없다면:
```sql
-- 카테고리 추가
INSERT INTO public.service_categories (name, slug, description, icon, display_order, is_active) VALUES
  ('개발', 'development', 'MVP 및 Fullstack 개발 서비스', 'Code', 10, true),
  ('디자인', 'design', 'UI/UX 디자인 및 디자인 시스템', 'Palette', 20, true),
  ('운영', 'operations', 'DevOps 및 인프라 운영 관리', 'Settings', 30, true)
ON CONFLICT (slug) DO NOTHING;
```

### 3.3. 기존 서비스 확인

```sql
-- 동일 slug 서비스 존재 여부 확인
SELECT slug, title, price
FROM public.services
WHERE slug IN ('mvp', 'fullstack', 'design', 'operations');
```

- **0개 행**: 신규 INSERT 됨
- **1개 이상**: ON CONFLICT로 자동 UPDATE 됨

### 3.4. 백업 권장사항

중요 데이터가 있는 경우, 실행 전 백업 권장:

```sql
-- 기존 서비스 백업 (선택)
CREATE TABLE services_backup_20251116 AS
SELECT * FROM public.services;
```

---

## 4. 적용 방법

### 4.1. Supabase Dashboard 사용 (권장)

1. **Supabase Dashboard 접속**
   https://supabase.com/dashboard/project/zykjdneewbzyazfukzyg

2. **SQL Editor 열기**
   좌측 메뉴 → `SQL Editor` 클릭

3. **마이그레이션 파일 내용 복사**
   `supabase/migrations/20251116100002_add_toss_review_services_final.sql` 파일 내용 전체 복사

4. **SQL 실행**
   - `New Query` 버튼 클릭
   - 복사한 내용 붙여넣기
   - 우측 하단 `Run` 버튼 클릭 (또는 Ctrl+Enter)

5. **예상 출력**
   ```
   NOTICE: === Toss Payments Review Services Created ===
   NOTICE: Total services with required slugs: 4
   NOTICE:
   NOTICE: URLs:
   NOTICE:   - MVP: https://www.ideaonaction.ai/services/mvp
   NOTICE:   - Fullstack: https://www.ideaonaction.ai/services/fullstack
   NOTICE:   - Design: https://www.ideaonaction.ai/services/design
   NOTICE:   - Operations: https://www.ideaonaction.ai/services/operations
   NOTICE:
   NOTICE: Pricing: https://www.ideaonaction.ai/pricing
   NOTICE: Refund Policy: https://www.ideaonaction.ai/refund-policy

   Success. No rows returned
   ```

### 4.2. Supabase CLI 사용 (로컬)

```bash
# 1. Supabase CLI 로그인 (최초 1회)
supabase login

# 2. 프로젝트 연결 (최초 1회)
supabase link --project-ref zykjdneewbzyazfukzyg

# 3. 마이그레이션 실행
supabase db push
```

**주의**: `supabase db push`는 `supabase/migrations/` 폴더의 **모든 미적용 마이그레이션**을 실행합니다.

특정 마이그레이션만 실행하려면:
```bash
# SQL 파일을 직접 실행
cat supabase/migrations/20251116100002_add_toss_review_services_final.sql | supabase db execute
```

---

## 5. 검증 방법

### 5.1. 데이터베이스 확인

```sql
-- 4개 서비스 생성 확인
SELECT
  slug,
  title,
  price,
  status,
  category_id
FROM public.services
WHERE slug IN ('mvp', 'fullstack', 'design', 'operations')
ORDER BY slug;
```

**예상 결과**: 4개 행 반환

| slug | title | price | status | category_id |
|------|-------|-------|--------|-------------|
| design | Design System 서비스 | 3000000 | active | [UUID] |
| fullstack | Fullstack 개발 서비스 | 10000000 | active | [UUID] |
| mvp | MVP 개발 서비스 | 2000000 | active | [UUID] |
| operations | Operations 관리 서비스 | 5000000 | active | [UUID] |

### 5.2. 인덱스 확인

```sql
-- idx_services_slug 인덱스 생성 확인
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'services' AND indexname = 'idx_services_slug';
```

**예상 결과**: 1개 행 반환

### 5.3. 웹사이트 확인

브라우저에서 다음 URL 접속:

- https://www.ideaonaction.ai/services/mvp
- https://www.ideaonaction.ai/services/fullstack
- https://www.ideaonaction.ai/services/design
- https://www.ideaonaction.ai/services/operations

**예상 결과**: 각 서비스 상세 페이지 정상 표시

### 5.4. 관리자 페이지 확인

1. https://www.ideaonaction.ai/login 로그인 (관리자 계정)
2. https://www.ideaonaction.ai/admin/services 접속
3. 4개 서비스가 목록에 표시되는지 확인

---

## 6. 롤백 방법

마이그레이션을 되돌리려면:

### 6.1. 4개 서비스 삭제

```sql
-- Toss Payments 심사용 서비스 삭제
DELETE FROM public.services
WHERE slug IN ('mvp', 'fullstack', 'design', 'operations');
```

### 6.2. 인덱스 삭제 (선택)

```sql
-- idx_services_slug 인덱스 삭제 (선택)
DROP INDEX IF EXISTS public.idx_services_slug;
```

### 6.3. 백업 복원 (선택)

백업을 생성했다면:
```sql
-- 백업에서 특정 서비스 복원
INSERT INTO public.services
SELECT * FROM services_backup_20251116
WHERE slug IN ('mvp', 'fullstack', 'design', 'operations')
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  updated_at = NOW();
```

---

## 7. Quick Start (1분 안에 실행)

### Step 1: Supabase Dashboard 접속
https://supabase.com/dashboard/project/zykjdneewbzyazfukzyg → SQL Editor

### Step 2: 마이그레이션 실행
```sql
-- 파일 내용 복사 후 붙여넣기 → Run 버튼 클릭
-- supabase/migrations/20251116100002_add_toss_review_services_final.sql
```

### Step 3: 검증
```sql
-- 4개 서비스 확인
SELECT slug, title, price FROM public.services
WHERE slug IN ('mvp', 'fullstack', 'design', 'operations');
```

**완료!** 🎉

---

## 8. FAQ

### Q1. "relation public.service_categories does not exist" 오류

**원인**: `service_categories` 테이블이 생성되지 않음

**해결**:
```bash
# Supabase CLI로 모든 마이그레이션 실행
supabase db push
```

또는 Supabase Dashboard에서 `20251020000000_create_services_tables.sql` 수동 실행

---

### Q2. "insert or update on table services violates foreign key constraint" 오류

**원인**: `service_categories` 테이블에 `development`, `design`, `operations` slug가 없음

**해결**:
```sql
-- 필수 카테고리 추가
INSERT INTO public.service_categories (name, slug, description, icon, display_order, is_active) VALUES
  ('개발', 'development', 'MVP 및 Fullstack 개발 서비스', 'Code', 10, true),
  ('디자인', 'design', 'UI/UX 디자인 및 디자인 시스템', 'Palette', 20, true),
  ('운영', 'operations', 'DevOps 및 인프라 운영 관리', 'Settings', 30, true)
ON CONFLICT (slug) DO NOTHING;
```

---

### Q3. 기존 서비스가 덮어써지나요?

**답변**: 아니요. `ON CONFLICT (slug) DO UPDATE` 로직으로 **안전하게 업데이트**됩니다.

- 동일 slug가 없으면 → INSERT
- 동일 slug가 있으면 → UPDATE (title, description, price만 업데이트, id 유지)

---

### Q4. 프로덕션 사이트에 바로 반영되나요?

**답변**: 네. Supabase 데이터베이스는 실시간으로 프로덕션과 연결되어 있습니다.

- Supabase에서 SQL 실행 → 즉시 반영
- 웹사이트 재배포 **불필요** (데이터만 변경되므로)

---

### Q5. 환불 정책은 어디에 표시되나요?

**답변**: 각 서비스의 `description` 필드에 Markdown 형식으로 포함되어 있습니다.

예시:
```markdown
## 환불 정책
- 계약 후 7일 이내: 전액 환불
- 개발 시작 전: 80% 환불
- 개발 진행 중: 진행률에 따라 차등 환불 (최소 30%)
- 서비스 제공 완료 후: 환불 불가
```

웹사이트에서 서비스 상세 페이지에 자동으로 렌더링됩니다.

---

## 9. 트러블슈팅

### 문제 1: NOTICE 메시지가 표시되지 않음

**원인**: Supabase Dashboard 설정

**해결**: SQL Editor 우측 상단 → `Settings` → `Show NOTICE messages` 활성화

---

### 문제 2: 인덱스 생성 실패

**원인**: 이미 동일 이름 인덱스 존재

**해결**:
```sql
-- 기존 인덱스 삭제 후 재생성
DROP INDEX IF EXISTS public.idx_services_slug;
CREATE INDEX idx_services_slug ON public.services(slug);
```

---

### 문제 3: category_id가 NULL로 INSERT됨

**원인**: `service_categories` 테이블에 해당 slug가 없음

**해결**:
```sql
-- 카테고리 확인
SELECT slug, id FROM public.service_categories
WHERE slug IN ('development', 'design', 'operations');

-- 없으면 추가 (FAQ Q2 참고)
```

---

### 문제 4: 권한 오류 (permission denied)

**원인**: RLS (Row Level Security) 정책

**해결**:
- Supabase Dashboard에서 실행 (Service Role 권한 사용)
- 또는 Supabase CLI의 `supabase db execute` 사용

---

## 10. 관련 문서

- **토스페이먼츠 심사 기획서**: `docs/payments/toss-payments-review.md`
- **서비스 플랫폼 요구사항**: `spec/services-platform/requirements.md`
- **환불 정책 페이지**: https://www.ideaonaction.ai/refund-policy
- **서비스 목록 페이지**: https://www.ideaonaction.ai/services

---

## 11. 지원

문제가 지속되면:

1. **GitHub Issue 생성**: https://github.com/IDEA-on-Action/idea-on-action/issues
2. **이메일**: sinclairseo@gmail.com
3. **전화**: 010-4904-2671

---

**작성자**: Claude AI
**버전**: 1.0
**최종 업데이트**: 2025-11-16

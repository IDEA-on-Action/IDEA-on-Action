# 📘 Supabase Schema Migration Guide

> **작성일**: 2025-10-17
> **대상**: Phase 8-12 로드맵 기반 스키마 최적화
> **소요 시간**: 약 30분

---

## 🎯 마이그레이션 목표

### Before (현재)
- ❌ `services` 테이블 비어있음 (구조 불완전)
- ❌ 불필요한 테이블 존재 (`post_tags`, `gallery`, `metrics`)
- ❌ RLS 정책 미설정
- ❌ 인덱스 부족

### After (완료 후)
- ✅ `services` 테이블 완전한 구조 (Phase 8 준비 완료)
- ✅ 불필요한 테이블 제거 (깔끔한 스키마)
- ✅ RLS 정책 설정 (보안 강화)
- ✅ 인덱스 최적화 (성능 향상)
- ✅ 샘플 데이터 3개 (개발 준비 완료)
- ✅ TypeScript 타입 정의 (타입 안정성)

---

## 📋 사전 준비

### 1. 백업 생성 ⚠️ 필수

1. Supabase Dashboard 접속
   - URL: https://supabase.com/dashboard/project/zykjdneewbzyazfukzyg
2. **Database** → **Backups** 클릭
3. **Create a new backup** 클릭
4. 백업 완료 확인 (약 1-2분 소요)

### 2. 필요한 파일 확인

```bash
docs/database/
├── extract-schema.sql                    # 현재 스키마 확인용
├── current-schema.json                   # 현재 스키마 (자동 생성됨)
├── schema-analysis-report.md             # 분석 리포트
├── migrations/
│   ├── 001-schema-cleanup-and-improvement.sql  # 메인 마이그레이션
│   └── 002-insert-sample-services.sql          # 샘플 데이터
└── migration-guide.md                    # 이 파일
```

### 3. 권한 확인

- ✅ Supabase 프로젝트 Owner 또는 Admin 권한
- ✅ SQL Editor 접근 권한
- ✅ Database Schema 변경 권한

---

## 🚀 실행 단계

### Step 1: 현재 스키마 확인 (선택 사항)

**목적**: 마이그레이션 전 현재 상태 파악

1. Supabase Dashboard → **SQL Editor**
2. `docs/database/extract-schema.sql` 파일 내용 복사
3. SQL Editor에 붙여넣기
4. **Run** 클릭
5. 결과 확인 (테이블 목록, 컬럼 정보, 외래 키 등)

**예상 결과**:
```
services: 0 rows
service_categories: 4 rows
posts: 6 rows
...
```

---

### Step 2: 메인 마이그레이션 실행 ⭐ 핵심

**파일**: `docs/database/migrations/001-schema-cleanup-and-improvement.sql`

#### 2.1. SQL 파일 열기

```bash
# VS Code에서 열기
code docs/database/migrations/001-schema-cleanup-and-improvement.sql
```

#### 2.2. 실행 전 확인 사항

**PART 2 (불필요한 테이블 삭제)** 확인:
```sql
-- 2.1. post_tags 삭제 (확정)
DROP TABLE IF EXISTS post_tags CASCADE;

-- 2.2. gallery 삭제 (조건부)
-- ⚠️ 사용 중이면 이 라인 주석 처리
-- DROP TABLE IF EXISTS gallery CASCADE;

-- 2.3. metrics 삭제 (조건부)
-- ⚠️ 전역 메트릭 용도면 이 라인 주석 처리
-- DROP TABLE IF EXISTS metrics CASCADE;
```

**질문**:
- `gallery` 테이블을 삭제할까요?
  - 현재 0행, 용도 불명
  - **추천**: 삭제 (서비스 이미지는 `services.images` 사용)
- `metrics` 테이블을 삭제할까요?
  - 현재 0행, 용도 불명
  - **추천**: 삭제 (서비스 메트릭은 `services.metrics` 사용)

**결정**:
- 삭제하려면 → 주석 제거 (`--` 삭제)
- 유지하려면 → 주석 유지

#### 2.3. Supabase SQL Editor에서 실행

1. SQL 파일 전체 내용 복사
2. Supabase Dashboard → **SQL Editor**
3. **New query** 클릭
4. 붙여넣기
5. **Run** 클릭 (실행 시간: 약 10-20초)

#### 2.4. 실행 결과 확인

**성공 시**:
```
NOTICE: === 데이터 백업 체크 ===
NOTICE: service_categories: 4 rows
NOTICE: posts: 6 rows
NOTICE: services: 0 rows

... (테이블 생성 및 수정)

NOTICE: === 마이그레이션 완료 ===
NOTICE: services 컬럼: 11 개
NOTICE: service_categories 컬럼: 8 개
NOTICE: RLS 정책 수: 10 개

Success. No rows returned
```

**실패 시** (에러 발생):
- 에러 메시지 확인
- `schema-analysis-report.md` 참고
- 백업에서 복원 후 재시도

---

### Step 3: 샘플 데이터 삽입

**파일**: `docs/database/migrations/002-insert-sample-services.sql`

#### 3.1. SQL 파일 실행

1. `002-insert-sample-services.sql` 파일 내용 복사
2. Supabase SQL Editor → **New query**
3. 붙여넣기
4. **Run** 클릭

#### 3.2. 삽입된 데이터 확인

**쿼리 실행**:
```sql
SELECT
  s.id,
  s.title,
  sc.name AS category_name,
  s.price,
  s.status,
  jsonb_array_length(s.features) AS feature_count,
  jsonb_array_length(s.images) AS image_count,
  s.metrics->>'users' AS users
FROM services s
LEFT JOIN service_categories sc ON s.category_id = sc.id
ORDER BY s.created_at DESC;
```

**예상 결과** (3개 행):
| title | category_name | price | feature_count | image_count | users |
|-------|--------------|-------|---------------|-------------|-------|
| AI 워크플로우 자동화 도구 | AI 솔루션 | 299000 | 5 | 3 | 1250 |
| 스마트 데이터 분석 플랫폼 | 데이터 분석 | 450000 | 5 | 3 | 850 |
| 비즈니스 컨설팅 패키지 | 컨설팅 | 1200000 | 5 | 3 | 120 |

---

### Step 4: RLS 정책 테스트

**목적**: Public 접근 권한 확인

#### 4.1. Anon Key로 테스트

1. SQL Editor → **Settings** (톱니바퀴 아이콘)
2. **Run as** → **anon** 선택
3. 아래 쿼리 실행:

```sql
-- Public은 active 서비스만 조회 가능
SELECT id, title, price, status
FROM services
WHERE status = 'active';
```

**예상 결과**: 3개 행 반환

#### 4.2. Draft 서비스 테스트

```sql
-- Draft 서비스는 조회 불가 (RLS 정책)
SELECT id, title, status
FROM services
WHERE status = 'draft';
```

**예상 결과**: 0개 행 반환 (정상)

---

### Step 5: TypeScript 타입 검증

**파일**: `src/types/database.ts` (이미 생성됨)

#### 5.1. TypeScript 빌드 확인

```bash
# 타입 체크
npm run build

# 또는
npx tsc --noEmit
```

**예상 결과**: 에러 없음

#### 5.2. 타입 사용 예시

```typescript
import { Service, ServiceCategory } from '@/types/database'

// React Query 훅에서 사용
const { data: services } = useQuery<Service[]>({
  queryKey: ['services'],
  queryFn: async () => {
    const { data } = await supabase
      .from('services')
      .select('*')
      .eq('status', 'active')
    return data
  }
})
```

---

## ✅ 완료 체크리스트

### 필수 항목
- [ ] Supabase 백업 생성 완료
- [ ] `001-schema-cleanup-and-improvement.sql` 실행 완료
- [ ] `002-insert-sample-services.sql` 실행 완료
- [ ] 샘플 서비스 3개 확인 (AI 도구, 데이터 분석, 컨설팅)
- [ ] RLS 정책 동작 확인 (anon key 테스트)
- [ ] TypeScript 빌드 에러 없음

### 검증 항목
- [ ] `services` 테이블 컬럼 11개
- [ ] `service_categories` 테이블 컬럼 8개
- [ ] RLS 정책 10개 이상
- [ ] 인덱스 설정 확인 (category_id, status, created_at)
- [ ] 외래 키 제약 조건 동작 확인

### 선택 항목
- [ ] `gallery` 테이블 삭제 (필요시)
- [ ] `metrics` 테이블 삭제 (필요시)
- [ ] 추가 카테고리 생성 (필요시)

---

## 🔧 문제 해결 (Troubleshooting)

### 문제 1: "relation does not exist" 에러

**원인**: 테이블이 존재하지 않음

**해결**:
1. `extract-schema.sql`로 테이블 존재 확인
2. 해당 테이블 CREATE 문 추가
3. 마이그레이션 재실행

---

### 문제 2: "duplicate key value violates unique constraint"

**원인**: 중복 데이터 삽입 시도

**해결**:
```sql
-- 샘플 데이터 삭제 후 재삽입
DELETE FROM services WHERE title LIKE 'AI 워크플로우%';
-- 그 후 002-insert-sample-services.sql 재실행
```

---

### 문제 3: RLS 정책 적용 안 됨

**원인**: RLS 활성화 안 됨

**해결**:
```sql
-- RLS 활성화 확인
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'services';

-- RLS 활성화
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
```

---

### 문제 4: TypeScript 타입 에러

**원인**: 타입 정의와 실제 스키마 불일치

**해결**:
1. Supabase CLI로 타입 자동 생성:
```bash
npx supabase gen types typescript --project-id zykjdneewbzyazfukzyg > src/types/supabase.ts
```
2. 또는 `database.ts` 수동 수정

---

## 📊 마이그레이션 전후 비교

### 테이블 구조

| 항목 | Before | After |
|------|--------|-------|
| 총 테이블 수 | 14개 | 11-13개 (삭제에 따라) |
| services 컬럼 | 불명 | 11개 (완전한 구조) |
| 샘플 데이터 | 0개 | 3개 |
| RLS 정책 | 0개 | 10개 |
| 인덱스 | 기본만 | 최적화됨 |

### Phase 준비 현황

| Phase | Before | After |
|-------|--------|-------|
| Phase 8 (서비스 페이지) | ❌ | ✅ 준비 완료 |
| Phase 9 (전자상거래) | ⚠️ 부분 | ✅ 준비 완료 |
| Phase 10 (인증) | ⚠️ 부분 | ✅ 준비 완료 |
| Phase 11 (블로그) | ✅ | ✅ 유지 |
| Phase 12 (고급) | ✅ | ✅ 유지 |

---

## 🎉 다음 단계

### Phase 8 개발 시작
1. **React Query 훅 작성**
   - `src/hooks/useServices.ts`
   - `src/hooks/useServiceDetail.ts`
2. **서비스 목록 페이지**
   - `src/pages/Services.tsx`
3. **서비스 상세 페이지**
   - `src/pages/ServiceDetail.tsx`

### 관련 문서
- [Phase 8 개발 가이드](../../project-todo.md)
- [TypeScript 타입 사용법](../../src/types/database.ts)
- [Supabase RLS 가이드](https://supabase.com/docs/guides/auth/row-level-security)

---

## 📞 지원

### 문의처
- **이메일**: sinclairseo@gmail.com
- **GitHub Issues**: https://github.com/IDEA-on-Action/IdeaonAction-Homepage/issues

### 유용한 링크
- [Supabase 문서](https://supabase.com/docs)
- [PostgreSQL 문서](https://www.postgresql.org/docs/)
- [프로젝트 로드맵](../project/roadmap.md)

---

**마이그레이션 성공을 기원합니다! 🚀**

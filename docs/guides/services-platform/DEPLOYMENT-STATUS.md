# Services Platform 배포 현황

> **날짜**: 2025-11-19
> **상태**: 🔄 진행 중 (프로덕션 DB 설정 대기)
> **담당**: Claude + User

---

## ✅ 완료된 작업

### 1. 프론트엔드 코드 수정 (커밋: 152dca4, f8a3c1f)

**문제**: 프로덕션 DB 호환성 이슈
- `is_active` 컬럼 없음 → 400 Bad Request
- `.single()` → 406 Not Acceptable (중복 또는 결과 없음)

**해결**:
- ✅ `useServicesPlatform.ts`: `.eq('is_active', true)` 제거
- ✅ `useServicesPlatform.ts`: `.single()` → `.maybeSingle()` 변경
- ✅ Vercel 배포 완료 (자동)

**파일**:
- `src/hooks/useServicesPlatform.ts` (수정)

---

### 2. 프로덕션 DB 권한 설정 (Supabase 실행 완료)

**파일**: `fix-service-tables-permissions.sql`

**실행 결과**:
```json
[
  {
    "table_name": "service_packages",
    "privileges": "{DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE}",
    "grantees": "{anon,authenticated,postgres,service_role}"
  },
  {
    "table_name": "subscription_plans",
    "privileges": "{DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE}",
    "grantees": "{anon,authenticated,postgres,service_role}"
  }
]
```

✅ `anon`, `authenticated` 역할 모두 SELECT 권한 보유

---

### 3. 데이터 INSERT 스크립트 준비 (Supabase 실행 완료)

**파일**: `insert-packages-and-plans.sql`

**실행 결과**:
- ✅ MVP 개발: 3개 패키지
- ✅ Fullstack 개발: 3개 플랜
- ✅ 디자인 시스템: 2개 패키지
- ✅ 운영 관리: 3개 플랜
- **총**: 5개 패키지 + 6개 플랜 = 11개

---

### 4. 검증 스크립트 생성 (커밋: f8a3c1f)

**파일**:
- `scripts/check-packages-plans-link.cjs` - 패키지/플랜 연결 검증
- `scripts/check-rls-policies.sql` - RLS 정책 확인
- `scripts/test-anon-access.cjs` - anon 권한 테스트

---

## ⏳ 대기 중인 작업

### 프로덕션 DB slug 변경 (선택 사항)

**파일**: `update-services-slug.sql`

**목적**: URL을 더 짧고 깔끔하게

**변경 내용**:
```
mvp-development → mvp
fullstack-development → fullstack
design-system → design
operations-management → operations
```

**실행 방법**:
1. Supabase SQL Editor
2. `update-services-slug.sql` 전체 복사
3. RUN 클릭

**실행 후 URL**:
- https://www.ideaonaction.ai/services/mvp
- https://www.ideaonaction.ai/services/fullstack
- https://www.ideaonaction.ai/services/design
- https://www.ideaonaction.ai/services/operations

---

## 🎯 현재 상황 요약

### 프론트엔드
- ✅ 코드 수정 완료
- ✅ Vercel 배포 완료
- ⏳ 프로덕션 테스트 대기 (DB 데이터 필요)

### 프로덕션 DB
- ✅ 테이블 권한 설정 완료 (anon/authenticated SELECT 가능)
- ✅ 패키지/플랜 데이터 INSERT 완료 (11개)
- ⏳ slug 변경 대기 (선택 사항)

### 검증
- ✅ 로컬 검증 스크립트 준비 완료
- ⏳ 프로덕션 페이지 테스트 대기

---

## 🚀 다음 단계

### 옵션 1: slug 변경 후 테스트 (권장)

1. **Supabase에서 slug 변경 실행**
   - 파일: `update-services-slug.sql`
   - 결과: 4개 서비스 slug가 짧아짐

2. **프로덕션 페이지 테스트**
   - https://www.ideaonaction.ai/services/mvp
   - https://www.ideaonaction.ai/services/fullstack
   - https://www.ideaonaction.ai/services/design
   - https://www.ideaonaction.ai/services/operations

3. **검증**
   - [ ] 페이지 로딩 성공 (406 에러 없음)
   - [ ] 패키지/플랜 표시 (3개, 3개, 2개, 3개)
   - [ ] "인기" 배지 표시
   - [ ] "선택하기" 버튼 → 장바구니 추가

### 옵션 2: 현재 slug 유지하고 테스트

1. **프로덕션 페이지 테스트**
   - https://www.ideaonaction.ai/services/mvp-development
   - https://www.ideaonaction.ai/services/fullstack-development
   - https://www.ideaonaction.ai/services/design-system
   - https://www.ideaonaction.ai/services/operations-management

2. **검증** (동일)

---

## 📊 Git 히스토리

```
f8a3c1f - chore: add production deployment validation scripts (방금)
152dca4 - fix: use maybeSingle instead of single for slug query (10분 전)
0d8dd95 - fix: remove is_active filter for production compatibility (15분 전)
```

---

## 🛠️ 생성된 파일 목록

### 프로덕션 배포 스크립트
- `fix-service-tables-permissions.sql` (권한 설정, 실행 완료)
- `insert-packages-and-plans.sql` (데이터 INSERT, 실행 완료)
- `update-services-slug.sql` (slug 변경, 선택 사항)

### 검증 스크립트
- `scripts/check-packages-plans-link.cjs` (패키지/플랜 연결)
- `scripts/check-rls-policies.sql` (RLS 정책)
- `scripts/test-anon-access.cjs` (anon 권한)

### 기타
- `insert-service-packages-plans.sql` (원본 스크립트)
- `insert-service-packages-plans-fixed.sql` (수정본)
- `scripts/check-service-tables.cjs` (테이블 검증)

---

## 🔍 문제 발생 시

### Rollback (프로덕션 DB)

**slug 변경 롤백**:
```sql
UPDATE public.services SET slug = 'mvp-development' WHERE slug = 'mvp';
UPDATE public.services SET slug = 'fullstack-development' WHERE slug = 'fullstack';
UPDATE public.services SET slug = 'design-system' WHERE slug = 'design';
UPDATE public.services SET slug = 'operations-management' WHERE slug = 'operations';
```

**데이터 삭제**:
```sql
DELETE FROM public.service_packages;
DELETE FROM public.subscription_plans;
```

### Rollback (Vercel)

1. Vercel 대시보드 → Deployments
2. 이전 버전 선택 (0d8dd95 이전)
3. "Promote to Production" 클릭

---

**마지막 업데이트**: 2025-11-19
**작성자**: Claude
**상태**: 프로덕션 DB slug 변경 또는 현재 상태 테스트 선택 대기

# Toss Payments 서비스 마이그레이션 - 빠른 참조

**소요 시간**: 약 10분 | **난이도**: 초급 | **영향도**: 낮음 (기존 데이터 무영향)

---

## 🚀 30초 요약

Supabase SQL Editor에서 마이그레이션 파일의 SQL을 복사 → 붙여넣기 → Run 클릭

---

## 📋 4가지 서비스 추가

| # | 서비스 | Slug | 가격 | URL |
|---|--------|------|------|-----|
| 1 | MVP 개발 | `mvp` | ₩2M | `/services/mvp` |
| 2 | Fullstack 개발 | `fullstack` | ₩10M | `/services/fullstack` |
| 3 | Design System | `design` | ₩3M | `/services/design` |
| 4 | Operations | `operations` | ₩5M | `/services/operations` |

---

## ⚡ 적용 절차 (3단계)

### Step 1: 준비
```
1. Supabase 콘솔 접속 → SQL Editor
2. supabase/migrations/20251116100001_add_toss_review_services_fixed.sql 열기
3. 전체 코드 복사
```

### Step 2: 적용
```
1. Supabase SQL Editor → New Query
2. 코드 붙여넣기
3. Run 버튼 클릭 (또는 Ctrl + Enter)
4. "Query completed successfully" 메시지 확인
```

### Step 3: 검증
```
1. 각 URL 방문:
   ✅ https://www.ideaonaction.ai/services/mvp
   ✅ https://www.ideaonaction.ai/services/fullstack
   ✅ https://www.ideaonaction.ai/services/design
   ✅ https://www.ideaonaction.ai/services/operations
2. 모두 404 에러 없이 로딩되면 성공
```

---

## 🔍 검증 쿼리 (복사-붙여넣기용)

### 적용 성공 확인
```sql
-- 4개 서비스 모두 존재하는지 확인
SELECT slug, title, price, status
FROM public.services
WHERE slug IN ('mvp', 'fullstack', 'design', 'operations')
ORDER BY slug;
```

**예상 결과**: 4개 행 반환 ✓

### 적용 전 사전 확인
```sql
-- 필수 카테고리 존재 확인
SELECT slug, name
FROM public.service_categories
WHERE slug IN ('development', 'design', 'operations');
```

**예상 결과**: 3개 행 반환 ✓

---

## ⚠️ 주의사항

| 항목 | 상황 | 해결 |
|------|------|------|
| **404 에러** | 적용 후 서비스 페이지 404 | Vercel 캐시 갱신 (재배포) |
| **중복 실행** | 같은 마이그레이션 여러 번 실행 | 안전함 (덮어쓰기만 됨) |
| **롤백** | 마이그레이션 취소해야 함 | `DELETE WHERE id IN (...)` |
| **가격 변경** | 나중에 가격 수정하고 싶음 | `UPDATE price = ... WHERE slug = ...` |

---

## 📞 문제 해결

### ❌ "relation 'public.services' does not exist"
→ 테이블 없음 (빌드 필요)

### ❌ "duplicate key value"
→ 동일 ID 이미 존재 (무시하고 진행 가능)

### ❌ "undefined_function" (카테고리 관련)
→ 카테고리 테이블 없음 (먼저 카테고리 생성)

---

## 💾 롤백 방법

```sql
-- 추가된 서비스 삭제
DELETE FROM public.services
WHERE id IN (
  'mvp-development-service',
  'fullstack-development-service',
  'design-system-service',
  'operations-management-service'
);
```

---

## 📚 자세한 가이드

👉 [toss-payments-services-migration.md](./toss-payments-services-migration.md)

---

**마지막 업데이트**: 2025-11-16
**상태**: ✅ Ready to Apply

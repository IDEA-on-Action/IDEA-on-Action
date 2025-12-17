# 일일 작업 요약 - 2025-11-16

## 📋 작업 개요

**목표**: 토스 페이먼츠 심사를 위한 서비스 페이지 개선 및 데이터 정리

**소요 시간**: 약 3시간

**주요 성과**:
- ✅ 마크다운 렌더링 수정 (2개 파일)
- ✅ 서비스 필터링 (4개 메인 서비스만 표시)
- ✅ RLS 정책 수정 (service_categories 403 에러 해결)
- ✅ 서비스 데이터 보강 (이미지 4개, 기능 16개 추가)
- ✅ Vercel 배포 (3회)
- ✅ 토스 페이먼츠 심사 회신 검토 완료

---

## 🎯 주요 작업

### 1. 마크다운 렌더링 수정 ✅

**문제**: 서비스 설명에서 마크다운 문법(`**텍스트**`, `- 항목`)이 그대로 표시됨

**해결**:
- `ServiceCard.tsx`: ReactMarkdown 컴포넌트 적용
- `ServiceDetail.tsx`: MarkdownRenderer 컴포넌트 적용

**파일 변경**:
- `src/components/services/ServiceCard.tsx` (16줄 수정)
- `src/pages/ServiceDetail.tsx` (3곳 수정)

**결과**:
- ✅ Bold 텍스트 표시
- ✅ 개조식 목록 표시
- ✅ DOM 중첩 경고 해결 (a 태그 → span 변환)

**커밋**: 45e40d1, 6787281, 11dbc48, aa9db03

---

### 2. 서비스 필터링 (토스 페이먼츠 심사용) ✅

**목표**: 4개 메인 서비스만 표시, 컨설팅 서비스 숨기기

**작업**:
1. 7개 서비스 archived 처리
2. 4개 메인 서비스 active 유지
3. useServices.ts 필터 활성화

**SQL 마이그레이션**:
```sql
-- Archive 7 services
UPDATE services SET status = 'archived' WHERE id IN (...);

-- Ensure 4 main services active
UPDATE services SET status = 'active' 
WHERE slug IN ('mvp', 'fullstack', 'design', 'operations');
```

**파일 변경**:
- `supabase/migrations/hide-non-toss-services.sql` (신규)
- `src/hooks/useServices.ts` (1줄 수정)

**결과**:
- ✅ 서비스 목록: 11개 → 4개
- ✅ MVP, Fullstack, Design, Operations만 표시

**커밋**: ce9be8a

---

### 3. RLS 정책 수정 (403 에러 해결) ✅

**문제**: `service_categories` API 호출 시 403 Forbidden 에러

**원인**:
1. anon 롤 SELECT 권한 부족
2. display_order 컬럼 누락

**해결**:
1. GRANT SELECT TO anon, authenticated
2. RLS 정책 2개 생성
3. display_order 컬럼 추가 및 초기값 설정

**SQL 마이그레이션**:
```sql
-- Grant permissions
GRANT SELECT ON service_categories TO anon;
GRANT SELECT ON service_categories TO authenticated;

-- Create RLS policies
CREATE POLICY "service_categories_anon_select" ...
CREATE POLICY "service_categories_authenticated_select" ...

-- Add display_order column
ALTER TABLE service_categories ADD COLUMN display_order INTEGER DEFAULT 0;
```

**파일 변경**:
- `supabase/migrations/fix-service-categories-rls.sql` (신규)
- `supabase/migrations/fix-service-categories-complete.sql` (신규)

**결과**:
- ✅ HTTP 200 OK (403 에러 해결)
- ✅ 5개 카테고리 정상 반환
- ✅ display_order 정렬 작동

**Supabase 실행**: ✅ 완료

**커밋**: (SQL 파일만 생성, 실행은 Supabase Dashboard)

---

### 4. 서비스 데이터 보강 ✅

**목표**: 모든 서비스에 이미지 및 주요 기능 추가

**작업**:
1. Unsplash 이미지 URL 추가 (각 서비스 2장)
2. 주요 기능 4개씩 작성 (마크다운 형식)

**SQL 마이그레이션**:
```sql
UPDATE services
SET
  image_url = 'https://images.unsplash.com/photo-...',
  images = '["url1", "url2"]'::jsonb,
  features = '[
    {"title": "...", "description": "**Bold** 텍스트\n\n- 항목1\n- 항목2"}
  ]'::jsonb
WHERE slug IN ('mvp', 'fullstack', 'design', 'operations');
```

**데이터 통계**:
- 이미지: 4개 서비스 × 2장 = 8장
- 주요 기능: 4개 서비스 × 4개 = 16개

**파일 변경**:
- `supabase/migrations/20251116110000_add_toss_services_content.sql` (신규)

**결과**:
- ✅ 모든 서비스에 이미지 표시
- ✅ 모든 서비스에 주요 기능 4개씩 표시
- ✅ 마크다운 형식으로 가독성 향상

**Supabase 실행**: ✅ 완료

**커밋**: (SQL 파일만 생성, 실행은 Supabase Dashboard)

---

### 5. Vercel 배포 ✅

**배포 횟수**: 3회

**배포 1**: vercel.json 수정 (routes → rewrites)
- **문제**: 기존 배포 실패 (routes와 headers 충돌)
- **해결**: routes 제거, rewrites 사용
- **커밋**: 576ffa1, bc19df2
- **결과**: ✅ 배포 성공

**배포 2**: RLS 정책 적용 후 재배포
- **목적**: service_categories RLS 정책 적용 확인
- **커밋**: 3fb5cb8 (empty commit)
- **결과**: ✅ 403 에러 해결 확인

**배포 3**: 최종 확인
- **Last-Modified**: 2025-11-16 03:01:39 GMT
- **X-Vercel-Cache**: HIT
- **결과**: ✅ 모든 기능 정상 작동

**Cache-Control 설정**:
```json
{
  "headers": [{
    "source": "/(.*)",
    "headers": [{"key": "Cache-Control", "value": "public, max-age=0, must-revalidate"}]
  }]
}
```

**SPA 라우팅**:
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

---

### 6. 토스 페이먼츠 심사 회신 검토 ✅

**작업**: 심사 회신 내용의 모든 URL 검증

**검증 결과**:

| URL | 상태 | 비고 |
|-----|------|------|
| /services | ✅ 200 OK | 서비스 메인 |
| /services/mvp | ✅ 200 OK | MVP 개발 |
| /services/fullstack | ✅ 200 OK | Fullstack 개발 |
| /services/design | ✅ 200 OK | Design System |
| /services/operations | ✅ 200 OK | Operations 관리 |
| /pricing | ✅ 200 OK | 가격 안내 |
| /refund-policy | ✅ 200 OK | 환불정책 |
| /terms | ✅ 200 OK | 이용약관 |
| /privacy | ✅ 200 OK | 개인정보처리방침 |
| /electronic-finance-terms | ✅ 200 OK | 전자금융거래약관 |

**검증 내용**:
- ✅ 모든 URL 정상 작동
- ✅ 서비스 페이지 Supabase 데이터 연동 확인
- ✅ 장바구니 기능 확인
- ✅ 가격 정보 표시 확인

**결론**: 원래 작성한 회신 내용 그대로 제출 가능

---

## 📊 변경 파일 요약

### 코드 파일 (2개)
1. `src/components/services/ServiceCard.tsx` - ReactMarkdown 적용
2. `src/pages/ServiceDetail.tsx` - MarkdownRenderer 적용

### 마이그레이션 파일 (5개)
1. `supabase/migrations/hide-non-toss-services.sql` - 서비스 필터링
2. `supabase/migrations/fix-service-categories-rls.sql` - RLS 정책 (v1)
3. `supabase/migrations/fix-service-categories-complete.sql` - RLS 정책 (v2, 최종)
4. `supabase/migrations/20251116110000_add_toss_services_content.sql` - 이미지 & 기능 추가
5. `supabase/migrations/check-all-services-data.sql` - 검증용 쿼리

### 설정 파일 (1개)
1. `vercel.json` - rewrites 설정

### 문서 파일 (1개)
1. `docs/daily-summary-2025-11-16.md` - 이 문서

**총 9개 파일 변경/생성**

---

## 🚀 배포 결과

### 프로덕션 URL
- https://www.ideaonaction.ai/services

### 서비스 개수
- Before: 11개 (모든 서비스)
- After: 4개 (토스 페이먼츠 심사용)

### API 상태
- service_categories: HTTP 403 → HTTP 200 ✅
- services: HTTP 200 (변경 없음) ✅

### 페이지 기능
- ✅ 마크다운 렌더링
- ✅ 이미지 표시
- ✅ 주요 기능 표시
- ✅ 장바구니 추가
- ✅ 가격 정보 표시

---

## 🎯 토스 페이먼츠 심사 준비 완료

### ✅ 필수 요구사항
1. **결제 기능**: 장바구니 추가 버튼 ✅
2. **가격 정보**: 각 패키지별 명확한 가격 ✅
3. **상품 설명**: 4개 서비스 상세 설명 ✅
4. **환불정책**: 별도 페이지 존재 ✅
5. **법적 문서**: 3개 모두 존재 ✅

### 제출 가능한 URL
```
① 결제 상품/서비스 확인 가능한 URL
서비스 메인: https://www.ideaonaction.ai/services
MVP 개발: https://www.ideaonaction.ai/services/mvp
Fullstack 개발: https://www.ideaonaction.ai/services/fullstack
Design System: https://www.ideaonaction.ai/services/design
Operations 관리: https://www.ideaonaction.ai/services/operations
가격 안내: https://www.ideaonaction.ai/pricing

② 환불정책 확인 가능한 URL
https://www.ideaonaction.ai/refund-policy

③ 법적 문서
이용약관: https://www.ideaonaction.ai/terms
개인정보처리방침: https://www.ideaonaction.ai/privacy
전자금융거래약관: https://www.ideaonaction.ai/electronic-finance-terms
```

---

## 📝 Git 커밋 이력

```bash
bc19df2 - fix: use rewrites instead of routes in vercel.json
3fb5cb8 - chore: trigger Vercel redeploy to apply service_categories RLS fix
576ffa1 - fix: disable Vercel CDN cache
aa9db03 - fix: React/Markdown link nesting in ServiceCard
11dbc48 - fix: ServiceCard DOM nesting & markdown rendering
6787281 - fix: ServiceDetail markdown rendering
45e40d1 - fix: ServiceCard markdown rendering
ce9be8a - feat(services): hide non-toss services for payment review
```

---

## 🔧 기술적 개선 사항

### 1. 마크다운 렌더링
- **Before**: Plain text (`**텍스트**`)
- **After**: Formatted markdown (**텍스트**)

### 2. DOM 구조
- **Before**: `<a><a>` nested links (경고)
- **After**: `<a><span>` (경고 해결)

### 3. RLS 정책
- **Before**: 403 Forbidden
- **After**: 200 OK (anon 권한 부여)

### 4. 캐시 전략
- **Before**: routes + headers 충돌
- **After**: rewrites + headers (max-age=0)

---

## 🎓 교훈

### 1. Vercel 설정
- `routes`는 레거시 설정 (headers와 충돌)
- `rewrites`를 사용해야 함
- Cache-Control은 headers로 설정

### 2. Supabase RLS
- GRANT 권한 + RLS 정책 둘 다 필요
- anon 롤도 명시적으로 권한 부여 필요
- display_order 같은 정렬 컬럼은 미리 추가

### 3. React 마크다운
- ReactMarkdown은 `<p>` 태그 생성
- CardDescription도 `<p>` 태그 생성 → 중첩 경고
- `<div>`로 감싸거나 components prop으로 커스터마이징

### 4. 프로덕션 배포
- 빈 커밋으로 재배포 트리거 가능
- Last-Modified 헤더로 배포 시점 확인
- 시크릿 모드로 캐시 우회 테스트

---

## 🚀 다음 단계

### 즉시 가능
- ✅ 토스 페이먼츠 심사 회신 제출
- ✅ 원래 작성한 회신 내용 그대로 사용 가능

### 선택 사항 (심사 후)
- [ ] 나머지 7개 서비스 재활성화
- [ ] 서비스 slug 기반 라우팅 개선
- [ ] 이미지 최적화 (WebP 변환)
- [ ] SEO 메타태그 추가

---

**작성자**: Claude
**작성일**: 2025-11-16
**소요 시간**: 약 3시간
**상태**: ✅ 완료


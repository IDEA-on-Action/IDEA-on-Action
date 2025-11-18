# Services Platform Production Deployment Checklist

> **Sprint 1 Day 2 완료** - 프로덕션 배포 준비
> **날짜**: 2025-11-19
> **버전**: 2.2.0 (Toss Payments Sprint 1)

---

## 📋 배포 전 체크리스트

### 1. 코드 검증 (Local)

- [x] **TypeScript 컴파일**: `npx tsc --noEmit`
  - ✅ 0 errors

- [x] **ESLint**: `npm run lint`
  - ✅ 0 errors, 1 unrelated warning (supabase edge function)

- [x] **프로덕션 빌드**: `npm run build`
  - ✅ Build succeeded (26.98s)
  - ✅ ServiceDetail.js: 13.10 kB (4.16 kB gzip)
  - ✅ PWA precache: 26 entries (1.6 MB)
  - ⚠️ pages-admin: 2.8 MB (732 kB gzip) - Expected (lazy loaded)

- [x] **Git 상태**: `git status`
  - ✅ Working tree clean
  - ✅ All commits pushed to origin/main

### 2. Database 마이그레이션 (Supabase Production)

**⚠️ 중요**: 프로덕션 DB 마이그레이션은 신중하게 진행해야 합니다!

#### Step 2.1: 프로덕션 DB 백업

```bash
# Supabase 대시보드에서 백업 생성
# 또는 CLI로 백업:
supabase db dump -f backup-before-services-platform-$(date +%Y%m%d).sql --db-url <PRODUCTION_DB_URL>
```

- [ ] 프로덕션 DB 백업 완료
- [ ] 백업 파일 다운로드 완료 (안전한 위치 저장)

#### Step 2.2: 마이그레이션 파일 확인

다음 4개 마이그레이션을 적용해야 합니다:

1. **20251118000000_extend_services_table.sql**
   - services 테이블에 4개 JSONB 컬럼 추가
   - pricing_data, deliverables, process_steps, faq

2. **20251118000001_create_service_packages_table.sql**
   - service_packages 테이블 생성
   - RLS 정책: public SELECT, admin INSERT/UPDATE/DELETE
   - 4개 인덱스

3. **20251118000002_create_subscription_plans_table.sql**
   - subscription_plans 테이블 생성
   - RLS 정책: public SELECT, admin INSERT/UPDATE/DELETE
   - 5개 인덱스

4. **20251118000003_add_services_content_data.sql**
   - 4개 서비스에 콘텐츠 데이터 추가
   - MVP, Fullstack, Design, Operations
   - 총 11개 패키지/플랜, 35개 결과물, 21단계, 36 FAQ

#### Step 2.3: Supabase CLI로 마이그레이션 적용

```bash
# 1. Supabase 프로젝트 링크 (이미 연결되어 있다면 스킵)
supabase link --project-ref <YOUR_PROJECT_REF>

# 2. 마이그레이션 적용
supabase db push

# 3. 마이그레이션 확인
supabase migration list
```

- [ ] Supabase 프로젝트 링크 완료
- [ ] 마이그레이션 4개 적용 완료
- [ ] 마이그레이션 리스트 확인 (모두 'Applied' 상태)

#### Step 2.4: 데이터 검증

```sql
-- 1. services 테이블에 새 컬럼 확인
SELECT id, title, slug,
       pricing_data IS NOT NULL as has_pricing,
       deliverables IS NOT NULL as has_deliverables,
       process_steps IS NOT NULL as has_process,
       faq IS NOT NULL as has_faq
FROM services
WHERE slug IN ('mvp', 'fullstack', 'design', 'operations');

-- 2. service_packages 개수 확인 (예상: 8개)
SELECT service_id, COUNT(*) as package_count
FROM service_packages
GROUP BY service_id;

-- 3. subscription_plans 개수 확인 (예상: 6개)
SELECT service_id, COUNT(*) as plan_count
FROM subscription_plans
GROUP BY service_id;

-- 4. RLS 정책 확인 (anonymous SELECT 가능)
-- Supabase 대시보드 > Database > Policies에서 확인
```

- [ ] 4개 서비스에 새 컬럼 데이터 확인
- [ ] service_packages: 8개 확인
- [ ] subscription_plans: 6개 확인 (fullstack 3개, operations 3개)
- [ ] RLS 정책 동작 확인 (public SELECT, admin CUD)

### 3. Vercel 배포

#### Step 3.1: 자동 배포 트리거

Vercel은 GitHub `main` 브랜치에 푸시하면 자동으로 배포됩니다.

- [x] GitHub 푸시 완료 (커밋: e526aca)
- [ ] Vercel 빌드 시작 확인 (https://vercel.com/dashboard)
- [ ] Vercel 빌드 성공 확인 (약 2-3분 소요)
- [ ] Production 배포 완료 확인

#### Step 3.2: 배포 URL 확인

- [ ] https://www.ideaonaction.ai/ - 홈페이지 정상
- [ ] https://www.ideaonaction.ai/services - 서비스 목록 정상

### 4. 서비스 페이지 검증

각 서비스 페이지를 수동으로 테스트합니다.

#### 4.1 MVP 개발 서비스

**URL**: https://www.ideaonaction.ai/services/mvp

테스트 항목:
- [ ] ServiceHero 섹션 표시 (제목, 설명, 이미지, 카테고리, 태그)
- [ ] PackageSelector 섹션 표시
  - [ ] "일회성 프로젝트" 탭 클릭 → 3개 패키지 표시
  - [ ] 스탠다드 (₩8,000,000), 프로 (₩12,000,000), 엔터프라이즈 (₩18,000,000)
  - [ ] "인기" 배지 표시 (프로 패키지)
  - [ ] "선택하기" 버튼 클릭 → Toast 알림 표시
  - [ ] Toast "장바구니 보기" 버튼 클릭 → 장바구니 drawer 열림
  - [ ] 장바구니에 패키지 추가 확인
- [ ] ProcessTimeline 섹션 표시
  - [ ] 5단계 프로세스 (기획→디자인→개발→테스트→배포)
  - [ ] 타임라인 연결선 표시
  - [ ] 단계별 활동 체크리스트 표시
- [ ] DeliverablesGrid 섹션 표시
  - [ ] 10개 결과물 2열 그리드 표시
  - [ ] 아이콘 + 제목 + 설명 표시
- [ ] FAQSection 섹션 표시
  - [ ] 8개 FAQ Accordion 표시
  - [ ] 질문 클릭 → 답변 확장
  - [ ] Markdown 렌더링 정상 (볼드, 이탤릭 등)

#### 4.2 풀스택 개발 서비스

**URL**: https://www.ideaonaction.ai/services/fullstack

테스트 항목:
- [ ] ServiceHero 정상
- [ ] PackageSelector 섹션 표시
  - [ ] "정기 구독" 탭 클릭 → 3개 플랜 표시
  - [ ] 월간 플랜 (₩5,500,000), 분기 플랜 (₩15,000,000), 연간 플랜 (₩60,000,000)
  - [ ] "월간", "분기", "연간" 라벨 표시
  - [ ] "선택하기" 버튼 클릭 → Toast 알림 (billing_cycle 포함)
  - [ ] 장바구니에 플랜 추가 확인
- [ ] ProcessTimeline 정상 (6단계)
- [ ] DeliverablesGrid 정상 (12개 결과물)
- [ ] FAQSection 정상 (10개 FAQ)

#### 4.3 디자인 시스템 서비스

**URL**: https://www.ideaonaction.ai/services/design

테스트 항목:
- [ ] ServiceHero 정상
- [ ] PackageSelector: 2개 패키지 (₩800,000, ₩1,500,000)
- [ ] ProcessTimeline 정상 (5단계)
- [ ] DeliverablesGrid 정상 (8개 결과물)
- [ ] FAQSection 정상 (8개 FAQ)

#### 4.4 운영 관리 서비스

**URL**: https://www.ideaonaction.ai/services/operations

테스트 항목:
- [ ] ServiceHero 정상
- [ ] PackageSelector: 3개 플랜 (₩1,000,000-4,000,000)
- [ ] ProcessTimeline 정상 (5단계)
- [ ] DeliverablesGrid 정상 (5개 결과물)
- [ ] FAQSection 정상 (10개 FAQ)

### 5. 반응형 테스트

각 서비스 페이지를 다양한 화면 크기에서 테스트:

- [ ] **모바일** (375px): iPhone SE
  - [ ] PackageSelector: 1열 그리드
  - [ ] ProcessTimeline: 세로 레이아웃
  - [ ] DeliverablesGrid: 1열 그리드

- [ ] **태블릿** (768px): iPad
  - [ ] PackageSelector: 2열 그리드
  - [ ] DeliverablesGrid: 2열 그리드

- [ ] **데스크톱** (1920px)
  - [ ] PackageSelector: 3열 그리드
  - [ ] DeliverablesGrid: 2열 그리드

### 6. 다크 모드 테스트

- [ ] 다크 모드 토글 클릭
- [ ] 모든 컴포넌트 색상 정상 (ServiceHero, PackageSelector, ProcessTimeline, Deliverables, FAQ)
- [ ] 라이트 모드로 다시 전환 → 정상

### 7. 장바구니 & 결제 플로우 테스트

- [ ] 패키지 장바구니 담기 → 장바구니 drawer 확인
- [ ] 플랜 장바구니 담기 → billing_cycle 표시 확인
- [ ] 장바구니에서 삭제 → 정상 삭제
- [ ] 결제하기 버튼 클릭 → Checkout 페이지 이동
- [ ] (선택 사항) Toss Payments 테스트 결제

### 8. SEO & 성능 테스트

- [ ] **Google Lighthouse** 실행 (각 서비스 페이지)
  - [ ] Performance: 90+ 목표
  - [ ] Accessibility: 95+ 목표
  - [ ] Best Practices: 95+ 목표
  - [ ] SEO: 100 목표

- [ ] **Meta Tags 확인** (View Page Source)
  - [ ] `<title>` 태그 정상
  - [ ] `<meta name="description">` 정상
  - [ ] Open Graph tags 정상

### 9. 에러 모니터링

- [ ] **Sentry 대시보드** 확인 (https://sentry.io)
  - [ ] 새로운 에러 없음
  - [ ] 기존 에러 해결 확인

- [ ] **Vercel Analytics** 확인
  - [ ] 페이지뷰 정상 기록
  - [ ] Web Vitals 정상

### 10. Rollback 준비

만약 문제가 발생하면 즉시 롤백할 수 있도록 준비:

#### Vercel Rollback (프론트엔드)

1. Vercel 대시보드 → Deployments
2. 이전 버전 선택 → "Promote to Production" 클릭
3. 약 30초 내 롤백 완료

#### Supabase Rollback (데이터베이스)

```sql
-- Step 1: 콘텐츠 데이터 삭제
DELETE FROM service_packages;
DELETE FROM subscription_plans;

UPDATE services
SET pricing_data = NULL,
    deliverables = NULL,
    process_steps = NULL,
    faq = NULL
WHERE slug IN ('mvp', 'fullstack', 'design', 'operations');

-- Step 2: 테이블 삭제
DROP TABLE IF EXISTS subscription_plans CASCADE;
DROP TABLE IF EXISTS service_packages CASCADE;

-- Step 3: 컬럼 삭제
ALTER TABLE services
DROP COLUMN IF EXISTS pricing_data,
DROP COLUMN IF EXISTS deliverables,
DROP COLUMN IF EXISTS process_steps,
DROP COLUMN IF EXISTS faq;
```

- [ ] 롤백 스크립트 준비 완료
- [ ] DB 백업 파일 위치 확인 (복원 가능)

---

## 📝 배포 결과 문서화

### 배포 정보

- **배포 날짜**: ________________
- **배포 시간**: ________________
- **Vercel Deployment ID**: ________________
- **Git Commit**: e526aca

### 검증 결과

- [ ] 모든 서비스 페이지 정상 작동
- [ ] 장바구니 통합 정상
- [ ] 모바일/태블릿/데스크톱 반응형 정상
- [ ] 다크 모드 정상
- [ ] Lighthouse 점수 목표 달성
- [ ] 에러 없음 (Sentry)

### 발견된 이슈

(이슈가 있다면 기록)

---

## 🎯 Toss Payments 심사 준비

Services Platform 배포 완료 후 Toss Payments 가맹점 심사를 진행합니다.

### 심사 제출 자료

1. **서비스 페이지 URL** (4개):
   - https://www.ideaonaction.ai/services/mvp
   - https://www.ideaonaction.ai/services/fullstack
   - https://www.ideaonaction.ai/services/design
   - https://www.ideaonaction.ai/services/operations

2. **가격 정보**:
   - 일회성 프로젝트: ₩800,000 ~ ₩18,000,000
   - 정기 구독: ₩1,000,000 ~ ₩60,000,000 (월간/분기/연간)

3. **법적 정보 페이지**:
   - 이용약관: https://www.ideaonaction.ai/terms
   - 개인정보처리방침: https://www.ideaonaction.ai/privacy
   - 환불정책: https://www.ideaonaction.ai/refund-policy
   - 전자금융거래약관: https://www.ideaonaction.ai/electronic-finance-terms

4. **사업자 정보**:
   - 사업자명: 생각과 행동 (IDEA on Action)
   - 대표자: 서민원
   - 사업자등록번호: 537-05-01511
   - 신고번호: 2025-경기시흥-2094
   - 주소: 경기도 시흥시 대은로104번길 11 (은행동, 우남아파트) 103동 601호

### 심사 체크리스트

- [ ] 모든 서비스 페이지 공개
- [ ] 가격 정보 명확히 표시
- [ ] 법적 정보 페이지 완비
- [ ] 결제 플로우 정상 작동
- [ ] 환불 정책 명확히 표시
- [ ] 고객 문의 연락처 표시 (sinclair.seo@ideaonaction.ai, 010-4904-2671)

---

## 📚 관련 문서

- [DB Setup Summary](./db-setup-summary.md) - 데이터베이스 설정 요약
- [Cart Integration Summary](./cart-integration-summary.md) - 장바구니 통합 요약
- [Sprint 1 Tasks](../../../tasks/services-platform/sprint-1.md) - 전체 태스크 목록

---

**마지막 업데이트**: 2025-11-19
**작성자**: Claude (AI Assistant)
**검토자**: ________________

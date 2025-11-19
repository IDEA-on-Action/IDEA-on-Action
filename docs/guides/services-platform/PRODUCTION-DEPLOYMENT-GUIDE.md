# 🚀 Services Platform 프로덕션 배포 가이드

> **신속 배포 가이드** - Supabase DB 마이그레이션 & Vercel 배포
> **날짜**: 2025-11-19
> **예상 소요 시간**: 15-20분

---

## 📋 사전 준비

### 필수 확인 사항

- [x] ✅ 로컬 빌드 성공 (npm run build)
- [x] ✅ TypeScript 0 errors
- [x] ✅ Git 커밋 완료 및 GitHub 푸시 완료
- [ ] ⏳ Supabase 대시보드 접속 가능
- [ ] ⏳ Vercel 대시보드 접속 가능

---

## 🗄️ Step 1: Supabase 프로덕션 DB 마이그레이션 (10분)

### 방법 A: Supabase 대시보드 (권장 - 더 안전)

#### 1.1 백업 생성

1. **Supabase 대시보드** 접속: https://supabase.com/dashboard
2. **프로젝트 선택**: ideaonaction (또는 프로젝트 이름)
3. **Settings** → **Database** → **Backups**
4. **Manual Backup 생성** 클릭
5. 백업 이름: `before-services-platform-2025-11-19`
6. 백업 완료 확인 (~1-2분 소요)

#### 1.2 마이그레이션 실행

1. **SQL Editor** 클릭 (좌측 메뉴)
2. **New Query** 클릭
3. 다음 파일 내용 복사:
   - **파일 경로**: `supabase/migrations/production-migration-services-platform.sql`
   - **위치**: 프로젝트 루트에서 `supabase/migrations/production-migration-services-platform.sql`

4. SQL Editor에 **붙여넣기**
5. **RUN** 버튼 클릭 (또는 Ctrl+Enter)
6. 결과 확인:
   ```
   Migration 1/4: services table extended ✓
   Migration 2/4: service_packages table created ✓
   Migration 3/4: subscription_plans table created ✓
   Migration 4/4: Ready for content data (run separately)
   ```

#### 1.3 콘텐츠 데이터 추가

1. **새 쿼리** 생성 (New Query)
2. 다음 파일 내용 복사:
   - **파일 경로**: `supabase/migrations/20251118000003_add_services_content_data.sql`

3. SQL Editor에 **붙여넣기**
4. **RUN** 버튼 클릭
5. 결과 확인:
   - MVP 개발: 3개 패키지 추가 ✓
   - 풀스택 개발: 3개 플랜 추가 ✓
   - 디자인 시스템: 2개 패키지 추가 ✓
   - 운영 관리: 3개 플랜 추가 ✓

#### 1.4 데이터 검증

**새 쿼리 실행** (검증용):

```sql
-- 1. services 테이블 새 컬럼 확인
SELECT
  id,
  title,
  slug,
  pricing_data IS NOT NULL as has_pricing,
  deliverables IS NOT NULL as has_deliverables,
  process_steps IS NOT NULL as has_process,
  faq IS NOT NULL as has_faq
FROM services
WHERE slug IN ('mvp', 'fullstack', 'design', 'operations');

-- 2. service_packages 개수 확인 (예상: 8개)
SELECT
  s.title as service_name,
  COUNT(sp.*) as package_count
FROM services s
LEFT JOIN service_packages sp ON sp.service_id = s.id
WHERE s.slug IN ('mvp', 'fullstack', 'design', 'operations')
GROUP BY s.id, s.title
ORDER BY s.title;

-- 3. subscription_plans 개수 확인 (예상: 6개)
SELECT
  s.title as service_name,
  COUNT(sp.*) as plan_count
FROM services s
LEFT JOIN subscription_plans sp ON sp.service_id = s.id
WHERE s.slug IN ('mvp', 'fullstack', 'design', 'operations')
GROUP BY s.id, s.title
ORDER BY s.title;
```

**예상 결과**:
- MVP 개발: 3개 패키지, 0개 플랜
- 풀스택 개발: 0개 패키지, 3개 플랜
- 디자인 시스템: 2개 패키지, 0개 플랜
- 운영 관리: 0개 패키지, 3개 플랜

✅ **총 8개 패키지, 6개 플랜 = 14개 항목**

---

### 방법 B: Supabase CLI (고급 사용자용)

```bash
# 1. Supabase 프로젝트 링크
supabase link --project-ref <YOUR_PROJECT_REF>
# Project REF는 Supabase 대시보드 → Settings → General → Reference ID

# 2. 마이그레이션 푸시
supabase db push

# 3. 마이그레이션 확인
supabase migration list
```

---

## ☁️ Step 2: Vercel 배포 확인 (5분)

### 2.1 Vercel 대시보드 접속

1. **Vercel 대시보드**: https://vercel.com/dashboard
2. **프로젝트 선택**: idea-on-action (또는 프로젝트 이름)
3. **Deployments** 탭 클릭

### 2.2 최신 배포 확인

- **최신 커밋**: `a0daa26` (docs: add Day 2 completion summary...)
- **배포 상태**:
  - ⏳ Building... → 약 2-3분 소요
  - ✅ Ready → 배포 완료

### 2.3 배포 로그 확인

1. 최신 배포 클릭
2. **Building** 탭에서 빌드 로그 확인
3. 에러 없이 완료 확인:
   ```
   ✓ built in 26.98s
   PWA v1.1.0
   precache  26 entries (1588.92 KiB)
   ```

---

## 🧪 Step 3: 서비스 페이지 검증 (10분)

### 3.1 MVP 개발 서비스

**URL**: https://www.ideaonaction.ai/services/mvp

**확인 사항**:
- [ ] ServiceHero 섹션 표시 (제목, 설명, 이미지, 카테고리, 태그)
- [ ] PackageSelector 섹션 표시
  - [ ] "일회성 프로젝트" 탭: 3개 패키지 (₩8,000,000 / ₩12,000,000 / ₩18,000,000)
  - [ ] "프로" 패키지에 "인기" 배지 표시
  - [ ] "선택하기" 버튼 클릭 → Toast 알림
  - [ ] Toast "장바구니 보기" 버튼 → 장바구니 drawer 열림
- [ ] ProcessTimeline 섹션: 5단계 (기획→디자인→개발→테스트→배포)
- [ ] DeliverablesGrid 섹션: 10개 결과물 (2열 그리드)
- [ ] FAQSection 섹션: 8개 FAQ (Accordion)

### 3.2 풀스택 개발 서비스

**URL**: https://www.ideaonaction.ai/services/fullstack

**확인 사항**:
- [ ] ServiceHero 정상
- [ ] PackageSelector:
  - [ ] "정기 구독" 탭: 3개 플랜
  - [ ] 월간 (₩5,500,000) / 분기 (₩15,000,000) / 연간 (₩60,000,000)
  - [ ] "월간", "분기", "연간" 라벨 표시
  - [ ] "선택하기" 버튼 → Toast (billing_cycle 포함)
- [ ] ProcessTimeline: 6단계
- [ ] DeliverablesGrid: 12개 결과물
- [ ] FAQSection: 10개 FAQ

### 3.3 디자인 시스템 서비스

**URL**: https://www.ideaonaction.ai/services/design

**확인 사항**:
- [ ] ServiceHero 정상
- [ ] PackageSelector: 2개 패키지 (₩800,000 / ₩1,500,000)
- [ ] ProcessTimeline: 5단계
- [ ] DeliverablesGrid: 8개 결과물
- [ ] FAQSection: 8개 FAQ

### 3.4 운영 관리 서비스

**URL**: https://www.ideaonaction.ai/services/operations

**확인 사항**:
- [ ] ServiceHero 정상
- [ ] PackageSelector: 3개 플랜 (₩1,000,000 / ₩2,500,000 / ₩4,000,000)
- [ ] ProcessTimeline: 5단계
- [ ] DeliverablesGrid: 5개 결과물
- [ ] FAQSection: 10개 FAQ

---

## 📱 Step 4: 반응형 & 다크 모드 테스트 (선택 사항)

### 4.1 반응형 테스트

브라우저 개발자 도구 (F12) → Device Toolbar (Ctrl+Shift+M)

- [ ] **모바일** (375px): PackageSelector 1열, DeliverablesGrid 1열
- [ ] **태블릿** (768px): PackageSelector 2열, DeliverablesGrid 2열
- [ ] **데스크톱** (1920px): PackageSelector 3열, DeliverablesGrid 2열

### 4.2 다크 모드 테스트

- [ ] 다크 모드 토글 클릭
- [ ] 모든 컴포넌트 색상 정상
- [ ] 라이트 모드로 전환 → 정상

---

## 🎯 완료 확인

### 최종 체크리스트

- [ ] ✅ Supabase DB 마이그레이션 완료
- [ ] ✅ 데이터 검증 완료 (14개 패키지/플랜)
- [ ] ✅ Vercel 배포 완료
- [ ] ✅ 4개 서비스 페이지 정상 작동
- [ ] ✅ 장바구니 통합 정상
- [ ] ✅ Toast 알림 정상
- [ ] ✅ 반응형 레이아웃 정상 (선택 사항)
- [ ] ✅ 다크 모드 정상 (선택 사항)

---

## 🚨 문제 발생 시 Rollback

### Supabase 롤백 (DB)

1. **Supabase 대시보드** → **Settings** → **Database** → **Backups**
2. 백업 선택: `before-services-platform-2025-11-19`
3. **Restore** 버튼 클릭
4. 확인 후 복원 (~5분 소요)

### Vercel 롤백 (프론트엔드)

1. **Vercel 대시보드** → **Deployments**
2. 이전 버전 선택 (예: ec7a85b)
3. **⋯** 메뉴 → **Promote to Production**
4. 확인 (~30초 소요)

---

## 🎉 다음 단계 (Toss Payments 심사)

배포 완료 후:

1. **4개 서비스 페이지 URL 준비**:
   - https://www.ideaonaction.ai/services/mvp
   - https://www.ideaonaction.ai/services/fullstack
   - https://www.ideaonaction.ai/services/design
   - https://www.ideaonaction.ai/services/operations

2. **법적 정보 페이지 확인**:
   - https://www.ideaonaction.ai/terms
   - https://www.ideaonaction.ai/privacy
   - https://www.ideaonaction.ai/refund-policy
   - https://www.ideaonaction.ai/electronic-finance-terms

3. **Toss Payments 심사 신청**:
   - 가맹점 정보 입력
   - 서비스 페이지 URL 제출
   - 법적 정보 페이지 제출
   - 사업자 정보 제출

---

**배포 완료 시간**: ________________
**배포자**: ________________
**검증자**: ________________

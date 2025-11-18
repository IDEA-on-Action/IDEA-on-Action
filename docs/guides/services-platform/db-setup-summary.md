# Services Platform DB 설정 완료 요약

**일시**: 2025-11-18
**Sprint**: Toss Payments Sprint 1
**완료 태스크**: TASK-001 ~ TASK-004 (Day 1)
**소요 시간**: ~2시간
**상태**: ✅ 완료

---

## 📊 완료된 작업

### TASK-001: services 테이블 확장 ✅

**목적**: 토스페이먼츠 심사용 서비스 상세 정보 저장

**추가된 컬럼** (4개):
1. `pricing_data` (JSONB) - 패키지/플랜 정보
2. `deliverables` (JSONB) - 결과물 목록
3. `process_steps` (JSONB) - 프로세스 단계
4. `faq` (JSONB) - FAQ 목록

**마이그레이션 파일**:
- `supabase/migrations/20251118000000_extend_services_table.sql`

**검증 결과**:
- ✅ 4개 컬럼 정상 추가
- ✅ 기존 4개 서비스 데이터 유지
- ✅ NULL 허용으로 기존 데이터 영향 없음

---

### TASK-002: service_packages 테이블 생성 ✅

**목적**: 일회성 프로젝트 패키지 정보 저장 (예: MVP Standard, MVP Pro)

**테이블 구조**:
- `id` (UUID, PK)
- `service_id` (UUID, FK → services.id)
- `name` (TEXT) - 패키지 이름
- `price` (NUMERIC) - 가격 (KRW)
- `features` (JSONB) - 기능 목록
- `is_popular` (BOOLEAN) - 인기 패키지 표시
- `display_order` (INTEGER) - 표시 순서
- `created_at`, `updated_at` (TIMESTAMPTZ)

**인덱스** (4개):
1. Primary Key (id)
2. Foreign Key (service_id)
3. Display Order (display_order)
4. Composite (service_id + display_order)

**RLS 정책** (4개):
1. `service_packages_public_select` - Public SELECT
2. `service_packages_admin_insert` - Admin INSERT
3. `service_packages_admin_update` - Admin UPDATE
4. `service_packages_admin_delete` - Admin DELETE

**마이그레이션 파일**:
- `supabase/migrations/20251118000001_create_service_packages_table.sql`

**검증 결과**:
- ✅ 테이블 생성 완료
- ✅ 4개 인덱스 생성 완료
- ✅ 4개 RLS 정책 설정 완료

---

### TASK-003: subscription_plans 테이블 생성 ✅

**목적**: 정기 구독 플랜 정보 저장 (예: Operations Standard, Pro, Enterprise)

**테이블 구조**:
- `id` (UUID, PK)
- `service_id` (UUID, FK → services.id)
- `plan_name` (TEXT) - 플랜 이름
- `billing_cycle` (TEXT) - 결제 주기 (monthly/quarterly/yearly)
- `price` (NUMERIC) - 가격 (KRW)
- `features` (JSONB) - 기능 목록
- `is_popular` (BOOLEAN) - 인기 플랜 표시
- `display_order` (INTEGER) - 표시 순서
- `created_at`, `updated_at` (TIMESTAMPTZ)

**인덱스** (5개):
1. Primary Key (id)
2. Foreign Key (service_id)
3. Billing Cycle (billing_cycle)
4. Composite (service_id + billing_cycle)
5. Display Order (display_order)

**RLS 정책** (4개):
1. `subscription_plans_public_select` - Public SELECT
2. `subscription_plans_admin_insert` - Admin INSERT
3. `subscription_plans_admin_update` - Admin UPDATE
4. `subscription_plans_admin_delete` - Admin DELETE

**마이그레이션 파일**:
- `supabase/migrations/20251118000002_create_subscription_plans_table.sql`

**검증 결과**:
- ✅ 테이블 생성 완료
- ✅ 5개 인덱스 생성 완료
- ✅ 4개 RLS 정책 설정 완료

---

### TASK-004: RLS 정책 검증 ✅

**목적**: 3개 테이블의 RLS 정책 작동 확인

**검증 스크립트**:
1. `scripts/check-services-schema.sql` - 스키마 검증
2. `scripts/check-services-rls-policies.sql` - RLS 정책 조회
3. `scripts/check-services-rls.cjs` - Node.js 자동 검증

**검증 결과**:
- ✅ Anonymous 사용자 SELECT 권한 확인
- ✅ Anonymous 사용자 INSERT 차단 확인 (정상)
- ✅ RLS 활성화 상태 확인
- ✅ 정책 개수 확인 (services: 6개, packages: 4개, plans: 4개)

**주요 확인 사항**:
| 테이블 | RLS 활성화 | 정책 개수 | Public SELECT | Admin CRUD |
|--------|------------|-----------|---------------|------------|
| services | ✅ | 6개 | ✅ | ✅ |
| service_packages | ✅ | 4개 | ✅ | ✅ |
| subscription_plans | ✅ | 4개 | ✅ | ✅ |

---

## 🗄️ 데이터베이스 구조

```
services (기존 + 확장)
├── id (UUID)
├── title, slug, description (TEXT)
├── category_id (FK → service_categories)
├── price (NUMERIC)
├── status (active/draft/archived)
├── 📦 pricing_data (JSONB) ← 신규
├── 📦 deliverables (JSONB) ← 신규
├── 📦 process_steps (JSONB) ← 신규
└── 📦 faq (JSONB) ← 신규

service_packages (신규)
├── id (UUID)
├── service_id (FK → services)
├── name (TEXT)
├── price (NUMERIC)
├── features (JSONB)
├── is_popular (BOOLEAN)
└── display_order (INTEGER)

subscription_plans (신규)
├── id (UUID)
├── service_id (FK → services)
├── plan_name (TEXT)
├── billing_cycle (monthly/quarterly/yearly)
├── price (NUMERIC)
├── features (JSONB)
├── is_popular (BOOLEAN)
└── display_order (INTEGER)
```

---

## 📝 마이그레이션 파일 목록

1. `20251118000000_extend_services_table.sql` (TASK-001)
2. `20251118000001_create_service_packages_table.sql` (TASK-002)
3. `20251118000002_create_subscription_plans_table.sql` (TASK-003)

**적용 방법**:
```bash
# 로컬 DB 초기화 (모든 마이그레이션 적용)
supabase db reset

# 프로덕션 DB 적용 (프로젝트 링크 후)
supabase db push
```

---

## 🔐 RLS 정책 요약

### 공통 패턴
- **Public (anon/authenticated)**: SELECT 권한만 허용
- **Admin (admin@ideaonaction.local)**: 모든 CRUD 권한 허용

### 정책 상세
```sql
-- Public SELECT
CREATE POLICY "xxx_public_select"
  ON public.xxx FOR SELECT
  TO anon, authenticated
  USING (true);

-- Admin INSERT/UPDATE/DELETE
CREATE POLICY "xxx_admin_insert"
  ON public.xxx FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid() AND email = 'admin@ideaonaction.local'
    )
  );
```

---

## ✅ 검증 체크리스트

- [x] services 테이블에 4개 JSONB 컬럼 추가
- [x] service_packages 테이블 생성 (8개 컬럼)
- [x] subscription_plans 테이블 생성 (9개 컬럼)
- [x] 총 13개 인덱스 생성 (PK 3개 + 추가 10개)
- [x] 총 14개 RLS 정책 설정 (services 6개 + packages 4개 + plans 4개)
- [x] RLS 활성화 확인 (3개 테이블 모두)
- [x] Public SELECT 권한 확인
- [x] Public INSERT 차단 확인
- [x] 기존 4개 서비스 데이터 유지 확인

---

## 📊 통계

- **총 마이그레이션 파일**: 3개
- **총 테이블 변경**: 3개 (services 확장 + 2개 신규)
- **총 컬럼 추가**: 21개 (services 4개 + packages 8개 + plans 9개)
- **총 인덱스**: 13개
- **총 RLS 정책**: 14개
- **총 검증 스크립트**: 3개

---

## 🎯 다음 단계

### TASK-005: 마이그레이션 데이터 추가 (1.5시간)

토스페이먼츠 심사용 서비스 4개에 실제 데이터 추가:

1. **MVP 개발 서비스**
   - pricing_data: 3개 패키지 (Standard, Pro, Enterprise)
   - deliverables: 10개 결과물
   - process_steps: 5단계 프로세스
   - faq: 8개 FAQ

2. **풀스택 개발 서비스**
   - pricing_data: 3개 패키지
   - deliverables: 12개 결과물
   - process_steps: 6단계 프로세스
   - faq: 10개 FAQ

3. **디자인 시스템 서비스**
   - pricing_data: 2개 패키지
   - deliverables: 8개 결과물
   - process_steps: 4단계 프로세스
   - faq: 6개 FAQ

4. **운영 관리 서비스**
   - pricing_data: 3개 플랜 (Standard, Pro, Enterprise)
   - deliverables: 5개 결과물
   - process_steps: 3단계 프로세스
   - faq: 7개 FAQ

---

## 📚 참고 문서

- [Services Platform Requirements](../../../spec/services-platform/requirements.md)
- [Services Platform Architecture](../../../plan/services-platform/architecture.md)
- [Sprint 1 Tasks](../../../tasks/services-platform/sprint-1.md)
- [Toss Payments 홈페이지 결제경로 제작 가이드](../../../토스페이먼츠_홈페이지 결제경로 제작 가이드_정기결제용.pdf)

---

**작성자**: Claude (AI Assistant)
**마지막 업데이트**: 2025-11-18
**상태**: Day 1 완료 ✅

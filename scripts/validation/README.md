# 검증 스크립트 (Validation Scripts)

데이터베이스 스키마, 데이터 무결성, 기능 검증을 위한 SQL 스크립트 모음입니다.

## 📋 목적

- **스키마 검증**: 테이블, 컬럼, 제약조건 존재 확인
- **RLS 정책 검증**: Row-Level Security 정책 올바른 설정 확인
- **데이터 완전성 검증**: 필수 데이터 입력 여부 확인
- **기능 테스트**: RPC 함수 및 기능 정상 작동 확인
- **문제 진단**: 스키마, 권한, 데이터 문제 트러블슈팅

---

## 📁 스크립트 목록 (10개)

### 1. check-services-schema.sql
**Services Platform DB 스키마 검증** (Toss Payments 심사용)
- services 테이블 존재 및 컬럼 확인
- 필수 컬럼: id, title, slug, pricing_data, deliverables, process_steps, faq
- 4개 서비스 데이터 완전성 확인 (MVP, Fullstack, Design, Operations)
- 관련 태스크: TASK-005 (Services Platform DB Setup, Day 1)

### 2. check-services-rls-policies.sql
**Services Platform RLS 정책 완전 검증**
- services, service_packages, subscription_plans 테이블 RLS 확인
- 예상 정책 개수 검증 (services: 6, packages: 4, plans: 4)
- 관련 태스크: TASK-004 (RLS Policy Validation, Day 1)

### 3. check-rls-policies.sql
**서비스 패키지 및 구독 플랜 RLS 빠른 확인**
- RLS 정책 상세 정보 표시 (이름, 역할, 명령)
- Anonymous 사용자 SELECT 권한 확인
- Anonymous 사용자 INSERT 차단 확인

### 4. check-all-services-data.sql
**4개 활성 서비스 데이터 완전성 검증**
- 서비스 slug, title, status, 데이터 존재 여부
- 이미지 및 features 개수 확인
- Description 미리보기
- 관련 태스크: TASK-005 (Services Content Data, Day 1)

### 5. check-service-categories-schema.sql
**service_categories 테이블 스키마 및 설정 검증**
- 컬럼 정의 확인 (id, name, display_order 등)
- RLS 정책 설정 확인
- anon, authenticated, public 역할 접근 권한 확인
- 카테고리 순서 확인

### 6. verify-analytics-setup.sql
**Analytics 인프라 완전 검증**
- analytics_events 테이블 존재 확인
- 4개 RPC 함수 검증: calculate_funnel(), calculate_bounce_rate(), get_event_counts(), get_session_timeline()
- 함수 권한 확인 (authenticated 사용자)
- 2개 RLS 정책 및 6개 인덱스 확인
- 예상 결과: 모든 함수는 빈 결과 반환 (데이터 없을 경우 정상)

### 7. test-analytics-rpc-functions.sql
**RPC 함수 직접 실행 테스트**
- 각 RPC 함수 샘플 파라미터로 테스트
- 반환 타입 및 예상 컬럼 확인
- 함수 시그니처 및 보안 설정 확인
- analytics_events 테이블 의존성 확인

### 8. fix-analytics-rpc-permissions.sql
**Analytics RPC 함수 권한 문제 해결**
- 현재 execute 권한 확인
- PUBLIC execute 권한 철회
- authenticated 사용자 execute 권한 부여
- 함수 테스트로 에러 없음 확인
- 사용 시기: Analytics 함수가 존재하지만 404 에러 또는 권한 거부 발생 시

### 9. verify-user-value-fields-migration.sql
**User Value Fields 마이그레이션 검증** (선택 사항, CMS Phase 4)
- roadmap.user_benefits (jsonb), stability_score (integer) 컬럼 확인
- projects.problem, solution, impact 필드 확인
- 2개 GIN 인덱스 및 check constraint 확인 (stability_score: 0-100)
- 샘플 데이터 및 통계 표시
- 관련 태스크: 선택 사항 user value fields migration (2025-11-16)

### 10. temp-check-schema.sql
**service_categories 테이블 빠른 스키마 확인** (임시 진단 스크립트)
- 컬럼 구조 및 데이터 타입 확인
- NULL 제약 및 기본값 확인
- 최소 출력으로 빠른 리뷰

---

## 🚀 사용 방법

### Method 1: Supabase CLI (로컬)
```bash
# Docker Desktop 실행 후
supabase start
supabase db execute -f scripts/validation/check-services-schema.sql
```

### Method 2: psql CLI (로컬)
```bash
# 로컬 DB 연결
psql -h localhost -p 54322 -U postgres -d postgres -f scripts/validation/check-services-schema.sql
```

### Method 3: Supabase SQL Editor (프로덕션)
1. [Supabase Dashboard](https://supabase.com/dashboard) 로그인
2. 프로젝트 선택 → **SQL Editor** 탭
3. 스크립트 내용 복사 & 붙여넣기
4. **Run** 버튼 클릭

---

## 📝 사용 시나리오

### 1. Services Platform 설정 검증 (Day 1)
```bash
1. check-services-schema.sql       # 스키마 확인
2. check-services-rls-policies.sql # 권한 확인
3. check-all-services-data.sql     # 데이터 확인
```

### 2. Analytics RPC 문제 트러블슈팅
```bash
1. verify-analytics-setup.sql           # 전체 상태 확인
2. test-analytics-rpc-functions.sql    # 개별 함수 테스트
3. fix-analytics-rpc-permissions.sql   # 권한 수정 (필요 시)
```

### 3. 마이그레이션 후 검증
```bash
# 1. 마이그레이션 적용
supabase db reset

# 2. 스키마 확인
supabase db execute -f scripts/validation/temp-check-schema.sql

# 3. 데이터 확인
supabase db execute -f scripts/validation/check-all-services-data.sql
```

### 4. 프로덕션 배포 전 검증
```bash
# 로컬 환경에서 마이그레이션 테스트
supabase db reset
npm run test:e2e

# 검증 스크립트 실행
for file in scripts/validation/check-*.sql; do
  supabase db execute -f "$file"
done
```

---

## 🔧 일반적인 문제 & 해결

### 문제 1: "relation does not exist"
**에러**: `ERROR: relation "services" does not exist`

**해결**:
1. 데이터베이스 확인
2. 마이그레이션 실행: `supabase db reset` (로컬)
3. Git 히스토리에서 마이그레이션 파일 확인

### 문제 2: "permission denied for schema public"
**에러**: `ERROR: permission denied for schema public`

**해결**:
1. 로컬: `postgres` 사용자 사용 (superadmin)
2. 프로덕션: Supabase 역할에 read 권한 확인
3. RLS 정책이 쿼리를 차단하지 않는지 확인

### 문제 3: "Cannot execute function (404)"
**에러**: `ERROR: could not find the function`

**해결**:
1. `verify-analytics-setup.sql` 실행해서 함수 존재 확인
2. `fix-analytics-rpc-permissions.sql` 실행해서 권한 수정
3. 마이그레이션 확인: `supabase/migrations/20251116*analytics*.sql`

### 문제 4: RLS 정책이 작동하지 않음
**에러**: 예상 데이터가 차단되어야 하는데 여전히 반환됨

**해결**:
1. `check-services-rls-policies.sql` 실행해서 정책 확인
2. Supabase SQL Editor에서 "Run as" 드롭다운으로 다른 역할 테스트

---

## 📚 관련 문서

### 데이터베이스 설정 가이드
- **[DB Setup Summary](../../docs/guides/services-platform/db-setup-summary.md)** - Services Platform DB 완전 가이드
- **[RLS Policies](../../docs/guides/database/README.md)** - Row-Level Security 문서
- **[Supabase Dashboard Guide](../../docs/guides/supabase-dashboard-cron-setup.md)** - Dashboard 작업

### 배포 & 마이그레이션
- **[CMS Phase 4 Deployment Checklist](../../docs/guides/deployment/cms-phase4-deployment-checklist.md)** - 프로덕션 배포 단계
- **[Service Categories Migration](../../docs/guides/database/service-categories-migration-guide.md)** - 마이그레이션 가이드

### 프로젝트 문서
- **[CLAUDE.md](../../CLAUDE.md)** - 프로젝트 현재 상태 및 버전
- **[project-todo.md](../../project-todo.md)** - 활성 태스크 추적
- **[Changelog](../../docs/project/changelog.md)** - 버전 히스토리

---

## ✅ 검증 체크리스트

### 프로덕션 배포 전
- [ ] `check-services-schema.sql` - 모든 컬럼 존재
- [ ] `check-services-rls-policies.sql` - 모든 RLS 정책 설정됨
- [ ] `check-all-services-data.sql` - 4개 서비스 필수 데이터 있음
- [ ] `verify-analytics-setup.sql` - Analytics 인프라 완전함
- [ ] `check-service-categories-schema.sql` - 카테고리 올바르게 설정됨

### 데이터베이스 마이그레이션 후
- [ ] 모든 스키마 검증 스크립트 실행
- [ ] 예상 결과와 실제 결과 비교
- [ ] 경고 또는 실패 확인
- [ ] 추가 컨텍스트를 위한 로그 리뷰

---

## 📌 주의사항

⚠️ **프로덕션 환경에서 직접 실행하지 마세요!**

- 이 스크립트들은 **읽기 전용 검증**용입니다
- 프로덕션 환경에서는 Supabase Studio의 SQL Editor에서 신중히 실행하세요
- 데이터 변경이 필요한 경우 마이그레이션 파일을 사용하세요
- `fix-analytics-rpc-permissions.sql`은 권한을 변경하므로 주의 필요

### 성능 고려사항
- 대부분 스크립트는 < 1초 실행
- 대용량 데이터 확인은 2-5초 소요 가능
- 반복 실행 안전 (읽기 전용)
- 잠금 또는 트랜잭션 간섭 없음

---

**폴더 생성일**: 2025-11-16
**최종 업데이트**: 2025-11-19
**관련 Phase**: Services Platform (Day 1 & 2), CMS Phase 4
**관리**: Claude Code + Development Team

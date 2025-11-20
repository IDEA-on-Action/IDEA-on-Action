# Database Scripts

데이터베이스 관련 스크립트 모음

## 📁 스크립트 분류

### 데이터 검증 (check-*-data*.js)
- `check-cms-tables.cjs` - CMS 테이블 데이터 확인
- `check-newsletter-data.js` - 뉴스레터 데이터 확인
- `check-newsletter-profiles.cjs` - 뉴스레터 프로필 확인
- `check-service-data-detailed.cjs` - 서비스 상세 데이터 확인
- `check-services-content-data.cjs` - 서비스 콘텐츠 데이터 확인
- `check-services-data.cjs` - 서비스 데이터 확인
- `check-status-data.cjs` - 상태 데이터 확인
- `check-data-simple.js` - 간단한 데이터 확인

### 테이블 검증 (check-*-tables*.js)
- `check-cms-tables.js` - CMS 테이블 구조 확인
- `check-service-tables.cjs` - 서비스 테이블 확인

### RLS 정책 (check-*-rls*.js)
- `check-services-rls.cjs` - 서비스 RLS 정책 확인
- `check-rls-policies.js` - RLS 정책 전체 확인
- `apply-rls-policies.js` - RLS 정책 적용

### Supabase 관리
- `check-supabase-data.js` - Supabase 데이터 확인
- `check-local-db.js` - 로컬 DB 확인
- `run-migration.js` - 마이그레이션 실행

### 서비스 관리
- `check-actual-services.cjs` - 실제 서비스 확인
- `check-compass-service.cjs` - COMPASS 서비스 확인
- `check-production-services.cjs` - 프로덕션 서비스 확인
- `check-services-price.js` - 서비스 가격 확인
- `check-slug-values.cjs` - Slug 값 확인
- `check-packages-plans-link.cjs` - 패키지/플랜 링크 확인
- `add-compass-navigator-subscription.js` - COMPASS Navigator 구독 추가

## 🚀 사용법

### 로컬 DB 검증
```bash
node scripts/db/check-local-db.js
```

### 프로덕션 DB 검증
```bash
node scripts/db/check-production-services.cjs
```

### RLS 정책 적용
```bash
node scripts/db/apply-rls-policies.js
```

### 마이그레이션 실행
```bash
node scripts/db/run-migration.js
```

## 📝 참고사항

- 대부분의 스크립트는 환경 변수가 필요합니다 (`.env.local`)
- Supabase CLI가 설치되어 있어야 합니다
- 프로덕션 스크립트는 `USE_PRODUCTION=true` 환경 변수 필요

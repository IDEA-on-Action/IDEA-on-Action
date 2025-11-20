# Testing Scripts

테스트 관련 스크립트 모음

## 📁 스크립트 목록

### 계정 관리
- `create-test-account.js` - 테스트 계정 생성
- `verify-super-admin.js` - Super Admin 권한 검증

### 접근 권한 테스트
- `test-anon-access.cjs` - Anonymous 사용자 접근 테스트

### 스크린샷 캡처
- `capture-payment-screenshots.js` - 결제 화면 스크린샷 캡처

## 🚀 사용법

### 테스트 계정 생성
```bash
# 로컬
node scripts/testing/create-test-account.js

# 프로덕션
USE_LOCAL=false node scripts/testing/create-test-account.js
```

### Super Admin 권한 검증
```bash
node scripts/testing/verify-super-admin.js
```

### Anonymous 접근 테스트
```bash
node scripts/testing/test-anon-access.cjs
```

### 결제 화면 캡처
```bash
node scripts/testing/capture-payment-screenshots.js
```

## 🧪 E2E 테스트

### Playwright 실행
```bash
# 전체 테스트
npx playwright test

# 특정 파일
npx playwright test tests/e2e/admin/admin-dashboard.spec.ts

# UI 모드
npx playwright test --ui

# 디버그 모드
npx playwright test --debug
```

### 테스트 분류
- **Admin 테스트**: `tests/e2e/admin/`
- **Public 테스트**: `tests/e2e/public/`
- **인증 테스트**: `tests/e2e/auth/`

## 📝 참고사항

- 테스트 계정 이메일: `test@example.com`
- Super Admin: `admin@ideaonaction.local`
- E2E 테스트 가이드: `docs/guides/cms/e2e-test-guide.md`
- 총 E2E 테스트: 215개

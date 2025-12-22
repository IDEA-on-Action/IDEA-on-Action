# AdminNewsletter E2E 테스트 실행 가이드

> **마지막 업데이트**: 2025-12-22
> **버전**: v2.39.1
> **테스트 개수**: 33개 (11개 스위트)

---

## 📋 목차

1. [개요](#개요)
2. [빠른 시작](#빠른-시작)
3. [상세 가이드](#상세-가이드)
4. [참고 자료](#참고-자료)

---

## 개요

### 테스트 목적

AdminNewsletter E2E 테스트는 뉴스레터 관리자 페이지의 **회귀 방지**와 **기능 검증**을 위해 작성되었습니다.

### 테스트 대상

**AdminNewsletter 페이지** (`/admin/newsletter`)의 다음 기능들을 테스트합니다:

- **통계 대시보드**: 구독자 총계, 확인 완료, 확인 대기, 구독 취소 카운트
- **검색 기능**: 이메일 검색, 검색 결과 필터링
- **상태 필터**: All, Pending, Confirmed, Unsubscribed 필터
- **구독자 관리**: 상태 변경, 삭제, GDPR 준수
- **CSV Export**: 구독자 목록 다운로드

### 테스트 통계

```
총 테스트:     33개
테스트 스위트:  11개
커버리지:      100% (핵심 기능)
평균 실행 시간: ~2분 15초
Parallel Workers: 3개
```

---

## 빠른 시작

### 1. 사전 준비

```bash
# Docker Desktop 실행 후
supabase start
npm run dev
npx playwright install
```

### 2. 테스트 실행

```bash
# 전체 테스트
npx playwright test admin-newsletter

# 특정 스위트
npx playwright test admin-newsletter -g "Search"

# 디버그 모드
npx playwright test admin-newsletter --ui
```

### 3. 리포트 확인

```bash
npx playwright show-report
```

---

## 상세 가이드

문서가 분할되었습니다. 상세 내용은 아래 문서를 참조하세요:

| 문서 | 내용 |
|------|------|
| [setup.md](./newsletter-e2e/setup.md) | 환경 설정, 테스트 데이터 준비 |
| [execution.md](./newsletter-e2e/execution.md) | 테스트 실행, 디버그 모드 |
| [test-suites.md](./newsletter-e2e/test-suites.md) | 11개 테스트 스위트 상세 |
| [troubleshooting.md](./newsletter-e2e/troubleshooting.md) | 실패 대응, 성능 최적화 |
| [ci-cd.md](./newsletter-e2e/ci-cd.md) | GitHub Actions, Vercel 통합 |

---

## 참고 자료

### 공식 문서
- [Playwright 문서](https://playwright.dev/docs/intro)
- [Supabase 로컬 개발](https://supabase.com/docs/guides/cli/local-development)

### 프로젝트 문서
- [E2E 테스트 가이드](./e2e-test-guide.md) - 전체 E2E 테스트 215개
- [Admin Newsletter 가이드](../cms/admin-newsletter-guide.md) - 기능 설명

### 관련 파일
- `tests/e2e/admin-newsletter.spec.ts` - 테스트 코드
- `tests/e2e/helpers/auth.ts` - 로그인 헬퍼
- `playwright.config.ts` - Playwright 설정
- `src/pages/admin/AdminNewsletter.tsx` - UI 컴포넌트

---

**마지막 업데이트**: 2025-12-22
**작성자**: Claude (AI)
**버전**: v2.39.1

# Newsletter E2E 테스트 - 실행 방법

> AdminNewsletter E2E 테스트 실행 및 디버깅 가이드

**마지막 업데이트**: 2025-12-22
**관련 문서**: [메인 가이드](../run-newsletter-e2e-tests.md)

---

## 1. 전체 테스트 실행

모든 AdminNewsletter 테스트를 실행합니다:

```bash
# 기본 실행 (헤드리스 모드)
npx playwright test admin-newsletter

# 출력 예시:
# Running 33 tests using 3 workers
#   ✓  [chromium] › admin-newsletter.spec.ts:15:5 › AdminNewsletter › Page Loading › should load page
#   ...
#   33 passed (2m 15s)
```

**옵션 플래그**:
```bash
# Verbose 모드 (상세 로그)
npx playwright test admin-newsletter --reporter=list

# 병렬 워커 수 조정 (CPU 코어 수에 맞춰)
npx playwright test admin-newsletter --workers=5

# 재시도 활성화 (불안정한 테스트 대응)
npx playwright test admin-newsletter --retries=2

# 타임아웃 증가 (느린 환경)
npx playwright test admin-newsletter --timeout=30000
```

---

## 2. 특정 스위트 실행

특정 기능만 테스트하려면 `-g` (grep) 플래그를 사용합니다:

```bash
# 검색 기능만 테스트
npx playwright test admin-newsletter -g "Search"

# 상태 변경만 테스트
npx playwright test admin-newsletter -g "Status Change"

# CSV Export만 테스트
npx playwright test admin-newsletter -g "CSV Export"

# 여러 패턴 조합
npx playwright test admin-newsletter -g "Search|Filter"
```

---

## 3. 디버그 모드 실행

### UI 모드 (추천)

```bash
# UI 모드 실행
npx playwright test admin-newsletter --ui

# 브라우저에서 http://localhost:9323 자동 열림
# - 테스트 목록에서 개별 테스트 선택
# - 단계별 실행 (Step over)
# - DOM 스냅샷 확인
```

### Headed 모드

```bash
# 브라우저 표시 (Chromium)
npx playwright test admin-newsletter --headed

# 특정 브라우저 지정
npx playwright test admin-newsletter --headed --project=firefox
```

### Debug 모드

```bash
# 특정 테스트만 디버그
npx playwright test admin-newsletter -g "CSV export" --debug

# Playwright Inspector 열림
# - 각 단계마다 일시 정지
# - Console에서 page 객체 조작 가능
```

---

## 4. HTML 리포트 확인

```bash
# 테스트 실행 (리포트 자동 생성)
npx playwright test admin-newsletter

# 리포트 열기
npx playwright show-report
```

**리포트 내용**:
- ✅ 통과/실패 테스트 목록
- ⏱️ 각 테스트 실행 시간
- 📸 실패 시 스크린샷 (자동 캡처)
- 📹 실패 시 비디오 (설정 시)
- 📋 콘솔 로그 및 네트워크 요청

---

## 다음 단계

- [테스트 스위트 목록](./test-suites.md)
- [문제 해결](./troubleshooting.md)

# Newsletter E2E 테스트 - CI/CD 통합

> GitHub Actions 및 Vercel 통합 가이드

**마지막 업데이트**: 2025-12-22
**관련 문서**: [메인 가이드](../run-newsletter-e2e-tests.md)

---

## GitHub Actions 예시

`.github/workflows/e2e-tests.yml`:

```yaml
name: E2E Tests - AdminNewsletter

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 10

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Supabase CLI
        run: |
          curl -s https://install.supabase.com | bash
          echo "$HOME/.supabase/bin" >> $GITHUB_PATH

      - name: Start Supabase
        run: |
          supabase start
          supabase db reset

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium

      - name: Build project
        run: npm run build

      - name: Start dev server
        run: |
          npm run dev &
          npx wait-on http://localhost:5173 --timeout 60000

      - name: Run E2E tests
        run: npx playwright test admin-newsletter --reporter=html

      - name: Upload Playwright report
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7

      - name: Comment PR with results
        if: github.event_name == 'pull_request'
        uses: daun/playwright-report-comment@v3
        with:
          report-path: playwright-report/
```

---

## Vercel 통합

`vercel.json`:

```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm ci",
  "framework": "vite",
  "outputDirectory": "dist",
  "ignoreCommand": "npx playwright test admin-newsletter --reporter=json",
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-E2E-Tests",
          "value": "33 tests passed"
        }
      ]
    }
  ]
}
```

**Preview 배포 시 자동 테스트**:
- PR 생성 시 Vercel Preview 배포
- Preview URL에서 E2E 테스트 실행
- PR 코멘트에 결과 표시

---

## CI 환경 리소스

```
CPU:      40-50% (2 workers)
RAM:      ~600 MB
Network:  ~15 MB
Disk:     ~100 MB (리포트 포함)
```

---

## 핵심 단계

1. ✅ Node.js 설치 (v18+)
2. ✅ Supabase CLI 설치
3. ✅ `supabase start` (로컬 DB)
4. ✅ Playwright 브라우저 설치
5. ✅ 개발 서버 실행 (`npm run dev &`)
6. ✅ 테스트 실행 (`npx playwright test`)
7. ✅ 리포트 업로드 (artifacts)

**주의사항**:
- CI에서는 헤드리스 모드만 가능
- 타임아웃을 넉넉히 설정 (30초+)
- 캐시 활용 (`actions/cache`)
- 실패 시 스크린샷/비디오 업로드

---

## 다음 단계

- [문제 해결](./troubleshooting.md)
- [메인 가이드](../run-newsletter-e2e-tests.md)

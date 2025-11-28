import { defineConfig, devices } from '@playwright/test';

/**
 * CI 환경용 Playwright E2E 테스트 설정
 * - Chromium만 실행 (크로스 브라우저 테스트는 로컬에서)
 * - 워커 2개로 병렬 처리
 * - 재시도 1회로 감소
 */
export default defineConfig({
  testDir: './tests/e2e',

  /* 병렬 실행 */
  fullyParallel: true,

  /* CI에서 .only 금지 */
  forbidOnly: true,

  /* 재시도 1회 (2회 → 1회로 감소) */
  retries: 1,

  /* 워커 2개로 병렬 처리 */
  workers: 2,

  /* 타임아웃 설정 */
  timeout: 30000,
  expect: { timeout: 5000 },

  /* 리포터 설정 */
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['github']
  ],

  /* 공통 테스트 설정 */
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4173',
    screenshot: 'only-on-failure',
    video: 'off',
    trace: 'off',
  },

  /* 프리뷰 서버 사용 (dev 서버보다 빠름) */
  webServer: {
    command: 'npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: false,
    timeout: 60000,
  },

  /* CI에서는 Chromium만 실행 */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});

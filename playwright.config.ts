import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E 테스트 설정
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests/e2e',

  /* 병렬 실행 */
  fullyParallel: true,

  /* CI에서 재시도 허용 */
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,

  /* CI에서는 1개 워커만 사용 */
  workers: process.env.CI ? 1 : undefined,

  /* 리포터 설정 */
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['list']
  ],

  /* 공통 테스트 설정 */
  use: {
    /* 베이스 URL */
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:8080',

    /* 실패 시 스크린샷 */
    screenshot: 'only-on-failure',

    /* 실패 시 비디오 */
    video: 'retain-on-failure',

    /* 트레이스 수집 */
    trace: 'on-first-retry',
  },

  /* 테스트 전 개발 서버 실행 (로컬 테스트 시에만) */
  webServer: process.env.PLAYWRIGHT_SKIP_SERVER ? undefined : {
    command: 'npm run dev',
    url: 'http://localhost:8080',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    env: {
      VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL || 'https://zykjdneewbzyazfukzyg.supabase.co',
      VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5a2pkbmVld2J6eWF6ZnVrenlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0Mjc4MTUsImV4cCI6MjA3MTAwMzgxNX0.Lgnm2-NpoDVMLgb3qUK9xgrE2k1S-_eORbG-5RyGST8',
    },
  },

  /* 브라우저 설정 */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* 모바일 뷰포트 테스트 */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },

    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
});

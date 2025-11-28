import { defineConfig, devices } from '@playwright/test';

/**
 * CI 환경용 Playwright E2E 테스트 설정
 * - Chromium만 실행
 * - 정적 페이지 Smoke 테스트만 (외부 API 의존 테스트 제외)
 * - 워커 4개로 병렬 처리
 * - 재시도 없음
 */
export default defineConfig({
  testDir: './tests/e2e',

  /* CI용 핵심 테스트만 실행 (정적 페이지 Smoke Test) */
  testMatch: [
    '**/homepage.spec.ts',
    '**/navigation.spec.ts',
    '**/dark-mode.spec.ts',
    '**/responsive.spec.ts',
    '**/status.spec.ts',
  ],

  /* 병렬 실행 */
  fullyParallel: true,

  /* CI에서 .only 금지 */
  forbidOnly: true,

  /* 재시도 없음 (속도 우선) */
  retries: 0,

  /* 워커 4개로 병렬 처리 */
  workers: 4,

  /* 타임아웃 설정 */
  timeout: 15000,
  expect: { timeout: 3000 },

  /* 리포터 설정 */
  reporter: [
    ['github'],
    ['list'],
  ],

  /* 공통 테스트 설정 */
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4173',
    screenshot: 'off',
    video: 'off',
    trace: 'off',
  },

  /* 프리뷰 서버 사용 */
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

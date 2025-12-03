/**
 * Playwright Sandbox 환경 설정
 * 
 * 목적: Minu Sandbox 환경 E2E 테스트 설정
 * 참조: plan/minu-sandbox-setup.md
 * 
 * 실행 명령:
 *   - 전체 테스트: npx playwright test -c playwright.config.sandbox.ts
 *   - 특정 프로젝트: npx playwright test --project="OAuth Flow" -c playwright.config.sandbox.ts
 *   - UI 모드: npx playwright test --ui -c playwright.config.sandbox.ts
 */

import { defineConfig, devices } from '@playwright/test';
import path from 'path';

// 환경 변수 로드 (.env.sandbox)
import dotenv from 'dotenv';
dotenv.config({ path: '.env.sandbox' });

/**
 * Playwright 설정
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // 테스트 디렉토리
  testDir: './tests/e2e/sandbox',

  // 테스트 파일 패턴
  testMatch: /.*\.spec\.ts$/,

  // 전역 설정
  timeout: 60 * 1000, // 테스트 타임아웃: 60초
  expect: {
    timeout: 10 * 1000, // Assertion 타임아웃: 10초
  },

  // 병렬 실행 설정
  fullyParallel: true, // 모든 테스트 병렬 실행
  workers: process.env.CI ? 2 : undefined, // CI: 2개 워커, 로컬: CPU 기반 자동 설정

  // 리포터 설정
  reporter: [
    ['html', { outputFolder: 'playwright-report/sandbox' }], // HTML 리포트
    ['json', { outputFile: 'test-results/sandbox/results.json' }], // JSON 결과
    ['junit', { outputFile: 'test-results/sandbox/junit.xml' }], // JUnit (CI 통합용)
    ['list'], // 콘솔 출력
  ],

  // 실패 시 재시도
  retries: process.env.CI ? 2 : 1, // CI: 2회, 로컬: 1회

  // 스크린샷/비디오 설정
  use: {
    // Base URL (Sandbox 환경)
    baseURL: process.env.VITE_SANDBOX_BASE_URL || 'https://sandbox.ideaonaction.ai',

    // 브라우저 설정
    headless: process.env.CI ? true : false, // CI: headless, 로컬: headed
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true, // 자체 서명 인증서 허용 (개발 환경)

    // 스크린샷
    screenshot: 'only-on-failure', // 실패 시에만 스크린샷

    // 비디오
    video: 'retain-on-failure', // 실패 시에만 비디오 저장

    // 트레이스
    trace: 'on-first-retry', // 첫 재시도 시에만 트레이스

    // 네트워크 설정
    actionTimeout: 15 * 1000, // 액션 타임아웃: 15초
    navigationTimeout: 30 * 1000, // 네비게이션 타임아웃: 30초
  },

  // 프로젝트별 설정 (테스트 카테고리)
  projects: [
    /**
     * 1. OAuth Flow 테스트
     * - Authorization Code Flow
     * - Token Exchange
     * - Token Refresh
     */
    {
      name: 'OAuth Flow',
      testMatch: /oauth.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
      },
    },

    /**
     * 2. API Integration 테스트
     * - Permission Check
     * - Session Management
     * - Team Management
     * - Rate Limiting
     */
    {
      name: 'API Integration',
      testMatch: /api.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
      },
    },

    /**
     * 3. Subscription 테스트
     * - Profile Sync
     * - Webhook Verification
     * - Audit Log
     */
    {
      name: 'Subscription',
      testMatch: /(subscription|profile|webhook|audit).*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
      },
    },

    /**
     * 4. 크로스 브라우저 테스트 (선택 사항)
     * - Firefox
     * - Safari (macOS only)
     */
    {
      name: 'Firefox',
      testMatch: /oauth-authorization-flow\.spec\.ts/, // 핵심 플로우만 테스트
      use: {
        ...devices['Desktop Firefox'],
      },
    },

    // Safari는 macOS에서만 실행
    ...(process.platform === 'darwin'
      ? [
          {
            name: 'Safari',
            testMatch: /oauth-authorization-flow\.spec\.ts/,
            use: {
              ...devices['Desktop Safari'],
            },
          },
        ]
      : []),
  ],

  // 테스트 전역 Setup/Teardown
  globalSetup: path.resolve(__dirname, 'tests/e2e/sandbox/setup/global-setup.ts'),
  globalTeardown: path.resolve(__dirname, 'tests/e2e/sandbox/setup/global-teardown.ts'),

  // 웹 서버 설정 (로컬 개발 시 자동 시작)
  webServer: process.env.CI
    ? undefined // CI에서는 이미 배포된 서버 사용
    : {
        command: 'npm run dev',
        url: 'http://localhost:8080',
        reuseExistingServer: true, // 이미 실행 중이면 재사용
        timeout: 120 * 1000, // 서버 시작 타임아웃: 2분
      },

  // 테스트 출력 디렉토리
  outputDir: 'test-results/sandbox',
});

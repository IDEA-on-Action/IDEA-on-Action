import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // 전역 테스트 함수 사용 (describe, it, expect 등)
    globals: true,
    // Node.js 환경에서 실행
    environment: 'node',
    // 테스트 파일 패턴
    include: ['tests/**/*.test.ts'],
    // 테스트 제외 패턴
    exclude: ['**/node_modules/**', '**/dist/**'],
    // 커버리지 설정
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts'],
      // 커버리지 임계값 (선택적)
      thresholds: {
        statements: 60,
        branches: 60,
        functions: 60,
        lines: 60,
      },
    },
    // 테스트 타임아웃 (ms)
    testTimeout: 10000,
    // 훅 타임아웃 (ms)
    hookTimeout: 10000,
    // 파일 감시 제외
    watchExclude: ['**/node_modules/**', '**/dist/**'],
  },
});

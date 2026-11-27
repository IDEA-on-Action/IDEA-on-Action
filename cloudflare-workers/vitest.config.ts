import { defineConfig } from 'vitest/config';

/** Workers 핸들러 테스트 설정 (루트의 jsdom 설정과 분리) */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
  },
});

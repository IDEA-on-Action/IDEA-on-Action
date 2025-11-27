import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

/**
 * Vitest 유닛/컴포넌트 테스트 설정
 * @see https://vitest.dev/config/
 */
export default defineConfig({
  plugins: [
    react({
      jsxImportSource: 'react',
    }),
  ],
  test: {
    /* jsdom 환경 (React 컴포넌트 테스트) */
    environment: 'jsdom',

    /* 글로벌 테스트 API 활성화 */
    globals: true,

    /* 테스트 파일 설정 */
    include: ['tests/unit/**/*.test.ts', 'tests/unit/**/*.test.tsx', 'src/**/*.test.ts', 'src/**/*.test.tsx'],
    exclude: ['tests/e2e/**', 'node_modules/**', 'dist/**'],
    setupFiles: ['./tests/setupTests.ts'],

    /* 커버리지 설정 */
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov', 'json'],
      include: [
        'src/**/*.ts',
        'src/**/*.tsx',
      ],
      exclude: [
        'node_modules/',
        'tests/',
        '*.config.ts',
        '*.config.js',
        'dist/',
        'src/**/*.d.ts',
        'src/**/*.test.ts',
        'src/**/*.test.tsx',
        'src/vite-env.d.ts',
        'src/main.tsx',
        'src/integrations/**',
      ],
      all: true,
      lines: 80,
      functions: 80,
      branches: 80,
      statements: 80,
      reportsDirectory: './coverage',
    },

    /* 병렬 실행 */
    poolOptions: {
      threads: {
        singleThread: false,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});

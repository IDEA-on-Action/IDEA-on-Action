import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

/**
 * Vitest 글로벌 설정 파일
 * 각 테스트 후 자동 클린업
 */

// 각 테스트 후 React 컴포넌트 정리
afterEach(() => {
  cleanup();
});

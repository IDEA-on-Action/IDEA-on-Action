/**
 * Vitest Test Setup
 *
 * - @testing-library/jest-dom matchers 추가
 * - jest-axe matchers 추가 (접근성 테스트)
 * - window.matchMedia mock (다크 모드 테스트용)
 * - Uint8Array polyfill (jose 라이브러리용)
 */

import '@testing-library/jest-dom'
import { toHaveNoViolations } from 'jest-axe'

// jest-axe의 toHaveNoViolations matcher 추가
expect.extend(toHaveNoViolations)

// jsdom 환경에서 TextEncoder/Uint8Array polyfill (jose 라이브러리 호환성)
// jose가 사용하는 TextEncoder가 jsdom의 것이 아닌 Node.js 네이티브를 사용하도록 설정
if (typeof global !== 'undefined' && typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const util = require('util');
  const NodeTextEncoder = util.TextEncoder;
  const NodeTextDecoder = util.TextDecoder;

  // @ts-expect-error: jsdom TextEncoder 대신 Node.js TextEncoder 사용
  globalThis.TextEncoder = NodeTextEncoder;
  // @ts-expect-error: 동일
  globalThis.TextDecoder = NodeTextDecoder;
  // @ts-expect-error: 동일
  window.TextEncoder = NodeTextEncoder;
  // @ts-expect-error: 동일
  window.TextDecoder = NodeTextDecoder;
}

// Mock window.matchMedia (for theme/dark mode tests)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {}, // deprecated
    removeListener: () => {}, // deprecated
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
  }),
})

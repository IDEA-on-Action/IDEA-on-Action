/**
 * Vitest Test Setup
 *
 * - @testing-library/jest-dom matchers 추가
 * - jest-axe matchers 추가 (접근성 테스트)
 * - window.matchMedia mock (다크 모드 테스트용)
 */

import '@testing-library/jest-dom'
import { toHaveNoViolations } from 'jest-axe'

// jest-axe의 toHaveNoViolations matcher 추가
expect.extend(toHaveNoViolations)

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

/**
 * Vitest Test Setup
 *
 * - @testing-library/jest-dom matchers 추가
 * - jest-axe matchers 추가 (접근성 테스트)
 * - 공통 Mock 설정 (useAuth, Workers API, toast 등)
 * - window.matchMedia mock (다크 모드 테스트용)
 * - Uint8Array polyfill (jose 라이브러리용)
 */

import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'
import { toHaveNoViolations } from 'jest-axe'

// jest-axe의 toHaveNoViolations matcher 추가
expect.extend(toHaveNoViolations)

// ============================================================================
// 글로벌 Mock 설정
// ============================================================================

// useAuth 훅 기본 Mock (모든 테스트에서 자동 적용)
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    workersTokens: { accessToken: 'test-token', refreshToken: 'test-refresh' },
    workersUser: { id: 'user-123', email: 'test@example.com' },
    isAuthenticated: true,
    loading: false,
    error: null,
    // Supabase 호환성
    user: { id: 'user-123', email: 'test@example.com' },
    session: { access_token: 'test-token', refresh_token: 'test-refresh' },
    // 메서드
    login: vi.fn(),
    logout: vi.fn(),
    signUp: vi.fn(),
    getAccessToken: vi.fn(() => 'test-token'),
    refreshTokens: vi.fn(),
  })),
}))

// sonner toast Mock
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
}))

// ResizeObserver 폴리필 (Radix UI 컴포넌트용)
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// PointerCapture 폴리필 (Radix UI Select 컴포넌트용)
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = vi.fn().mockReturnValue(false)
}
if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = vi.fn()
}
if (!Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = vi.fn()
}

// scrollIntoView 폴리필 (JSDOM 미지원)
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = vi.fn()
}

// IntersectionObserver Mock (lazy loading 등)
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
  root: null,
  rootMargin: '',
  thresholds: [],
}))

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
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// ============================================================================
// 테스트 생명주기
// ============================================================================

// 각 테스트 전 Mock 초기화
beforeEach(() => {
  vi.clearAllMocks()
})

// 각 테스트 후 React 컴포넌트 정리
afterEach(() => {
  cleanup()
})

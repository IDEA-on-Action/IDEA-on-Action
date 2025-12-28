import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

/**
 * Vitest 글로벌 설정 파일
 * - 각 테스트 후 자동 클린업
 * - 공통 Mock 설정 (useAuth, Workers API, toast 등)
 */

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
}));

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
}));

// ResizeObserver 폴리필 (Radix UI 컴포넌트용)
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// PointerCapture 폴리필 (Radix UI Select 컴포넌트용)
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
}
if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = vi.fn();
}
if (!Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = vi.fn();
}

// scrollIntoView 폴리필 (JSDOM 미지원)
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = vi.fn();
}

// matchMedia Mock (반응형 테스트용)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// IntersectionObserver Mock (lazy loading 등)
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
  root: null,
  rootMargin: '',
  thresholds: [],
}));

// ============================================================================
// 테스트 생명주기
// ============================================================================

// 각 테스트 전 Mock 초기화
beforeEach(() => {
  vi.clearAllMocks();
});

// 각 테스트 후 React 컴포넌트 정리
afterEach(() => {
  cleanup();
});

// ============================================================================
// 사용자 정의 Auth 상태 변경 가이드
// ============================================================================
/**
 * 특정 테스트에서 인증 상태를 변경하려면:
 *
 * import { useAuth } from '@/hooks/useAuth';
 * import { vi } from 'vitest';
 *
 * // 비인증 상태로 변경
 * vi.mocked(useAuth).mockReturnValue({
 *   workersTokens: null,
 *   workersUser: null,
 *   isAuthenticated: false,
 *   loading: false,
 *   ...
 * });
 *
 * // 또는 test-utils의 헬퍼 사용
 * import { createMockAuthReturn, UNAUTHENTICATED_STATE } from '@/tests/utils/test-utils';
 * vi.mocked(useAuth).mockReturnValue(createMockAuthReturn(UNAUTHENTICATED_STATE));
 */

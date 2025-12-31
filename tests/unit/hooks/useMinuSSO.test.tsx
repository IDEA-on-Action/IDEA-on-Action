/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * useMinuSSO 훅 유닛 테스트
 *
 * Minu SSO OAuth 인증 훅 테스트
 * - PKCE 기반 인증 플로우
 * - 토큰 관리 및 갱신
 * - 구독 정보 관리
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useMinuSSO, type MinuService } from '@/hooks/useMinuSSO';
import { callWorkersApi } from '@/integrations/cloudflare/client';

// Mock Workers API client
vi.mock('@/integrations/cloudflare/client', () => ({
  callWorkersApi: vi.fn(),
}));

// Mock useAuth
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id', email: 'test@example.com' },
    workersTokens: { accessToken: 'test-access-token' },
  }),
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock crypto API
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'test-uuid-1234',
    getRandomValues: (arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    },
    subtle: {
      digest: vi.fn().mockResolvedValue(new ArrayBuffer(32)),
    },
  },
});

describe('useMinuSSO', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    vi.mocked(callWorkersApi).mockResolvedValue({ data: [], error: null });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('초기화', () => {
    it('초기 상태는 인증되지 않은 상태여야 함', () => {
      const { result } = renderHook(() => useMinuSSO({ service: 'find' }));

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.accessToken).toBeNull();
      expect(result.current.subscription).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it('저장된 유효한 토큰이 있으면 세션을 복원해야 함', async () => {
      const futureDate = new Date(Date.now() + 3600 * 1000).toISOString();
      localStorageMock.setItem('minu_access_token', 'stored-token');
      localStorageMock.setItem('minu_service', 'find');
      localStorageMock.setItem('minu_expires_at', futureDate);

      const { result } = renderHook(() => useMinuSSO({ service: 'find' }));

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      expect(result.current.accessToken).toBe('stored-token');
    });

    it('만료된 토큰이 있으면 정리되어야 함', async () => {
      const pastDate = new Date(Date.now() - 3600 * 1000).toISOString();
      localStorageMock.setItem('minu_access_token', 'expired-token');
      localStorageMock.setItem('minu_service', 'find');
      localStorageMock.setItem('minu_expires_at', pastDate);

      const { result } = renderHook(() => useMinuSSO({ service: 'find' }));

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(false);
      });
    });

    it('다른 서비스의 토큰은 무시해야 함', () => {
      const futureDate = new Date(Date.now() + 3600 * 1000).toISOString();
      localStorageMock.setItem('minu_access_token', 'frame-token');
      localStorageMock.setItem('minu_service', 'frame');
      localStorageMock.setItem('minu_expires_at', futureDate);

      const { result } = renderHook(() => useMinuSSO({ service: 'find' }));

      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('handleCallback', () => {
    it('정상적인 콜백을 처리해야 함', async () => {
      const { result } = renderHook(() => useMinuSSO({ service: 'find' }));

      const callbackParams = new URLSearchParams({
        access_token: 'callback-token',
        service: 'find',
      });

      await act(async () => {
        await result.current.handleCallback(callbackParams);
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.accessToken).toBe('callback-token');
      expect(result.current.error).toBeNull();
    });

    it('에러 콜백을 처리해야 함', async () => {
      const { result } = renderHook(() => useMinuSSO({ service: 'find' }));

      const callbackParams = new URLSearchParams({
        error: 'access_denied',
        error_description: '사용자가 인증을 거부했습니다.',
      });

      await act(async () => {
        await result.current.handleCallback(callbackParams);
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.error).toBe('사용자가 인증을 거부했습니다.');
    });

    it('서비스 불일치 시 에러를 반환해야 함', async () => {
      const { result } = renderHook(() => useMinuSSO({ service: 'find' }));

      const callbackParams = new URLSearchParams({
        access_token: 'callback-token',
        service: 'frame',
      });

      await act(async () => {
        await result.current.handleCallback(callbackParams);
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.error).toBeTruthy();
    });

    it('토큰이 없는 콜백은 에러를 반환해야 함', async () => {
      const { result } = renderHook(() => useMinuSSO({ service: 'find' }));

      const callbackParams = new URLSearchParams({
        service: 'find',
      });

      await act(async () => {
        await result.current.handleCallback(callbackParams);
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.error).toBeTruthy();
    });
  });

  describe('exchangeToken', () => {
    it('토큰 교환이 성공해야 함', async () => {
      const mockResponse = {
        access_token: 'hub-token',
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: 'hub-refresh',
        user: { id: 'user-1', email: 'test@example.com' },
        subscription: null,
      };

      vi.mocked(callWorkersApi).mockResolvedValue({ data: mockResponse, error: null });

      const { result } = renderHook(() => useMinuSSO({ service: 'find' }));

      let exchangeResult: any;
      await act(async () => {
        exchangeResult = await result.current.exchangeToken('minu-token');
      });

      expect(exchangeResult).toEqual(mockResponse);
      expect(callWorkersApi).toHaveBeenCalledWith('/minu/token/exchange', {
        method: 'POST',
        body: {
          minu_access_token: 'minu-token',
          service: 'find',
        },
      });
    });

    it('토큰 교환 실패 시 에러를 던져야 함', async () => {
      vi.mocked(callWorkersApi).mockResolvedValue({ data: null, error: '토큰 교환 실패' });

      const { result } = renderHook(() => useMinuSSO({ service: 'find' }));

      let error: Error | undefined;
      await act(async () => {
        try {
          await result.current.exchangeToken('invalid-token');
        } catch (e) {
          error = e as Error;
        }
      });

      expect(error).toBeDefined();
    });
  });

  describe('logout', () => {
    it('logout 메서드가 존재해야 함', () => {
      const { result } = renderHook(() => useMinuSSO({ service: 'find' }));

      expect(typeof result.current.logout).toBe('function');
    });

    it('로그아웃 시 인증 상태가 초기화되어야 함', async () => {
      // 먼저 인증 상태 설정
      const futureDate = new Date(Date.now() + 3600 * 1000).toISOString();
      localStorageMock.setItem('minu_access_token', 'test-token');
      localStorageMock.setItem('minu_service', 'find');
      localStorageMock.setItem('minu_expires_at', futureDate);

      // fetch 모킹
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({ ok: true }) as any;

      const { result } = renderHook(() => useMinuSSO({ service: 'find' }));

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.accessToken).toBeNull();

      // 복구
      global.fetch = originalFetch;
    });
  });

  describe('canUseFeature', () => {
    it('구독이 없으면 false를 반환해야 함', () => {
      const { result } = renderHook(() => useMinuSSO({ service: 'find' }));

      expect(result.current.canUseFeature('any_feature')).toBe(false);
    });
  });

  describe('canAccessService', () => {
    it('구독이 없으면 false를 반환해야 함', () => {
      const { result } = renderHook(() => useMinuSSO({ service: 'find' }));

      expect(result.current.canAccessService()).toBe(false);
    });
  });

  describe('서비스별 훅', () => {
    const services: MinuService[] = ['find', 'frame', 'build', 'keep'];

    services.forEach((service) => {
      it(`${service} 서비스에 대한 훅이 생성되어야 함`, () => {
        const { result } = renderHook(() => useMinuSSO({ service }));

        expect(result.current).toBeDefined();
        expect(result.current.initiateLogin).toBeDefined();
        expect(result.current.handleCallback).toBeDefined();
        expect(result.current.logout).toBeDefined();
      });
    });
  });

  describe('메서드 존재 여부', () => {
    it('모든 필수 메서드가 정의되어 있어야 함', () => {
      const { result } = renderHook(() => useMinuSSO({ service: 'find' }));

      expect(typeof result.current.initiateLogin).toBe('function');
      expect(typeof result.current.handleCallback).toBe('function');
      expect(typeof result.current.exchangeToken).toBe('function');
      expect(typeof result.current.logout).toBe('function');
      expect(typeof result.current.refreshToken).toBe('function');
      expect(typeof result.current.canUseFeature).toBe('function');
      expect(typeof result.current.canAccessService).toBe('function');
      expect(typeof result.current.loadSubscription).toBe('function');
    });

    it('상태 속성이 정의되어 있어야 함', () => {
      const { result } = renderHook(() => useMinuSSO({ service: 'find' }));

      expect(result.current.isLoading).toBeDefined();
      expect(result.current.error).toBeDefined();
      expect(result.current.isAuthenticated).toBeDefined();
      expect(result.current.accessToken).toBeDefined();
      expect(result.current.subscription).toBeDefined();
    });
  });
});

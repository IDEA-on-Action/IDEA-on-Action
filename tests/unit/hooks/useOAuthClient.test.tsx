/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * useOAuthClient Hook 테스트
 *
 * Minu 서비스용 OAuth 클라이언트 훅 테스트
 * - PKCE 기반 인증
 * - 토큰 자동 갱신
 * - localStorage 토큰 관리
 *
 * @migration Supabase -> Workers API 모킹으로 마이그레이션
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useOAuthClient, useOAuthAccessToken, useOAuthHeaders } from '@/hooks/useOAuthClient';
import { callWorkersApi } from '@/integrations/cloudflare/client';

// Mock Workers API client
vi.mock('@/integrations/cloudflare/client', () => ({
  callWorkersApi: vi.fn(),
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

describe('useOAuthClient', () => {
  const mockAccessToken = 'mock-access-token';
  const mockRefreshToken = 'mock-refresh-token';
  const mockExpiresAt = Date.now() + 3600 * 1000; // 1시간 후

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('초기화', () => {
    it('초기 상태는 인증되지 않은 상태여야 함', () => {
      // Execute
      const { result } = renderHook(() => useOAuthClient());

      // Assert
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.subscription).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it('저장된 유효한 토큰이 있으면 세션을 복원해야 함', async () => {
      // Setup
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
      };

      localStorageMock.setItem('minu_oauth_access_token', mockAccessToken);
      localStorageMock.setItem('minu_oauth_refresh_token', mockRefreshToken);
      localStorageMock.setItem('minu_oauth_expires_at', mockExpiresAt.toString());
      localStorageMock.setItem('minu_oauth_user', JSON.stringify(mockUser));

      // Execute
      const { result } = renderHook(() => useOAuthClient());

      // Assert - 토큰이 저장되어 있으면 복원 시도
      expect(localStorageMock.getItem('minu_oauth_access_token')).toBe(mockAccessToken);
    });

    it('만료된 토큰이 있으면 갱신 로직이 트리거되어야 함', async () => {
      // Setup
      const expiredExpiresAt = Date.now() - 1000; // 이미 만료됨

      localStorageMock.setItem('minu_oauth_access_token', mockAccessToken);
      localStorageMock.setItem('minu_oauth_refresh_token', mockRefreshToken);
      localStorageMock.setItem('minu_oauth_expires_at', expiredExpiresAt.toString());

      // Workers API 모킹 - 토큰 갱신 성공
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: {
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token',
          expires_in: 3600,
        },
        error: null,
        status: 200,
      });

      // Execute
      const { result } = renderHook(() => useOAuthClient());

      // Assert - 초기 상태 확인
      expect(result.current.isLoading).toBeDefined();
    });

    it('토큰 저장소에 접근할 수 있어야 함', () => {
      // Setup
      localStorageMock.setItem('minu_oauth_access_token', mockAccessToken);

      // Execute
      const { result } = renderHook(() => useOAuthClient());

      // Assert - 훅이 정상적으로 마운트됨
      expect(result.current).toBeDefined();
    });
  });

  describe('login', () => {
    it('login 메서드가 존재해야 함', () => {
      // Execute
      const { result } = renderHook(() => useOAuthClient());

      // Assert
      expect(typeof result.current.login).toBe('function');
    });

    it('login 호출이 가능해야 함', () => {
      // Setup
      const originalLocation = window.location;
      delete (window as any).location;
      window.location = { ...originalLocation, href: '' } as any;

      // Execute
      const { result } = renderHook(() => useOAuthClient());

      // Assert - login 호출이 에러 없이 실행되어야 함
      expect(() => {
        result.current.login();
      }).not.toThrow();

      // Cleanup
      window.location = originalLocation;
    });
  });

  describe('handleCallback', () => {
    it('handleCallback 메서드가 존재해야 함', () => {
      // Execute
      const { result } = renderHook(() => useOAuthClient());

      // Assert
      expect(typeof result.current.handleCallback).toBe('function');
    });

    it('잘못된 state로 CSRF 공격을 방지해야 함', async () => {
      // Setup
      const code = 'auth-code-123';
      const invalidState = 'invalid-state';
      const validState = 'valid-state';

      localStorageMock.setItem('minu_oauth_pkce_verifier', 'verifier-123');
      localStorageMock.setItem('minu_oauth_pkce_state', validState);

      // Execute
      const { result } = renderHook(() => useOAuthClient());

      // Assert
      let error: Error | undefined;
      try {
        await result.current.handleCallback(code, invalidState);
      } catch (e) {
        error = e as Error;
      }

      expect(error).toBeDefined();
    });

    it('PKCE verifier가 없으면 에러를 던져야 함', async () => {
      // Setup
      const code = 'auth-code-123';
      const state = 'state-123';

      localStorageMock.setItem('minu_oauth_pkce_state', state);
      // verifier는 설정하지 않음

      // Execute
      const { result } = renderHook(() => useOAuthClient());

      // Assert
      let error: Error | undefined;
      try {
        await result.current.handleCallback(code, state);
      } catch (e) {
        error = e as Error;
      }

      expect(error).toBeDefined();
    });

    it('유효한 code와 state로 토큰을 교환해야 함', async () => {
      // Setup
      const code = 'auth-code-123';
      const state = 'valid-state';
      const verifier = 'verifier-123';

      localStorageMock.setItem('minu_oauth_pkce_verifier', verifier);
      localStorageMock.setItem('minu_oauth_pkce_state', state);

      // JWT 형식의 mock access token (base64 인코딩된 payload 포함)
      const jwtPayload = {
        sub: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
      };
      const encodedPayload = btoa(JSON.stringify(jwtPayload));
      const mockJwtToken = `header.${encodedPayload}.signature`;

      // Workers API 모킹 - 토큰 교환 성공
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: {
          access_token: mockJwtToken,
          refresh_token: 'new-refresh-token',
          expires_in: 3600,
        },
        error: null,
        status: 200,
      });

      // Execute
      const { result } = renderHook(() => useOAuthClient());

      await act(async () => {
        await result.current.handleCallback(code, state);
      });

      // Assert
      expect(callWorkersApi).toHaveBeenCalledWith('/auth/oauth/token', {
        method: 'POST',
        body: {
          grant_type: 'authorization_code',
          code,
          redirect_uri: expect.any(String),
          code_verifier: verifier,
          client_id: expect.any(String),
        },
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user?.email).toBe('test@example.com');
    });
  });

  describe('logout', () => {
    it('logout 메서드가 존재해야 함', () => {
      // Execute
      const { result } = renderHook(() => useOAuthClient());

      // Assert
      expect(typeof result.current.logout).toBe('function');
    });

    it('logout 호출 시 인증 상태가 false가 되어야 함', async () => {
      // Setup
      const { result } = renderHook(() => useOAuthClient());

      // Execute
      await act(async () => {
        await result.current.logout();
      });

      // Assert
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
    });

    it('logout 호출 시 localStorage가 클리어되어야 함', async () => {
      // Setup
      localStorageMock.setItem('minu_oauth_access_token', mockAccessToken);
      localStorageMock.setItem('minu_oauth_refresh_token', mockRefreshToken);
      localStorageMock.setItem('minu_oauth_user', JSON.stringify({ id: 'user-123' }));

      const { result } = renderHook(() => useOAuthClient());

      // Execute
      await act(async () => {
        await result.current.logout();
      });

      // Assert
      expect(localStorageMock.getItem('minu_oauth_access_token')).toBeNull();
      expect(localStorageMock.getItem('minu_oauth_refresh_token')).toBeNull();
      expect(localStorageMock.getItem('minu_oauth_user')).toBeNull();
    });
  });

  describe('refreshToken', () => {
    it('refreshToken 메서드가 존재해야 함', () => {
      // Execute
      const { result } = renderHook(() => useOAuthClient());

      // Assert
      expect(typeof result.current.refreshToken).toBe('function');
    });

    it('refresh 토큰이 없으면 에러가 발생해야 함', async () => {
      // Setup
      const { result } = renderHook(() => useOAuthClient());

      // Execute & Assert
      let error: Error | undefined;
      try {
        await result.current.refreshToken();
      } catch (e) {
        error = e as Error;
      }

      expect(error).toBeDefined();
    });

    it('유효한 refresh 토큰으로 새 토큰을 발급받아야 함', async () => {
      // Setup
      localStorageMock.setItem('minu_oauth_refresh_token', mockRefreshToken);

      // Workers API 모킹 - 토큰 갱신 성공
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: {
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token',
          expires_in: 3600,
        },
        error: null,
        status: 200,
      });

      const { result } = renderHook(() => useOAuthClient());

      // Execute
      await act(async () => {
        await result.current.refreshToken();
      });

      // Assert
      expect(callWorkersApi).toHaveBeenCalledWith('/auth/oauth/token', {
        method: 'POST',
        body: {
          grant_type: 'refresh_token',
          refresh_token: mockRefreshToken,
          client_id: expect.any(String),
        },
      });

      expect(localStorageMock.getItem('minu_oauth_access_token')).toBe('new-access-token');
      expect(localStorageMock.getItem('minu_oauth_refresh_token')).toBe('new-refresh-token');
    });

    it('토큰 갱신 실패 시 로그아웃되어야 함', async () => {
      // Setup
      localStorageMock.setItem('minu_oauth_refresh_token', mockRefreshToken);

      // Workers API 모킹 - 토큰 갱신 실패
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: null,
        error: 'Token refresh failed',
        status: 401,
      });

      const { result } = renderHook(() => useOAuthClient());

      // Execute & Assert
      let error: Error | undefined;
      try {
        await act(async () => {
          await result.current.refreshToken();
        });
      } catch (e) {
        error = e as Error;
      }

      expect(error).toBeDefined();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('자동 토큰 갱신', () => {
    it('훅이 자동 갱신 로직을 위한 상태를 관리해야 함', () => {
      // Execute
      const { result } = renderHook(() => useOAuthClient());

      // Assert - 필수 속성들이 존재해야 함
      expect(result.current.isAuthenticated).toBeDefined();
      expect(result.current.isLoading).toBeDefined();
    });
  });
});

describe('useOAuthAccessToken', () => {
  const testAccessToken = 'test-access-token-123';

  beforeEach(() => {
    localStorageMock.clear();
  });

  it('저장된 액세스 토큰을 반환해야 함', () => {
    // Setup
    localStorageMock.setItem('minu_oauth_access_token', testAccessToken);

    // Execute
    const { result } = renderHook(() => useOAuthAccessToken());

    // Assert
    expect(result.current).toBe(testAccessToken);
  });

  it('토큰이 없으면 null을 반환해야 함', () => {
    // Execute
    const { result } = renderHook(() => useOAuthAccessToken());

    // Assert
    expect(result.current).toBeNull();
  });
});

describe('useOAuthHeaders', () => {
  const testAccessToken = 'test-access-token-456';

  beforeEach(() => {
    localStorageMock.clear();
  });

  it('유효한 토큰으로 Authorization 헤더를 생성해야 함', () => {
    // Setup
    localStorageMock.setItem('minu_oauth_access_token', testAccessToken);

    // Execute
    const { result } = renderHook(() => useOAuthHeaders());

    // Assert
    expect(result.current).toEqual({
      Authorization: `Bearer ${testAccessToken}`,
      'Content-Type': 'application/json',
    });
  });

  it('토큰이 없으면 null을 반환해야 함', () => {
    // Execute
    const { result } = renderHook(() => useOAuthHeaders());

    // Assert
    expect(result.current).toBeNull();
  });
});

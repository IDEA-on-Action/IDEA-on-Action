/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * useOAuthClient Hook 테스트
 *
 * Minu 서비스용 OAuth 클라이언트 훅 테스트
 * - PKCE 기반 인증
 * - 토큰 자동 갱신
 * - localStorage 토큰 관리
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useOAuthClient, useOAuthAccessToken, useOAuthHeaders } from '@/hooks/useOAuthClient';
import { supabase } from '@/integrations/supabase/client';

// Mock dependencies
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      refreshSession: vi.fn(),
      exchangeCodeForSession: vi.fn(),
    },
  },
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
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
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

      // Assert
      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isLoading).toBe(false);
    });

    it('만료된 토큰이 있으면 자동으로 갱신을 시도해야 함', async () => {
      // Setup
      const expiredExpiresAt = Date.now() - 1000; // 이미 만료됨
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
      };

      localStorageMock.setItem('minu_oauth_access_token', mockAccessToken);
      localStorageMock.setItem('minu_oauth_refresh_token', mockRefreshToken);
      localStorageMock.setItem('minu_oauth_expires_at', expiredExpiresAt.toString());
      localStorageMock.setItem('minu_oauth_user', JSON.stringify(mockUser));

      vi.mocked(supabase.auth.refreshSession).mockResolvedValue({
        data: {
          session: {
            access_token: 'new-access-token',
            refresh_token: 'new-refresh-token',
            expires_in: 3600,
            user: mockUser as any,
          } as any,
          user: mockUser as any,
        },
        error: null,
      });

      // Execute
      const { result } = renderHook(() => useOAuthClient());

      // Assert
      await waitFor(() => {
        expect(supabase.auth.refreshSession).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('토큰 갱신 실패 시 로그아웃해야 함', async () => {
      // Setup
      const expiredExpiresAt = Date.now() - 1000;

      localStorageMock.setItem('minu_oauth_access_token', mockAccessToken);
      localStorageMock.setItem('minu_oauth_refresh_token', mockRefreshToken);
      localStorageMock.setItem('minu_oauth_expires_at', expiredExpiresAt.toString());

      vi.mocked(supabase.auth.refreshSession).mockResolvedValue({
        data: { session: null, user: null },
        error: { message: 'Refresh failed' } as any,
      });

      // Execute
      const { result } = renderHook(() => useOAuthClient());

      // Assert
      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(false);
      });

      expect(localStorageMock.getItem('minu_oauth_access_token')).toBeNull();
    });
  });

  describe('login', () => {
    it('PKCE 파라미터와 함께 OAuth URL로 리다이렉트해야 함', async () => {
      // Setup
      const originalLocation = window.location;
      delete (window as any).location;
      window.location = { ...originalLocation, href: '' } as any;

      // Execute
      const { result } = renderHook(() => useOAuthClient());

      act(() => {
        result.current.login();
      });

      // Assert
      await waitFor(() => {
        expect(localStorageMock.getItem('minu_oauth_pkce_verifier')).toBeTruthy();
        expect(localStorageMock.getItem('minu_oauth_pkce_state')).toBeTruthy();
      });

      // Cleanup
      window.location = originalLocation;
    });

    it('커스텀 redirect URI를 사용할 수 있어야 함', async () => {
      // Setup
      const originalLocation = window.location;
      delete (window as any).location;
      window.location = { ...originalLocation, href: '' } as any;

      const customRedirectUri = 'https://custom.com/callback';

      // Execute
      const { result } = renderHook(() => useOAuthClient());

      act(() => {
        result.current.login(customRedirectUri);
      });

      // Assert
      await waitFor(() => {
        expect(localStorageMock.getItem('minu_oauth_pkce_verifier')).toBeTruthy();
      });

      // Cleanup
      window.location = originalLocation;
    });
  });

  describe('handleCallback', () => {
    it('유효한 code와 state로 토큰을 교환해야 함', async () => {
      // Setup
      const code = 'auth-code-123';
      const state = 'state-123';
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: {
          full_name: 'Test User',
        },
      };

      localStorageMock.setItem('minu_oauth_pkce_verifier', 'verifier-123');
      localStorageMock.setItem('minu_oauth_pkce_state', state);

      vi.mocked(supabase.auth.exchangeCodeForSession).mockResolvedValue({
        data: {
          session: {
            access_token: mockAccessToken,
            refresh_token: mockRefreshToken,
            expires_in: 3600,
            user: mockUser as any,
          } as any,
          user: mockUser as any,
        },
        error: null,
      });

      // Execute
      const { result } = renderHook(() => useOAuthClient());

      await act(async () => {
        await result.current.handleCallback(code, state);
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      expect(result.current.user?.email).toBe('test@example.com');
      expect(localStorageMock.getItem('minu_oauth_access_token')).toBe(mockAccessToken);
      expect(localStorageMock.getItem('minu_oauth_pkce_verifier')).toBeNull();
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
      await expect(async () => {
        await result.current.handleCallback(code, invalidState);
      }).rejects.toThrow('Invalid state parameter');
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
      await expect(async () => {
        await result.current.handleCallback(code, state);
      }).rejects.toThrow('PKCE verifier not found');
    });

    it('토큰 교환 실패 시 에러를 처리해야 함', async () => {
      // Setup
      const code = 'auth-code-123';
      const state = 'state-123';

      localStorageMock.setItem('minu_oauth_pkce_verifier', 'verifier-123');
      localStorageMock.setItem('minu_oauth_pkce_state', state);

      vi.mocked(supabase.auth.exchangeCodeForSession).mockResolvedValue({
        data: { session: null, user: null },
        error: { message: 'Exchange failed' } as any,
      });

      // Execute
      const { result } = renderHook(() => useOAuthClient());

      // Assert
      await expect(async () => {
        await result.current.handleCallback(code, state);
      }).rejects.toThrow();
    });
  });

  describe('logout', () => {
    it('모든 토큰을 정리하고 로그아웃해야 함', async () => {
      // Setup
      localStorageMock.setItem('minu_oauth_access_token', mockAccessToken);
      localStorageMock.setItem('minu_oauth_refresh_token', mockRefreshToken);
      localStorageMock.setItem('minu_oauth_expires_at', mockExpiresAt.toString());

      const { result } = renderHook(() => useOAuthClient());

      // Execute
      await act(async () => {
        await result.current.logout();
      });

      // Assert
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(localStorageMock.getItem('minu_oauth_access_token')).toBeNull();
      expect(localStorageMock.getItem('minu_oauth_refresh_token')).toBeNull();
    });
  });

  describe('refreshToken', () => {
    it('토큰을 성공적으로 갱신해야 함', async () => {
      // Setup
      localStorageMock.setItem('minu_oauth_refresh_token', mockRefreshToken);

      vi.mocked(supabase.auth.refreshSession).mockResolvedValue({
        data: {
          session: {
            access_token: 'new-access-token',
            refresh_token: 'new-refresh-token',
            expires_in: 3600,
          } as any,
          user: null,
        },
        error: null,
      });

      const { result } = renderHook(() => useOAuthClient());

      // Execute
      await act(async () => {
        await result.current.refreshToken();
      });

      // Assert
      await waitFor(() => {
        expect(localStorageMock.getItem('minu_oauth_access_token')).toBe('new-access-token');
      });
    });

    it('refresh 토큰이 없으면 에러를 던져야 함', async () => {
      // Setup
      const { result } = renderHook(() => useOAuthClient());

      // Execute & Assert
      await expect(async () => {
        await result.current.refreshToken();
      }).rejects.toThrow('Refresh token이 없습니다');
    });

    it('토큰 갱신 실패 시 로그아웃해야 함', async () => {
      // Setup
      localStorageMock.setItem('minu_oauth_access_token', mockAccessToken);
      localStorageMock.setItem('minu_oauth_refresh_token', mockRefreshToken);

      vi.mocked(supabase.auth.refreshSession).mockResolvedValue({
        data: { session: null, user: null },
        error: { message: 'Refresh failed' } as any,
      });

      const { result } = renderHook(() => useOAuthClient());

      // Execute
      await act(async () => {
        try {
          await result.current.refreshToken();
        } catch {
          // 에러 무시
        }
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(false);
      });
    });
  });

  describe('자동 토큰 갱신', () => {
    it('만료 5분 전에 자동으로 토큰을 갱신해야 함', async () => {
      // Setup
      const expiresAt = Date.now() + 4 * 60 * 1000; // 4분 후 (5분 임계값보다 작음)
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
      };

      localStorageMock.setItem('minu_oauth_access_token', mockAccessToken);
      localStorageMock.setItem('minu_oauth_refresh_token', mockRefreshToken);
      localStorageMock.setItem('minu_oauth_expires_at', expiresAt.toString());
      localStorageMock.setItem('minu_oauth_user', JSON.stringify(mockUser));

      vi.mocked(supabase.auth.refreshSession).mockResolvedValue({
        data: {
          session: {
            access_token: 'new-access-token',
            refresh_token: 'new-refresh-token',
            expires_in: 3600,
          } as any,
          user: null,
        },
        error: null,
      });

      // Execute
      renderHook(() => useOAuthClient());

      // 1분 경과 시뮬레이션
      act(() => {
        vi.advanceTimersByTime(60 * 1000);
      });

      // Assert
      await waitFor(() => {
        expect(supabase.auth.refreshSession).toHaveBeenCalled();
      });
    });
  });
});

describe('useOAuthAccessToken', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('저장된 액세스 토큰을 반환해야 함', () => {
    // Setup
    localStorageMock.setItem('minu_oauth_access_token', mockAccessToken);

    // Execute
    const { result } = renderHook(() => useOAuthAccessToken());

    // Assert
    expect(result.current).toBe(mockAccessToken);
  });

  it('토큰이 없으면 null을 반환해야 함', () => {
    // Execute
    const { result } = renderHook(() => useOAuthAccessToken());

    // Assert
    expect(result.current).toBeNull();
  });
});

describe('useOAuthHeaders', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('유효한 토큰으로 Authorization 헤더를 생성해야 함', () => {
    // Setup
    localStorageMock.setItem('minu_oauth_access_token', mockAccessToken);

    // Execute
    const { result } = renderHook(() => useOAuthHeaders());

    // Assert
    expect(result.current).toEqual({
      Authorization: `Bearer ${mockAccessToken}`,
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

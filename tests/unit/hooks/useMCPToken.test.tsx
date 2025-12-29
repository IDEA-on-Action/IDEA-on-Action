/**
 * useMCPToken Hook 테스트
 *
 * OAuth 2.0 토큰 관리 훅 테스트
 * - Authorization Code 교환
 * - Refresh Token 갱신
 * - Token 저장/조회/삭제
 * - 자동 검증
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import useMCPToken from '@/hooks/useMCPToken';
import type { OAuthTokenResponse, ExchangeCodeParams } from '@/types/mcp-auth.types';
import React from 'react';

// Mock dependencies
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: {
      id: 'user-123',
      email: 'test@example.com',
    },
  })),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

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

// Test wrapper
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

// Helper: JWT 생성
function createMockJWT(payload: Record<string, unknown>): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = btoa(JSON.stringify(header));
  const encodedPayload = btoa(JSON.stringify(payload));
  const signature = 'mock-signature';

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

describe('useMCPToken', () => {
  const mockTokenResponse: OAuthTokenResponse = {
    access_token: createMockJWT({
      sub: 'user-123',
      iss: 'https://www.ideaonaction.ai',
      aud: 'minu-find',
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
      scope: 'read write',
    }),
    refresh_token: 'rt_mock-refresh-token-123',
    expires_in: 3600,
    token_type: 'Bearer',
    scope: 'read write',
  };

  const mockExchangeParams: ExchangeCodeParams = {
    code: 'auth-code-123',
    redirect_uri: 'https://find.minu.best/callback',
    client_id: 'minu-find',
    client_secret: 'secret-123',
    code_verifier: 'verifier-123',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('초기화', () => {
    it('초기 상태는 로딩 중이 아니어야 함', () => {
      const { result } = renderHook(() => useMCPToken(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('저장된 토큰이 있으면 자동으로 로드해야 함', () => {
      // 토큰 사전 저장
      const stored = {
        access_token: mockTokenResponse.access_token,
        refresh_token: mockTokenResponse.refresh_token,
        expires_at: Date.now() + 3600000,
        token_type: 'Bearer' as const,
        scope: 'read write',
        created_at: Date.now(),
      };
      localStorageMock.setItem('mcp_oauth_tokens', JSON.stringify(stored));

      const { result } = renderHook(() => useMCPToken(), {
        wrapper: createWrapper(),
      });

      const tokens = result.current.getStoredTokens();
      expect(tokens).not.toBeNull();
      expect(tokens?.access_token).toBe(mockTokenResponse.access_token);
    });
  });

  describe('exchangeCode', () => {
    it('Authorization Code를 성공적으로 교환해야 함', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokenResponse,
      });

      const { result } = renderHook(() => useMCPToken(), {
        wrapper: createWrapper(),
      });

      let response: OAuthTokenResponse | undefined;

      await act(async () => {
        response = await result.current.exchangeCode(mockExchangeParams);
      });

      expect(response).toEqual(mockTokenResponse);
      // Workers API로 마이그레이션 후 엔드포인트 변경
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/oauth/token'),
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );
    });

    it('Code 교환 실패 시 에러를 발생시켜야 함', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: 'invalid_grant',
          error_description: 'Invalid authorization code',
        }),
      });

      const { result } = renderHook(() => useMCPToken(), {
        wrapper: createWrapper(),
      });

      await expect(
        act(async () => {
          await result.current.exchangeCode(mockExchangeParams);
        })
      ).rejects.toThrow('Invalid authorization code');
    });

    it('Code 교환 성공 시 토큰을 저장해야 함', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokenResponse,
      });

      const { result } = renderHook(() => useMCPToken(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.exchangeCode(mockExchangeParams);
      });

      const stored = localStorageMock.getItem('mcp_oauth_tokens');
      expect(stored).not.toBeNull();

      const parsed = JSON.parse(stored!);
      expect(parsed.access_token).toBe(mockTokenResponse.access_token);
    });
  });

  describe('refreshToken', () => {
    beforeEach(() => {
      // 저장된 토큰 설정
      const stored = {
        access_token: mockTokenResponse.access_token,
        refresh_token: mockTokenResponse.refresh_token,
        expires_at: Date.now() + 3600000,
        token_type: 'Bearer' as const,
        scope: 'read write',
        created_at: Date.now(),
      };
      localStorageMock.setItem('mcp_oauth_tokens', JSON.stringify(stored));
    });

    it('Refresh Token으로 새 Access Token을 발급받아야 함', async () => {
      const newTokenResponse = {
        ...mockTokenResponse,
        access_token: createMockJWT({
          sub: 'user-123',
          exp: Math.floor(Date.now() / 1000) + 3600,
          iat: Math.floor(Date.now() / 1000),
        }),
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => newTokenResponse,
      });

      const { result } = renderHook(() => useMCPToken(), {
        wrapper: createWrapper(),
      });

      let response: OAuthTokenResponse | undefined;

      await act(async () => {
        response = await result.current.refreshToken();
      });

      expect(response).toEqual(newTokenResponse);
      // Workers API로 마이그레이션 후 엔드포인트 변경
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/oauth/token'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('refresh_token'),
        })
      );
    });

    it('Refresh Token이 없으면 에러를 발생시켜야 함', async () => {
      localStorageMock.clear();

      const { result } = renderHook(() => useMCPToken(), {
        wrapper: createWrapper(),
      });

      await expect(
        act(async () => {
          await result.current.refreshToken();
        })
      ).rejects.toThrow('No refresh token available');
    });

    it('Refresh 실패 시 에러를 발생시켜야 함', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: 'invalid_grant',
          error_description: 'Refresh token expired',
        }),
      });

      const { result } = renderHook(() => useMCPToken(), {
        wrapper: createWrapper(),
      });

      await expect(
        act(async () => {
          await result.current.refreshToken();
        })
      ).rejects.toThrow('Refresh token expired');
    });
  });

  describe('revokeToken', () => {
    it('토큰을 성공적으로 폐기해야 함', async () => {
      const stored = {
        access_token: mockTokenResponse.access_token,
        refresh_token: mockTokenResponse.refresh_token,
        expires_at: Date.now() + 3600000,
        token_type: 'Bearer' as const,
        scope: 'read write',
        created_at: Date.now(),
      };
      localStorageMock.setItem('mcp_oauth_tokens', JSON.stringify(stored));

      const { result } = renderHook(() => useMCPToken(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.revokeToken();
      });

      const tokens = result.current.getStoredTokens();
      expect(tokens).toBeNull();
      expect(localStorageMock.getItem('mcp_oauth_tokens')).toBeNull();
    });
  });

  describe('getStoredTokens', () => {
    it('저장된 토큰을 반환해야 함', () => {
      const stored = {
        access_token: mockTokenResponse.access_token,
        refresh_token: mockTokenResponse.refresh_token,
        expires_at: Date.now() + 3600000,
        token_type: 'Bearer' as const,
        scope: 'read write',
        created_at: Date.now(),
      };
      localStorageMock.setItem('mcp_oauth_tokens', JSON.stringify(stored));

      const { result } = renderHook(() => useMCPToken(), {
        wrapper: createWrapper(),
      });

      const tokens = result.current.getStoredTokens();
      expect(tokens).not.toBeNull();
      expect(tokens?.access_token).toBe(stored.access_token);
    });

    it('저장된 토큰이 없으면 null을 반환해야 함', () => {
      const { result } = renderHook(() => useMCPToken(), {
        wrapper: createWrapper(),
      });

      const tokens = result.current.getStoredTokens();
      expect(tokens).toBeNull();
    });
  });

  describe('getAccessToken', () => {
    it('유효한 토큰을 반환해야 함', async () => {
      const stored = {
        access_token: mockTokenResponse.access_token,
        refresh_token: mockTokenResponse.refresh_token,
        expires_at: Date.now() + 3600000,
        token_type: 'Bearer' as const,
        scope: 'read write',
        created_at: Date.now(),
      };
      localStorageMock.setItem('mcp_oauth_tokens', JSON.stringify(stored));

      const { result } = renderHook(() => useMCPToken(), {
        wrapper: createWrapper(),
      });

      let token: string | null = null;

      await act(async () => {
        token = await result.current.getAccessToken();
      });

      expect(token).toBe(mockTokenResponse.access_token);
    });

    it('토큰이 없으면 null을 반환해야 함', async () => {
      const { result } = renderHook(() => useMCPToken(), {
        wrapper: createWrapper(),
      });

      let token: string | null = null;

      await act(async () => {
        token = await result.current.getAccessToken();
      });

      expect(token).toBeNull();
    });

    it('만료된 토큰은 자동 갱신을 시도해야 함', async () => {
      const expiredToken = createMockJWT({
        sub: 'user-123',
        exp: Math.floor(Date.now() / 1000) - 3600, // 1시간 전 만료
        iat: Math.floor(Date.now() / 1000) - 7200,
      });

      const stored = {
        access_token: expiredToken,
        refresh_token: mockTokenResponse.refresh_token,
        expires_at: Date.now() - 3600000, // 1시간 전
        token_type: 'Bearer' as const,
        scope: 'read write',
        created_at: Date.now() - 7200000,
      };
      localStorageMock.setItem('mcp_oauth_tokens', JSON.stringify(stored));

      const newTokenResponse = {
        ...mockTokenResponse,
        access_token: createMockJWT({
          sub: 'user-123',
          exp: Math.floor(Date.now() / 1000) + 3600,
          iat: Math.floor(Date.now() / 1000),
        }),
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => newTokenResponse,
      });

      const { result } = renderHook(() => useMCPToken(), {
        wrapper: createWrapper(),
      });

      let token: string | null = null;

      await act(async () => {
        token = await result.current.getAccessToken();
      });

      expect(token).toBe(newTokenResponse.access_token);
      expect(mockFetch).toHaveBeenCalledWith(
        '/functions/v1/oauth-token',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('refresh_token'),
        })
      );
    });
  });

  describe('validateToken', () => {
    it('유효한 토큰을 검증해야 함', () => {
      const stored = {
        access_token: mockTokenResponse.access_token,
        refresh_token: mockTokenResponse.refresh_token,
        expires_at: Date.now() + 3600000,
        token_type: 'Bearer' as const,
        scope: 'read write',
        created_at: Date.now(),
      };
      localStorageMock.setItem('mcp_oauth_tokens', JSON.stringify(stored));

      const { result } = renderHook(() => useMCPToken(), {
        wrapper: createWrapper(),
      });

      const validation = result.current.validateToken();
      expect(validation.status).toBe('valid');
      expect(validation.payload).toBeDefined();
    });

    it('만료된 토큰을 감지해야 함', () => {
      const expiredToken = createMockJWT({
        sub: 'user-123',
        exp: Math.floor(Date.now() / 1000) - 3600,
        iat: Math.floor(Date.now() / 1000) - 7200,
      });

      const stored = {
        access_token: expiredToken,
        refresh_token: mockTokenResponse.refresh_token,
        expires_at: Date.now() - 3600000,
        token_type: 'Bearer' as const,
        scope: 'read write',
        created_at: Date.now() - 7200000,
      };
      localStorageMock.setItem('mcp_oauth_tokens', JSON.stringify(stored));

      const { result } = renderHook(() => useMCPToken(), {
        wrapper: createWrapper(),
      });

      const validation = result.current.validateToken();
      expect(validation.status).toBe('expired');
    });

    it('토큰이 없으면 missing 상태를 반환해야 함', () => {
      const { result } = renderHook(() => useMCPToken(), {
        wrapper: createWrapper(),
      });

      const validation = result.current.validateToken();
      expect(validation.status).toBe('missing');
    });
  });

  describe('storeTokens & clearTokens', () => {
    it('토큰을 저장해야 함', () => {
      const { result } = renderHook(() => useMCPToken(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.storeTokens(mockTokenResponse);
      });

      const stored = localStorageMock.getItem('mcp_oauth_tokens');
      expect(stored).not.toBeNull();

      const parsed = JSON.parse(stored!);
      expect(parsed.access_token).toBe(mockTokenResponse.access_token);
    });

    it('토큰을 삭제해야 함', () => {
      const stored = {
        access_token: mockTokenResponse.access_token,
        refresh_token: mockTokenResponse.refresh_token,
        expires_at: Date.now() + 3600000,
        token_type: 'Bearer' as const,
        scope: 'read write',
        created_at: Date.now(),
      };
      localStorageMock.setItem('mcp_oauth_tokens', JSON.stringify(stored));

      const { result } = renderHook(() => useMCPToken(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.clearTokens();
      });

      const afterClear = localStorageMock.getItem('mcp_oauth_tokens');
      expect(afterClear).toBeNull();
    });
  });
});

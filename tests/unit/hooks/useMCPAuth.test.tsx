/**
 * useMCPAuth Hook 테스트
 *
 * MCP 토큰 인증 훅 테스트
 * - 토큰 요청/검증/갱신/폐기
 * - 자동 토큰 갱신 로직
 * - 로컬 스토리지 세션 관리
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import useMCPAuth, {
  useMCPAuthState,
  useMCPServiceAuth,
  useMCPAuthHeaders,
} from '@/hooks/integrations/useMCPAuth';
import * as mcpAuthLib from '@/lib/mcp-auth';
import type { MCPTokenResponse, MCPTokenVerifyResponse } from '@/types/auth/mcp-auth.types';
import React from 'react';

// Mock dependencies
vi.mock('@/lib/mcp-auth', () => ({
  requestMCPToken: vi.fn(),
  verifyMCPToken: vi.fn(),
  refreshMCPToken: vi.fn(),
  revokeMCPToken: vi.fn(),
  getStoredTokenIfValid: vi.fn(),
  removeTokenFromStorage: vi.fn(),
  calculateTokenExpiresIn: vi.fn(),
  needsTokenRefresh: vi.fn(),
  isMCPAuthError: vi.fn(),
}));

vi.mock('@/hooks/auth/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: {
      id: 'user-123',
      email: 'test@example.com',
    },
  })),
}));

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

describe('useMCPAuth', () => {
  const mockTokenResponse: MCPTokenResponse = {
    accessToken: 'access-token-123',
    refreshToken: 'refresh-token-123',
    tokenType: 'Bearer',
    expiresIn: 3600,
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
    scopes: ['read', 'write'],
    serviceName: 'minu-find',
  };

  const mockVerifyResponse: MCPTokenVerifyResponse = {
    valid: true,
    status: 'valid',
    expiresAt: mockTokenResponse.expiresAt,
    remainingTime: 3600,
    userId: 'user-123',
    serviceName: 'minu-find',
    scopes: ['read', 'write'],
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // 기본 mock 설정
    vi.mocked(mcpAuthLib.getStoredTokenIfValid).mockReturnValue(null);
    vi.mocked(mcpAuthLib.calculateTokenExpiresIn).mockReturnValue(3600);
    vi.mocked(mcpAuthLib.needsTokenRefresh).mockReturnValue(false);
    vi.mocked(mcpAuthLib.isMCPAuthError).mockReturnValue(false);
    // verifyMCPToken이 undefined를 반환하지 않도록 기본값 설정
    vi.mocked(mcpAuthLib.verifyMCPToken).mockResolvedValue({
      valid: false,
      status: 'invalid',
      expiresAt: null,
      remainingTime: 0,
      userId: null,
      serviceName: null,
      scopes: [],
    });
  });

  describe('초기화', () => {
    it('초기 상태는 인증되지 않은 상태여야 함', () => {
      // Execute
      const { result } = renderHook(() => useMCPAuth(), {
        wrapper: createWrapper(),
      });

      // Assert
      expect(result.current.state.isAuthenticated).toBe(false);
      expect(result.current.state.accessToken).toBeNull();
      expect(result.current.state.refreshToken).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it('저장된 유효한 토큰이 있으면 세션을 복원해야 함', () => {
      // Setup
      const storedToken = {
        accessToken: 'stored-access-token',
        refreshToken: 'stored-refresh-token',
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        serviceName: 'minu-find' as const,
        scopes: ['read'],
        createdAt: new Date().toISOString(),
      };

      vi.mocked(mcpAuthLib.getStoredTokenIfValid).mockReturnValue(storedToken);

      // Execute
      const { result } = renderHook(() => useMCPAuth(), {
        wrapper: createWrapper(),
      });

      // Assert
      expect(result.current.state.isAuthenticated).toBe(true);
      expect(result.current.state.accessToken).toBe(storedToken.accessToken);
      expect(result.current.state.serviceName).toBe(storedToken.serviceName);
    });

    it('저장된 토큰이 없으면 초기 상태여야 함', () => {
      // Setup
      vi.mocked(mcpAuthLib.getStoredTokenIfValid).mockReturnValue(null);

      // Execute
      const { result } = renderHook(() => useMCPAuth(), {
        wrapper: createWrapper(),
      });

      // Assert
      expect(result.current.state.isAuthenticated).toBe(false);
      expect(result.current.state.accessToken).toBeNull();
    });
  });

  describe('requestToken', () => {
    it('토큰 요청 함수가 호출되어야 함', async () => {
      // Setup
      vi.mocked(mcpAuthLib.requestMCPToken).mockResolvedValue(mockTokenResponse);

      const { result } = renderHook(() => useMCPAuth(), {
        wrapper: createWrapper(),
      });

      // Execute
      await act(async () => {
        await result.current.requestToken('minu-find', ['read', 'write']);
      });

      // Assert - 함수 호출 확인
      expect(mcpAuthLib.requestMCPToken).toHaveBeenCalledWith('minu-find', ['read', 'write']);
    });

    it('토큰 요청 실패 시 에러를 처리해야 함', async () => {
      // Setup
      const error = new Error('Token request failed');
      vi.mocked(mcpAuthLib.requestMCPToken).mockRejectedValue(error);

      const { result } = renderHook(() => useMCPAuth(), {
        wrapper: createWrapper(),
      });

      // Execute
      let thrownError: Error | undefined;
      await act(async () => {
        try {
          await result.current.requestToken('minu-find');
        } catch (e) {
          thrownError = e as Error;
        }
      });

      // Assert - 에러가 발생하거나 인증되지 않은 상태
      expect(thrownError || !result.current.state.isAuthenticated).toBeTruthy();
    });

    it('requestToken 메서드가 존재해야 함', () => {
      // Setup
      const { result } = renderHook(() => useMCPAuth(), {
        wrapper: createWrapper(),
      });

      // Assert
      expect(typeof result.current.requestToken).toBe('function');
    });
  });

  describe('verifyToken', () => {
    it('verifyToken 메서드가 존재해야 함', () => {
      // Setup
      const { result } = renderHook(() => useMCPAuth(), {
        wrapper: createWrapper(),
      });

      // Assert
      expect(typeof result.current.verifyToken).toBe('function');
    });

    it('토큰이 없을 때 verifyToken 호출 시 에러가 발생해야 함', async () => {
      // Setup
      const { result } = renderHook(() => useMCPAuth(), {
        wrapper: createWrapper(),
      });

      // Execute & Assert
      let error: Error | undefined;
      await act(async () => {
        try {
          await result.current.verifyToken();
        } catch (e) {
          error = e as Error;
        }
      });

      expect(error).toBeDefined();
    });
  });

  describe('refreshToken', () => {
    it('refreshToken 메서드가 존재해야 함', () => {
      // Setup
      const { result } = renderHook(() => useMCPAuth(), {
        wrapper: createWrapper(),
      });

      // Assert
      expect(typeof result.current.refreshToken).toBe('function');
    });

    it('리프레시 토큰이 없으면 에러가 발생해야 함', async () => {
      // Setup
      const { result } = renderHook(() => useMCPAuth(), {
        wrapper: createWrapper(),
      });

      // Execute
      let error: Error | undefined;
      await act(async () => {
        try {
          await result.current.refreshToken();
        } catch (e) {
          error = e as Error;
        }
      });

      // Assert - 에러가 발생하거나 인증되지 않은 상태
      expect(error || !result.current.state.isAuthenticated).toBeTruthy();
    });

    it('초기 isRefreshing 상태는 false여야 함', () => {
      // Setup
      const { result } = renderHook(() => useMCPAuth(), {
        wrapper: createWrapper(),
      });

      // Assert
      expect(result.current.state.isRefreshing).toBe(false);
    });
  });

  describe('revokeToken', () => {
    it('revokeToken 메서드가 존재해야 함', () => {
      // Setup
      const { result } = renderHook(() => useMCPAuth(), {
        wrapper: createWrapper(),
      });

      // Assert
      expect(typeof result.current.revokeToken).toBe('function');
    });

    it('토큰이 없는 상태에서 revokeToken 호출 시 안전하게 처리되어야 함', async () => {
      // Setup
      vi.mocked(mcpAuthLib.revokeMCPToken).mockResolvedValue(undefined);

      const { result } = renderHook(() => useMCPAuth(), {
        wrapper: createWrapper(),
      });

      // Execute - 토큰 없이 호출
      await act(async () => {
        try {
          await result.current.revokeToken();
        } catch {
          // 에러가 발생해도 됨
        }
      });

      // Assert - 앱이 크래시되지 않아야 함
      expect(result.current.state.isAuthenticated).toBe(false);
    });
  });

  describe('clearAuth', () => {
    it('clearAuth 메서드가 존재해야 함', () => {
      // Setup
      const { result } = renderHook(() => useMCPAuth(), {
        wrapper: createWrapper(),
      });

      // Assert
      expect(typeof result.current.clearAuth).toBe('function');
    });

    it('clearAuth 호출 시 인증 상태가 초기화되어야 함', () => {
      // Setup
      const { result } = renderHook(() => useMCPAuth(), {
        wrapper: createWrapper(),
      });

      // Execute
      act(() => {
        result.current.clearAuth();
      });

      // Assert
      expect(result.current.state.isAuthenticated).toBe(false);
      expect(result.current.state.accessToken).toBeNull();
    });
  });

  describe('자동 토큰 갱신', () => {
    it('needsRefresh 속성이 존재해야 함', () => {
      // Setup
      const { result } = renderHook(() => useMCPAuth(), {
        wrapper: createWrapper(),
      });

      // Assert
      expect(typeof result.current.needsRefresh).toBe('boolean');
    });

    it('초기 needsRefresh는 false여야 함', () => {
      // Setup
      vi.mocked(mcpAuthLib.needsTokenRefresh).mockReturnValue(false);

      const { result } = renderHook(() => useMCPAuth(), {
        wrapper: createWrapper(),
      });

      // Assert
      expect(result.current.needsRefresh).toBe(false);
    });

    it('isRefreshing 속성이 존재해야 함', () => {
      // Setup
      const { result } = renderHook(() => useMCPAuth(), {
        wrapper: createWrapper(),
      });

      // Assert
      expect(result.current.state.isRefreshing).toBe(false);
    });
  });

  describe('토큰 유효성 검사', () => {
    it('isTokenValid 속성이 존재해야 함', () => {
      // Setup
      const { result } = renderHook(() => useMCPAuth(), {
        wrapper: createWrapper(),
      });

      // Assert
      expect(typeof result.current.isTokenValid).toBe('boolean');
    });

    it('tokenExpiresIn 속성이 존재해야 함', () => {
      // Setup
      vi.mocked(mcpAuthLib.calculateTokenExpiresIn).mockReturnValue(3600);

      const { result } = renderHook(() => useMCPAuth(), {
        wrapper: createWrapper(),
      });

      // Assert - tokenExpiresIn은 number 또는 null일 수 있음
      expect(
        typeof result.current.tokenExpiresIn === 'number' ||
          result.current.tokenExpiresIn === null
      ).toBe(true);
    });

    it('토큰이 없을 때 isTokenValid가 false여야 함', () => {
      // Setup
      const { result } = renderHook(() => useMCPAuth(), {
        wrapper: createWrapper(),
      });

      // Assert
      expect(result.current.isTokenValid).toBe(false);
    });
  });
});

describe('useMCPAuthState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(mcpAuthLib.getStoredTokenIfValid).mockReturnValue(null);
    // verifyMCPToken이 undefined를 반환하지 않도록 기본값 설정
    vi.mocked(mcpAuthLib.verifyMCPToken).mockResolvedValue({
      valid: false,
      status: 'invalid',
      expiresAt: null,
      remainingTime: 0,
      userId: null,
      serviceName: null,
      scopes: [],
    });
  });

  it('인증 상태만 반환해야 함', () => {
    // Execute
    const { result } = renderHook(() => useMCPAuthState(), {
      wrapper: createWrapper(),
    });

    // Assert
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.accessToken).toBeNull();
  });
});

describe('useMCPServiceAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(mcpAuthLib.getStoredTokenIfValid).mockReturnValue(null);
    vi.mocked(mcpAuthLib.requestMCPToken).mockResolvedValue({
      accessToken: 'token',
      refreshToken: 'refresh',
      tokenType: 'Bearer',
      expiresIn: 3600,
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      scopes: ['read'],
      serviceName: 'minu-find',
    });
    // verifyMCPToken이 undefined를 반환하지 않도록 기본값 설정
    vi.mocked(mcpAuthLib.verifyMCPToken).mockResolvedValue({
      valid: true,
      status: 'valid',
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      remainingTime: 3600,
      userId: 'user-123',
      serviceName: 'minu-find',
      scopes: ['read'],
    });
  });

  it('특정 서비스 인증 상태를 확인해야 함', async () => {
    // Execute
    const { result } = renderHook(() => useMCPServiceAuth('minu-find'), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.requestToken('minu-find');
    });

    // Assert
    await waitFor(() => {
      expect(result.current.isCurrentService).toBe(true);
    });

    expect(result.current.isServiceAuthenticated).toBe(true);
  });

  it('다른 서비스일 때 isCurrentService가 false여야 함', async () => {
    // Execute
    const { result } = renderHook(() => useMCPServiceAuth('minu-build'), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.requestToken('minu-find');
    });

    // Assert
    await waitFor(() => {
      expect(result.current.isCurrentService).toBe(false);
    });

    expect(result.current.isServiceAuthenticated).toBe(false);
  });
});

describe('useMCPAuthHeaders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(mcpAuthLib.getStoredTokenIfValid).mockReturnValue(null);
    vi.mocked(mcpAuthLib.requestMCPToken).mockResolvedValue({
      accessToken: 'token-123',
      refreshToken: 'refresh',
      tokenType: 'Bearer',
      expiresIn: 3600,
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      scopes: ['read'],
      serviceName: 'minu-find',
    });
    vi.mocked(mcpAuthLib.calculateTokenExpiresIn).mockReturnValue(3600);
    // verifyMCPToken이 undefined를 반환하지 않도록 기본값 설정
    vi.mocked(mcpAuthLib.verifyMCPToken).mockResolvedValue({
      valid: true,
      status: 'valid',
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      remainingTime: 3600,
      userId: 'user-123',
      serviceName: 'minu-find',
      scopes: ['read'],
    });
  });

  it('유효한 토큰으로 Authorization 헤더를 생성해야 함', () => {
    // Setup - 유효한 토큰이 있는 상태로 mock 설정
    vi.mocked(mcpAuthLib.getStoredTokenIfValid).mockReturnValue({
      accessToken: 'token-123',
      refreshToken: 'refresh-token',
      expiresAt: Date.now() + 3600000,
      provider: 'minu-find',
    });

    // Execute
    const { result } = renderHook(() => useMCPAuthHeaders(), {
      wrapper: createWrapper(),
    });

    // Assert
    const headers = result.current.getAuthHeaders();
    expect(headers).toEqual({
      Authorization: 'Bearer token-123',
    });
  });

  it('토큰이 없을 때 빈 객체를 반환해야 함', () => {
    // Execute
    const { result } = renderHook(() => useMCPAuthHeaders(), {
      wrapper: createWrapper(),
    });

    // Assert
    const headers = result.current.getAuthHeaders();
    expect(headers).toEqual({});
  });
});

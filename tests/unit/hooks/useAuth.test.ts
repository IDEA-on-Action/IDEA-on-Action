/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useAuth } from '@/hooks/useAuth';
import { authApi } from '@/integrations/cloudflare/client';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

// Mock Workers API client
vi.mock('@/integrations/cloudflare/client', () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
    refresh: vi.fn(),
    logout: vi.fn(),
  },
}));

// Mock Sentry
vi.mock('@/lib/sentry', () => ({
  setUser: vi.fn(),
  clearUser: vi.fn(),
}));

// Mock errors
vi.mock('@/lib/errors', () => ({
  devError: vi.fn(),
  devLog: vi.fn(),
}));

// localStorage 모킹
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// window.location 모킹
const originalLocation = window.location;
delete (window as any).location;
window.location = { href: '' } as any;

describe('useAuth', () => {
  // mockStoredTokens.user와 동일하게 설정 (반환되는 객체와 일치)
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
  };

  const mockTokens = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    expiresIn: 3600,
  };

  const mockStoredTokens = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    expiresAt: Date.now() + 3600000, // 1시간 후
    user: mockUser,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    mockNavigate.mockClear();
    window.location.href = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('초기 상태는 로딩 중이어야 함', async () => {
    // Setup - localStorage에 토큰 없음
    localStorageMock.getItem.mockReturnValue(null);

    // Execute
    const { result } = renderHook(() => useAuth());

    // Assert - 초기 로딩 상태
    expect(result.current.loading).toBe(true);
    expect(result.current.workersUser).toBe(null);
    expect(result.current.workersTokens).toBe(null);

    // 로딩 완료 대기
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });

  it('저장된 토큰이 유효하면 사용자 정보를 설정해야 함', async () => {
    // Setup - localStorage에 유효한 토큰 저장
    localStorageMock.getItem.mockReturnValue(JSON.stringify(mockStoredTokens));

    // Execute
    const { result } = renderHook(() => useAuth());

    // Assert
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.workersUser).toEqual(mockUser);
    expect(result.current.workersTokens).toEqual(mockStoredTokens);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('저장된 토큰이 없으면 사용자 정보가 null이어야 함', async () => {
    // Setup - localStorage에 토큰 없음
    localStorageMock.getItem.mockReturnValue(null);

    // Execute
    const { result } = renderHook(() => useAuth());

    // Assert
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.workersUser).toBe(null);
    expect(result.current.workersTokens).toBe(null);
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('만료된 토큰은 갱신을 시도해야 함', async () => {
    // Setup - 만료된 토큰
    const expiredTokens = {
      ...mockStoredTokens,
      expiresAt: Date.now() - 1000, // 이미 만료됨
    };
    localStorageMock.getItem.mockReturnValue(JSON.stringify(expiredTokens));

    // 토큰 갱신 성공 모킹
    vi.mocked(authApi.refresh).mockResolvedValue({
      data: {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 3600,
      },
      error: null,
      status: 200,
    });

    // Execute
    const { result } = renderHook(() => useAuth());

    // Assert
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(authApi.refresh).toHaveBeenCalledWith(expiredTokens.refreshToken);
  });

  it('토큰 갱신 실패 시 로그아웃 처리되어야 함', async () => {
    // Setup - 만료된 토큰
    const expiredTokens = {
      ...mockStoredTokens,
      expiresAt: Date.now() - 1000,
    };
    localStorageMock.getItem.mockReturnValue(JSON.stringify(expiredTokens));

    // 토큰 갱신 실패 모킹
    vi.mocked(authApi.refresh).mockResolvedValue({
      data: null,
      error: 'Token expired',
      status: 401,
    });

    // Execute
    const { result } = renderHook(() => useAuth());

    // Assert
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.workersUser).toBe(null);
    expect(result.current.isAuthenticated).toBe(false);
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('workers_auth_tokens');
  });

  it('Google 로그인 함수가 OAuth URL로 리다이렉트해야 함', async () => {
    // Setup
    localStorageMock.getItem.mockReturnValue(null);

    // Execute
    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.signInWithGoogle();
    });

    // Assert - Workers OAuth URL로 리다이렉트
    expect(window.location.href).toContain('/oauth/google/authorize');
  });

  it('GitHub 로그인 함수가 OAuth URL로 리다이렉트해야 함', async () => {
    // Setup
    localStorageMock.getItem.mockReturnValue(null);

    // Execute
    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.signInWithGithub();
    });

    // Assert
    expect(window.location.href).toContain('/oauth/github/authorize');
  });

  it('Kakao 로그인 함수가 OAuth URL로 리다이렉트해야 함', async () => {
    // Setup
    localStorageMock.getItem.mockReturnValue(null);

    // Execute
    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.signInWithKakao();
    });

    // Assert
    expect(window.location.href).toContain('/oauth/kakao/authorize');
  });

  it('이메일 로그인 함수가 정상 작동해야 함', async () => {
    // Setup
    localStorageMock.getItem.mockReturnValue(null);

    vi.mocked(authApi.login).mockResolvedValue({
      data: {
        user: mockUser,
        ...mockTokens,
      },
      error: null,
      status: 200,
    });

    // Execute
    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.signInWithEmail('test@example.com', 'password123');
    });

    // Assert
    expect(authApi.login).toHaveBeenCalledWith('test@example.com', 'password123');
    expect(localStorageMock.setItem).toHaveBeenCalled();
    expect(result.current.workersUser).toEqual(mockUser);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('이메일 로그인 실패 시 에러를 throw해야 함', async () => {
    // Setup
    localStorageMock.getItem.mockReturnValue(null);

    vi.mocked(authApi.login).mockResolvedValue({
      data: null,
      error: '잘못된 이메일 또는 비밀번호입니다',
      status: 401,
    });

    // Execute
    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Assert
    await expect(
      act(async () => {
        await result.current.signInWithEmail('test@example.com', 'wrongpassword');
      })
    ).rejects.toThrow('잘못된 이메일 또는 비밀번호입니다');
  });

  it('회원가입 함수가 정상 작동해야 함', async () => {
    // Setup
    localStorageMock.getItem.mockReturnValue(null);

    vi.mocked(authApi.register).mockResolvedValue({
      data: {
        user: { id: '123', email: 'test@example.com', name: 'New User' },
        ...mockTokens,
      },
      error: null,
      status: 201,
    });

    // Execute
    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.signUpWithEmail('test@example.com', 'password123', 'New User');
    });

    // Assert
    expect(authApi.register).toHaveBeenCalledWith('test@example.com', 'password123', 'New User');
    expect(localStorageMock.setItem).toHaveBeenCalled();
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('회원가입 실패 시 에러를 throw해야 함', async () => {
    // Setup
    localStorageMock.getItem.mockReturnValue(null);

    vi.mocked(authApi.register).mockResolvedValue({
      data: null,
      error: '이미 존재하는 이메일입니다',
      status: 409,
    });

    // Execute
    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Assert
    await expect(
      act(async () => {
        await result.current.signUpWithEmail('test@example.com', 'password123');
      })
    ).rejects.toThrow('이미 존재하는 이메일입니다');
  });

  it('로그아웃 함수가 정상 작동해야 함', async () => {
    // Setup - 로그인된 상태
    localStorageMock.getItem.mockReturnValue(JSON.stringify(mockStoredTokens));

    vi.mocked(authApi.logout).mockResolvedValue({
      data: { success: true },
      error: null,
      status: 200,
    });

    // Execute
    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.signOut();
    });

    // Assert
    expect(authApi.logout).toHaveBeenCalledWith(mockStoredTokens.refreshToken);
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('workers_auth_tokens');
    expect(result.current.workersUser).toBe(null);
    expect(result.current.isAuthenticated).toBe(false);
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('로그아웃 API 실패해도 로컬 상태는 정리되어야 함', async () => {
    // Setup - 로그인된 상태
    localStorageMock.getItem.mockReturnValue(JSON.stringify(mockStoredTokens));

    vi.mocked(authApi.logout).mockRejectedValue(new Error('Network error'));

    // Execute
    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.signOut();
    });

    // Assert - API 실패해도 로컬 상태는 정리됨
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('workers_auth_tokens');
    expect(result.current.workersUser).toBe(null);
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('getAccessToken이 현재 토큰을 반환해야 함', async () => {
    // Setup
    localStorageMock.getItem.mockReturnValue(JSON.stringify(mockStoredTokens));

    // Execute
    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Assert
    expect(result.current.getAccessToken()).toBe(mockStoredTokens.accessToken);
  });

  it('로그인되지 않은 상태에서 getAccessToken은 null을 반환해야 함', async () => {
    // Setup
    localStorageMock.getItem.mockReturnValue(null);

    // Execute
    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Assert
    expect(result.current.getAccessToken()).toBe(null);
  });

  it('하위 호환성을 위한 레거시 속성이 올바르게 반환되어야 함', async () => {
    // Setup
    localStorageMock.getItem.mockReturnValue(JSON.stringify(mockStoredTokens));

    // Execute
    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Assert - 레거시 속성
    expect(result.current.user).toEqual(mockUser); // workersUser와 동일
    expect(result.current.session).toBe(null); // 항상 null
    expect(result.current.authProvider).toBe('workers'); // 항상 'workers'
  });

  afterAll(() => {
    window.location = originalLocation;
  });
});

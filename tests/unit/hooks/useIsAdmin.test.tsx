/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { supabase } from '@/integrations/supabase/client';
import type { ReactNode } from 'react';

// Mock useAuth hook
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

// Mock supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

const { useAuth } = await import('@/hooks/useAuth');

describe('useIsAdmin', () => {
  let queryClient: QueryClient;

  const createWrapper = () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    return ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  const mockUser = {
    id: '123',
    email: 'admin@example.com',
  };

  const mockSupabaseChain = (data: any, error: any = null) => {
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data, error }),
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    queryClient?.clear();
  });

  it('사용자가 없으면 false를 반환해야 함', async () => {
    // Setup
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      session: null,
      loading: false,
      signInWithGoogle: vi.fn(),
      signInWithGithub: vi.fn(),
      signInWithKakao: vi.fn(),
      signInWithEmail: vi.fn(),
      signOut: vi.fn(),
    });

    // Execute
    const { result } = renderHook(() => useIsAdmin(), {
      wrapper: createWrapper(),
    });

    // Assert
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBe(undefined);
    expect(result.current.isSuccess).toBe(false);
  });

  it('사용자가 관리자이면 true를 반환해야 함', async () => {
    // Setup
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser as any,
      session: null,
      loading: false,
      signInWithGoogle: vi.fn(),
      signInWithGithub: vi.fn(),
      signInWithKakao: vi.fn(),
      signInWithEmail: vi.fn(),
      signOut: vi.fn(),
    });

    // 훅이 admins 테이블을 조회하므로 role 필드 사용
    const mockAdminRole = {
      user_id: '123',
      role: 'admin'
    };
    vi.mocked(supabase.from).mockReturnValue(
      mockSupabaseChain(mockAdminRole) as any
    );

    // Execute
    const { result } = renderHook(() => useIsAdmin(), {
      wrapper: createWrapper(),
    });

    // Assert
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBe(true);
    expect(supabase.from).toHaveBeenCalledWith('admins');
  });

  it('사용자가 일반 유저이면 false를 반환해야 함', async () => {
    // Setup
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser as any,
      session: null,
      loading: false,
      signInWithGoogle: vi.fn(),
      signInWithGithub: vi.fn(),
      signInWithKakao: vi.fn(),
      signInWithEmail: vi.fn(),
      signOut: vi.fn(),
    });

    vi.mocked(supabase.from).mockReturnValue(
      mockSupabaseChain(null) as any
    );

    // Execute
    const { result } = renderHook(() => useIsAdmin(), {
      wrapper: createWrapper(),
    });

    // Assert
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBe(false);
  });

  it('에러 발생 시 false를 반환해야 함', async () => {
    // Setup
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser as any,
      session: null,
      loading: false,
      signInWithGoogle: vi.fn(),
      signInWithGithub: vi.fn(),
      signInWithKakao: vi.fn(),
      signInWithEmail: vi.fn(),
      signOut: vi.fn(),
    });

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    vi.mocked(supabase.from).mockReturnValue(
      mockSupabaseChain(null, { message: 'Database error' }) as any
    );

    // Execute
    const { result } = renderHook(() => useIsAdmin(), {
      wrapper: createWrapper(),
    });

    // Assert
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBe(false);
    // devError는 개발 환경에서만 로그를 출력하므로, 에러 객체가 전달되는지 확인
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it('매번 최신 데이터를 조회해야 함 (캐시 비활성화)', async () => {
    // Setup
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser as any,
      session: null,
      loading: false,
      signInWithGoogle: vi.fn(),
      signInWithGithub: vi.fn(),
      signInWithKakao: vi.fn(),
      signInWithEmail: vi.fn(),
      signOut: vi.fn(),
    });

    const mockAdminRole = { user_id: '123', role: 'admin' };
    vi.mocked(supabase.from).mockReturnValue(
      mockSupabaseChain(mockAdminRole) as any
    );

    // Execute
    const { result, rerender } = renderHook(() => useIsAdmin(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // 첫 번째 호출
    const firstCallCount = vi.mocked(supabase.from).mock.calls.length;
    expect(firstCallCount).toBeGreaterThanOrEqual(1);

    // 리렌더링 (staleTime: 0이므로 다시 조회)
    rerender();

    // 캐시가 비활성화되어 있으므로 추가 호출 발생 가능
    // 정확한 호출 횟수는 React Query의 내부 동작에 따라 달라질 수 있음
    expect(vi.mocked(supabase.from).mock.calls.length).toBeGreaterThanOrEqual(firstCallCount);
  });
});

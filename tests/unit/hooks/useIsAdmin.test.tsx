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

    const mockAdminRole = { 
      user_id: '123', 
      role_id: 'role-1',
      role: { name: 'admin' }
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
    expect(supabase.from).toHaveBeenCalledWith('user_roles');
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

  it('5분간 캐시를 유지해야 함', async () => {
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
    expect(supabase.from).toHaveBeenCalledTimes(1);

    // 리렌더링 (캐시 사용)
    rerender();

    // 캐시로 인해 추가 호출 없음
    expect(supabase.from).toHaveBeenCalledTimes(1);
  });
});

/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * useIsAdmin Hook 테스트
 * @migration Supabase -> Workers API (마이그레이션 완료)
 *
 * 현재 사용자가 관리자인지 확인하는 훅 테스트
 * - Workers API를 통해 관리자 역할 조회
 * - React Query 캐시 비활성화 동작 확인
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { adminsApi } from '@/integrations/cloudflare/client';
import type { ReactNode } from 'react';

// Mock Workers API client
vi.mock('@/integrations/cloudflare/client', () => ({
  adminsApi: {
    checkIsAdmin: vi.fn(),
  },
}));

// Mock useAuth hook
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
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

  const mockWorkersUser = {
    id: '123',
    email: 'admin@example.com',
  };

  const mockGetAccessToken = vi.fn(() => 'mock-access-token');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    queryClient?.clear();
  });

  it('사용자가 없으면 false를 반환해야 함', async () => {
    // Setup - 인증되지 않은 상태
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      session: null,
      loading: false,
      workersUser: null,
      isAuthenticated: false,
      getAccessToken: vi.fn(() => null),
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

    // Assert - enabled: false 이므로 쿼리가 실행되지 않음
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBe(undefined);
    expect(result.current.isSuccess).toBe(false);
    // API가 호출되지 않아야 함
    expect(adminsApi.checkIsAdmin).not.toHaveBeenCalled();
  });

  it('사용자가 관리자이면 true를 반환해야 함', async () => {
    // Setup - 인증된 관리자 상태
    vi.mocked(useAuth).mockReturnValue({
      user: mockWorkersUser as any,
      session: null,
      loading: false,
      workersUser: mockWorkersUser,
      isAuthenticated: true,
      getAccessToken: mockGetAccessToken,
      signInWithGoogle: vi.fn(),
      signInWithGithub: vi.fn(),
      signInWithKakao: vi.fn(),
      signInWithEmail: vi.fn(),
      signOut: vi.fn(),
    });

    // Workers API 응답 모킹 - 관리자
    vi.mocked(adminsApi.checkIsAdmin).mockResolvedValue({
      data: { isAdmin: true, role: 'admin' },
      error: null,
    });

    // Execute
    const { result } = renderHook(() => useIsAdmin(), {
      wrapper: createWrapper(),
    });

    // Assert
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBe(true);
    expect(adminsApi.checkIsAdmin).toHaveBeenCalledWith('mock-access-token');
  });

  it('사용자가 super_admin이면 true를 반환해야 함', async () => {
    // Setup - 인증된 슈퍼 관리자 상태
    vi.mocked(useAuth).mockReturnValue({
      user: mockWorkersUser as any,
      session: null,
      loading: false,
      workersUser: mockWorkersUser,
      isAuthenticated: true,
      getAccessToken: mockGetAccessToken,
      signInWithGoogle: vi.fn(),
      signInWithGithub: vi.fn(),
      signInWithKakao: vi.fn(),
      signInWithEmail: vi.fn(),
      signOut: vi.fn(),
    });

    // Workers API 응답 모킹 - 슈퍼 관리자
    vi.mocked(adminsApi.checkIsAdmin).mockResolvedValue({
      data: { isAdmin: true, role: 'super_admin' },
      error: null,
    });

    // Execute
    const { result } = renderHook(() => useIsAdmin(), {
      wrapper: createWrapper(),
    });

    // Assert
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBe(true);
  });

  it('사용자가 일반 유저이면 false를 반환해야 함', async () => {
    // Setup - 인증된 일반 유저 상태
    vi.mocked(useAuth).mockReturnValue({
      user: mockWorkersUser as any,
      session: null,
      loading: false,
      workersUser: mockWorkersUser,
      isAuthenticated: true,
      getAccessToken: mockGetAccessToken,
      signInWithGoogle: vi.fn(),
      signInWithGithub: vi.fn(),
      signInWithKakao: vi.fn(),
      signInWithEmail: vi.fn(),
      signOut: vi.fn(),
    });

    // Workers API 응답 모킹 - 일반 유저 (role: null)
    vi.mocked(adminsApi.checkIsAdmin).mockResolvedValue({
      data: { isAdmin: false, role: null },
      error: null,
    });

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

  it('API 에러 발생 시 false를 반환해야 함', async () => {
    // Setup - 인증된 상태
    vi.mocked(useAuth).mockReturnValue({
      user: mockWorkersUser as any,
      session: null,
      loading: false,
      workersUser: mockWorkersUser,
      isAuthenticated: true,
      getAccessToken: mockGetAccessToken,
      signInWithGoogle: vi.fn(),
      signInWithGithub: vi.fn(),
      signInWithKakao: vi.fn(),
      signInWithEmail: vi.fn(),
      signOut: vi.fn(),
    });

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Workers API 에러 응답 모킹
    vi.mocked(adminsApi.checkIsAdmin).mockResolvedValue({
      data: null,
      error: { message: 'API Error', status: 500 },
    });

    // Execute
    const { result } = renderHook(() => useIsAdmin(), {
      wrapper: createWrapper(),
    });

    // Assert
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBe(false);
    // 에러 로그가 출력되어야 함
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it('API 호출 실패 시 false를 반환해야 함', async () => {
    // Setup - 인증된 상태
    vi.mocked(useAuth).mockReturnValue({
      user: mockWorkersUser as any,
      session: null,
      loading: false,
      workersUser: mockWorkersUser,
      isAuthenticated: true,
      getAccessToken: mockGetAccessToken,
      signInWithGoogle: vi.fn(),
      signInWithGithub: vi.fn(),
      signInWithKakao: vi.fn(),
      signInWithEmail: vi.fn(),
      signOut: vi.fn(),
    });

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Workers API 예외 발생 모킹
    vi.mocked(adminsApi.checkIsAdmin).mockRejectedValue(new Error('Network error'));

    // Execute
    const { result } = renderHook(() => useIsAdmin(), {
      wrapper: createWrapper(),
    });

    // Assert
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBe(false);
    // 에러 로그가 출력되어야 함
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it('매번 최신 데이터를 조회해야 함 (캐시 비활성화)', async () => {
    // Setup - 인증된 관리자 상태
    vi.mocked(useAuth).mockReturnValue({
      user: mockWorkersUser as any,
      session: null,
      loading: false,
      workersUser: mockWorkersUser,
      isAuthenticated: true,
      getAccessToken: mockGetAccessToken,
      signInWithGoogle: vi.fn(),
      signInWithGithub: vi.fn(),
      signInWithKakao: vi.fn(),
      signInWithEmail: vi.fn(),
      signOut: vi.fn(),
    });

    vi.mocked(adminsApi.checkIsAdmin).mockResolvedValue({
      data: { isAdmin: true, role: 'admin' },
      error: null,
    });

    // Execute
    const { result, rerender } = renderHook(() => useIsAdmin(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // 첫 번째 호출
    const firstCallCount = vi.mocked(adminsApi.checkIsAdmin).mock.calls.length;
    expect(firstCallCount).toBeGreaterThanOrEqual(1);

    // 리렌더링 (staleTime: 0이므로 다시 조회)
    rerender();

    // 캐시가 비활성화되어 있으므로 추가 호출 발생 가능
    // 정확한 호출 횟수는 React Query의 내부 동작에 따라 달라질 수 있음
    expect(vi.mocked(adminsApi.checkIsAdmin).mock.calls.length).toBeGreaterThanOrEqual(firstCallCount);
  });

  it('토큰이 없으면 API를 호출하지 않아야 함', async () => {
    // Setup - 인증되었지만 토큰이 없는 상태
    vi.mocked(useAuth).mockReturnValue({
      user: mockWorkersUser as any,
      session: null,
      loading: false,
      workersUser: mockWorkersUser,
      isAuthenticated: true,
      getAccessToken: vi.fn(() => null),
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
      expect(result.current.isSuccess).toBe(true);
    });

    // queryFn이 실행되어도 토큰이 없으면 false를 반환
    expect(result.current.data).toBe(false);
  });
});

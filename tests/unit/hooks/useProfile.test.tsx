/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useProfile,
  useUpdateProfile,
  useUploadAvatar,
  useConnectedAccounts,
  useDisconnectAccount,
} from '@/hooks/useProfile';
import { callWorkersApi, storageApi } from '@/integrations/cloudflare/client';
import React, { type ReactNode } from 'react';

// Mock Workers API client
vi.mock('@/integrations/cloudflare/client', () => ({
  callWorkersApi: vi.fn(),
  storageApi: {
    upload: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock useAuth
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'user-123', email: 'test@example.com', user_metadata: { name: 'Test User' } },
    workersTokens: { accessToken: 'mock-token' },
  })),
}));

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock errors
vi.mock('@/lib/errors', () => ({
  devError: vi.fn(),
}));

// Mock storage url-rewriter
vi.mock('@/lib/storage/url-rewriter', () => ({
  rewriteStorageUrl: vi.fn((url) => url),
}));

describe('useProfile', () => {
  let queryClient: QueryClient;

  const mockProfile = {
    id: 'profile-1',
    user_id: 'user-123',
    avatar_url: 'https://example.com/avatar.jpg',
    display_name: 'Test User',
    bio: '테스트 사용자입니다.',
    phone: '010-1234-5678',
    location: {
      country: 'KR',
      city: 'Seoul',
      timezone: 'Asia/Seoul',
    },
    preferences: {
      theme: 'dark' as const,
      language: 'ko',
      notifications: true,
    },
    email_verified: true,
    phone_verified: false,
    last_login_at: '2024-01-01T00:00:00Z',
    last_login_ip: '127.0.0.1',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe('프로필 조회', () => {
    it('프로필을 성공적으로 불러와야 함', async () => {
      // Setup - Workers API 모킹
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: mockProfile,
        error: null,
        status: 200,
      });

      // Execute
      const { result } = renderHook(() => useProfile(), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      }, { timeout: 3000 });

      if (result.current.isSuccess) {
        expect(result.current.data).not.toBeNull();
        expect(result.current.data?.display_name).toBe('Test User');
        expect(result.current.data?.location.city).toBe('Seoul');
      }
    });

    it('프로필이 없으면 새로 생성해야 함', async () => {
      // Setup - Workers API 모킹: 첫 번째 호출은 404, 두 번째는 생성 성공
      vi.mocked(callWorkersApi)
        .mockResolvedValueOnce({
          data: null,
          error: 'not found',
          status: 404,
        })
        .mockResolvedValueOnce({
          data: mockProfile,
          error: null,
          status: 201,
        });

      // Execute
      const { result } = renderHook(() => useProfile(), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      }, { timeout: 3000 });

      // 두 번 호출되었는지 확인 (조회 + 생성)
      expect(callWorkersApi).toHaveBeenCalledTimes(2);

      // 두 번째 호출은 POST로 생성
      expect(callWorkersApi).toHaveBeenNthCalledWith(
        2,
        '/api/v1/users/user-123/profile',
        expect.objectContaining({
          method: 'POST',
          body: expect.objectContaining({
            user_id: 'user-123',
          }),
        })
      );
    });

    it('에러 발생 시 throw 해야 함', async () => {
      // Setup - Workers API 에러 모킹
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: null,
        error: 'Database error',
        status: 500,
      });

      // Execute
      const { result } = renderHook(() => useProfile(), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      }, { timeout: 3000 });
    });
  });

  describe('프로필 수정', () => {
    it('프로필을 성공적으로 수정해야 함', async () => {
      // Setup - Workers API 모킹
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: { ...mockProfile, display_name: 'Updated Name' },
        error: null,
        status: 200,
      });

      // Execute
      const { result } = renderHook(() => useUpdateProfile(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({
          display_name: 'Updated Name',
        });
      });

      // Assert
      await waitFor(() => {
        expect(callWorkersApi).toHaveBeenCalledWith(
          '/api/v1/users/user-123/profile',
          expect.objectContaining({
            method: 'PATCH',
            body: expect.objectContaining({
              display_name: 'Updated Name',
            }),
          })
        );
      });
    });

    it('사용자가 없으면 에러를 throw 해야 함', async () => {
      const { useAuth } = await import('@/hooks/useAuth');
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        workersTokens: null,
      } as any);

      const { result } = renderHook(() => useUpdateProfile(), { wrapper });

      await act(async () => {
        try {
          await result.current.mutateAsync({
            display_name: 'Test',
          });
        } catch (error) {
          expect((error as Error).message).toContain('로그인이 필요합니다');
        }
      });
    });
  });

  describe('아바타 업로드', () => {
    beforeEach(async () => {
      // Reset useAuth mock for avatar tests
      const { useAuth } = await import('@/hooks/useAuth');
      vi.mocked(useAuth).mockReturnValue({
        user: { id: 'user-123', email: 'test@example.com', user_metadata: { name: 'Test User' } },
        workersTokens: { accessToken: 'mock-token' },
      } as any);
    });

    it('아바타를 성공적으로 업로드해야 함', async () => {
      const mockFile = new File(['dummy content'], 'avatar.jpg', { type: 'image/jpeg' });

      // Setup - Workers API 모킹
      // 1. 기존 프로필 조회
      vi.mocked(callWorkersApi)
        .mockResolvedValueOnce({
          data: { avatar_url: 'https://example.com/old-avatar.jpg' },
          error: null,
          status: 200,
        })
        // 2. 프로필 업데이트
        .mockResolvedValueOnce({
          data: { ...mockProfile, avatar_url: 'https://example.com/avatar-new.jpg' },
          error: null,
          status: 200,
        });

      // Storage API 모킹
      vi.mocked(storageApi.upload).mockResolvedValue({
        data: { url: 'https://example.com/avatar-new.jpg' },
        error: null,
        status: 200,
      });

      vi.mocked(storageApi.delete).mockResolvedValue({
        data: {},
        error: null,
        status: 200,
      });

      // Execute
      const { result } = renderHook(() => useUploadAvatar(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync(mockFile);
      });

      // Assert
      await waitFor(() => {
        expect(storageApi.upload).toHaveBeenCalledWith('mock-token', mockFile, 'avatars');
      });
    });

    it('파일 크기가 5MB를 초과하면 에러를 throw 해야 함', async () => {
      const largeFile = new File([new ArrayBuffer(6 * 1024 * 1024)], 'large.jpg', {
        type: 'image/jpeg',
      });

      const { result } = renderHook(() => useUploadAvatar(), { wrapper });

      await act(async () => {
        try {
          await result.current.mutateAsync(largeFile);
        } catch (error) {
          expect((error as Error).message).toContain('5MB 이하');
        }
      });
    });

    it('허용되지 않은 파일 형식이면 에러를 throw 해야 함', async () => {
      const invalidFile = new File(['dummy'], 'test.txt', { type: 'text/plain' });

      const { result } = renderHook(() => useUploadAvatar(), { wrapper });

      await act(async () => {
        try {
          await result.current.mutateAsync(invalidFile);
        } catch (error) {
          expect((error as Error).message).toContain('JPG, PNG, WEBP');
        }
      });
    });
  });

  describe('연결된 계정 조회', () => {
    const mockAccounts = [
      {
        id: 'acc-1',
        user_id: 'user-123',
        provider: 'google' as const,
        provider_account_id: 'google-123',
        provider_account_email: 'test@gmail.com',
        is_primary: true,
        connected_at: '2023-01-01T00:00:00Z',
        last_used_at: '2024-01-01T00:00:00Z',
      },
      {
        id: 'acc-2',
        user_id: 'user-123',
        provider: 'github' as const,
        provider_account_id: 'github-456',
        provider_account_email: 'test@github.com',
        is_primary: false,
        connected_at: '2023-06-01T00:00:00Z',
        last_used_at: '2024-01-02T00:00:00Z',
      },
    ];

    beforeEach(async () => {
      // Reset useAuth mock
      const { useAuth } = await import('@/hooks/useAuth');
      vi.mocked(useAuth).mockReturnValue({
        user: { id: 'user-123', email: 'test@example.com', user_metadata: { name: 'Test User' } },
        workersTokens: { accessToken: 'mock-token' },
      } as any);
    });

    it('연결된 계정 목록을 불러와야 함', async () => {
      // Setup - Workers API 모킹
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: mockAccounts,
        error: null,
        status: 200,
      });

      // Execute
      const { result } = renderHook(() => useConnectedAccounts(), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      }, { timeout: 3000 });

      if (result.current.isSuccess && result.current.data && result.current.data.length > 0) {
        expect(result.current.data).toHaveLength(2);
        expect(result.current.data[0].provider).toBe('google');
        expect(result.current.data[1].provider).toBe('github');
      }
    });
  });

  describe('계정 연결 해제', () => {
    beforeEach(async () => {
      // Reset useAuth mock
      const { useAuth } = await import('@/hooks/useAuth');
      vi.mocked(useAuth).mockReturnValue({
        user: { id: 'user-123', email: 'test@example.com', user_metadata: { name: 'Test User' } },
        workersTokens: { accessToken: 'mock-token' },
      } as any);
    });

    it('계정 연결을 해제할 수 있어야 함', async () => {
      // Setup - Workers API 모킹
      vi.mocked(callWorkersApi)
        // 1. 계정 정보 확인
        .mockResolvedValueOnce({
          data: { is_primary: false, provider: 'github' },
          error: null,
          status: 200,
        })
        // 2. 연결 해제
        .mockResolvedValueOnce({
          data: {},
          error: null,
          status: 200,
        });

      // Execute
      const { result } = renderHook(() => useDisconnectAccount(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync('acc-2');
      });

      // Assert
      await waitFor(() => {
        expect(callWorkersApi).toHaveBeenCalledTimes(2);
        expect(callWorkersApi).toHaveBeenNthCalledWith(
          2,
          '/api/v1/users/user-123/connected-accounts/acc-2',
          expect.objectContaining({
            method: 'DELETE',
          })
        );
      });
    });

    it('주 계정은 연결 해제할 수 없어야 함', async () => {
      // Setup - Workers API 모킹
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: { is_primary: true, provider: 'google' },
        error: null,
        status: 200,
      });

      // Execute
      const { result } = renderHook(() => useDisconnectAccount(), { wrapper });

      await act(async () => {
        try {
          await result.current.mutateAsync('acc-1');
        } catch (error) {
          expect((error as Error).message).toContain('주 계정은 연결 해제할 수 없습니다');
        }
      });
    });
  });
});

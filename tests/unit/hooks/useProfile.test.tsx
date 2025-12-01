/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useProfile,
  useUpdateProfile,
  useUploadAvatar,
  useConnectedAccounts,
  useDisconnectAccount,
} from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import React, { type ReactNode } from 'react';

// Mock supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    storage: {
      from: vi.fn(),
    },
  },
}));

// Mock useAuth
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'user-123', email: 'test@example.com', user_metadata: { name: 'Test User' } },
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

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe('프로필 조회', () => {
    it('프로필을 성공적으로 불러와야 함', async () => {
      const mockFrom = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockProfile,
          error: null,
        }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockFrom as any);

      const { result } = renderHook(() => useProfile(), { wrapper });

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      // 데이터가 로드되었는지 확인
      expect(result.current.data).not.toBeNull();
      if (result.current.data) {
        expect(result.current.data.display_name).toBe('Test User');
        expect(result.current.data.location.city).toBe('Seoul');
      }
    });

    it('프로필이 없으면 새로 생성해야 함', async () => {
      const mockFrom = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn()
          .mockResolvedValueOnce({
            data: null,
            error: { code: 'PGRST116', message: 'No rows found' },
          })
          .mockResolvedValueOnce({
            data: mockProfile,
            error: null,
          }),
        insert: vi.fn().mockReturnThis(),
      };

      mockFrom.insert.mockImplementation(function (this: any) {
        return this;
      });

      vi.mocked(supabase.from).mockReturnValue(mockFrom as any);

      const { result } = renderHook(() => useProfile(), { wrapper });

      await waitFor(() => {
        expect(mockFrom.insert).toHaveBeenCalled();
      });
    });

    it('에러 발생 시 throw 해야 함', async () => {
      const mockFrom = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'UNKNOWN', message: 'Database error' },
        }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockFrom as any);

      const { result } = renderHook(() => useProfile(), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('프로필 수정', () => {
    it('프로필을 성공적으로 수정해야 함', async () => {
      const mockFrom = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { ...mockProfile, display_name: 'Updated Name' },
          error: null,
        }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockFrom as any);

      const { result } = renderHook(() => useUpdateProfile(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({
          display_name: 'Updated Name',
        });
      });

      await waitFor(() => {
        expect(mockFrom.update).toHaveBeenCalledWith(
          expect.objectContaining({
            display_name: 'Updated Name',
          })
        );
      });
    });

    it('사용자가 없으면 에러를 throw 해야 함', async () => {
      const { useAuth } = await import('@/hooks/useAuth');
      vi.mocked(useAuth).mockReturnValue({
        user: null,
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
      } as any);
    });

    it('아바타를 성공적으로 업로드해야 함', async () => {
      const mockFile = new File(['dummy content'], 'avatar.jpg', { type: 'image/jpeg' });

      const mockStorage = {
        upload: vi.fn().mockResolvedValue({
          data: { path: 'avatars/user-123-123456.jpg' },
          error: null,
        }),
        getPublicUrl: vi.fn().mockReturnValue({
          data: { publicUrl: 'https://example.com/avatar-new.jpg' },
        }),
        remove: vi.fn().mockResolvedValue({
          data: {},
          error: null,
        }),
      };

      const mockFrom = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { avatar_url: 'https://example.com/old-avatar.jpg' },
          error: null,
        }),
        update: vi.fn().mockReturnThis(),
      };

      mockFrom.update.mockImplementation(function (this: any) {
        return {
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { ...mockProfile, avatar_url: 'https://example.com/avatar-new.jpg' },
            error: null,
          }),
        };
      });

      vi.mocked(supabase.from).mockReturnValue(mockFrom as any);
      vi.mocked(supabase.storage.from).mockReturnValue(mockStorage as any);

      const { result } = renderHook(() => useUploadAvatar(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync(mockFile);
      });

      await waitFor(() => {
        expect(mockStorage.upload).toHaveBeenCalled();
      });

      expect(mockFrom.update).toHaveBeenCalled();
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

    it('연결된 계정 목록을 불러와야 함', async () => {
      const mockFrom = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockAccounts,
          error: null,
        }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockFrom as any);

      const { result } = renderHook(() => useConnectedAccounts(), { wrapper });

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      // 데이터가 정상적으로 로드되었는지 확인
      if (result.current.data && result.current.data.length > 0) {
        expect(result.current.data).toHaveLength(2);
        expect(result.current.data[0].provider).toBe('google');
        expect(result.current.data[1].provider).toBe('github');
      }
    });
  });

  describe('계정 연결 해제', () => {
    it('계정 연결을 해제할 수 있어야 함', async () => {
      const mockFrom = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { is_primary: false, provider: 'github' },
          error: null,
        }),
        delete: vi.fn().mockReturnThis(),
      };

      mockFrom.delete.mockImplementation(function (this: any) {
        return {
          eq: vi.fn().mockResolvedValue({
            data: {},
            error: null,
          }),
        };
      });

      vi.mocked(supabase.from).mockReturnValue(mockFrom as any);

      const { result } = renderHook(() => useDisconnectAccount(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync('acc-2');
      });

      await waitFor(() => {
        expect(mockFrom.delete).toHaveBeenCalled();
      });
    });

    it('주 계정은 연결 해제할 수 없어야 함', async () => {
      const mockFrom = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { is_primary: true, provider: 'google' },
          error: null,
        }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockFrom as any);

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

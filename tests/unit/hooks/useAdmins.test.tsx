/**
 * useAdmins Hook 테스트
 *
 * 관리자 관리 훅 테스트 (Workers API 모킹)
 * - 관리자 목록 조회
 * - 단일 관리자 조회
 * - 역할별 관리자 조회
 * - 관리자 권한 확인
 * - 관리자 생성/수정/삭제
 * - 에러 처리
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useAdmins,
  useAdmin,
  useAdminsByRole,
  useCurrentAdminRole,
  useCreateAdmin,
  useUpdateAdmin,
  useDeleteAdmin,
  adminKeys,
} from '@/hooks/auth/useAdmins';
import { adminsApi } from '@/integrations/cloudflare/client';
import React from 'react';

// Mock Cloudflare Workers API
vi.mock('@/integrations/cloudflare/client', () => ({
  adminsApi: {
    list: vi.fn(),
    listByRole: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    checkIsAdmin: vi.fn(),
  },
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

// Mock 데이터
const mockAdminsWithEmail = [
  {
    id: '1',
    user_id: 'user-1',
    email: 'admin@example.com',
    role: 'super_admin',
    created_at: '2025-12-01T10:00:00Z',
  },
  {
    id: '2',
    user_id: 'user-2',
    email: 'editor@example.com',
    role: 'content_admin',
    created_at: '2025-12-01T11:00:00Z',
  },
];

describe('useAdmins', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Workers API 기본 응답 설정
    vi.mocked(adminsApi.list).mockResolvedValue({
      data: { admins: mockAdminsWithEmail },
      error: null,
      status: 200,
    });

    vi.mocked(adminsApi.listByRole).mockResolvedValue({
      data: { admins: [mockAdminsWithEmail[0]] },
      error: null,
      status: 200,
    });

    vi.mocked(adminsApi.checkIsAdmin).mockResolvedValue({
      data: { isAdmin: true, role: 'super_admin' },
      error: null,
      status: 200,
    });

    vi.mocked(adminsApi.create).mockResolvedValue({
      data: mockAdminsWithEmail[0],
      error: null,
      status: 201,
    });

    vi.mocked(adminsApi.update).mockResolvedValue({
      data: { success: true },
      error: null,
      status: 200,
    });

    vi.mocked(adminsApi.delete).mockResolvedValue({
      data: { success: true },
      error: null,
      status: 200,
    });
  });

  describe('초기 상태 확인', () => {
    it('초기 로딩 상태여야 함', () => {
      const { result } = renderHook(() => useAdmins(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
    });

    it('올바른 query key를 사용해야 함', () => {
      expect(Array.isArray(adminKeys.all)).toBe(true);
      expect(adminKeys.all[0]).toBe('admins');
      expect(adminKeys.lists()).toEqual(['admins', 'list']);
      expect(adminKeys.detail('user-1')).toEqual(['admins', 'detail', 'user-1']);
    });
  });

  describe('관리자 목록 조회', () => {
    it('모든 관리자를 조회해야 함', async () => {
      const { result } = renderHook(() => useAdmins(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(adminsApi.list).toHaveBeenCalledWith('test-token');
      expect(result.current.data).toEqual(mockAdminsWithEmail);
    });

    it('각 관리자의 이메일이 포함되어야 함', async () => {
      const { result } = renderHook(() => useAdmins(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.[0].email).toBe('admin@example.com');
      expect(result.current.data?.[1].email).toBe('editor@example.com');
    });
  });

  describe('단일 관리자 조회', () => {
    it('특정 관리자를 조회해야 함', async () => {
      const { result } = renderHook(() => useAdmin('user-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(adminsApi.list).toHaveBeenCalledWith('test-token');
      expect(result.current.data?.user_id).toBe('user-1');
    });

    it('userId가 없으면 쿼리를 비활성화해야 함', () => {
      const { result } = renderHook(() => useAdmin(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe('idle');
    });
  });

  describe('역할별 관리자 조회', () => {
    it('특정 역할의 관리자만 조회해야 함', async () => {
      const { result } = renderHook(() => useAdminsByRole('super_admin'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(adminsApi.listByRole).toHaveBeenCalledWith('test-token', 'super_admin');
      expect(result.current.data?.[0].role).toBe('super_admin');
    });

    it('역할이 없으면 쿼리를 비활성화해야 함', () => {
      const { result } = renderHook(() => useAdminsByRole('' as 'super_admin'), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe('idle');
    });
  });

  describe('현재 사용자 관리자 역할 조회', () => {
    it('현재 사용자의 역할을 조회해야 함', async () => {
      const { result } = renderHook(() => useCurrentAdminRole(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(adminsApi.checkIsAdmin).toHaveBeenCalledWith('test-token');
      expect(result.current.data).toBe('super_admin');
    });
  });

  describe('관리자 생성', () => {
    it('새 관리자를 생성해야 함', async () => {
      const { result } = renderHook(() => useCreateAdmin(), {
        wrapper: createWrapper(),
      });

      await result.current.mutateAsync({
        user_id: 'user-1',
        role: 'super_admin',
      });

      expect(adminsApi.create).toHaveBeenCalledWith('test-token', {
        user_id: 'user-1',
        role: 'super_admin',
      });
    });

    it('에러 발생 시 처리해야 함', async () => {
      vi.mocked(adminsApi.create).mockResolvedValueOnce({
        data: null,
        error: '권한이 없습니다',
        status: 403,
      });

      const { result } = renderHook(() => useCreateAdmin(), {
        wrapper: createWrapper(),
      });

      await expect(
        result.current.mutateAsync({
          user_id: 'user-1',
          role: 'super_admin',
        })
      ).rejects.toThrow('권한이 없습니다');
    });
  });

  describe('관리자 수정', () => {
    it('관리자 역할을 수정해야 함', async () => {
      const { result } = renderHook(() => useUpdateAdmin(), {
        wrapper: createWrapper(),
      });

      await result.current.mutateAsync({
        id: '1',
        role: 'content_admin',
      });

      expect(adminsApi.update).toHaveBeenCalledWith('test-token', '1', {
        role: 'content_admin',
      });
    });
  });

  describe('관리자 삭제', () => {
    it('관리자를 삭제해야 함', async () => {
      const { result } = renderHook(() => useDeleteAdmin(), {
        wrapper: createWrapper(),
      });

      await result.current.mutateAsync('1');

      expect(adminsApi.delete).toHaveBeenCalledWith('test-token', '1');
    });
  });
});

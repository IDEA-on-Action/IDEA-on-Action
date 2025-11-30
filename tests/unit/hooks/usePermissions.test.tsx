/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * usePermissions Hook 테스트
 *
 * RBAC 권한 확인 및 역할 관리 훅 테스트
 * - 권한 확인
 * - 사용자 역할 조회
 * - 역할 할당/제거
 * - 조직 멤버 관리
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  usePermissions,
  useUserRole,
  useRoles,
  useAssignRole,
  useRemoveRole,
  useOrganizationMembers,
  useHasPermission,
  useIsRole,
  useIsAdminOrOwner,
} from '@/hooks/usePermissions';
import { supabase } from '@/integrations/supabase/client';
import type { CheckPermissionResponse, UserRole } from '@/hooks/usePermissions';
import React from 'react';

// Mock dependencies
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

vi.mock('@/hooks/useAuth', () => ({
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

describe('usePermissions', () => {
  const organizationId = 'org-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('권한 확인', () => {
    it('사용자가 권한을 가지고 있으면 allowed가 true여야 함', async () => {
      // Setup
      vi.mocked(supabase.rpc)
        .mockResolvedValueOnce({
          data: true,
          error: null,
        } as any)
        .mockResolvedValueOnce({
          data: 'admin',
          error: null,
        } as any);

      // Execute
      const { result } = renderHook(() => usePermissions('content', 'create', organizationId), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const response = result.current.data as CheckPermissionResponse;
      expect(response.allowed).toBe(true);
      expect(response.role).toBe('admin');
      expect(response.resource).toBe('content');
      expect(response.action).toBe('create');
    });

    it('사용자가 권한이 없으면 allowed가 false여야 함', async () => {
      // Setup
      vi.mocked(supabase.rpc)
        .mockResolvedValueOnce({
          data: false,
          error: null,
        } as any)
        .mockResolvedValueOnce({
          data: 'viewer',
          error: null,
        } as any);

      // Execute
      const { result } = renderHook(() => usePermissions('content', 'delete', organizationId), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const response = result.current.data as CheckPermissionResponse;
      expect(response.allowed).toBe(false);
      expect(response.role).toBe('viewer');
    });

    it('organizationId가 없으면 쿼리를 비활성화해야 함', () => {
      // Execute
      const { result } = renderHook(() => usePermissions('content', 'read'), {
        wrapper: createWrapper(),
      });

      // Assert
      expect(result.current.fetchStatus).toBe('idle');
    });

    it('사용자가 인증되지 않았으면 null을 반환해야 함', async () => {
      // Setup
      vi.resetModules();
      vi.doMock('@/hooks/useAuth', () => ({
        useAuth: vi.fn(() => ({
          user: null,
        })),
      }));

      // Execute
      const { result } = renderHook(() => usePermissions('content', 'read', organizationId), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(() => {
        expect(result.current.data).toBeNull();
      });
    });

    it('권한 확인 RPC 호출 실패 시 에러를 처리해야 함', async () => {
      // Setup
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: { message: 'RPC error' },
      } as any);

      // Execute
      const { result } = renderHook(() => usePermissions('content', 'read', organizationId), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('useUserRole', () => {
    it('사용자의 역할을 성공적으로 조회해야 함', async () => {
      // Setup
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: 'admin',
        error: null,
      } as any);

      // Execute
      const { result } = renderHook(() => useUserRole(organizationId), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBe('admin');
    });

    it('특정 사용자의 역할을 조회할 수 있어야 함', async () => {
      // Setup
      const targetUserId = 'user-456';
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: 'member',
        error: null,
      } as any);

      // Execute
      const { result } = renderHook(() => useUserRole(organizationId, targetUserId), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBe('member');
      expect(supabase.rpc).toHaveBeenCalledWith('get_user_role', {
        p_user_id: targetUserId,
        p_organization_id: organizationId,
      });
    });

    it('organizationId가 없으면 null을 반환해야 함', async () => {
      // Execute
      const { result } = renderHook(() => useUserRole(), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(() => {
        expect(result.current.data).toBeNull();
      });
    });

    it('역할 조회 실패 시 에러를 처리해야 함', async () => {
      // Setup
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: { message: 'Role fetch error' },
      } as any);

      // Execute
      const { result } = renderHook(() => useUserRole(organizationId), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('useRoles', () => {
    it('모든 역할 정보를 성공적으로 조회해야 함', async () => {
      // Setup
      const mockRoles = [
        {
          role: 'owner',
          permissions: { content: ['read', 'create', 'update', 'delete'] },
        },
        {
          role: 'admin',
          permissions: { content: ['read', 'create', 'update'] },
        },
      ];

      const mockSelect = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: mockRoles,
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        order: mockOrder,
      } as any);

      // Execute
      const { result } = renderHook(() => useRoles(), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toHaveLength(2);
      expect(result.current.data?.[0].role).toBe('owner');
      expect(result.current.data?.[0].description).toBeTruthy();
    });

    it('역할 설명이 포함되어야 함', async () => {
      // Setup
      const mockRoles = [
        {
          role: 'admin',
          permissions: { content: ['read'] },
        },
      ];

      const mockSelect = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: mockRoles,
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        order: mockOrder,
      } as any);

      // Execute
      const { result } = renderHook(() => useRoles(), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const adminRole = result.current.data?.find((r) => r.role === 'admin');
      expect(adminRole?.description).toContain('관리');
    });
  });

  describe('useAssignRole', () => {
    it('역할을 성공적으로 할당해야 함', async () => {
      // Setup
      const mockUpsert = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          user_id: 'user-456',
          organization_id: organizationId,
          role: 'admin',
        },
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        upsert: mockUpsert,
        select: mockSelect,
        single: mockSingle,
      } as any);

      // Execute
      const { result } = renderHook(() => useAssignRole(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        userId: 'user-456',
        organizationId,
        role: 'admin',
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockUpsert).toHaveBeenCalledWith(
        {
          user_id: 'user-456',
          organization_id: organizationId,
          role: 'admin',
        },
        {
          onConflict: 'organization_id,user_id',
        }
      );
    });

    it('역할 할당 실패 시 에러를 처리해야 함', async () => {
      // Setup
      const mockUpsert = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Assign failed' },
      });

      vi.mocked(supabase.from).mockReturnValue({
        upsert: mockUpsert,
        select: mockSelect,
        single: mockSingle,
      } as any);

      // Execute
      const { result } = renderHook(() => useAssignRole(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        userId: 'user-456',
        organizationId,
        role: 'admin',
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });

    it('역할 할당 성공 시 캐시를 무효화해야 함', async () => {
      // Setup
      const mockUpsert = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: {},
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        upsert: mockUpsert,
        select: mockSelect,
        single: mockSingle,
      } as any);

      const queryClient = new QueryClient();
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      // Execute
      const { result } = renderHook(() => useAssignRole(), { wrapper });

      result.current.mutate({
        userId: 'user-456',
        organizationId,
        role: 'admin',
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalled();
    });
  });

  describe('useRemoveRole', () => {
    it('역할을 성공적으로 제거해야 함', async () => {
      // Setup
      const mockDelete = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();

      vi.mocked(supabase.from).mockReturnValue({
        delete: mockDelete,
        eq: mockEq,
      } as any);

      mockEq.mockResolvedValue({
        data: null,
        error: null,
      });

      // Execute
      const { result } = renderHook(() => useRemoveRole(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        userId: 'user-456',
        organizationId,
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockDelete).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('user_id', 'user-456');
      expect(mockEq).toHaveBeenCalledWith('organization_id', organizationId);
    });

    it('역할 제거 실패 시 에러를 처리해야 함', async () => {
      // Setup
      const mockDelete = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();

      vi.mocked(supabase.from).mockReturnValue({
        delete: mockDelete,
        eq: mockEq,
      } as any);

      mockEq.mockResolvedValue({
        data: null,
        error: { message: 'Remove failed' },
      });

      // Execute
      const { result } = renderHook(() => useRemoveRole(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        userId: 'user-456',
        organizationId,
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('useOrganizationMembers', () => {
    it('조직 멤버 목록을 성공적으로 조회해야 함', async () => {
      // Setup
      const mockMembers = [
        {
          user_id: 'user-1',
          organization_id: organizationId,
          role: 'admin',
          created_at: '2024-01-01T00:00:00Z',
        },
        {
          user_id: 'user-2',
          organization_id: organizationId,
          role: 'member',
          created_at: '2024-01-02T00:00:00Z',
        },
      ];

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: mockMembers,
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        order: mockOrder,
      } as any);

      // Execute
      const { result } = renderHook(() => useOrganizationMembers(organizationId), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockMembers);
      expect(mockEq).toHaveBeenCalledWith('organization_id', organizationId);
    });

    it('organizationId가 없으면 빈 배열을 반환해야 함', async () => {
      // Execute
      const { result } = renderHook(() => useOrganizationMembers(), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(() => {
        expect(result.current.data).toEqual([]);
      });
    });
  });

  describe('useHasPermission', () => {
    it('권한이 있으면 true를 반환해야 함', async () => {
      // Setup
      vi.mocked(supabase.rpc)
        .mockResolvedValueOnce({
          data: true,
          error: null,
        } as any)
        .mockResolvedValueOnce({
          data: 'admin',
          error: null,
        } as any);

      // Execute
      const { result } = renderHook(() => useHasPermission('content', 'create', organizationId), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(() => {
        expect(result.current).toBe(true);
      });
    });

    it('권한이 없으면 false를 반환해야 함', async () => {
      // Setup
      vi.mocked(supabase.rpc)
        .mockResolvedValueOnce({
          data: false,
          error: null,
        } as any)
        .mockResolvedValueOnce({
          data: 'viewer',
          error: null,
        } as any);

      // Execute
      const { result } = renderHook(() => useHasPermission('content', 'delete', organizationId), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(() => {
        expect(result.current).toBe(false);
      });
    });
  });

  describe('useIsRole', () => {
    it('지정한 역할이면 true를 반환해야 함', async () => {
      // Setup
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: 'admin',
        error: null,
      } as any);

      // Execute
      const { result } = renderHook(() => useIsRole('admin', organizationId), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(() => {
        expect(result.current).toBe(true);
      });
    });

    it('다른 역할이면 false를 반환해야 함', async () => {
      // Setup
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: 'member',
        error: null,
      } as any);

      // Execute
      const { result } = renderHook(() => useIsRole('admin', organizationId), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(() => {
        expect(result.current).toBe(false);
      });
    });
  });

  describe('useIsAdminOrOwner', () => {
    it('owner 역할이면 true를 반환해야 함', async () => {
      // Setup
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: 'owner',
        error: null,
      } as any);

      // Execute
      const { result } = renderHook(() => useIsAdminOrOwner(organizationId), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(() => {
        expect(result.current).toBe(true);
      });
    });

    it('admin 역할이면 true를 반환해야 함', async () => {
      // Setup
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: 'admin',
        error: null,
      } as any);

      // Execute
      const { result } = renderHook(() => useIsAdminOrOwner(organizationId), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(() => {
        expect(result.current).toBe(true);
      });
    });

    it('member 역할이면 false를 반환해야 함', async () => {
      // Setup
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: 'member',
        error: null,
      } as any);

      // Execute
      const { result } = renderHook(() => useIsAdminOrOwner(organizationId), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(() => {
        expect(result.current).toBe(false);
      });
    });

    it('viewer 역할이면 false를 반환해야 함', async () => {
      // Setup
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: 'viewer',
        error: null,
      } as any);

      // Execute
      const { result } = renderHook(() => useIsAdminOrOwner(organizationId), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(() => {
        expect(result.current).toBe(false);
      });
    });
  });
});

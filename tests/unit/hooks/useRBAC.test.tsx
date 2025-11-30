/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * useRBAC Hook 테스트
 *
 * RBAC (Role-Based Access Control) 훅 테스트
 * - 역할 조회
 * - 권한 조회
 * - 사용자 역할 할당/해제
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useRoles,
  usePermissions,
  useUserRoles,
  useUserPermissions,
  useHasPermission,
  useAssignRole,
  useRevokeRole,
} from '@/hooks/useRBAC';
import { supabase } from '@/integrations/supabase/client';
import type { Role, Permission } from '@/types/rbac';
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

describe('useRBAC', () => {
  const mockRoles: Role[] = [
    {
      id: 'role-1',
      name: 'admin',
      description: '관리자',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'role-2',
      name: 'member',
      description: '멤버',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  ];

  const mockPermissions: Permission[] = [
    {
      id: 'perm-1',
      name: 'content.read',
      resource: 'content',
      action: 'read',
      description: '콘텐츠 읽기',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'perm-2',
      name: 'content.write',
      resource: 'content',
      action: 'write',
      description: '콘텐츠 쓰기',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useRoles', () => {
    it('모든 역할을 성공적으로 조회해야 함', async () => {
      // Setup
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

      expect(result.current.data).toEqual(mockRoles);
      expect(supabase.from).toHaveBeenCalledWith('roles');
    });

    it('역할 조회 실패 시 에러를 처리해야 함', async () => {
      // Setup
      const mockSelect = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
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
        expect(result.current.isError).toBe(true);
      });
    });

    it('빈 역할 목록을 처리해야 함', async () => {
      // Setup
      const mockSelect = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: [],
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

      expect(result.current.data).toEqual([]);
    });
  });

  describe('usePermissions', () => {
    it('모든 권한을 성공적으로 조회해야 함', async () => {
      // Setup
      const mockSelect = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: mockPermissions,
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        order: mockOrder,
      } as any);

      // Execute
      const { result } = renderHook(() => usePermissions(), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockPermissions);
      expect(supabase.from).toHaveBeenCalledWith('permissions');
    });

    it('권한 조회 실패 시 에러를 처리해야 함', async () => {
      // Setup
      const mockSelect = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Permission error' },
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        order: mockOrder,
      } as any);

      // Execute
      const { result } = renderHook(() => usePermissions(), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('useUserRoles', () => {
    it('특정 사용자의 역할을 성공적으로 조회해야 함', async () => {
      // Setup
      const mockUserRoles = [
        {
          id: 'ur-1',
          user_id: 'user-123',
          role_id: 'role-1',
          assigned_by: 'admin-123',
          assigned_at: '2024-01-01T00:00:00Z',
          role: mockRoles[0],
          user: { id: 'user-123', email: 'test@example.com' },
        },
      ];

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockResolvedValue({
        data: mockUserRoles,
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
      } as any);

      // Execute
      const { result } = renderHook(() => useUserRoles('user-123'), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockUserRoles);
      expect(mockEq).toHaveBeenCalledWith('user_id', 'user-123');
    });

    it('userId가 없으면 쿼리를 비활성화해야 함', () => {
      // Execute
      const { result } = renderHook(() => useUserRoles(), {
        wrapper: createWrapper(),
      });

      // Assert
      expect(result.current.fetchStatus).toBe('idle');
    });

    it('사용자 역할이 없을 때 빈 배열을 반환해야 함', async () => {
      // Setup
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
      } as any);

      // Execute
      const { result } = renderHook(() => useUserRoles('user-123'), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([]);
    });
  });

  describe('useUserPermissions', () => {
    it('사용자의 권한을 성공적으로 조회해야 함', async () => {
      // Setup
      const mockUserPermissions = [
        {
          permission_name: 'content.read',
          resource: 'content',
          action: 'read',
        },
        {
          permission_name: 'content.write',
          resource: 'content',
          action: 'write',
        },
      ];

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: mockUserPermissions,
        error: null,
      } as any);

      // Execute
      const { result } = renderHook(() => useUserPermissions('user-123'), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockUserPermissions);
      expect(supabase.rpc).toHaveBeenCalledWith('get_user_permissions', {
        p_user_id: 'user-123',
      });
    });

    it('userId가 없으면 빈 배열을 반환해야 함', async () => {
      // Execute
      const { result } = renderHook(() => useUserPermissions(), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(() => {
        expect(result.current.data).toEqual([]);
      });
    });

    it('권한 조회 실패 시 에러를 처리해야 함', async () => {
      // Setup
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: { message: 'RPC error' },
      } as any);

      // Execute
      const { result } = renderHook(() => useUserPermissions('user-123'), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('useHasPermission', () => {
    it('사용자가 권한을 가지고 있으면 true를 반환해야 함', async () => {
      // Setup
      const mockUserPermissions = [
        { permission_name: 'content.read', resource: 'content', action: 'read' },
      ];

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: mockUserPermissions,
        error: null,
      } as any);

      // Execute
      const { result } = renderHook(() => useHasPermission('content.read'), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(() => {
        expect(result.current).toBe(true);
      });
    });

    it('사용자가 권한을 가지고 있지 않으면 false를 반환해야 함', async () => {
      // Setup
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: [],
        error: null,
      } as any);

      // Execute
      const { result } = renderHook(() => useHasPermission('content.delete'), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(() => {
        expect(result.current).toBe(false);
      });
    });
  });

  describe('useAssignRole', () => {
    it('역할을 성공적으로 할당해야 함', async () => {
      // Setup
      const mockInsert = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert,
      } as any);

      // Execute
      const { result } = renderHook(() => useAssignRole(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        userId: 'user-123',
        roleId: 'role-1',
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockInsert).toHaveBeenCalledWith({
        user_id: 'user-123',
        role_id: 'role-1',
        assigned_by: 'user-123',
      });
    });

    it('역할 할당 실패 시 에러를 처리해야 함', async () => {
      // Setup
      const mockInsert = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Insert failed' },
      });

      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert,
      } as any);

      // Execute
      const { result } = renderHook(() => useAssignRole(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        userId: 'user-123',
        roleId: 'role-1',
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });

    it('역할 할당 성공 시 캐시를 무효화해야 함', async () => {
      // Setup
      const mockInsert = vi.fn().mockResolvedValue({
        data: { id: 'ur-1' },
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert,
      } as any);

      const queryClient = new QueryClient();
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      // Execute
      const { result } = renderHook(() => useAssignRole(), { wrapper });

      result.current.mutate({
        userId: 'user-123',
        roleId: 'role-1',
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalled();
    });
  });

  describe('useRevokeRole', () => {
    it('역할을 성공적으로 해제해야 함', async () => {
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
      const { result } = renderHook(() => useRevokeRole(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        userId: 'user-123',
        roleId: 'role-1',
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockDelete).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('user_id', 'user-123');
      expect(mockEq).toHaveBeenCalledWith('role_id', 'role-1');
    });

    it('역할 해제 실패 시 에러를 처리해야 함', async () => {
      // Setup
      const mockDelete = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();

      vi.mocked(supabase.from).mockReturnValue({
        delete: mockDelete,
        eq: mockEq,
      } as any);

      mockEq.mockResolvedValue({
        data: null,
        error: { message: 'Delete failed' },
      });

      // Execute
      const { result } = renderHook(() => useRevokeRole(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        userId: 'user-123',
        roleId: 'role-1',
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });

    it('역할 해제 성공 시 캐시를 무효화해야 함', async () => {
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

      const queryClient = new QueryClient();
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      // Execute
      const { result } = renderHook(() => useRevokeRole(), { wrapper });

      result.current.mutate({
        userId: 'user-123',
        roleId: 'role-1',
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalled();
    });
  });
});

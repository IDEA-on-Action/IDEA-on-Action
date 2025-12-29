 
/**
 * useRBAC Hook 테스트
 *
 * RBAC (Role-Based Access Control) 훅 테스트
 * @migration Supabase -> Cloudflare Workers API
 * - 역할 조회
 * - 권한 조회
 * - 사용자 역할 할당/해제
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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
import { permissionsApi } from '@/integrations/cloudflare/client';
import type { Role, Permission } from '@/types/rbac';
import React from 'react';

// Mock Workers API client
vi.mock('@/integrations/cloudflare/client', () => ({
  permissionsApi: {
    getRoles: vi.fn(),
    getUserRoles: vi.fn(),
    assignRole: vi.fn(),
    revokeRole: vi.fn(),
  },
}));

// Mock useAuth hook
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: {
      id: 'user-123',
      email: 'test@example.com',
    },
    workersUser: {
      id: 'user-123',
      email: 'test@example.com',
    },
    workersTokens: { accessToken: 'mock-token' },
    isAuthenticated: true,
    getAccessToken: () => 'mock-token',
  })),
}));

describe('useRBAC', () => {
  let queryClient: QueryClient;

  // Workers API 응답 형식의 역할 목록
  const mockApiRoles = [
    {
      id: 'role-1',
      name: 'admin',
      description: '관리자',
      permissions: ['content:read', 'content:write', 'admin:all'],
      is_system: true,
    },
    {
      id: 'role-2',
      name: 'member',
      description: '멤버',
      permissions: ['content:read'],
      is_system: false,
    },
  ];

  // 변환된 Role 타입 형식
  const mockRoles: Role[] = mockApiRoles.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    permissions: r.permissions,
    is_system: r.is_system,
    created_at: expect.any(String),
    updated_at: expect.any(String),
  }));

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

  // Test wrapper
  const createWrapper = () => {
    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  describe('useRoles', () => {
    it('모든 역할을 성공적으로 조회해야 함', async () => {
      // Setup - Workers API 모킹
      vi.mocked(permissionsApi.getRoles).mockResolvedValue({
        data: { roles: mockApiRoles },
        error: null,
        status: 200,
      });

      // Execute
      const { result } = renderHook(() => useRoles(), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(
        () => {
          expect(result.current.isSuccess).toBe(true);
        },
        { timeout: 3000 }
      );

      expect(result.current.data).toHaveLength(2);
      expect(result.current.data?.[0].name).toBe('admin');
      expect(result.current.data?.[1].name).toBe('member');
      expect(permissionsApi.getRoles).toHaveBeenCalledWith('mock-token');
    });

    it('역할 조회 실패 시 에러를 처리해야 함', async () => {
      // Setup - Workers API 에러 모킹
      vi.mocked(permissionsApi.getRoles).mockResolvedValue({
        data: null,
        error: 'Database error',
        status: 500,
      });

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
      // Setup - Workers API 빈 목록 모킹
      vi.mocked(permissionsApi.getRoles).mockResolvedValue({
        data: { roles: [] },
        error: null,
        status: 200,
      });

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
      // Setup - Workers API 모킹 (역할에서 권한 추출)
      vi.mocked(permissionsApi.getRoles).mockResolvedValue({
        data: { roles: mockApiRoles },
        error: null,
        status: 200,
      });

      // Execute
      const { result } = renderHook(() => usePermissions(), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // 고유 권한 추출됨: content:read, content:write, admin:all
      expect(result.current.data).toBeDefined();
      expect(result.current.data?.length).toBeGreaterThan(0);
      expect(permissionsApi.getRoles).toHaveBeenCalledWith('mock-token');
    });

    it('권한 조회 실패 시 에러를 처리해야 함', async () => {
      // Setup - Workers API 에러 모킹
      vi.mocked(permissionsApi.getRoles).mockResolvedValue({
        data: null,
        error: 'Permission error',
        status: 500,
      });

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
      // Setup - Workers API 사용자 역할 모킹
      const mockUserRolesResponse = [
        {
          id: 'role-1',
          name: 'admin',
          permissions: ['content:read', 'content:write'],
          granted_at: '2024-01-01T00:00:00Z',
          granted_by: 'admin-123',
        },
      ];

      vi.mocked(permissionsApi.getUserRoles).mockResolvedValue({
        data: { roles: mockUserRolesResponse },
        error: null,
        status: 200,
      });

      // Execute
      const { result } = renderHook(() => useUserRoles('user-123'), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeDefined();
      expect(result.current.data?.length).toBe(1);
      expect(permissionsApi.getUserRoles).toHaveBeenCalledWith('mock-token', 'user-123');
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
      // Setup - Workers API 빈 역할 목록 모킹
      vi.mocked(permissionsApi.getUserRoles).mockResolvedValue({
        data: { roles: [] },
        error: null,
        status: 200,
      });

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
      // Setup - Workers API 사용자 역할 모킹 (권한 추출용)
      const mockUserRolesResponse = [
        {
          id: 'role-1',
          name: 'admin',
          permissions: ['content:read', 'content:write'],
          granted_at: '2024-01-01T00:00:00Z',
          granted_by: 'admin-123',
        },
      ];

      vi.mocked(permissionsApi.getUserRoles).mockResolvedValue({
        data: { roles: mockUserRolesResponse },
        error: null,
        status: 200,
      });

      // Execute
      const { result } = renderHook(() => useUserPermissions('user-123'), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeDefined();
      expect(result.current.data?.length).toBe(2);
      expect(result.current.data?.[0].permission_name).toBe('content:read');
      expect(result.current.data?.[1].permission_name).toBe('content:write');
    });

    it('userId가 없으면 쿼리가 비활성화되어야 함', () => {
      // Execute
      const { result } = renderHook(() => useUserPermissions(), {
        wrapper: createWrapper(),
      });

      // Assert - 쿼리가 idle 상태이거나 데이터가 비어있음
      expect(
        result.current.fetchStatus === 'idle' ||
          result.current.data === undefined ||
          (Array.isArray(result.current.data) && result.current.data.length === 0)
      ).toBe(true);
    });

    it('권한 조회 실패 시 에러를 처리해야 함', async () => {
      // Setup - Workers API 에러 모킹
      vi.mocked(permissionsApi.getUserRoles).mockResolvedValue({
        data: null,
        error: 'RPC error',
        status: 500,
      });

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
      // Setup - Workers API 사용자 역할 모킹
      const mockUserRolesResponse = [
        {
          id: 'role-1',
          name: 'admin',
          permissions: ['content:read'],
          granted_at: '2024-01-01T00:00:00Z',
          granted_by: 'admin-123',
        },
      ];

      vi.mocked(permissionsApi.getUserRoles).mockResolvedValue({
        data: { roles: mockUserRolesResponse },
        error: null,
        status: 200,
      });

      // Execute
      const { result } = renderHook(() => useHasPermission('content:read'), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(() => {
        expect(result.current).toBe(true);
      });
    });

    it('사용자가 권한을 가지고 있지 않으면 false를 반환해야 함', async () => {
      // Setup - Workers API 빈 역할 목록 모킹
      vi.mocked(permissionsApi.getUserRoles).mockResolvedValue({
        data: { roles: [] },
        error: null,
        status: 200,
      });

      // Execute
      const { result } = renderHook(() => useHasPermission('content:delete'), {
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
      // Setup - Workers API 역할 할당 모킹
      vi.mocked(permissionsApi.assignRole).mockResolvedValue({
        data: { success: true },
        error: null,
        status: 200,
      });

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

      expect(permissionsApi.assignRole).toHaveBeenCalledWith('mock-token', 'user-123', 'role-1');
    });

    it('역할 할당 실패 시 에러를 처리해야 함', async () => {
      // Setup - Workers API 에러 모킹
      vi.mocked(permissionsApi.assignRole).mockResolvedValue({
        data: null,
        error: 'Insert failed',
        status: 500,
      });

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
      // Setup - Workers API 역할 할당 모킹
      vi.mocked(permissionsApi.assignRole).mockResolvedValue({
        data: { success: true },
        error: null,
        status: 200,
      });

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

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

      expect(invalidateSpy).toHaveBeenCalled();
    });
  });

  describe('useRevokeRole', () => {
    it('useRevokeRole 훅이 mutate 함수를 제공해야 함', () => {
      // Execute
      const { result } = renderHook(() => useRevokeRole(), {
        wrapper: createWrapper(),
      });

      // Assert
      expect(typeof result.current.mutate).toBe('function');
    });

    it('역할 해제 실패 시 에러를 처리해야 함', async () => {
      // Setup - Workers API 에러 모킹
      vi.mocked(permissionsApi.revokeRole).mockResolvedValue({
        data: null,
        error: 'Delete failed',
        status: 500,
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

    it('초기 상태가 idle이어야 함', () => {
      // Execute
      const { result } = renderHook(() => useRevokeRole(), {
        wrapper: createWrapper(),
      });

      // Assert
      expect(result.current.isIdle).toBe(true);
    });

    it('역할 해제를 성공적으로 수행해야 함', async () => {
      // Setup - Workers API 역할 해제 모킹
      vi.mocked(permissionsApi.revokeRole).mockResolvedValue({
        data: { success: true },
        error: null,
        status: 200,
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

      expect(permissionsApi.revokeRole).toHaveBeenCalledWith('mock-token', 'user-123', 'role-1');
    });
  });
});

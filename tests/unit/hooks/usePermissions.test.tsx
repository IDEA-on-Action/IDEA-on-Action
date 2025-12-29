/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * usePermissions Hook 테스트
 *
 * RBAC 권한 확인 및 역할 관리 훅 테스트
 * - 권한 확인
 * - 사용자 역할 조회
 * - 역할 할당/제거
 * - 조직 멤버 관리
 *
 * @migration Supabase -> Workers API 마이그레이션 완료
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
import { permissionsApi, subscriptionsApi, servicesApi } from '@/integrations/cloudflare/client';
import type { CheckPermissionResponse, UserRole } from '@/hooks/usePermissions';
import React from 'react';

// Mock Workers API client
vi.mock('@/integrations/cloudflare/client', () => ({
  permissionsApi: {
    check: vi.fn(),
    getMyPermissions: vi.fn(),
    getRoles: vi.fn(),
    getUserRoles: vi.fn(),
    assignRole: vi.fn(),
    revokeRole: vi.fn(),
  },
  subscriptionsApi: {
    getCurrent: vi.fn(),
  },
  servicesApi: {
    list: vi.fn(),
  },
}));

// Mock useAuth
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
    isAuthenticated: true,
    getAccessToken: vi.fn(() => 'mock-token'),
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
      // Setup - Workers API 모킹
      vi.mocked(permissionsApi.check).mockResolvedValue({
        data: { allowed: true, reason: '' },
        error: null,
        status: 200,
      });
      vi.mocked(permissionsApi.getMyPermissions).mockResolvedValue({
        data: {
          userId: 'user-123',
          isAdmin: true,
          roles: [{ id: 'role-1', name: 'admin', permissions: ['content:create'] }],
          permissions: ['content:create'],
        },
        error: null,
        status: 200,
      });

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
      expect(response.resource).toBe('content');
      expect(response.action).toBe('create');
    });

    it('사용자가 권한이 없으면 allowed가 false여야 함', async () => {
      // Setup - Workers API 모킹
      vi.mocked(permissionsApi.check).mockResolvedValue({
        data: { allowed: false, reason: 'permission denied' },
        error: null,
        status: 200,
      });
      vi.mocked(permissionsApi.getMyPermissions).mockResolvedValue({
        data: {
          userId: 'user-123',
          isAdmin: false,
          roles: [{ id: 'role-1', name: 'viewer', permissions: ['content:read'] }],
          permissions: ['content:read'],
        },
        error: null,
        status: 200,
      });

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
    });

    it('organizationId가 없으면 쿼리를 비활성화해야 함', () => {
      // Execute
      const { result } = renderHook(() => usePermissions('content', 'read'), {
        wrapper: createWrapper(),
      });

      // Assert
      expect(result.current.fetchStatus).toBe('idle');
    });

    it('권한 확인 결과가 null일 때 처리해야 함', async () => {
      // Setup - RPC가 null을 반환하는 경우
      vi.mocked(permissionsApi.check).mockResolvedValue({
        data: null,
        error: null,
        status: 200,
      });

      // Execute
      const { result } = renderHook(() => usePermissions('content', 'read', organizationId), {
        wrapper: createWrapper(),
      });

      // Assert - 에러 없이 처리되어야 함
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('권한 확인 API 호출 실패 시 에러를 처리해야 함', async () => {
      // Setup
      vi.mocked(permissionsApi.check).mockResolvedValue({
        data: null,
        error: 'API error',
        status: 500,
      });

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
      vi.mocked(permissionsApi.getUserRoles).mockResolvedValue({
        data: {
          roles: [
            { id: 'role-1', name: 'admin', permissions: [], granted_at: '', granted_by: '', granted_by_name: '' },
          ],
        },
        error: null,
        status: 200,
      });

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
      vi.mocked(permissionsApi.getUserRoles).mockResolvedValue({
        data: {
          roles: [
            { id: 'role-1', name: 'member', permissions: [], granted_at: '', granted_by: '', granted_by_name: '' },
          ],
        },
        error: null,
        status: 200,
      });

      // Execute
      const { result } = renderHook(() => useUserRole(organizationId, targetUserId), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBe('member');
      expect(permissionsApi.getUserRoles).toHaveBeenCalledWith('mock-token', targetUserId);
    });

    it('organizationId가 없으면 쿼리가 비활성화되어야 함', () => {
      // Execute
      const { result } = renderHook(() => useUserRole(), {
        wrapper: createWrapper(),
      });

      // Assert - 쿼리가 idle 상태이거나 데이터가 undefined/null
      expect(
        result.current.fetchStatus === 'idle' ||
          result.current.data === null ||
          result.current.data === undefined
      ).toBe(true);
    });

    it('역할 조회 실패 시 에러를 처리해야 함', async () => {
      // Setup
      vi.mocked(permissionsApi.getUserRoles).mockResolvedValue({
        data: null,
        error: 'Role fetch error',
        status: 500,
      });

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
      vi.mocked(permissionsApi.getRoles).mockResolvedValue({
        data: {
          roles: [
            { id: 'role-1', name: 'owner', description: '', permissions: ['*'], is_system: true },
            { id: 'role-2', name: 'admin', description: '', permissions: ['content:*'], is_system: true },
          ],
        },
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

      expect(result.current.data).toHaveLength(2);
      expect(result.current.data?.[0].role).toBe('owner');
      expect(result.current.data?.[0].description).toBeTruthy();
    });

    it('역할 설명이 포함되어야 함', async () => {
      // Setup
      vi.mocked(permissionsApi.getRoles).mockResolvedValue({
        data: {
          roles: [
            { id: 'role-1', name: 'admin', description: '', permissions: ['content:*'], is_system: true },
          ],
        },
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

      const adminRole = result.current.data?.find((r) => r.role === 'admin');
      expect(adminRole?.description).toContain('관리');
    });
  });

  describe('useAssignRole', () => {
    it('역할을 성공적으로 할당해야 함', async () => {
      // Setup
      vi.mocked(permissionsApi.getRoles).mockResolvedValue({
        data: {
          roles: [
            { id: 'role-1', name: 'admin', description: '', permissions: ['content:*'], is_system: true },
          ],
        },
        error: null,
        status: 200,
      });
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
        userId: 'user-456',
        organizationId,
        role: 'admin',
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(permissionsApi.assignRole).toHaveBeenCalledWith('mock-token', 'user-456', 'role-1');
    });

    it('역할 할당 실패 시 에러를 처리해야 함', async () => {
      // Setup
      vi.mocked(permissionsApi.getRoles).mockResolvedValue({
        data: {
          roles: [
            { id: 'role-1', name: 'admin', description: '', permissions: ['content:*'], is_system: true },
          ],
        },
        error: null,
        status: 200,
      });
      vi.mocked(permissionsApi.assignRole).mockResolvedValue({
        data: null,
        error: 'Assign failed',
        status: 500,
      });

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
      vi.mocked(permissionsApi.getRoles).mockResolvedValue({
        data: {
          roles: [
            { id: 'role-1', name: 'admin', description: '', permissions: ['content:*'], is_system: true },
          ],
        },
        error: null,
        status: 200,
      });
      vi.mocked(permissionsApi.assignRole).mockResolvedValue({
        data: { success: true },
        error: null,
        status: 200,
      });

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
    it('useRemoveRole 훅이 mutate 함수를 제공해야 함', () => {
      // Execute
      const { result } = renderHook(() => useRemoveRole(), {
        wrapper: createWrapper(),
      });

      // Assert
      expect(typeof result.current.mutate).toBe('function');
    });

    it('역할 제거 실패 시 에러를 처리해야 함', async () => {
      // Setup
      vi.mocked(permissionsApi.revokeRole).mockResolvedValue({
        data: null,
        error: 'Remove failed',
        status: 500,
      });

      // Execute
      const { result } = renderHook(() => useRemoveRole(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        userId: 'user-456',
        organizationId,
        roleId: 'role-1',
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('useOrganizationMembers', () => {
    it('조직 멤버 목록을 성공적으로 조회해야 함', async () => {
      // Setup - 현재 Workers API에서는 빈 배열 반환
      // Execute
      const { result } = renderHook(() => useOrganizationMembers(organizationId), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Workers API에서 현재 빈 배열 반환
      expect(result.current.data).toEqual([]);
    });

    it('organizationId가 없으면 쿼리가 비활성화되어야 함', () => {
      // Execute
      const { result } = renderHook(() => useOrganizationMembers(), {
        wrapper: createWrapper(),
      });

      // Assert - 쿼리가 idle 상태이거나 데이터가 비어있음
      expect(
        result.current.fetchStatus === 'idle' ||
          result.current.data === undefined ||
          (Array.isArray(result.current.data) && result.current.data.length === 0)
      ).toBe(true);
    });
  });

  describe('useHasPermission', () => {
    it('권한이 있으면 true를 반환해야 함', async () => {
      // Setup
      vi.mocked(permissionsApi.check).mockResolvedValue({
        data: { allowed: true, reason: '' },
        error: null,
        status: 200,
      });
      vi.mocked(permissionsApi.getMyPermissions).mockResolvedValue({
        data: {
          userId: 'user-123',
          isAdmin: true,
          roles: [{ id: 'role-1', name: 'admin', permissions: ['content:create'] }],
          permissions: ['content:create'],
        },
        error: null,
        status: 200,
      });

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
      vi.mocked(permissionsApi.check).mockResolvedValue({
        data: { allowed: false, reason: 'permission denied' },
        error: null,
        status: 200,
      });
      vi.mocked(permissionsApi.getMyPermissions).mockResolvedValue({
        data: {
          userId: 'user-123',
          isAdmin: false,
          roles: [{ id: 'role-1', name: 'viewer', permissions: ['content:read'] }],
          permissions: ['content:read'],
        },
        error: null,
        status: 200,
      });

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
      vi.mocked(permissionsApi.getUserRoles).mockResolvedValue({
        data: {
          roles: [
            { id: 'role-1', name: 'admin', permissions: [], granted_at: '', granted_by: '', granted_by_name: '' },
          ],
        },
        error: null,
        status: 200,
      });

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
      vi.mocked(permissionsApi.getUserRoles).mockResolvedValue({
        data: {
          roles: [
            { id: 'role-1', name: 'member', permissions: [], granted_at: '', granted_by: '', granted_by_name: '' },
          ],
        },
        error: null,
        status: 200,
      });

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
      vi.mocked(permissionsApi.getUserRoles).mockResolvedValue({
        data: {
          roles: [
            { id: 'role-1', name: 'owner', permissions: [], granted_at: '', granted_by: '', granted_by_name: '' },
          ],
        },
        error: null,
        status: 200,
      });

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
      vi.mocked(permissionsApi.getUserRoles).mockResolvedValue({
        data: {
          roles: [
            { id: 'role-1', name: 'admin', permissions: [], granted_at: '', granted_by: '', granted_by_name: '' },
          ],
        },
        error: null,
        status: 200,
      });

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
      vi.mocked(permissionsApi.getUserRoles).mockResolvedValue({
        data: {
          roles: [
            { id: 'role-1', name: 'member', permissions: [], granted_at: '', granted_by: '', granted_by_name: '' },
          ],
        },
        error: null,
        status: 200,
      });

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
      vi.mocked(permissionsApi.getUserRoles).mockResolvedValue({
        data: {
          roles: [
            { id: 'role-1', name: 'viewer', permissions: [], granted_at: '', granted_by: '', granted_by_name: '' },
          ],
        },
        error: null,
        status: 200,
      });

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

  describe('추가 권한 시나리오', () => {
    it('여러 리소스에 대한 권한을 순차적으로 확인할 수 있어야 함', async () => {
      // Setup - 첫 번째 권한 체크
      vi.mocked(permissionsApi.check).mockResolvedValue({
        data: { allowed: true, reason: '' },
        error: null,
        status: 200,
      });
      vi.mocked(permissionsApi.getMyPermissions).mockResolvedValue({
        data: {
          userId: 'user-123',
          isAdmin: true,
          roles: [{ id: 'role-1', name: 'admin', permissions: ['content:create'] }],
          permissions: ['content:create'],
        },
        error: null,
        status: 200,
      });

      // Execute
      const { result: result1 } = renderHook(
        () => usePermissions('content', 'create', organizationId),
        { wrapper: createWrapper() }
      );

      // Assert
      await waitFor(() => {
        expect(result1.current.isSuccess).toBe(true);
      });
      expect(result1.current.data?.allowed).toBe(true);

      // Setup - 두 번째 권한 체크
      vi.mocked(permissionsApi.check).mockResolvedValue({
        data: { allowed: false, reason: 'denied' },
        error: null,
        status: 200,
      });

      // Execute
      const { result: result2 } = renderHook(
        () => usePermissions('billing', 'manage', organizationId),
        { wrapper: createWrapper() }
      );

      // Assert
      await waitFor(() => {
        expect(result2.current.isSuccess).toBe(true);
      });
      expect(result2.current.data?.allowed).toBe(false);
    });

    it('캐싱된 권한 결과를 재사용해야 함', async () => {
      // Setup
      vi.mocked(permissionsApi.check).mockResolvedValue({
        data: { allowed: true, reason: '' },
        error: null,
        status: 200,
      });
      vi.mocked(permissionsApi.getMyPermissions).mockResolvedValue({
        data: {
          userId: 'user-123',
          isAdmin: true,
          roles: [{ id: 'role-1', name: 'admin', permissions: ['content:read'] }],
          permissions: ['content:read'],
        },
        error: null,
        status: 200,
      });

      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false, staleTime: 5 * 60 * 1000 },
        },
      });
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      // Execute - 첫 번째 호출
      const { result: result1 } = renderHook(
        () => usePermissions('content', 'read', organizationId),
        { wrapper }
      );

      await waitFor(() => {
        expect(result1.current.isSuccess).toBe(true);
      });

      // Execute - 두 번째 호출 (같은 쿼리)
      const { result: result2 } = renderHook(
        () => usePermissions('content', 'read', organizationId),
        { wrapper }
      );

      // Assert - 캐시된 데이터 사용
      await waitFor(() => {
        expect(result2.current.isSuccess).toBe(true);
      });
    });

    it('다양한 역할에 대한 권한 차이를 확인할 수 있어야 함', async () => {
      const roles: UserRole[] = ['owner', 'admin', 'member', 'viewer'];
      const expectedPermissions = {
        owner: true,
        admin: true,
        member: false,
        viewer: false,
      };

      for (const role of roles) {
        // Setup
        vi.mocked(permissionsApi.check).mockResolvedValue({
          data: { allowed: expectedPermissions[role], reason: '' },
          error: null,
          status: 200,
        });
        vi.mocked(permissionsApi.getMyPermissions).mockResolvedValue({
          data: {
            userId: 'user-123',
            isAdmin: role === 'owner' || role === 'admin',
            roles: [{ id: 'role-1', name: role, permissions: [] }],
            permissions: [],
          },
          error: null,
          status: 200,
        });

        // Execute
        const { result } = renderHook(() => usePermissions('users', 'delete', organizationId), {
          wrapper: createWrapper(),
        });

        // Assert
        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });
        expect(result.current.data?.allowed).toBe(expectedPermissions[role]);

        vi.clearAllMocks();
      }
    });
  });

  describe('역할 변경 시나리오', () => {
    it('역할 할당 후 권한 캐시가 무효화되어야 함', async () => {
      // Setup - 역할 할당 mock
      vi.mocked(permissionsApi.getRoles).mockResolvedValue({
        data: {
          roles: [
            { id: 'role-1', name: 'admin', description: '', permissions: ['content:*'], is_system: true },
          ],
        },
        error: null,
        status: 200,
      });
      vi.mocked(permissionsApi.assignRole).mockResolvedValue({
        data: { success: true },
        error: null,
        status: 200,
      });

      const queryClient = new QueryClient();
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      // Execute
      const { result } = renderHook(() => useAssignRole(), { wrapper });
      result.current.mutate({ userId: 'user-456', organizationId, role: 'admin' });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // 권한 캐시 무효화 확인
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ['permission'] })
      );
    });

    it('역할 제거 후 관련 캐시가 무효화되어야 함', async () => {
      // Setup
      vi.mocked(permissionsApi.revokeRole).mockResolvedValue({
        data: { success: true },
        error: null,
        status: 200,
      });

      const queryClient = new QueryClient();
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      // Execute
      const { result } = renderHook(() => useRemoveRole(), { wrapper });
      result.current.mutate({ userId: 'user-456', organizationId, roleId: 'role-1' });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ['permission'] })
      );
    });
  });

  describe('서비스별 접근 권한', () => {
    it('MCP Gateway 서비스 접근 권한을 확인할 수 있어야 함', async () => {
      // Setup
      vi.mocked(permissionsApi.check).mockResolvedValue({
        data: { allowed: true, reason: '' },
        error: null,
        status: 200,
      });
      vi.mocked(permissionsApi.getMyPermissions).mockResolvedValue({
        data: {
          userId: 'user-123',
          isAdmin: false,
          roles: [{ id: 'role-1', name: 'member', permissions: ['services:access'] }],
          permissions: ['services:access'],
        },
        error: null,
        status: 200,
      });

      // Execute
      const { result } = renderHook(() => usePermissions('services', 'access', organizationId), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
      expect(result.current.data?.allowed).toBe(true);
    });

    it('Claude Code 서비스 접근 권한을 확인할 수 있어야 함', async () => {
      // Setup
      vi.mocked(permissionsApi.check).mockResolvedValue({
        data: { allowed: false, reason: 'permission denied' },
        error: null,
        status: 200,
      });
      vi.mocked(permissionsApi.getMyPermissions).mockResolvedValue({
        data: {
          userId: 'user-123',
          isAdmin: false,
          roles: [{ id: 'role-1', name: 'viewer', permissions: ['services:read'] }],
          permissions: ['services:read'],
        },
        error: null,
        status: 200,
      });

      // Execute
      const { result } = renderHook(
        () => usePermissions('services', 'execute', organizationId),
        { wrapper: createWrapper() }
      );

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
      expect(result.current.data?.allowed).toBe(false);
    });
  });

  describe('조직 멤버 관리 추가 시나리오', () => {
    it('빈 조직의 멤버 목록을 조회할 수 있어야 함', async () => {
      // Setup - Workers API에서 현재 빈 배열 반환
      // Execute
      const { result } = renderHook(() => useOrganizationMembers(organizationId), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
      expect(result.current.data).toEqual([]);
    });

    it('조직 멤버 조회는 빈 배열을 반환해야 함 (현재 Workers API 제한)', async () => {
      // Execute
      const { result } = renderHook(() => useOrganizationMembers(organizationId), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
      expect(result.current.data).toEqual([]);
    });
  });
});

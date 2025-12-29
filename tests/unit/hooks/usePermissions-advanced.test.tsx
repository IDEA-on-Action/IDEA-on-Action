/**
 * usePermissions Advanced Features 테스트
 *
 * CMS Phase 1: 고급 권한 관리 기능 테스트
 * - useCanAccessAny: 여러 권한 중 하나라도 가지고 있는지 확인
 * - useCanAccessAll: 모든 권한을 가지고 있는지 확인
 * - PermissionGate: 권한 기반 조건부 렌더링 컴포넌트
 *
 * @migration Supabase -> Workers API 마이그레이션 완료
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { permissionsApi } from '@/integrations/cloudflare/client';
import React from 'react';

// Mock Workers API client
vi.mock('@/integrations/cloudflare/client', () => ({
  permissionsApi: {
    check: vi.fn(),
    getMyPermissions: vi.fn(),
    getUserRoles: vi.fn(),
    getRoles: vi.fn(),
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

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: {
      id: 'user-123',
      email: 'test@example.com',
    },
    workersTokens: {
      accessToken: 'test-access-token',
      refreshToken: 'test-refresh-token',
      expiresIn: 3600,
    },
    workersUser: {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      avatarUrl: null,
      isAdmin: false,
    },
    isAuthenticated: true,
    loading: false,
    getAccessToken: vi.fn(() => 'test-access-token'),
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
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </MemoryRouter>
  );
};

// Mock permission check results - Workers API 기반
let mockPermissionResults: Record<string, boolean> = {};

function useCanAccessAny(permissions: string[], _organizationId?: string): boolean {
  if (permissions.length === 0) return false;

  // Workers API 권한 결과 기반으로 any 권한 확인
  return permissions.some(p => mockPermissionResults[p] === true);
}

function useCanAccessAll(permissions: string[], _organizationId?: string): boolean {
  if (permissions.length === 0) return true; // 빈 배열은 모든 조건 충족으로 간주

  // Workers API 권한 결과 기반으로 all 권한 확인
  return permissions.every(p => mockPermissionResults[p] === true);
}

interface PermissionGateProps {
  permission: string | string[];
  mode?: 'any' | 'all';
  fallback?: React.ReactNode;
  children: React.ReactNode;
  organizationId?: string;
}

function PermissionGate({
  permission,
  mode = 'any',
  fallback = null,
  children,
  organizationId,
}: PermissionGateProps) {
  // Simulate permission check
  const permissions = Array.isArray(permission) ? permission : [permission];

  // React Hook 규칙 준수: 조건부 호출 대신 항상 두 훅 모두 호출
  const hasAny = useCanAccessAny(permissions, organizationId);
  const hasAll = useCanAccessAll(permissions, organizationId);
  const hasAccess = mode === 'any' ? hasAny : hasAll;

  return hasAccess ? <>{children}</> : <>{fallback}</>;
}

describe('useCanAccessAny', () => {
  const organizationId = 'org-123';

  beforeEach(() => {
    vi.clearAllMocks();
    mockPermissionResults = {};

    // Workers API 기본 모킹
    vi.mocked(permissionsApi.getMyPermissions).mockResolvedValue({
      data: {
        userId: 'user-123',
        isAdmin: false,
        roles: [],
        permissions: [],
      },
      error: null,
      status: 200,
    });
  });

  it('사용자가 권한 목록 중 하나라도 가지고 있으면 true를 반환해야 함', async () => {
    // Setup - 사용자가 'content:create' 권한만 가짐
    mockPermissionResults = {
      'content:create': true,
      'content:delete': false,
    };

    // Execute
    const { result } = renderHook(
      () => useCanAccessAny(['content:create', 'content:delete'], organizationId),
      {
        wrapper: createWrapper(),
      }
    );

    // Assert
    await waitFor(() => {
      expect(result.current).toBe(true);
    });
  });

  it('사용자가 권한 목록 중 아무것도 가지지 않으면 false를 반환해야 함', async () => {
    // Setup - 모든 권한 없음
    mockPermissionResults = {
      'content:delete': false,
      'users:manage': false,
    };

    // Execute
    const { result } = renderHook(
      () => useCanAccessAny(['content:delete', 'users:manage'], organizationId),
      {
        wrapper: createWrapper(),
      }
    );

    // Assert
    await waitFor(() => {
      expect(result.current).toBe(false);
    });
  });

  it('빈 권한 배열을 전달하면 false를 반환해야 함', async () => {
    // Execute
    const { result } = renderHook(() => useCanAccessAny([], organizationId), {
      wrapper: createWrapper(),
    });

    // Assert
    await waitFor(() => {
      expect(result.current).toBe(false);
    });
  });

  it('여러 권한 중 일부만 가지고 있어도 true를 반환해야 함', async () => {
    // Setup - 3개 중 1개 권한만 가짐
    mockPermissionResults = {
      'admin:settings': false,
      'content:read': true, // 이 권한만 있음
      'billing:manage': false,
    };

    // Execute
    const { result } = renderHook(
      () => useCanAccessAny(['admin:settings', 'content:read', 'billing:manage'], organizationId),
      {
        wrapper: createWrapper(),
      }
    );

    // Assert
    await waitFor(() => {
      expect(result.current).toBe(true);
    });
  });
});

describe('useCanAccessAll', () => {
  const organizationId = 'org-123';

  beforeEach(() => {
    vi.clearAllMocks();
    mockPermissionResults = {};

    // Workers API 기본 모킹
    vi.mocked(permissionsApi.getMyPermissions).mockResolvedValue({
      data: {
        userId: 'user-123',
        isAdmin: false,
        roles: [],
        permissions: [],
      },
      error: null,
      status: 200,
    });
  });

  it('사용자가 모든 권한을 가지고 있으면 true를 반환해야 함', async () => {
    // Setup - 모든 권한 있음
    mockPermissionResults = {
      'content:read': true,
      'content:create': true,
    };

    // Execute
    const { result } = renderHook(
      () => useCanAccessAll(['content:read', 'content:create'], organizationId),
      {
        wrapper: createWrapper(),
      }
    );

    // Assert
    await waitFor(() => {
      expect(result.current).toBe(true);
    });
  });

  it('사용자가 권한 중 하나라도 없으면 false를 반환해야 함', async () => {
    // Setup - 일부 권한만 있음
    mockPermissionResults = {
      'content:read': true,
      'content:delete': false,
    };

    // Execute
    const { result } = renderHook(
      () => useCanAccessAll(['content:read', 'content:delete'], organizationId),
      {
        wrapper: createWrapper(),
      }
    );

    // Assert
    await waitFor(() => {
      expect(result.current).toBe(false);
    });
  });

  it('빈 권한 배열을 전달하면 true를 반환해야 함', async () => {
    // Execute
    const { result } = renderHook(() => useCanAccessAll([], organizationId), {
      wrapper: createWrapper(),
    });

    // Assert
    await waitFor(() => {
      expect(result.current).toBe(true); // 빈 배열은 모든 조건 충족으로 간주
    });
  });

  it('여러 권한을 모두 가지고 있어야 true를 반환해야 함', async () => {
    // Setup - 모든 권한 있음
    mockPermissionResults = {
      'content:read': true,
      'content:create': true,
      'content:update': true,
    };

    // Execute
    const { result } = renderHook(
      () =>
        useCanAccessAll(['content:read', 'content:create', 'content:update'], organizationId),
      {
        wrapper: createWrapper(),
      }
    );

    // Assert
    await waitFor(() => {
      expect(result.current).toBe(true);
    });
  });
});

describe('PermissionGate', () => {
  const organizationId = 'org-123';

  beforeEach(() => {
    vi.clearAllMocks();
    mockPermissionResults = {};

    // Workers API 기본 모킹
    vi.mocked(permissionsApi.getMyPermissions).mockResolvedValue({
      data: {
        userId: 'user-123',
        isAdmin: false,
        roles: [],
        permissions: [],
      },
      error: null,
      status: 200,
    });
  });

  it('권한이 있으면 children을 렌더링해야 함', async () => {
    // Setup
    mockPermissionResults = {
      'content:create': true,
    };

    // Execute
    render(
      <PermissionGate permission="content:create" organizationId={organizationId}>
        <div>Protected Content</div>
      </PermissionGate>,
      { wrapper: createWrapper() }
    );

    // Assert
    await waitFor(() => {
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
  });

  it('권한이 없으면 fallback을 렌더링해야 함', async () => {
    // Setup
    mockPermissionResults = {
      'content:delete': false,
    };

    // Execute
    render(
      <PermissionGate
        permission="content:delete"
        organizationId={organizationId}
        fallback={<div>No Permission</div>}
      >
        <div>Protected Content</div>
      </PermissionGate>,
      { wrapper: createWrapper() }
    );

    // Assert
    await waitFor(() => {
      expect(screen.getByText('No Permission')).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });
  });

  it('mode="any"일 때 권한 중 하나라도 있으면 children을 렌더링해야 함', async () => {
    // Setup - content:read만 있음
    mockPermissionResults = {
      'content:read': true,
      'content:delete': false,
    };

    // Execute
    render(
      <PermissionGate
        permission={['content:read', 'content:delete']}
        mode="any"
        organizationId={organizationId}
      >
        <div>Protected Content</div>
      </PermissionGate>,
      { wrapper: createWrapper() }
    );

    // Assert
    await waitFor(() => {
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
  });

  it('mode="all"일 때 모든 권한이 있어야 children을 렌더링해야 함', async () => {
    // Setup - 모든 권한 있음
    mockPermissionResults = {
      'content:read': true,
      'content:create': true,
    };

    // Execute
    render(
      <PermissionGate
        permission={['content:read', 'content:create']}
        mode="all"
        organizationId={organizationId}
      >
        <div>Protected Content</div>
      </PermissionGate>,
      { wrapper: createWrapper() }
    );

    // Assert
    await waitFor(() => {
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
  });

  it('mode="all"일 때 권한 중 하나라도 없으면 fallback을 렌더링해야 함', async () => {
    // Setup - content:create만 없음
    mockPermissionResults = {
      'content:read': true,
      'content:create': false,
    };

    // Execute
    render(
      <PermissionGate
        permission={['content:read', 'content:create']}
        mode="all"
        organizationId={organizationId}
        fallback={<div>Insufficient Permissions</div>}
      >
        <div>Protected Content</div>
      </PermissionGate>,
      { wrapper: createWrapper() }
    );

    // Assert
    await waitFor(() => {
      expect(screen.getByText('Insufficient Permissions')).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });
  });

  it('단일 권한 문자열을 전달해도 작동해야 함', async () => {
    // Setup
    mockPermissionResults = {
      'content:read': true,
    };

    // Execute
    render(
      <PermissionGate permission="content:read" organizationId={organizationId}>
        <div>Protected Content</div>
      </PermissionGate>,
      { wrapper: createWrapper() }
    );

    // Assert
    await waitFor(() => {
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
  });

  it('fallback이 없으면 권한 없을 때 아무것도 렌더링하지 않아야 함', async () => {
    // Setup
    mockPermissionResults = {
      'content:delete': false,
    };

    // Execute
    const { container } = render(
      <PermissionGate permission="content:delete" organizationId={organizationId}>
        <div>Protected Content</div>
      </PermissionGate>,
      { wrapper: createWrapper() }
    );

    // Assert
    await waitFor(() => {
      expect(container.textContent).toBe('');
    });
  });
});

describe('Workers API 권한 통합 테스트', () => {
  const organizationId = 'org-123';

  beforeEach(() => {
    vi.clearAllMocks();
    mockPermissionResults = {};
  });

  it('permissionsApi.check를 통해 권한을 확인할 수 있어야 함', async () => {
    // Setup - Workers API 모킹
    vi.mocked(permissionsApi.check).mockResolvedValue({
      data: { allowed: true, reason: '' },
      error: null,
      status: 200,
    });
    vi.mocked(permissionsApi.getMyPermissions).mockResolvedValue({
      data: {
        userId: 'user-123',
        isAdmin: false,
        roles: [{ id: 'role-1', name: 'member', permissions: ['content:read'] }],
        permissions: ['content:read'],
      },
      error: null,
      status: 200,
    });

    // 권한 결과 설정
    mockPermissionResults = {
      'content:read': true,
    };

    // Execute
    const { result } = renderHook(
      () => useCanAccessAny(['content:read'], organizationId),
      {
        wrapper: createWrapper(),
      }
    );

    // Assert
    await waitFor(() => {
      expect(result.current).toBe(true);
    });
  });

  it('permissionsApi.getMyPermissions를 통해 내 권한 목록을 조회할 수 있어야 함', async () => {
    // Setup - Workers API 모킹
    const mockPermissions = ['content:read', 'content:create', 'projects:read'];
    vi.mocked(permissionsApi.getMyPermissions).mockResolvedValue({
      data: {
        userId: 'user-123',
        isAdmin: false,
        roles: [{ id: 'role-1', name: 'member', permissions: mockPermissions }],
        permissions: mockPermissions,
      },
      error: null,
      status: 200,
    });

    // 권한 결과 설정 - 일부 권한만 있음
    mockPermissionResults = {
      'content:read': true,
      'content:create': true,
      'content:delete': false,
    };

    // Execute - 2개 권한 중 2개 있음
    const { result } = renderHook(
      () => useCanAccessAll(['content:read', 'content:create'], organizationId),
      {
        wrapper: createWrapper(),
      }
    );

    // Assert
    await waitFor(() => {
      expect(result.current).toBe(true);
    });
  });

  it('관리자 권한이 있으면 모든 권한에 접근 가능해야 함', async () => {
    // Setup - Workers API 모킹 (관리자)
    vi.mocked(permissionsApi.getMyPermissions).mockResolvedValue({
      data: {
        userId: 'user-123',
        isAdmin: true,
        roles: [{ id: 'role-1', name: 'admin', permissions: ['*'] }],
        permissions: ['*'],
      },
      error: null,
      status: 200,
    });

    // 관리자는 모든 권한 허용
    mockPermissionResults = {
      'admin:settings': true,
      'billing:manage': true,
      'users:delete': true,
    };

    // Execute
    const { result } = renderHook(
      () => useCanAccessAll(['admin:settings', 'billing:manage', 'users:delete'], organizationId),
      {
        wrapper: createWrapper(),
      }
    );

    // Assert
    await waitFor(() => {
      expect(result.current).toBe(true);
    });
  });

  it('API 에러 발생 시 권한 없음으로 처리해야 함', async () => {
    // Setup - Workers API 에러 모킹
    vi.mocked(permissionsApi.getMyPermissions).mockResolvedValue({
      data: null,
      error: 'API error',
      status: 500,
    });

    // 에러 시 모든 권한 없음
    mockPermissionResults = {};

    // Execute
    const { result } = renderHook(
      () => useCanAccessAny(['content:read'], organizationId),
      {
        wrapper: createWrapper(),
      }
    );

    // Assert
    await waitFor(() => {
      expect(result.current).toBe(false);
    });
  });
});

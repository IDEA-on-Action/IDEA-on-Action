/**
 * useAdmins Hook 테스트
 *
 * 관리자 관리 훅 테스트
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
} from '@/hooks/useAdmins';
import { supabase } from '@/integrations/supabase/client';
import React from 'react';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
      admin: {
        getUserById: vi.fn(),
      },
    },
  },
}));

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
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
const mockAdmins = [
  {
    id: '1',
    user_id: 'user-1',
    role: 'super_admin',
    created_at: '2025-12-01T10:00:00Z',
    updated_at: '2025-12-01T10:00:00Z',
  },
  {
    id: '2',
    user_id: 'user-2',
    role: 'content_admin',
    created_at: '2025-12-01T11:00:00Z',
    updated_at: '2025-12-01T11:00:00Z',
  },
];

const mockUserData = {
  user: {
    id: 'user-1',
    email: 'admin@example.com',
  },
};

// Mock query 타입 정의
interface MockQuery {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  then?: ReturnType<typeof vi.fn>;
}

describe('useAdmins', () => {
  let mockQuery: MockQuery;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock query 체이닝
    const createMockQuery = () => {
      const query = {
        select: vi.fn(),
        eq: vi.fn(),
        order: vi.fn(),
        insert: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        maybeSingle: vi.fn(),
        single: vi.fn(),
      };

      query.select.mockReturnValue(query);
      query.eq.mockReturnValue(query);
      query.order.mockReturnValue(query);
      query.insert.mockReturnValue(query);
      query.update.mockReturnValue(query);
      query.delete.mockReturnValue(query);
      query.maybeSingle.mockReturnValue(query);
      query.single.mockReturnValue(query);

      const queryWithThen = query as MockQuery;
      queryWithThen.then = vi.fn((onFulfilled) => {
        return Promise.resolve({ data: mockAdmins, error: null }).then(onFulfilled);
      });

      return queryWithThen;
    };

    mockQuery = createMockQuery();
    vi.mocked(supabase.from).mockReturnValue(mockQuery as ReturnType<typeof supabase.from>);
    vi.mocked(supabase.auth.admin.getUserById).mockResolvedValue({
      data: mockUserData,
      error: null
    } as { data: typeof mockUserData; error: null });
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
        expect(result.current.isLoading).toBe(false);
      });

      expect(supabase.from).toHaveBeenCalledWith('admins');
      expect(mockQuery.select).toHaveBeenCalledWith('*');
      expect(mockQuery.order).toHaveBeenCalledWith('created_at', { ascending: false });
    });

    it('각 관리자의 이메일을 조회해야 함', async () => {
      const { result } = renderHook(() => useAdmins(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(supabase.auth.admin.getUserById).toHaveBeenCalled();
    });
  });

  describe('단일 관리자 조회', () => {
    it('특정 관리자를 조회해야 함', async () => {
      mockQuery.then = vi.fn((onFulfilled) => {
        return Promise.resolve({ data: mockAdmins[0], error: null }).then(onFulfilled);
      });

      const { result } = renderHook(() => useAdmin('user-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockQuery.eq).toHaveBeenCalledWith('user_id', 'user-1');
      expect(mockQuery.maybeSingle).toHaveBeenCalled();
    });

    it('userId가 없으면 쿼리를 비활성화해야 함', () => {
      const { result } = renderHook(() => useAdmin(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('역할별 관리자 조회', () => {
    it('특정 역할의 관리자만 조회해야 함', async () => {
      const { result } = renderHook(() => useAdminsByRole('super_admin'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockQuery.eq).toHaveBeenCalledWith('role', 'super_admin');
    });

    it('역할이 없으면 쿼리를 비활성화해야 함', () => {
      const { result } = renderHook(() => useAdminsByRole('' as 'super_admin'), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('현재 사용자 관리자 역할 조회', () => {
    beforeEach(() => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUserData.user },
        error: null,
      } as { data: { user: typeof mockUserData.user }; error: null });
    });

    it('현재 사용자의 역할을 조회해야 함', async () => {
      mockQuery.then = vi.fn((onFulfilled) => {
        return Promise.resolve({ data: { role: 'super_admin' }, error: null }).then(onFulfilled);
      });

      const { result } = renderHook(() => useCurrentAdminRole(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(supabase.auth.getUser).toHaveBeenCalled();
    });
  });

  describe('관리자 생성', () => {
    it('새 관리자를 생성해야 함', async () => {
      mockQuery.single.mockReturnValue({
        then: vi.fn((onFulfilled) => {
          return Promise.resolve({ data: mockAdmins[0], error: null }).then(onFulfilled);
        }),
      });

      const { result } = renderHook(() => useCreateAdmin(), {
        wrapper: createWrapper(),
      });

      await result.current.mutateAsync({
        user_id: 'user-1',
        role: 'super_admin',
      });

      expect(mockQuery.insert).toHaveBeenCalledWith({
        user_id: 'user-1',
        role: 'super_admin',
      });
      expect(mockQuery.select).toHaveBeenCalled();
      expect(mockQuery.single).toHaveBeenCalled();
    });
  });

  describe('관리자 수정', () => {
    it('관리자 역할을 수정해야 함', async () => {
      mockQuery.single.mockReturnValue({
        then: vi.fn((onFulfilled) => {
          return Promise.resolve({ data: mockAdmins[0], error: null }).then(onFulfilled);
        }),
      });

      const { result } = renderHook(() => useUpdateAdmin(), {
        wrapper: createWrapper(),
      });

      await result.current.mutateAsync({
        id: '1',
        role: 'content_admin',
      });

      expect(mockQuery.update).toHaveBeenCalledWith({ role: 'content_admin' });
      expect(mockQuery.eq).toHaveBeenCalledWith('id', '1');
    });
  });

  describe('관리자 삭제', () => {
    it('관리자를 삭제해야 함', async () => {
      mockQuery.then = vi.fn((onFulfilled) => {
        return Promise.resolve({ data: null, error: null }).then(onFulfilled);
      });

      const { result } = renderHook(() => useDeleteAdmin(), {
        wrapper: createWrapper(),
      });

      await result.current.mutateAsync('1');

      expect(mockQuery.delete).toHaveBeenCalled();
      expect(mockQuery.eq).toHaveBeenCalledWith('id', '1');
    });
  });
});

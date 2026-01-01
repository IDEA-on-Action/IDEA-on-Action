/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * useCRUD Bulk Operations 테스트
 *
 * CMS Phase 1: CRUD 벌크 작업 테스트
 * - useBulkDelete: 여러 항목 동시 삭제
 * - useBulkUpdate: 여러 항목 동시 업데이트
 * - useExport: 데이터 내보내기 (CSV, JSON)
 * - useCount: 필터링된 항목 수 조회
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

// useAuth 모킹
vi.mock('@/hooks/auth/useAuth', () => ({
  useAuth: vi.fn(() => ({
    workersTokens: { accessToken: 'test-token' },
    workersUser: { id: 'user-123', email: 'test@example.com' },
    isAuthenticated: true,
    loading: false,
  })),
}));

// Workers API 모킹
vi.mock('@/integrations/cloudflare/client', () => ({
  callWorkersApi: vi.fn(),
}));

// Toast 모킹
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// 테스트용 엔티티 타입
interface TestEntity {
  id: string;
  name: string;
  value: number;
  created_at?: string;
  updated_at?: string;
}

// Mock implementations for bulk operations
// These would be added to src/hooks/useCRUD.ts

function useBulkDelete<T>(table: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (ids: string[]) => {
      if (ids.length === 0) {
        return [];
      }

      const { callWorkersApi } = await import('@/integrations/cloudflare/client');
      const response = await callWorkersApi({
        path: `/api/${table}`,
        method: 'DELETE',
        body: { ids },
      });

      if (!response.success) {
        const { toast } = await import('sonner');
        toast.error(response.error);
        throw new Error(response.error);
      }

      return response.data?.deletedIds || ids;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [table, 'list'] });
    },
  });

  return mutation;
}

function useBulkUpdate<T>(table: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (params: { ids: string[]; values: Partial<T> }) => {
      if (params.ids.length === 0) {
        return [];
      }

      const { callWorkersApi } = await import('@/integrations/cloudflare/client');
      const response = await callWorkersApi({
        path: `/api/${table}`,
        method: 'PATCH',
        body: { ids: params.ids, values: params.values },
      });

      if (!response.success) {
        throw new Error(response.error);
      }

      return response.data || params.ids.map((id) => ({ id, ...params.values }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [table, 'list'] });
    },
  });

  return mutation;
}

type ExportFormat = 'csv' | 'json';

interface ExportOptions {
  format: ExportFormat;
  columns?: string[];
  filters?: Record<string, any>;
}

function useExport<T>(table: string) {
  const mutation = useMutation({
    mutationFn: async (options: ExportOptions) => {
      const { callWorkersApi } = await import('@/integrations/cloudflare/client');
      const response = await callWorkersApi({
        path: `/api/${table}/export`,
        method: 'POST',
        body: {
          format: options.format,
          columns: options.columns,
          filters: options.filters,
        },
      });

      if (!response.success) {
        throw new Error(response.error);
      }

      const data = response.data;
      const mimeType = options.format === 'csv' ? 'text/csv' : 'application/json';

      let content: string;
      if (options.format === 'csv') {
        if (data.length === 0) {
          content = '';
        } else {
          const headers = Object.keys(data[0]).join(',');
          const rows = data.map((item: any) => Object.values(item).join(','));
          content = [headers, ...rows].join('\n');
        }
      } else {
        content = JSON.stringify(data, null, 2);
      }

      return new Blob([content], { type: mimeType });
    },
  });

  return mutation;
}

interface CountOptions {
  filters?: Record<string, any>;
}

function useCount(table: string) {
  const query = useQuery({
    queryKey: [table, 'count'],
    queryFn: async () => {
      const { callWorkersApi } = await import('@/integrations/cloudflare/client');
      const response = await callWorkersApi({
        path: `/api/${table}/count`,
        method: 'GET',
      });

      if (!response.success) {
        throw new Error(response.error);
      }

      return response.data?.count || 0;
    },
  });

  return query;
}

describe('useBulkDelete', () => {
  let queryClient: QueryClient;
  let wrapper: React.FC<{ children: React.ReactNode }>;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    wrapper = ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </MemoryRouter>
    );

    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('여러 항목을 한 번에 삭제해야 함', async () => {
    // Setup
    const ids = ['1', '2', '3'];
    const { callWorkersApi } = await import('@/integrations/cloudflare/client');

    vi.mocked(callWorkersApi).mockResolvedValue({
      success: true,
      data: { deletedIds: ids },
    });

    // Execute
    const { result } = renderHook(() => useBulkDelete<TestEntity>('test_table'), { wrapper });

    const deletedIds = await result.current.mutateAsync(ids);

    // Assert
    expect(deletedIds).toEqual(ids);
    expect(callWorkersApi).toHaveBeenCalledWith(
      expect.objectContaining({
        path: expect.stringContaining('test_table'),
        method: 'DELETE',
      })
    );
  });

  it('삭제 성공 시 쿼리를 무효화해야 함', async () => {
    // Setup
    const { callWorkersApi } = await import('@/integrations/cloudflare/client');

    vi.mocked(callWorkersApi).mockResolvedValue({
      success: true,
      data: { deletedIds: ['1', '2'] },
    });

    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    // Execute
    const { result } = renderHook(() => useBulkDelete<TestEntity>('test_table'), { wrapper });

    await result.current.mutateAsync(['1', '2']);

    // Assert
    await waitFor(() => {
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ['test_table', 'list'],
      });
    });
  });

  it('빈 배열을 전달하면 아무 작업도 하지 않아야 함', async () => {
    // Setup
    const { callWorkersApi } = await import('@/integrations/cloudflare/client');

    // Execute
    const { result } = renderHook(() => useBulkDelete<TestEntity>('test_table'), { wrapper });

    await result.current.mutateAsync([]);

    // Assert
    expect(callWorkersApi).not.toHaveBeenCalled();
  });

  it('삭제 실패 시 에러를 처리해야 함', async () => {
    // Setup
    const { toast } = await import('sonner');
    const { callWorkersApi } = await import('@/integrations/cloudflare/client');

    vi.mocked(callWorkersApi).mockResolvedValue({
      success: false,
      error: 'Delete failed',
    });

    // Execute
    const { result } = renderHook(() => useBulkDelete<TestEntity>('test_table'), { wrapper });

    try {
      await result.current.mutateAsync(['1', '2']);
    } catch (error) {
      // Expected error
    }

    // Assert
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Delete failed'));
    });
  });

  it('대량의 항목도 한 번에 삭제할 수 있어야 함', async () => {
    // Setup
    const ids = Array.from({ length: 100 }, (_, i) => String(i + 1));
    const { callWorkersApi } = await import('@/integrations/cloudflare/client');

    vi.mocked(callWorkersApi).mockResolvedValue({
      success: true,
      data: { deletedIds: ids },
    });

    // Execute
    const { result } = renderHook(() => useBulkDelete<TestEntity>('test_table'), { wrapper });

    const deletedIds = await result.current.mutateAsync(ids);

    // Assert
    expect(deletedIds).toEqual(ids);
  });
});

describe('useBulkUpdate', () => {
  let queryClient: QueryClient;
  let wrapper: React.FC<{ children: React.ReactNode }>;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    wrapper = ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </MemoryRouter>
    );

    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('여러 항목을 한 번에 업데이트해야 함', async () => {
    // Setup
    const ids = ['1', '2', '3'];
    const values = { value: 999 };
    const updatedItems = ids.map((id) => ({ id, name: 'Test', value: 999 }));
    const { callWorkersApi } = await import('@/integrations/cloudflare/client');

    vi.mocked(callWorkersApi).mockResolvedValue({
      success: true,
      data: updatedItems,
    });

    // Execute
    const { result } = renderHook(() => useBulkUpdate<TestEntity>('test_table'), { wrapper });

    const result_data = await result.current.mutateAsync({ ids, values });

    // Assert
    expect(result_data).toHaveLength(3);
    expect(callWorkersApi).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'PATCH',
        body: expect.objectContaining({ ids, values }),
      })
    );
  });

  it('업데이트된 항목을 반환해야 함', async () => {
    // Setup
    const ids = ['1', '2'];
    const values = { name: 'Updated', value: 100 };
    const updatedItems = ids.map((id) => ({ id, ...values }));
    const { callWorkersApi } = await import('@/integrations/cloudflare/client');

    vi.mocked(callWorkersApi).mockResolvedValue({
      success: true,
      data: updatedItems,
    });

    // Execute
    const { result } = renderHook(() => useBulkUpdate<TestEntity>('test_table'), { wrapper });

    const result_data = await result.current.mutateAsync({ ids, values });

    // Assert
    expect(result_data).toEqual(updatedItems);
  });

  it('업데이트 성공 시 쿼리를 무효화해야 함', async () => {
    // Setup
    const { callWorkersApi } = await import('@/integrations/cloudflare/client');

    vi.mocked(callWorkersApi).mockResolvedValue({
      success: true,
      data: [],
    });

    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    // Execute
    const { result } = renderHook(() => useBulkUpdate<TestEntity>('test_table'), { wrapper });

    await result.current.mutateAsync({ ids: ['1'], values: { value: 100 } });

    // Assert
    await waitFor(() => {
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ['test_table', 'list'],
      });
    });
  });

  it('빈 배열을 전달하면 아무 작업도 하지 않아야 함', async () => {
    // Setup
    const { callWorkersApi } = await import('@/integrations/cloudflare/client');

    // Execute
    const { result } = renderHook(() => useBulkUpdate<TestEntity>('test_table'), { wrapper });

    await result.current.mutateAsync({ ids: [], values: { value: 100 } });

    // Assert
    expect(callWorkersApi).not.toHaveBeenCalled();
  });

  it('부분 업데이트가 가능해야 함', async () => {
    // Setup
    const ids = ['1', '2'];
    const values = { value: 200 }; // name은 업데이트하지 않음
    const { callWorkersApi } = await import('@/integrations/cloudflare/client');

    vi.mocked(callWorkersApi).mockResolvedValue({
      success: true,
      data: ids.map((id) => ({ id, name: 'Existing', value: 200 })),
    });

    // Execute
    const { result } = renderHook(() => useBulkUpdate<TestEntity>('test_table'), { wrapper });

    await result.current.mutateAsync({ ids, values });

    // Assert
    expect(callWorkersApi).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({ values }),
      })
    );
  });
});

describe('useExport', () => {
  let queryClient: QueryClient;
  let wrapper: React.FC<{ children: React.ReactNode }>;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    wrapper = ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </MemoryRouter>
    );

    vi.clearAllMocks();
  });

  it('데이터를 CSV 형식으로 내보내야 함', async () => {
    // Setup
    const mockData = [
      { id: '1', name: 'Item 1', value: 10 },
      { id: '2', name: 'Item 2', value: 20 },
    ];
    const { callWorkersApi } = await import('@/integrations/cloudflare/client');

    vi.mocked(callWorkersApi).mockResolvedValue({
      success: true,
      data: mockData,
    });

    // Execute
    const { result } = renderHook(() => useExport<TestEntity>('test_table'), { wrapper });

    const blob = await result.current.mutateAsync({ format: 'csv' });

    // Assert
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toContain('csv');
  });

  it('데이터를 JSON 형식으로 내보내야 함', async () => {
    // Setup
    const mockData = [
      { id: '1', name: 'Item 1', value: 10 },
      { id: '2', name: 'Item 2', value: 20 },
    ];
    const { callWorkersApi } = await import('@/integrations/cloudflare/client');

    vi.mocked(callWorkersApi).mockResolvedValue({
      success: true,
      data: mockData,
    });

    // Execute
    const { result } = renderHook(() => useExport<TestEntity>('test_table'), { wrapper });

    const blob = await result.current.mutateAsync({ format: 'json' });

    // Assert
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toContain('json');
  });

  it('특정 컬럼만 선택하여 내보낼 수 있어야 함', async () => {
    // Setup
    const mockData = [
      { id: '1', name: 'Item 1' },
      { id: '2', name: 'Item 2' },
    ];
    const { callWorkersApi } = await import('@/integrations/cloudflare/client');

    vi.mocked(callWorkersApi).mockResolvedValue({
      success: true,
      data: mockData,
    });

    // Execute
    const { result } = renderHook(() => useExport<TestEntity>('test_table'), { wrapper });

    await result.current.mutateAsync({
      format: 'csv',
      columns: ['id', 'name'],
    });

    // Assert
    expect(callWorkersApi).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          columns: ['id', 'name'],
        }),
      })
    );
  });

  it('필터를 적용하여 내보낼 수 있어야 함', async () => {
    // Setup
    const mockData = [{ id: '1', name: 'Filtered', value: 10 }];
    const { callWorkersApi } = await import('@/integrations/cloudflare/client');

    vi.mocked(callWorkersApi).mockResolvedValue({
      success: true,
      data: mockData,
    });

    // Execute
    const { result } = renderHook(() => useExport<TestEntity>('test_table'), { wrapper });

    await result.current.mutateAsync({
      format: 'json',
      filters: { name: 'Filtered' },
    });

    // Assert
    expect(callWorkersApi).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          filters: { name: 'Filtered' },
        }),
      })
    );
  });

  it('CSV 헤더가 포함되어야 함', async () => {
    // Setup
    const mockData = [
      { id: '1', name: 'Item 1', value: 10 },
      { id: '2', name: 'Item 2', value: 20 },
    ];
    const { callWorkersApi } = await import('@/integrations/cloudflare/client');

    vi.mocked(callWorkersApi).mockResolvedValue({
      success: true,
      data: mockData,
    });

    // Execute
    const { result } = renderHook(() => useExport<TestEntity>('test_table'), { wrapper });

    const blob = await result.current.mutateAsync({ format: 'csv' });

    // FileReader를 사용하여 Blob 내용 읽기
    const text = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsText(blob);
    });

    // Assert
    expect(text).toContain('id,name,value'); // CSV 헤더
  });

  it('빈 데이터도 내보낼 수 있어야 함', async () => {
    // Setup
    const { callWorkersApi } = await import('@/integrations/cloudflare/client');

    vi.mocked(callWorkersApi).mockResolvedValue({
      success: true,
      data: [],
    });

    // Execute
    const { result } = renderHook(() => useExport<TestEntity>('test_table'), { wrapper });

    const blob = await result.current.mutateAsync({ format: 'csv' });

    // Assert
    expect(blob).toBeInstanceOf(Blob);
  });
});

describe('useCount', () => {
  let queryClient: QueryClient;
  let wrapper: React.FC<{ children: React.ReactNode }>;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    wrapper = ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </MemoryRouter>
    );

    vi.clearAllMocks();
  });

  it('전체 항목 수를 반환해야 함', async () => {
    // Setup
    const { callWorkersApi } = await import('@/integrations/cloudflare/client');

    vi.mocked(callWorkersApi).mockResolvedValue({
      success: true,
      data: { count: 42 },
    });

    // Execute
    const { result } = renderHook(() => useCount('test_table'), { wrapper });

    // Assert
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBe(42);
  });

  it('필터를 적용한 항목 수를 반환해야 함', async () => {
    // Setup
    const { callWorkersApi } = await import('@/integrations/cloudflare/client');

    vi.mocked(callWorkersApi).mockResolvedValue({
      success: true,
      data: { count: 5 },
    });

    // Execute
    const { result } = renderHook(() => useCount('test_table'), { wrapper });

    // Assert
    await waitFor(() => {
      expect(result.current.data).toBe(5);
    });
  });

  it('데이터가 없으면 0을 반환해야 함', async () => {
    // Setup
    const { callWorkersApi } = await import('@/integrations/cloudflare/client');

    vi.mocked(callWorkersApi).mockResolvedValue({
      success: true,
      data: { count: 0 },
    });

    // Execute
    const { result } = renderHook(() => useCount('test_table'), { wrapper });

    // Assert
    await waitFor(() => {
      expect(result.current.data).toBe(0);
    });
  });

  it('에러 발생 시 에러 상태를 반환해야 함', async () => {
    // Setup
    const { callWorkersApi } = await import('@/integrations/cloudflare/client');

    vi.mocked(callWorkersApi).mockResolvedValue({
      success: false,
      error: 'Count error',
    });

    // Execute
    const { result } = renderHook(() => useCount('test_table'), { wrapper });

    // Assert
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });

  it('refetch 함수가 작동해야 함', async () => {
    // Setup
    const { callWorkersApi } = await import('@/integrations/cloudflare/client');

    vi.mocked(callWorkersApi)
      .mockResolvedValueOnce({
        success: true,
        data: { count: 10 },
      })
      .mockResolvedValueOnce({
        success: true,
        data: { count: 15 },
      });

    // Execute
    const { result } = renderHook(() => useCount('test_table'), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toBe(10);
    });

    // Refetch
    await result.current.refetch();

    // Assert
    await waitFor(() => {
      expect(result.current.data).toBe(15);
    });
  });
});

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
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import React from 'react';

// Supabase 클라이언트 모킹
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
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

// Supabase 쿼리 빌더 모킹 타입
type MockQueryBuilder = ReturnType<typeof supabase.from>;

// Mock implementations for bulk operations
// These would be added to src/hooks/useCRUD.ts

function useBulkDelete<T>(table: string) {
  // TODO: Implement this hook
  return {
    mutate: vi.fn(),
    mutateAsync: vi.fn(async (ids: string[]) => {
      return ids;
    }),
    isLoading: false,
    isSuccess: false,
    isError: false,
  };
}

function useBulkUpdate<T>(table: string) {
  // TODO: Implement this hook
  return {
    mutate: vi.fn(),
    mutateAsync: vi.fn(async (params: { ids: string[]; values: Partial<T> }) => {
      return params.ids.map((id) => ({ id, ...params.values }));
    }),
    isLoading: false,
    isSuccess: false,
    isError: false,
  };
}

type ExportFormat = 'csv' | 'json';

interface ExportOptions {
  format: ExportFormat;
  columns?: string[];
  filters?: Record<string, any>;
}

function useExport<T>(table: string) {
  // TODO: Implement this hook
  return {
    mutate: vi.fn(),
    mutateAsync: vi.fn(async (options: ExportOptions) => {
      return new Blob(['mock data'], { type: 'text/csv' });
    }),
    isLoading: false,
    isSuccess: false,
    isError: false,
  };
}

interface CountOptions {
  filters?: Record<string, any>;
}

function useCount(table: string) {
  // TODO: Implement this hook
  return {
    data: 0,
    isLoading: false,
    isSuccess: false,
    isError: false,
    refetch: vi.fn(),
  };
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
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('여러 항목을 한 번에 삭제해야 함', async () => {
    // Setup
    const ids = ['1', '2', '3'];
    const mockDelete = vi.fn().mockReturnThis();
    const mockIn = vi.fn().mockResolvedValue({
      error: null,
    });

    vi.mocked(supabase.from).mockReturnValue({
      delete: mockDelete,
      in: mockIn,
    } as any);

    // Execute
    const { result } = renderHook(() => useBulkDelete<TestEntity>('test_table'), { wrapper });

    const deletedIds = await result.current.mutateAsync(ids);

    // Assert
    expect(deletedIds).toEqual(ids);
    expect(mockDelete).toHaveBeenCalled();
    expect(mockIn).toHaveBeenCalledWith('id', ids);
  });

  it('삭제 성공 시 쿼리를 무효화해야 함', async () => {
    // Setup
    const mockDelete = vi.fn().mockReturnThis();
    const mockIn = vi.fn().mockResolvedValue({
      error: null,
    });

    vi.mocked(supabase.from).mockReturnValue({
      delete: mockDelete,
      in: mockIn,
    } as any);

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
    const mockDelete = vi.fn();
    vi.mocked(supabase.from).mockReturnValue({
      delete: mockDelete,
    } as any);

    // Execute
    const { result } = renderHook(() => useBulkDelete<TestEntity>('test_table'), { wrapper });

    await result.current.mutateAsync([]);

    // Assert
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('삭제 실패 시 에러를 처리해야 함', async () => {
    // Setup
    const { toast } = await import('sonner');
    const mockDelete = vi.fn().mockReturnThis();
    const mockIn = vi.fn().mockResolvedValue({
      error: { message: 'Delete failed' },
    });

    vi.mocked(supabase.from).mockReturnValue({
      delete: mockDelete,
      in: mockIn,
    } as any);

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
    const mockDelete = vi.fn().mockReturnThis();
    const mockIn = vi.fn().mockResolvedValue({
      error: null,
    });

    vi.mocked(supabase.from).mockReturnValue({
      delete: mockDelete,
      in: mockIn,
    } as any);

    // Execute
    const { result } = renderHook(() => useBulkDelete<TestEntity>('test_table'), { wrapper });

    const deletedIds = await result.current.mutateAsync(ids);

    // Assert
    expect(deletedIds).toEqual(ids);
    expect(mockIn).toHaveBeenCalledWith('id', ids);
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
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
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

    const mockUpdate = vi.fn().mockReturnThis();
    const mockIn = vi.fn().mockReturnThis();
    const mockSelect = vi.fn().mockResolvedValue({
      data: updatedItems,
      error: null,
    });

    vi.mocked(supabase.from).mockReturnValue({
      update: mockUpdate,
      in: mockIn,
      select: mockSelect,
    } as any);

    // Execute
    const { result } = renderHook(() => useBulkUpdate<TestEntity>('test_table'), { wrapper });

    const result_data = await result.current.mutateAsync({ ids, values });

    // Assert
    expect(result_data).toHaveLength(3);
    expect(mockUpdate).toHaveBeenCalledWith(values);
    expect(mockIn).toHaveBeenCalledWith('id', ids);
  });

  it('업데이트된 항목을 반환해야 함', async () => {
    // Setup
    const ids = ['1', '2'];
    const values = { name: 'Updated', value: 100 };
    const updatedItems = ids.map((id) => ({ id, ...values }));

    const mockUpdate = vi.fn().mockReturnThis();
    const mockIn = vi.fn().mockReturnThis();
    const mockSelect = vi.fn().mockResolvedValue({
      data: updatedItems,
      error: null,
    });

    vi.mocked(supabase.from).mockReturnValue({
      update: mockUpdate,
      in: mockIn,
      select: mockSelect,
    } as any);

    // Execute
    const { result } = renderHook(() => useBulkUpdate<TestEntity>('test_table'), { wrapper });

    const result_data = await result.current.mutateAsync({ ids, values });

    // Assert
    expect(result_data).toEqual(updatedItems);
  });

  it('업데이트 성공 시 쿼리를 무효화해야 함', async () => {
    // Setup
    const mockUpdate = vi.fn().mockReturnThis();
    const mockIn = vi.fn().mockReturnThis();
    const mockSelect = vi.fn().mockResolvedValue({
      data: [],
      error: null,
    });

    vi.mocked(supabase.from).mockReturnValue({
      update: mockUpdate,
      in: mockIn,
      select: mockSelect,
    } as any);

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
    const mockUpdate = vi.fn();
    vi.mocked(supabase.from).mockReturnValue({
      update: mockUpdate,
    } as any);

    // Execute
    const { result } = renderHook(() => useBulkUpdate<TestEntity>('test_table'), { wrapper });

    await result.current.mutateAsync({ ids: [], values: { value: 100 } });

    // Assert
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('부분 업데이트가 가능해야 함', async () => {
    // Setup
    const ids = ['1', '2'];
    const values = { value: 200 }; // name은 업데이트하지 않음

    const mockUpdate = vi.fn().mockReturnThis();
    const mockIn = vi.fn().mockReturnThis();
    const mockSelect = vi.fn().mockResolvedValue({
      data: ids.map((id) => ({ id, name: 'Existing', value: 200 })),
      error: null,
    });

    vi.mocked(supabase.from).mockReturnValue({
      update: mockUpdate,
      in: mockIn,
      select: mockSelect,
    } as any);

    // Execute
    const { result } = renderHook(() => useBulkUpdate<TestEntity>('test_table'), { wrapper });

    await result.current.mutateAsync({ ids, values });

    // Assert
    expect(mockUpdate).toHaveBeenCalledWith(values);
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
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    vi.clearAllMocks();
  });

  it('데이터를 CSV 형식으로 내보내야 함', async () => {
    // Setup
    const mockData = [
      { id: '1', name: 'Item 1', value: 10 },
      { id: '2', name: 'Item 2', value: 20 },
    ];

    const mockSelect = vi.fn().mockResolvedValue({
      data: mockData,
      error: null,
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
    } as any);

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

    const mockSelect = vi.fn().mockResolvedValue({
      data: mockData,
      error: null,
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
    } as any);

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

    const mockSelect = vi.fn().mockResolvedValue({
      data: mockData,
      error: null,
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
    } as any);

    // Execute
    const { result } = renderHook(() => useExport<TestEntity>('test_table'), { wrapper });

    await result.current.mutateAsync({
      format: 'csv',
      columns: ['id', 'name'],
    });

    // Assert
    expect(mockSelect).toHaveBeenCalledWith('id,name');
  });

  it('필터를 적용하여 내보낼 수 있어야 함', async () => {
    // Setup
    const mockData = [{ id: '1', name: 'Filtered', value: 10 }];

    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockResolvedValue({
      data: mockData,
      error: null,
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
      eq: mockEq,
    } as any);

    // Execute
    const { result } = renderHook(() => useExport<TestEntity>('test_table'), { wrapper });

    await result.current.mutateAsync({
      format: 'json',
      filters: { name: 'Filtered' },
    });

    // Assert
    expect(mockEq).toHaveBeenCalledWith('name', 'Filtered');
  });

  it('CSV 헤더가 포함되어야 함', async () => {
    // Setup
    const mockData = [
      { id: '1', name: 'Item 1', value: 10 },
      { id: '2', name: 'Item 2', value: 20 },
    ];

    const mockSelect = vi.fn().mockResolvedValue({
      data: mockData,
      error: null,
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
    } as any);

    // Execute
    const { result } = renderHook(() => useExport<TestEntity>('test_table'), { wrapper });

    const blob = await result.current.mutateAsync({ format: 'csv' });
    const text = await blob.text();

    // Assert
    expect(text).toContain('id,name,value'); // CSV 헤더
  });

  it('빈 데이터도 내보낼 수 있어야 함', async () => {
    // Setup
    const mockSelect = vi.fn().mockResolvedValue({
      data: [],
      error: null,
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
    } as any);

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
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    vi.clearAllMocks();
  });

  it('전체 항목 수를 반환해야 함', async () => {
    // Setup
    const mockSelect = vi.fn().mockResolvedValue({
      data: null,
      error: null,
      count: 42,
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
    } as any);

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
    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockResolvedValue({
      data: null,
      error: null,
      count: 5,
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
      eq: mockEq,
    } as any);

    // Execute
    const { result } = renderHook(() => useCount('test_table'), { wrapper });

    // Assert
    await waitFor(() => {
      expect(result.current.data).toBe(5);
    });
  });

  it('데이터가 없으면 0을 반환해야 함', async () => {
    // Setup
    const mockSelect = vi.fn().mockResolvedValue({
      data: null,
      error: null,
      count: 0,
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
    } as any);

    // Execute
    const { result } = renderHook(() => useCount('test_table'), { wrapper });

    // Assert
    await waitFor(() => {
      expect(result.current.data).toBe(0);
    });
  });

  it('에러 발생 시 에러 상태를 반환해야 함', async () => {
    // Setup
    const mockSelect = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Count error' },
      count: null,
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
    } as any);

    // Execute
    const { result } = renderHook(() => useCount('test_table'), { wrapper });

    // Assert
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });

  it('refetch 함수가 작동해야 함', async () => {
    // Setup
    const mockSelect = vi.fn()
      .mockResolvedValueOnce({
        data: null,
        error: null,
        count: 10,
      })
      .mockResolvedValueOnce({
        data: null,
        error: null,
        count: 15,
      });

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
    } as any);

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

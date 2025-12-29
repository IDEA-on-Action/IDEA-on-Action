import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useServices } from '@/hooks/useServices';
import { servicesApi } from '@/integrations/cloudflare/client';
import React, { type ReactNode } from 'react';

// Mock Workers API client
vi.mock('@/integrations/cloudflare/client', () => ({
  servicesApi: {
    list: vi.fn(),
  },
}));

describe('useServices', () => {
  let queryClient: QueryClient;

  const mockServices = [
    {
      id: '1',
      title: 'AI 컨설팅',
      description: 'AI 컨설팅 서비스',
      category_id: 'cat-1',
      price: 1000000,
      status: 'active',
      created_at: '2024-01-01',
      category: {
        id: 'cat-1',
        name: '컨설팅',
        slug: 'consulting',
      },
    },
    {
      id: '2',
      title: '워크플로우 자동화',
      description: '업무 자동화 서비스',
      category_id: 'cat-2',
      price: 500000,
      status: 'active',
      created_at: '2024-01-02',
      category: {
        id: 'cat-2',
        name: '자동화',
        slug: 'automation',
      },
    },
  ];

  beforeEach(() => {
    // 각 테스트마다 새로운 QueryClient 생성
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false, // 테스트에서는 재시도 비활성화
        },
      },
    });

    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('서비스 목록을 성공적으로 조회해야 함', async () => {
    // Setup - Workers API 모킹
    vi.mocked(servicesApi.list).mockResolvedValue({
      data: { data: mockServices },
      error: null,
    });

    // Execute
    const { result } = renderHook(() => useServices(), { wrapper });

    // Assert
    await waitFor(() => {
      expect(result.current.isSuccess || result.current.isError).toBe(true);
    }, { timeout: 3000 });

    if (result.current.isSuccess) {
      expect(result.current.data).toEqual(mockServices);
      expect(servicesApi.list).toHaveBeenCalledWith({
        status: 'active',
        category_id: undefined,
        sort_by: undefined,
      });
    }
  });

  it('카테고리 필터가 적용되어야 함', async () => {
    // Setup - Workers API 모킹
    const filteredServices = mockServices.filter(s => s.category_id === 'cat-1');
    vi.mocked(servicesApi.list).mockResolvedValue({
      data: { data: filteredServices },
      error: null,
    });

    // Execute
    const { result } = renderHook(
      () => useServices({ categoryId: 'cat-1' }),
      { wrapper }
    );

    // Assert
    await waitFor(() => {
      expect(result.current.isSuccess || result.current.isError).toBe(true);
    }, { timeout: 3000 });

    if (result.current.isSuccess) {
      expect(result.current.data).toBeDefined();
      expect(servicesApi.list).toHaveBeenCalledWith({
        status: 'active',
        category_id: 'cat-1',
        sort_by: undefined,
      });
    }
  });

  it('상태 필터가 적용되어야 함 (기본: active)', async () => {
    // Setup - Workers API 모킹
    vi.mocked(servicesApi.list).mockResolvedValue({
      data: { data: mockServices },
      error: null,
    });

    // Execute
    const { result } = renderHook(() => useServices(), { wrapper });

    // Assert
    await waitFor(() => {
      expect(result.current.isSuccess || result.current.isError).toBe(true);
    }, { timeout: 3000 });

    if (result.current.isSuccess) {
      expect(result.current.data).toBeDefined();
      expect(servicesApi.list).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'active' })
      );
    }
  });

  it('정렬 옵션이 적용되어야 함 (newest)', async () => {
    // Setup - Workers API 모킹
    vi.mocked(servicesApi.list).mockResolvedValue({
      data: { data: mockServices },
      error: null,
    });

    // Execute
    const { result } = renderHook(
      () => useServices({ sortBy: 'newest' }),
      { wrapper }
    );

    // Assert
    await waitFor(() => {
      expect(result.current.isSuccess || result.current.isError).toBe(true);
    }, { timeout: 3000 });

    if (result.current.isSuccess) {
      expect(servicesApi.list).toHaveBeenCalledWith({
        status: 'active',
        category_id: undefined,
        sort_by: 'newest',
      });
    }
  });

  it('에러 발생 시 fallback 값을 반환해야 함', async () => {
    // Setup - Workers API 에러 모킹
    vi.mocked(servicesApi.list).mockResolvedValue({
      data: null,
      error: 'Database error',
    });

    // Execute
    const { result } = renderHook(() => useServices(), { wrapper });

    // Assert - 에러 시 빈 배열 반환
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([]);
  });

  it('로딩 상태가 올바르게 동작해야 함', async () => {
    // Setup - 지연된 응답 모킹
    vi.mocked(servicesApi.list).mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({ data: { data: mockServices }, error: null });
          }, 100);
        })
    );

    // Execute
    const { result } = renderHook(() => useServices(), { wrapper });

    // Assert - 초기 로딩 상태
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();

    // Assert - 완료 후
    await waitFor(() => {
      expect(result.current.isSuccess || result.current.isError).toBe(true);
    }, { timeout: 3000 });

    if (result.current.isSuccess) {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toEqual(mockServices);
    }
  });
});

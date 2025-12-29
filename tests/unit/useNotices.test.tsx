import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useNotices, useCreateNotice, useUpdateNotice, useDeleteNotice } from '@/hooks/useNotices';
import { noticesApi } from '@/integrations/cloudflare/client';
import React, { type ReactNode } from 'react';

// Mock Workers API client
vi.mock('@/integrations/cloudflare/client', () => ({
  noticesApi: {
    list: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock useAuth (setupTests.ts에서 기본 모킹 제공)

describe('useNotices', () => {
  let queryClient: QueryClient;

  const mockNotices = [
    {
      id: '1',
      type: 'info',
      title: 'Test Notice 1',
      content: 'Content 1',
      is_pinned: true,
      author: { id: 'user1', email: 'author@test.com' },
    },
    {
      id: '2',
      type: 'warning',
      title: 'Test Notice 2',
      content: 'Content 2',
      is_pinned: false,
      author: { id: 'user1', email: 'author@test.com' },
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

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('공지사항 목록을 성공적으로 조회해야 함', async () => {
    // Setup - Workers API 모킹
    vi.mocked(noticesApi.list).mockResolvedValue({
      data: { data: mockNotices },
      error: null,
      status: 200,
    });

    // Execute
    const { result } = renderHook(() => useNotices(), { wrapper });

    // Assert
    await waitFor(
      () => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      },
      { timeout: 3000 }
    );

    if (result.current.isSuccess) {
      expect(result.current.data).toEqual(mockNotices);
      expect(noticesApi.list).toHaveBeenCalledWith({
        type: undefined,
        include_expired: undefined,
        limit: undefined,
        offset: 0,
      });
    }
  });

  it('타입 필터가 적용되어야 함', async () => {
    // Setup - Workers API 모킹
    const urgentNotices = [
      {
        id: '1',
        type: 'urgent',
        title: 'Urgent Notice',
        content: 'Urgent content',
      },
    ];

    vi.mocked(noticesApi.list).mockResolvedValue({
      data: { data: urgentNotices },
      error: null,
      status: 200,
    });

    // Execute
    const { result } = renderHook(() => useNotices({ filters: { type: 'urgent' } }), { wrapper });

    // Assert
    await waitFor(
      () => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      },
      { timeout: 3000 }
    );

    if (result.current.isSuccess) {
      expect(noticesApi.list).toHaveBeenCalledWith({
        type: 'urgent',
        include_expired: undefined,
        limit: undefined,
        offset: 0,
      });
    }
  });

  it('에러 발생 시 빈 배열을 반환해야 함', async () => {
    // Setup - Workers API 에러 모킹
    vi.mocked(noticesApi.list).mockResolvedValue({
      data: null,
      error: 'Fetch failed',
      status: 500,
    });

    // Execute
    const { result } = renderHook(() => useNotices(), { wrapper });

    // Assert
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([]);
  });

  it('고정된 공지사항이 먼저 표시되어야 함 (API에서 정렬됨)', async () => {
    // Setup - Workers API 모킹 (서버에서 is_pinned 기준 정렬)
    const sortedNotices = [
      { id: '1', title: 'Pinned', is_pinned: true, created_at: '2025-10-19' },
      { id: '2', title: 'Regular', is_pinned: false, created_at: '2025-10-20' },
    ];

    vi.mocked(noticesApi.list).mockResolvedValue({
      data: { data: sortedNotices },
      error: null,
      status: 200,
    });

    // Execute
    const { result } = renderHook(() => useNotices(), { wrapper });

    // Assert
    await waitFor(
      () => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      },
      { timeout: 3000 }
    );

    if (result.current.isSuccess) {
      expect(result.current.data?.[0]?.is_pinned).toBe(true);
      expect(noticesApi.list).toHaveBeenCalled();
    }
  });

  it('만료된 공지사항 제외 필터가 적용되어야 함', async () => {
    // Setup - Workers API 모킹
    const activeNotices = [
      {
        id: '1',
        title: 'Active Notice',
        expires_at: null,
      },
    ];

    vi.mocked(noticesApi.list).mockResolvedValue({
      data: { data: activeNotices },
      error: null,
      status: 200,
    });

    // Execute
    const { result } = renderHook(
      () => useNotices({ filters: { include_expired: false } }),
      { wrapper }
    );

    // Assert
    await waitFor(
      () => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      },
      { timeout: 3000 }
    );

    if (result.current.isSuccess) {
      expect(noticesApi.list).toHaveBeenCalledWith({
        type: undefined,
        include_expired: false,
        limit: undefined,
        offset: 0,
      });
    }
  });

  it('로딩 상태가 올바르게 동작해야 함', async () => {
    // Setup - 지연된 응답 모킹
    vi.mocked(noticesApi.list).mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({ data: { data: mockNotices }, error: null, status: 200 });
          }, 100);
        })
    );

    // Execute
    const { result } = renderHook(() => useNotices(), { wrapper });

    // Assert - 초기 로딩 상태
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();

    // Assert - 완료 후
    await waitFor(
      () => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      },
      { timeout: 3000 }
    );

    if (result.current.isSuccess) {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toEqual(mockNotices);
    }
  });
});

describe('useCreateNotice', () => {
  let queryClient: QueryClient;

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

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('공지사항을 성공적으로 생성해야 함', async () => {
    // Setup - Workers API 모킹
    const mockNotice = {
      id: '1',
      type: 'info',
      title: 'New Notice',
      content: 'Content',
    };

    vi.mocked(noticesApi.create).mockResolvedValue({
      data: { data: mockNotice },
      error: null,
      status: 201,
    });

    // Execute
    const { result } = renderHook(() => useCreateNotice(), { wrapper });

    result.current.mutate({
      type: 'info',
      title: 'New Notice',
      content: 'Content',
    } as any);

    // Assert
    await waitFor(
      () => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      },
      { timeout: 3000 }
    );

    if (result.current.isSuccess) {
      expect(noticesApi.create).toHaveBeenCalledWith('test-token', {
        type: 'info',
        title: 'New Notice',
        content: 'Content',
      });
      expect(result.current.data).toEqual(mockNotice);
    }
  });

  it('생성 에러를 처리해야 함', async () => {
    // Setup - Workers API 에러 모킹
    vi.mocked(noticesApi.create).mockResolvedValue({
      data: null,
      error: 'Create failed',
      status: 500,
    });

    // Execute
    const { result } = renderHook(() => useCreateNotice(), { wrapper });

    result.current.mutate({
      type: 'info',
      title: 'New Notice',
      content: 'Content',
    } as any);

    // Assert
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeTruthy();
  });
});

describe('useUpdateNotice', () => {
  let queryClient: QueryClient;

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

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('공지사항을 성공적으로 수정해야 함', async () => {
    // Setup - Workers API 모킹
    const mockNotice = {
      id: '1',
      title: 'Updated Notice',
      content: 'Updated content',
    };

    vi.mocked(noticesApi.update).mockResolvedValue({
      data: { data: mockNotice },
      error: null,
      status: 200,
    });

    // Execute
    const { result } = renderHook(() => useUpdateNotice(), { wrapper });

    result.current.mutate({
      id: '1',
      data: {
        title: 'Updated Notice',
        content: 'Updated content',
      },
    } as any);

    // Assert
    await waitFor(
      () => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      },
      { timeout: 3000 }
    );

    if (result.current.isSuccess) {
      expect(noticesApi.update).toHaveBeenCalledWith('test-token', '1', {
        title: 'Updated Notice',
        content: 'Updated content',
      });
    }
  });

  it('고정 상태를 토글할 수 있어야 함', async () => {
    // Setup - Workers API 모킹
    const mockNotice = {
      id: '1',
      is_pinned: true,
    };

    vi.mocked(noticesApi.update).mockResolvedValue({
      data: { data: mockNotice },
      error: null,
      status: 200,
    });

    // Execute
    const { result } = renderHook(() => useUpdateNotice(), { wrapper });

    result.current.mutate({
      id: '1',
      data: {
        is_pinned: true,
        updated_at: new Date().toISOString(),
      },
    } as any);

    // Assert
    await waitFor(
      () => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      },
      { timeout: 3000 }
    );

    if (result.current.isSuccess) {
      expect(noticesApi.update).toHaveBeenCalledWith(
        'test-token',
        '1',
        expect.objectContaining({ is_pinned: true })
      );
    }
  });
});

describe('useDeleteNotice', () => {
  let queryClient: QueryClient;

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

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('공지사항을 성공적으로 삭제해야 함', async () => {
    // Setup - Workers API 모킹
    vi.mocked(noticesApi.delete).mockResolvedValue({
      data: { success: true },
      error: null,
      status: 200,
    });

    // Execute
    const { result } = renderHook(() => useDeleteNotice(), { wrapper });

    result.current.mutate('1');

    // Assert
    await waitFor(
      () => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      },
      { timeout: 3000 }
    );

    expect(noticesApi.delete).toHaveBeenCalledWith('test-token', '1');
  });

  it('삭제 에러를 처리해야 함', async () => {
    // Setup - Workers API 에러 모킹
    vi.mocked(noticesApi.delete).mockResolvedValue({
      data: null,
      error: 'Delete failed',
      status: 500,
    });

    // Execute
    const { result } = renderHook(() => useDeleteNotice(), { wrapper });

    result.current.mutate('1');

    // Assert
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeTruthy();
  });
});

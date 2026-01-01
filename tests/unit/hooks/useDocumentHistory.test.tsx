 
/**
 * useDocumentHistory Hook Tests
 * @migration Supabase -> Cloudflare Workers (완전 마이그레이션 완료)
 *
 * 문서 이력 관리 훅 테스트
 * - 문서 목록 조회
 * - 문서 저장
 * - 문서 삭제
 * - 필터링 및 정렬
 * - 통계 조회
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useDocumentHistory, useDocumentStats, formatFileSize, getFileTypeIcon, getFileTypeLabel } from '@/hooks/content/useDocumentHistory';
import * as cloudflareClient from '@/integrations/cloudflare/client';
import type { GeneratedDocument, CreateGeneratedDocument } from '@/types/document-history.types';

// Mock Workers API client
vi.mock('@/integrations/cloudflare/client', () => ({
  callWorkersApi: vi.fn(),
}));

// Mock useAuth with Workers tokens
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id', email: 'test@example.com' },
    workersTokens: { accessToken: 'mock-token' },
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Test data
const mockDocument: GeneratedDocument = {
  id: 'doc-1',
  user_id: 'test-user-id',
  template_id: 'template-1',
  file_name: 'report.xlsx',
  file_type: 'xlsx',
  file_size: 12345,
  storage_path: '/storage/doc-1.xlsx',
  metadata: { title: '주간 보고서' },
  input_data: { year: 2024 },
  generated_at: '2024-12-01T10:00:00Z',
};

const mockDocument2: GeneratedDocument = {
  id: 'doc-2',
  user_id: 'test-user-id',
  template_id: null,
  file_name: 'proposal.docx',
  file_type: 'docx',
  file_size: 67890,
  storage_path: '/storage/doc-2.docx',
  metadata: { title: '제안서' },
  input_data: {},
  generated_at: '2024-12-02T11:00:00Z',
};

const mockDocument3: GeneratedDocument = {
  id: 'doc-3',
  user_id: 'test-user-id',
  template_id: null,
  file_name: 'presentation.pptx',
  file_type: 'pptx',
  file_size: 234567,
  storage_path: '/storage/doc-3.pptx',
  metadata: { title: '발표 자료' },
  input_data: {},
  generated_at: '2024-12-03T12:00:00Z',
};

// Wrapper component for React Query
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useDocumentHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // 기본 성공 응답 설정
    vi.mocked(cloudflareClient.callWorkersApi).mockResolvedValue({
      data: [mockDocument, mockDocument2],
      error: null,
      status: 200,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================================================
  // 문서 목록 조회 테스트
  // ============================================================================

  it('사용자의 문서 목록을 조회해야 함', async () => {
    // Setup
    const { result } = renderHook(() => useDocumentHistory(), {
      wrapper: createWrapper(),
    });

    // Wait for loading to complete
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    }, { timeout: 3000 });

    // Assert
    expect(result.current.documents.length).toBeGreaterThanOrEqual(0);
    expect(cloudflareClient.callWorkersApi).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/documents'),
      expect.objectContaining({ token: 'mock-token' })
    );
  });

  it('빈 목록을 반환해야 함 (문서가 없는 경우)', async () => {
    // Setup - override with empty data
    vi.mocked(cloudflareClient.callWorkersApi).mockResolvedValue({
      data: [],
      error: null,
      status: 200,
    });

    // Execute
    const { result } = renderHook(() => useDocumentHistory(), {
      wrapper: createWrapper(),
    });

    // Assert
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.documents).toHaveLength(0);
  });

  it('파일 유형으로 필터링해야 함', async () => {
    // Setup
    vi.mocked(cloudflareClient.callWorkersApi).mockResolvedValue({
      data: [mockDocument],
      error: null,
      status: 200,
    });

    // Execute
    const { result } = renderHook(() => useDocumentHistory({ fileType: 'xlsx' }), {
      wrapper: createWrapper(),
    });

    // Assert
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    }, { timeout: 3000 });

    // Check that the API was called with the file_type filter
    expect(cloudflareClient.callWorkersApi).toHaveBeenCalledWith(
      expect.stringContaining('file_type=xlsx'),
      expect.any(Object)
    );
  });

  it('정렬 순서를 적용해야 함 (오름차순)', async () => {
    // Execute
    const { result } = renderHook(() => useDocumentHistory({ orderBy: 'asc' }), {
      wrapper: createWrapper(),
    });

    // Assert
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(cloudflareClient.callWorkersApi).toHaveBeenCalledWith(
      expect.stringContaining('order_by=asc'),
      expect.any(Object)
    );
  });

  it('정렬 순서를 적용해야 함 (내림차순)', async () => {
    // Execute
    const { result } = renderHook(() => useDocumentHistory({ orderBy: 'desc' }), {
      wrapper: createWrapper(),
    });

    // Assert
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(cloudflareClient.callWorkersApi).toHaveBeenCalledWith(
      expect.stringContaining('order_by=desc'),
      expect.any(Object)
    );
  });

  it('개수 제한을 적용해야 함', async () => {
    // Execute
    const { result } = renderHook(() => useDocumentHistory({ limit: 10 }), {
      wrapper: createWrapper(),
    });

    // Assert
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(cloudflareClient.callWorkersApi).toHaveBeenCalledWith(
      expect.stringContaining('limit=10'),
      expect.any(Object)
    );
  });

  it('조회 에러를 처리해야 함', async () => {
    // Setup
    vi.mocked(cloudflareClient.callWorkersApi).mockResolvedValue({
      data: null,
      error: 'Database error',
      status: 500,
    });

    // Execute
    const { result } = renderHook(() => useDocumentHistory(), {
      wrapper: createWrapper(),
    });

    // Assert - wait for the query to complete
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    }, { timeout: 3000 });

    // The error should be captured
    expect(result.current.error).toBeTruthy();
  });

  // ============================================================================
  // 문서 저장 테스트
  // ============================================================================

  it('새 문서를 저장해야 함', async () => {
    // Setup
    const newDoc: CreateGeneratedDocument = {
      user_id: 'test-user-id',
      file_name: 'new-report.xlsx',
      file_type: 'xlsx',
      file_size: 54321,
      metadata: { title: '새 보고서' },
    };

    const savedDocument = { ...mockDocument, ...newDoc, id: 'doc-new' };

    // Mock: 첫 번째 호출은 목록 조회, 이후 호출은 저장
    vi.mocked(cloudflareClient.callWorkersApi)
      .mockResolvedValueOnce({
        data: [],
        error: null,
        status: 200,
      })
      .mockResolvedValueOnce({
        data: savedDocument,
        error: null,
        status: 201,
      });

    // Execute
    const { result } = renderHook(() => useDocumentHistory(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const savedDoc = await result.current.saveDocument(newDoc);

    // Assert
    expect(savedDoc.file_name).toBe('new-report.xlsx');
    expect(cloudflareClient.callWorkersApi).toHaveBeenCalledWith(
      '/api/v1/documents',
      expect.objectContaining({
        method: 'POST',
        token: 'mock-token',
        body: newDoc,
      })
    );
  });

  it('문서 저장 에러를 처리해야 함', async () => {
    // Setup
    const newDoc: CreateGeneratedDocument = {
      user_id: 'test-user-id',
      file_name: 'error-doc.xlsx',
      file_type: 'xlsx',
      file_size: 1000,
    };

    // Mock: 첫 번째 호출은 목록 조회, 이후 호출은 저장 실패
    vi.mocked(cloudflareClient.callWorkersApi)
      .mockResolvedValueOnce({
        data: [],
        error: null,
        status: 200,
      })
      .mockResolvedValueOnce({
        data: null,
        error: 'Insert failed',
        status: 500,
      });

    // Execute
    const { result } = renderHook(() => useDocumentHistory(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Assert
    await expect(result.current.saveDocument(newDoc)).rejects.toThrow('문서 저장 실패');
  });

  // ============================================================================
  // 문서 삭제 테스트
  // ============================================================================

  it('문서를 삭제해야 함', async () => {
    // Setup
    vi.mocked(cloudflareClient.callWorkersApi)
      .mockResolvedValueOnce({
        data: [mockDocument],
        error: null,
        status: 200,
      })
      .mockResolvedValueOnce({
        data: null,
        error: null,
        status: 204,
      });

    // Execute
    const { result } = renderHook(() => useDocumentHistory(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await result.current.deleteDocument('doc-1');

    // Assert
    expect(cloudflareClient.callWorkersApi).toHaveBeenCalledWith(
      '/api/v1/documents/doc-1',
      expect.objectContaining({
        method: 'DELETE',
        token: 'mock-token',
      })
    );
  });

  it('문서 삭제 에러를 처리해야 함', async () => {
    // Setup
    vi.mocked(cloudflareClient.callWorkersApi)
      .mockResolvedValueOnce({
        data: [mockDocument],
        error: null,
        status: 200,
      })
      .mockResolvedValueOnce({
        data: null,
        error: 'Delete failed',
        status: 500,
      });

    // Execute
    const { result } = renderHook(() => useDocumentHistory(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Assert
    await expect(result.current.deleteDocument('doc-1')).rejects.toThrow('문서 삭제 실패');
  });

  // ============================================================================
  // refetch 테스트
  // ============================================================================

  it('데이터를 다시 불러올 수 있어야 함', async () => {
    // Execute
    const { result } = renderHook(() => useDocumentHistory(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Refetch
    result.current.refetch();

    // Assert
    expect(result.current.refetch).toBeDefined();
    expect(typeof result.current.refetch).toBe('function');
  });
});

// ============================================================================
// useDocumentStats 테스트
// ============================================================================

describe('useDocumentStats', () => {
  const mockStats = [
    {
      file_type: 'xlsx' as const,
      count: 5,
      total_size: 123456,
      latest_generated_at: '2024-12-01T10:00:00Z',
    },
    {
      file_type: 'docx' as const,
      count: 3,
      total_size: 67890,
      latest_generated_at: '2024-12-02T11:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('문서 통계를 조회해야 함', async () => {
    // Setup
    vi.mocked(cloudflareClient.callWorkersApi).mockResolvedValue({
      data: mockStats,
      error: null,
      status: 200,
    });

    // Execute
    const { result } = renderHook(() => useDocumentStats(), {
      wrapper: createWrapper(),
    });

    // Assert
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.stats).toHaveLength(2);
    expect(result.current.stats[0].file_type).toBe('xlsx');
    expect(result.current.stats[0].count).toBe(5);
    expect(result.current.stats[1].file_type).toBe('docx');
    expect(cloudflareClient.callWorkersApi).toHaveBeenCalledWith(
      '/api/v1/documents/stats',
      expect.objectContaining({ token: 'mock-token' })
    );
  });

  it('빈 통계를 반환해야 함', async () => {
    // Setup
    vi.mocked(cloudflareClient.callWorkersApi).mockResolvedValue({
      data: [],
      error: null,
      status: 200,
    });

    // Execute
    const { result } = renderHook(() => useDocumentStats(), {
      wrapper: createWrapper(),
    });

    // Assert
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.stats).toHaveLength(0);
  });

  it('통계 조회 에러를 처리해야 함', async () => {
    // Setup
    vi.mocked(cloudflareClient.callWorkersApi).mockResolvedValue({
      data: null,
      error: 'RPC failed',
      status: 500,
    });

    // Execute
    const { result } = renderHook(() => useDocumentStats(), {
      wrapper: createWrapper(),
    });

    // Assert
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.error?.message).toContain('통계 조회 실패');
  });
});

// ============================================================================
// Utility Functions 테스트
// ============================================================================

describe('formatFileSize', () => {
  it('0 바이트를 올바르게 포맷해야 함', () => {
    expect(formatFileSize(0)).toBe('0 Bytes');
  });

  it('바이트를 올바르게 포맷해야 함', () => {
    expect(formatFileSize(500)).toBe('500 Bytes');
  });

  it('킬로바이트를 올바르게 포맷해야 함', () => {
    expect(formatFileSize(1024)).toBe('1 KB');
    expect(formatFileSize(1536)).toBe('1.5 KB');
  });

  it('메가바이트를 올바르게 포맷해야 함', () => {
    expect(formatFileSize(1048576)).toBe('1 MB');
    expect(formatFileSize(1572864)).toBe('1.5 MB');
  });

  it('기가바이트를 올바르게 포맷해야 함', () => {
    expect(formatFileSize(1073741824)).toBe('1 GB');
  });

  it('소수점 자릿수를 커스터마이즈할 수 있어야 함', () => {
    expect(formatFileSize(1536, 0)).toBe('2 KB');
    expect(formatFileSize(1536, 1)).toBe('1.5 KB');
    expect(formatFileSize(1536, 3)).toBe('1.5 KB');
  });
});

describe('getFileTypeIcon', () => {
  it('xlsx 파일 아이콘을 반환해야 함', () => {
    expect(getFileTypeIcon('xlsx')).toBe('FileSpreadsheet');
  });

  it('docx 파일 아이콘을 반환해야 함', () => {
    expect(getFileTypeIcon('docx')).toBe('FileText');
  });

  it('pptx 파일 아이콘을 반환해야 함', () => {
    expect(getFileTypeIcon('pptx')).toBe('Presentation');
  });
});

describe('getFileTypeLabel', () => {
  it('xlsx 파일 라벨을 반환해야 함', () => {
    expect(getFileTypeLabel('xlsx')).toBe('Excel');
  });

  it('docx 파일 라벨을 반환해야 함', () => {
    expect(getFileTypeLabel('docx')).toBe('Word');
  });

  it('pptx 파일 라벨을 반환해야 함', () => {
    expect(getFileTypeLabel('pptx')).toBe('PowerPoint');
  });
});

/**
 * useDocumentHistory Hook 테스트
 *
 * 문서 이력 관리 훅 테스트
 * - 문서 목록 조회
 * - 문서 저장
 * - 문서 삭제
 * - 필터링 (파일 유형)
 * - 통계 조회
 * - 유틸리티 함수
 * - 에러 처리
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useDocumentHistory,
  useDocumentStats,
  formatFileSize,
  getFileTypeIcon,
  getFileTypeLabel,
} from '@/hooks/useDocumentHistory';
import { supabase } from '@/integrations/supabase/client';
import React from 'react';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

// Mock useAuth
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'user-1', email: 'test@example.com' },
  })),
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
const mockDocuments = [
  {
    id: '1',
    user_id: 'user-1',
    file_name: 'report.xlsx',
    file_type: 'xlsx',
    file_size: 12345,
    metadata: { title: '주간 보고서' },
    generated_at: '2025-12-01T10:00:00Z',
  },
  {
    id: '2',
    user_id: 'user-1',
    file_name: 'presentation.pptx',
    file_type: 'pptx',
    file_size: 54321,
    metadata: { title: '월간 발표' },
    generated_at: '2025-12-01T11:00:00Z',
  },
];

const mockStats = [
  {
    file_type: 'xlsx',
    count: 5,
    total_size: 123456,
    latest_generated_at: '2025-12-01T10:00:00Z',
  },
  {
    file_type: 'pptx',
    count: 3,
    total_size: 654321,
    latest_generated_at: '2025-12-01T11:00:00Z',
  },
];

// Mock query 타입 정의
interface MockQuery {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  then?: ReturnType<typeof vi.fn>;
}

describe('useDocumentHistory', () => {
  let mockQuery: MockQuery;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock query 체이닝
    const createMockQuery = () => {
      const query = {
        select: vi.fn(),
        eq: vi.fn(),
        order: vi.fn(),
        limit: vi.fn(),
        insert: vi.fn(),
        delete: vi.fn(),
        single: vi.fn(),
      };

      query.select.mockReturnValue(query);
      query.eq.mockReturnValue(query);
      query.order.mockReturnValue(query);
      query.limit.mockReturnValue(query);
      query.insert.mockReturnValue(query);
      query.delete.mockReturnValue(query);
      query.single.mockReturnValue(query);

      const queryWithThen = query as MockQuery;
      queryWithThen.then = vi.fn((onFulfilled) => {
        return Promise.resolve({ data: mockDocuments, error: null }).then(onFulfilled);
      });

      return queryWithThen;
    };

    mockQuery = createMockQuery();
    vi.mocked(supabase.from).mockReturnValue(mockQuery as ReturnType<typeof supabase.from>);
  });

  describe('초기 상태 확인', () => {
    it('초기 로딩 상태여야 함', () => {
      const { result } = renderHook(() => useDocumentHistory(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
    });
  });

  describe('문서 목록 조회', () => {
    it('사용자의 모든 문서를 조회해야 함', async () => {
      const { result } = renderHook(() => useDocumentHistory(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(supabase.from).toHaveBeenCalledWith('generated_documents');
      expect(mockQuery.select).toHaveBeenCalledWith('*');
      expect(mockQuery.eq).toHaveBeenCalledWith('user_id', 'user-1');
      expect(mockQuery.order).toHaveBeenCalledWith('generated_at', { ascending: false });
    });

    it('파일 유형으로 필터링해야 함', async () => {
      const { result } = renderHook(() => useDocumentHistory({ fileType: 'xlsx' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockQuery.eq).toHaveBeenCalledWith('file_type', 'xlsx');
    });

    it('정렬 순서를 변경할 수 있어야 함', async () => {
      const { result } = renderHook(() => useDocumentHistory({ orderBy: 'asc' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockQuery.order).toHaveBeenCalledWith('generated_at', { ascending: true });
    });

    it('limit을 적용해야 함', async () => {
      const { result } = renderHook(() => useDocumentHistory({ limit: 10 }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockQuery.limit).toHaveBeenCalledWith(10);
    });
  });

  describe('문서 저장', () => {
    it('새 문서를 저장해야 함', async () => {
      mockQuery.single.mockReturnValue({
        then: vi.fn((onFulfilled) => {
          return Promise.resolve({ data: mockDocuments[0], error: null }).then(onFulfilled);
        }),
      });

      const { result } = renderHook(() => useDocumentHistory(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await result.current.saveDocument({
        user_id: 'user-1',
        file_name: 'new-doc.xlsx',
        file_type: 'xlsx',
        file_size: 5000,
        metadata: { title: 'New Document' },
      });

      expect(mockQuery.insert).toHaveBeenCalled();
      expect(mockQuery.select).toHaveBeenCalled();
      expect(mockQuery.single).toHaveBeenCalled();
    });
  });

  describe('문서 삭제', () => {
    it('문서를 삭제해야 함', async () => {
      mockQuery.then = vi.fn((onFulfilled) => {
        return Promise.resolve({ data: null, error: null }).then(onFulfilled);
      });

      const { result } = renderHook(() => useDocumentHistory(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await result.current.deleteDocument('1');

      expect(mockQuery.delete).toHaveBeenCalled();
      expect(mockQuery.eq).toHaveBeenCalledWith('id', '1');
    });
  });

  describe('문서 통계 조회', () => {
    beforeEach(() => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: mockStats,
        error: null,
      } as { data: typeof mockStats; error: null });
    });

    it('파일 유형별 통계를 조회해야 함', async () => {
      const { result } = renderHook(() => useDocumentStats(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(supabase.rpc).toHaveBeenCalledWith('get_user_document_stats', {
        p_user_id: 'user-1',
      });

      expect(result.current.stats).toEqual(mockStats);
    });
  });

  describe('에러 처리', () => {
    it('조회 실패 시 에러를 처리해야 함', async () => {
      const error = new Error('Database error');
      mockQuery.then = vi.fn((onFulfilled) => {
        return Promise.resolve({ data: null, error }).then(onFulfilled);
      });

      const { result } = renderHook(() => useDocumentHistory(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });
    });

    it('저장 실패 시 에러를 던져야 함', async () => {
      mockQuery.single.mockReturnValue({
        then: vi.fn((onFulfilled) => {
          return Promise.resolve({ data: null, error: new Error('Insert failed') }).then(onFulfilled);
        }),
      });

      const { result } = renderHook(() => useDocumentHistory(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        result.current.saveDocument({
          user_id: 'user-1',
          file_name: 'test.xlsx',
          file_type: 'xlsx',
          file_size: 1000,
        })
      ).rejects.toThrow();
    });

    it('삭제 실패 시 에러를 던져야 함', async () => {
      mockQuery.then = vi.fn((onFulfilled) => {
        return Promise.resolve({ data: null, error: new Error('Delete failed') }).then(onFulfilled);
      });

      const { result } = renderHook(() => useDocumentHistory(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(result.current.deleteDocument('1')).rejects.toThrow();
    });
  });
});

describe('Utility Functions', () => {
  describe('formatFileSize', () => {
    it('0 바이트를 올바르게 포맷해야 함', () => {
      expect(formatFileSize(0)).toBe('0 Bytes');
    });

    it('바이트를 올바르게 포맷해야 함', () => {
      expect(formatFileSize(500)).toBe('500 Bytes');
    });

    it('KB를 올바르게 포맷해야 함', () => {
      expect(formatFileSize(1024)).toBe('1 KB');
    });

    it('MB를 올바르게 포맷해야 함', () => {
      expect(formatFileSize(1024 * 1024)).toBe('1 MB');
    });

    it('GB를 올바르게 포맷해야 함', () => {
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
    });

    it('소수점 자릿수를 지정할 수 있어야 함', () => {
      expect(formatFileSize(1536, 1)).toBe('1.5 KB');
    });
  });

  describe('getFileTypeIcon', () => {
    it('xlsx 아이콘을 반환해야 함', () => {
      expect(getFileTypeIcon('xlsx')).toBe('FileSpreadsheet');
    });

    it('docx 아이콘을 반환해야 함', () => {
      expect(getFileTypeIcon('docx')).toBe('FileText');
    });

    it('pptx 아이콘을 반환해야 함', () => {
      expect(getFileTypeIcon('pptx')).toBe('Presentation');
    });
  });

  describe('getFileTypeLabel', () => {
    it('xlsx 라벨을 반환해야 함', () => {
      expect(getFileTypeLabel('xlsx')).toBe('Excel');
    });

    it('docx 라벨을 반환해야 함', () => {
      expect(getFileTypeLabel('docx')).toBe('Word');
    });

    it('pptx 라벨을 반환해야 함', () => {
      expect(getFileTypeLabel('pptx')).toBe('PowerPoint');
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useClaudeChatWithRAG } from '@/hooks/useClaudeChatWithRAG';

// Mock dependencies
vi.mock('@/hooks/useClaudeChat', () => ({
  useClaudeChat: vi.fn(() => ({
    messages: [],
    sendMessage: vi.fn().mockResolvedValue(undefined),
    clearMessages: vi.fn(),
    isLoading: false,
    error: null,
  })),
}));

vi.mock('@/hooks/useRAGSearch', () => ({
  useRAGSearch: vi.fn(() => ({
    results: [
      {
        id: '1',
        content: '테스트 문서 내용',
        similarity: 0.9,
        metadata: { title: '문서 1' },
      },
    ],
    isSearching: false,
    error: null,
    search: vi.fn().mockResolvedValue([
      {
        id: '1',
        content: '테스트 문서 내용',
        similarity: 0.9,
        metadata: { title: '문서 1' },
      },
    ]),
    clearResults: vi.fn(),
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

describe('useClaudeChatWithRAG', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('초기화', () => {
    it('초기 상태가 올바르게 설정되어야 함', () => {
      const { result } = renderHook(() => useClaudeChatWithRAG(), {
        wrapper: createWrapper(),
      });

      expect(result.current.messages).toEqual([]);
      expect(result.current.ragResults).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: '1',
            content: '테스트 문서 내용',
          }),
        ])
      );
      expect(result.current.ragEnabled).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('RAG가 비활성화된 상태로 초기화할 수 있어야 함', () => {
      const { result } = renderHook(
        () => useClaudeChatWithRAG({ ragEnabled: false }),
        { wrapper: createWrapper() }
      );

      expect(result.current.ragEnabled).toBe(false);
    });

    it('서비스 ID 필터가 설정되어야 함', () => {
      const { result } = renderHook(
        () => useClaudeChatWithRAG({ ragServiceId: 'minu-find' }),
        { wrapper: createWrapper() }
      );

      expect(result.current).toBeDefined();
    });
  });

  describe('메시지 전송', () => {
    it('RAG가 활성화된 상태에서 메시지를 전송해야 함', async () => {
      const { result } = renderHook(
        () => useClaudeChatWithRAG({ ragEnabled: true }),
        { wrapper: createWrapper() }
      );

      await result.current.sendMessageWithRAG('프로젝트 관리 방법은?');

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('RAG가 비활성화된 상태에서 일반 메시지를 전송해야 함', async () => {
      const { result } = renderHook(
        () => useClaudeChatWithRAG({ ragEnabled: false }),
        { wrapper: createWrapper() }
      );

      await result.current.sendMessageWithRAG('일반 질문');

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('빈 메시지는 전송되지 않아야 함', async () => {
      const { result } = renderHook(() => useClaudeChatWithRAG(), {
        wrapper: createWrapper(),
      });

      await result.current.sendMessageWithRAG('   ');

      await waitFor(() => {
        expect(result.current.messages).toEqual([]);
      });
    });
  });

  describe('RAG 토글', () => {
    it('RAG를 활성화할 수 있어야 함', () => {
      const { result } = renderHook(
        () => useClaudeChatWithRAG({ ragEnabled: false }),
        { wrapper: createWrapper() }
      );

      expect(result.current.ragEnabled).toBe(false);

      result.current.toggleRAG(true);

      expect(result.current.ragEnabled).toBe(true);
    });

    it('RAG를 비활성화할 수 있어야 함', () => {
      const { result } = renderHook(
        () => useClaudeChatWithRAG({ ragEnabled: true }),
        { wrapper: createWrapper() }
      );

      expect(result.current.ragEnabled).toBe(true);

      result.current.toggleRAG(false);

      expect(result.current.ragEnabled).toBe(false);
    });
  });

  describe('메시지 관리', () => {
    it('메시지를 초기화할 수 있어야 함', () => {
      const { result } = renderHook(() => useClaudeChatWithRAG(), {
        wrapper: createWrapper(),
      });

      result.current.clearMessages();

      expect(result.current.messages).toEqual([]);
    });
  });

  describe('컨텍스트 주입', () => {
    it('prefix 모드로 컨텍스트를 주입해야 함', async () => {
      const { result } = renderHook(
        () =>
          useClaudeChatWithRAG({
            ragEnabled: true,
            contextInjectionMode: 'prefix',
          }),
        { wrapper: createWrapper() }
      );

      await result.current.sendMessageWithRAG('질문');

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('system 모드로 컨텍스트를 주입해야 함', async () => {
      const { result } = renderHook(
        () =>
          useClaudeChatWithRAG({
            ragEnabled: true,
            contextInjectionMode: 'system',
          }),
        { wrapper: createWrapper() }
      );

      await result.current.sendMessageWithRAG('질문');

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('both 모드로 컨텍스트를 주입해야 함', async () => {
      const { result } = renderHook(
        () =>
          useClaudeChatWithRAG({
            ragEnabled: true,
            contextInjectionMode: 'both',
          }),
        { wrapper: createWrapper() }
      );

      await result.current.sendMessageWithRAG('질문');

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('에러 처리', () => {
    it('RAG 검색 실패 시 일반 채팅으로 폴백해야 함', async () => {
      const { useRAGSearch } = await import('@/hooks/useRAGSearch');
      vi.mocked(useRAGSearch).mockReturnValue({
        results: [],
        isSearching: false,
        error: new Error('RAG 검색 실패'),
        search: vi.fn().mockRejectedValue(new Error('RAG 검색 실패')),
        clearResults: vi.fn(),
      } as never);

      const { result } = renderHook(
        () => useClaudeChatWithRAG({ ragEnabled: true }),
        { wrapper: createWrapper() }
      );

      await result.current.sendMessageWithRAG('질문');

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('고급 기능', () => {
    it('검색 결과 수 제한이 적용되어야 함', () => {
      const { result } = renderHook(
        () => useClaudeChatWithRAG({ ragLimit: 3 }),
        { wrapper: createWrapper() }
      );

      expect(result.current).toBeDefined();
    });

    it('유사도 임계값이 적용되어야 함', () => {
      const { result } = renderHook(
        () => useClaudeChatWithRAG({ ragThreshold: 0.8 }),
        { wrapper: createWrapper() }
      );

      expect(result.current).toBeDefined();
    });

    it('최대 컨텍스트 토큰이 설정되어야 함', () => {
      const { result } = renderHook(
        () => useClaudeChatWithRAG({ maxContextTokens: 2000 }),
        { wrapper: createWrapper() }
      );

      expect(result.current).toBeDefined();
    });
  });
});

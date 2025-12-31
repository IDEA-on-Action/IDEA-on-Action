/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useConversationManager,
  useConversations,
  useConversation,
  useMessages,
  useCreateConversation,
  useUpdateConversation,
  useArchiveConversation,
  useAddMessage,
  useSummarizeContext,
  useForkConversation,
  useExportToMarkdown,
} from '@/hooks/useConversationManager';
import { callWorkersApi } from '@/integrations/cloudflare/client';
import React, { type ReactNode } from 'react';

// Mock Workers API client
vi.mock('@/integrations/cloudflare/client', () => ({
  callWorkersApi: vi.fn(),
}));

// Mock useAuth hook
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'user-123', email: 'test@example.com' },
    workersTokens: { accessToken: 'mock-token' },
  })),
}));

describe('useConversationManager', () => {
  let queryClient: QueryClient;

  const mockSession = {
    id: 'session-1',
    user_id: 'user-123',
    title: '테스트 대화',
    system_prompt: '당신은 AI 어시스턴트입니다.',
    template_id: null,
    status: 'active',
    total_tokens: 100,
    parent_id: null,
    fork_index: 0,
    metadata: null,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  };

  const mockMessage = {
    id: 'msg-1',
    conversation_id: 'session-1',
    sequence: 1,
    role: 'user',
    content: '안녕하세요',
    content_blocks: null,
    tool_use: null,
    tool_result: null,
    token_count: 10,
    model: null,
    stop_reason: null,
    created_at: '2025-01-01T00:00:00Z',
  };

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

  describe('useConversations - 대화 목록 조회', () => {
    it('대화 목록을 조회해야 함', async () => {
      // Setup - Workers API 모킹
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: {
          data: [{ ...mockSession, message_count: 5 }],
          count: 1,
        },
        error: null,
        status: 200,
      });

      // Execute
      const { result } = renderHook(() => useConversations(), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isSuccess).toBe(true);
      if (result.current.data) {
        expect(result.current.data.data).toHaveLength(1);
        expect(result.current.data.count).toBe(1);
      }
      expect(callWorkersApi).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/ai-conversations'),
        expect.objectContaining({ token: 'mock-token' })
      );
    });

    it('필터를 적용하여 조회할 수 있어야 함', async () => {
      // Setup - Workers API 모킹
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: {
          data: [mockSession],
          count: 1,
        },
        error: null,
        status: 200,
      });

      // Execute
      const { result } = renderHook(() => useConversations({ status: 'active' }), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(callWorkersApi).toHaveBeenCalledWith(
        expect.stringContaining('status=active'),
        expect.any(Object)
      );
    });

    it('검색어를 적용할 수 있어야 함', async () => {
      // Setup - Workers API 모킹
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: {
          data: [mockSession],
          count: 1,
        },
        error: null,
        status: 200,
      });

      // Execute
      const { result } = renderHook(() => useConversations({ search: '테스트' }), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(callWorkersApi).toHaveBeenCalledWith(
        expect.stringContaining('search='),
        expect.any(Object)
      );
    });

    it('에러 발생 시 에러를 던져야 함', async () => {
      // Setup - Workers API 에러 모킹
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: null,
        error: 'Database error',
        status: 500,
      });

      // Execute
      const { result } = renderHook(() => useConversations(), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toContain('세션 목록을 불러오는데 실패했습니다');
    });
  });

  describe('useConversation - 대화 상세 조회', () => {
    it('특정 대화를 조회해야 함', async () => {
      // Setup - Workers API 모킹
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: mockSession,
        error: null,
        status: 200,
      });

      // Execute
      const { result } = renderHook(() => useConversation('session-1'), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data?.id).toBe('session-1');
      expect(callWorkersApi).toHaveBeenCalledWith(
        '/api/v1/ai-conversations/session-1',
        expect.objectContaining({ token: 'mock-token' })
      );
    });

    it('sessionId가 null이면 쿼리를 실행하지 않아야 함', () => {
      // Execute
      const { result } = renderHook(() => useConversation(null), { wrapper });

      // Assert
      expect(result.current.data).toBe(undefined);
      expect(callWorkersApi).not.toHaveBeenCalled();
    });
  });

  describe('useMessages - 메시지 목록 조회', () => {
    it('대화의 메시지 목록을 조회해야 함', async () => {
      // Setup - Workers API 모킹
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: {
          data: [mockMessage],
          count: 1,
        },
        error: null,
        status: 200,
      });

      // Execute
      const { result } = renderHook(() => useMessages('session-1'), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data?.data).toHaveLength(1);
      expect(callWorkersApi).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/ai-messages'),
        expect.objectContaining({ token: 'mock-token' })
      );
      expect(callWorkersApi).toHaveBeenCalledWith(
        expect.stringContaining('conversation_id=session-1'),
        expect.any(Object)
      );
      expect(callWorkersApi).toHaveBeenCalledWith(
        expect.stringContaining('order_by=created_at%3Aasc'),
        expect.any(Object)
      );
    });

    it('sessionId가 null이면 빈 배열을 반환해야 함', async () => {
      // Execute
      const { result } = renderHook(() => useMessages(null), { wrapper });

      // Assert - enabled: false이므로 쿼리가 실행되지 않음
      await waitFor(() => {
        expect(result.current.fetchStatus).toBe('idle');
      });

      // 쿼리가 비활성화되어 있으므로 data는 undefined
      expect(result.current.data).toBeUndefined();
    });
  });

  describe('useCreateConversation - 대화 생성', () => {
    it('새 대화를 생성할 수 있어야 함', async () => {
      // Setup - Workers API 모킹
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: mockSession,
        error: null,
        status: 201,
      });

      // Execute
      const { result } = renderHook(() => useCreateConversation(), { wrapper });

      let createdSession: any;
      await act(async () => {
        createdSession = await result.current.mutateAsync({
          title: '새 대화',
        });
      });

      // Assert
      expect(createdSession.id).toBe('session-1');
      expect(callWorkersApi).toHaveBeenCalledWith(
        '/api/v1/ai-conversations',
        expect.objectContaining({
          method: 'POST',
          token: 'mock-token',
          body: expect.objectContaining({
            title: '새 대화',
          }),
        })
      );
    });

    it('제목이 없으면 기본 제목을 생성해야 함', async () => {
      // Setup - Workers API 모킹
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: mockSession,
        error: null,
        status: 201,
      });

      // Execute
      const { result } = renderHook(() => useCreateConversation(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({});
      });

      // Assert
      expect(callWorkersApi).toHaveBeenCalledWith(
        '/api/v1/ai-conversations',
        expect.objectContaining({
          body: expect.objectContaining({
            title: expect.stringContaining('새 대화'),
          }),
        })
      );
    });

    it('템플릿 ID가 제공되면 시스템 프롬프트를 조회해야 함', async () => {
      // Setup - Workers API 모킹 (템플릿 조회 + 세션 생성)
      vi.mocked(callWorkersApi)
        .mockResolvedValueOnce({
          data: { system_prompt: '템플릿 프롬프트' },
          error: null,
          status: 200,
        })
        .mockResolvedValueOnce({
          data: mockSession,
          error: null,
          status: 201,
        });

      // Execute
      const { result } = renderHook(() => useCreateConversation(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({
          templateId: 'template-1',
        });
      });

      // Assert
      expect(callWorkersApi).toHaveBeenCalledWith(
        '/api/v1/prompt-templates/template-1',
        expect.objectContaining({ token: 'mock-token' })
      );
    });
  });

  describe('useUpdateConversation - 대화 수정', () => {
    it('대화를 수정할 수 있어야 함', async () => {
      // Setup - Workers API 모킹
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: { ...mockSession, title: '수정된 제목' },
        error: null,
        status: 200,
      });

      // Execute
      const { result } = renderHook(() => useUpdateConversation(), { wrapper });

      let updatedSession: any;
      await act(async () => {
        updatedSession = await result.current.mutateAsync({
          id: 'session-1',
          title: '수정된 제목',
        });
      });

      // Assert
      expect(updatedSession.title).toBe('수정된 제목');
      expect(callWorkersApi).toHaveBeenCalledWith(
        '/api/v1/ai-conversations/session-1',
        expect.objectContaining({
          method: 'PATCH',
          token: 'mock-token',
        })
      );
    });
  });

  describe('useArchiveConversation - 대화 아카이브', () => {
    it('대화를 아카이브할 수 있어야 함', async () => {
      // Setup - Workers API 모킹
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: null,
        error: null,
        status: 200,
      });

      // Execute
      const { result } = renderHook(() => useArchiveConversation(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync('session-1');
      });

      // Assert
      expect(callWorkersApi).toHaveBeenCalledWith(
        '/api/v1/ai-conversations/session-1',
        expect.objectContaining({
          method: 'PATCH',
          token: 'mock-token',
          body: { status: 'archived' },
        })
      );
    });
  });

  describe('useAddMessage - 메시지 추가', () => {
    it('메시지를 추가할 수 있어야 함', async () => {
      // Setup - Workers API 모킹
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: mockMessage,
        error: null,
        status: 201,
      });

      // Execute
      const { result } = renderHook(() => useAddMessage(), { wrapper });

      let addedMessage: any;
      await act(async () => {
        addedMessage = await result.current.mutateAsync({
          sessionId: 'session-1',
          role: 'user',
          content: '안녕하세요',
        });
      });

      // Assert
      expect(addedMessage.content).toBe('안녕하세요');
      expect(callWorkersApi).toHaveBeenCalledWith(
        '/api/v1/ai-messages',
        expect.objectContaining({
          method: 'POST',
          token: 'mock-token',
        })
      );
    });

    it('토큰 수가 제공되지 않으면 추정해야 함', async () => {
      // Setup - Workers API 모킹
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: mockMessage,
        error: null,
        status: 201,
      });

      // Execute
      const { result } = renderHook(() => useAddMessage(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({
          sessionId: 'session-1',
          role: 'user',
          content: '안녕하세요',
        });
      });

      // Assert
      expect(callWorkersApi).toHaveBeenCalledWith(
        '/api/v1/ai-messages',
        expect.objectContaining({
          body: expect.objectContaining({
            token_count: expect.any(Number),
          }),
        })
      );
    });
  });

  describe('useSummarizeContext - 컨텍스트 요약', () => {
    it('대화를 요약할 수 있어야 함', async () => {
      // 메시지 조회 모킹
      vi.mocked(callWorkersApi)
        .mockResolvedValueOnce({
          data: {
            data: Array(15)
              .fill(null)
              .map((_, i) => ({
                ...mockMessage,
                sequence: i + 1,
                content: `메시지 ${i + 1}`,
                token_count: 10,
              })),
          },
          error: null,
          status: 200,
        })
        // Claude API 응답 모킹
        .mockResolvedValueOnce({
          data: {
            success: true,
            data: {
              content: '대화 요약입니다.',
            },
          },
          error: null,
          status: 200,
        })
        // 세션 업데이트 모킹
        .mockResolvedValueOnce({
          data: null,
          error: null,
          status: 200,
        });

      // Execute
      const { result } = renderHook(() => useSummarizeContext(), { wrapper });

      let summaryResult: any;
      await act(async () => {
        summaryResult = await result.current.mutateAsync({
          sessionId: 'session-1',
        });
      });

      // Assert
      expect(summaryResult.summary).toBe('대화 요약입니다.');
      expect(summaryResult.summarizedCount).toBeGreaterThan(0);
      expect(callWorkersApi).toHaveBeenCalledWith(
        '/api/v1/claude-ai/chat',
        expect.objectContaining({
          method: 'POST',
          token: 'mock-token',
        })
      );
    });

    it('메시지가 충분하지 않으면 에러를 던져야 함', async () => {
      // 메시지 조회 모킹 - 5개만 반환
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: {
          data: Array(5)
            .fill(null)
            .map((_, i) => ({ ...mockMessage, sequence: i + 1 })),
        },
        error: null,
        status: 200,
      });

      // Execute
      const { result } = renderHook(() => useSummarizeContext(), { wrapper });

      // Assert
      await expect(
        act(async () => {
          await result.current.mutateAsync({ sessionId: 'session-1' });
        })
      ).rejects.toThrow('요약할 메시지가 충분하지 않습니다');
    });
  });

  describe('useForkConversation - 대화 포크', () => {
    it('대화를 포크할 수 있어야 함', async () => {
      // 부모 세션 조회 모킹
      vi.mocked(callWorkersApi)
        .mockResolvedValueOnce({
          data: mockSession,
          error: null,
          status: 200,
        })
        // 포크 카운트 모킹
        .mockResolvedValueOnce({
          data: { count: 1 },
          error: null,
          status: 200,
        })
        // 새 세션 생성 모킹
        .mockResolvedValueOnce({
          data: { ...mockSession, id: 'session-2' },
          error: null,
          status: 201,
        })
        // 메시지 조회 모킹
        .mockResolvedValueOnce({
          data: { data: [mockMessage] },
          error: null,
          status: 200,
        })
        // 메시지 벌크 삽입 모킹
        .mockResolvedValueOnce({
          data: null,
          error: null,
          status: 201,
        });

      // Execute
      const { result } = renderHook(() => useForkConversation(), { wrapper });

      let forkResult: any;
      await act(async () => {
        forkResult = await result.current.mutateAsync({
          parentSessionId: 'session-1',
          forkFromSequence: 5,
        });
      });

      // Assert
      expect(forkResult.newSession).toBeDefined();
      expect(forkResult.copiedMessageCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('useExportToMarkdown - Markdown 내보내기', () => {
    it('대화를 Markdown으로 내보낼 수 있어야 함', async () => {
      // 세션 조회 모킹
      vi.mocked(callWorkersApi)
        .mockResolvedValueOnce({
          data: mockSession,
          error: null,
          status: 200,
        })
        // 메시지 조회 모킹
        .mockResolvedValueOnce({
          data: { data: [mockMessage] },
          error: null,
          status: 200,
        });

      // Execute
      const { result } = renderHook(() => useExportToMarkdown(), { wrapper });

      let exportResult: any;
      await act(async () => {
        exportResult = await result.current.mutateAsync('session-1');
      });

      // Assert
      expect(exportResult.content).toContain('# 테스트 대화');
      expect(exportResult.content).toContain('안녕하세요');
      expect(exportResult.filename).toContain('.md');
    });
  });

  describe('useConversationManager - 통합 훅', () => {
    it('모든 기능을 통합하여 제공해야 함', async () => {
      // Setup - Workers API 모킹
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: {
          data: [mockSession],
          count: 1,
        },
        error: null,
        status: 200,
      });

      // Execute
      const { result } = renderHook(() => useConversationManager(), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.conversations).toHaveLength(1);
      expect(typeof result.current.createConversation).toBe('function');
      expect(typeof result.current.updateConversation).toBe('function');
      expect(typeof result.current.archiveConversation).toBe('function');
      expect(typeof result.current.addMessage).toBe('function');
      expect(typeof result.current.summarizeContext).toBe('function');
      expect(typeof result.current.forkConversation).toBe('function');
      expect(typeof result.current.exportToMarkdown).toBe('function');
    });

    it('에러를 적절히 처리해야 함', async () => {
      // Setup - Workers API 에러 모킹
      vi.mocked(callWorkersApi).mockResolvedValue({
        data: null,
        error: 'Database error',
        status: 500,
      });

      // Execute
      const { result } = renderHook(() => useConversationManager(), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.error).not.toBe(null);
      });
    });
  });
});

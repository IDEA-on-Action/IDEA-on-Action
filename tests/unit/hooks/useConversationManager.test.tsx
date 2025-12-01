/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
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
import { supabase } from '@/integrations/supabase/client';
import React, { type ReactNode } from 'react';

// Mock supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      getUser: vi.fn(),
    },
    from: vi.fn(),
    functions: {
      invoke: vi.fn(),
    },
    rpc: vi.fn(),
  },
}));

describe('useConversationManager', () => {
  let queryClient: QueryClient;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
  };

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

    // 기본 인증 모킹
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: mockUser as any },
      error: null,
    });

    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { access_token: 'mock-token' } as any },
      error: null,
    });
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe('useConversations - 대화 목록 조회', () => {
    it('대화 목록을 조회해야 함', async () => {
      // 체이닝 가능한 mock 객체 생성
      const chainableMock = {
        eq: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: [{ ...mockSession, message_count: [{ count: 5 }] }],
          error: null,
          count: 1,
        }),
      };

      const selectMock = vi.fn().mockReturnValue(chainableMock);

      vi.mocked(supabase.from).mockReturnValue({
        select: selectMock,
      } as any);

      const { result } = renderHook(() => useConversations(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isSuccess).toBe(true);
      if (result.current.data) {
        expect(result.current.data.data).toHaveLength(1);
        expect(result.current.data.count).toBe(1);
      }
      expect(supabase.from).toHaveBeenCalledWith('ai_conversations');
    });

    it('필터를 적용하여 조회할 수 있어야 함', async () => {
      const eqMock = vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          range: vi.fn().mockResolvedValue({
            data: [mockSession],
            error: null,
            count: 1,
          }),
        }),
      });

      const selectMock = vi.fn().mockReturnValue({
        eq: eqMock,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: selectMock,
      } as any);

      const { result } = renderHook(() => useConversations({ status: 'active' }), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(eqMock).toHaveBeenCalledWith('status', 'active');
    });

    it('검색어를 적용할 수 있어야 함', async () => {
      const ilikeMock = vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          range: vi.fn().mockResolvedValue({
            data: [mockSession],
            error: null,
            count: 1,
          }),
        }),
      });

      const selectMock = vi.fn().mockReturnValue({
        ilike: ilikeMock,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: selectMock,
      } as any);

      const { result } = renderHook(() => useConversations({ search: '테스트' }), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(ilikeMock).toHaveBeenCalledWith('title', '%테스트%');
    });

    it('에러 발생 시 에러를 던져야 함', async () => {
      const selectMock = vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          range: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database error' },
            count: null,
          }),
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: selectMock,
      } as any);

      const { result } = renderHook(() => useConversations(), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toContain('세션 목록을 불러오는데 실패했습니다');
    });
  });

  describe('useConversation - 대화 상세 조회', () => {
    it('특정 대화를 조회해야 함', async () => {
      const singleMock = vi.fn().mockResolvedValue({
        data: mockSession,
        error: null,
      });

      const eqMock = vi.fn().mockReturnValue({
        single: singleMock,
      });

      const selectMock = vi.fn().mockReturnValue({
        eq: eqMock,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: selectMock,
      } as any);

      const { result } = renderHook(() => useConversation('session-1'), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data?.id).toBe('session-1');
      expect(eqMock).toHaveBeenCalledWith('id', 'session-1');
    });

    it('sessionId가 null이면 쿼리를 실행하지 않아야 함', () => {
      const { result } = renderHook(() => useConversation(null), { wrapper });

      expect(result.current.data).toBe(undefined);
      expect(supabase.from).not.toHaveBeenCalled();
    });
  });

  describe('useMessages - 메시지 목록 조회', () => {
    it('대화의 메시지 목록을 조회해야 함', async () => {
      const limitMock = vi.fn().mockResolvedValue({
        data: [mockMessage],
        error: null,
        count: 1,
      });

      const orderMock = vi.fn().mockReturnValue({
        limit: limitMock,
      });

      const eqMock = vi.fn().mockReturnValue({
        order: orderMock,
      });

      const selectMock = vi.fn().mockReturnValue({
        eq: eqMock,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: selectMock,
      } as any);

      const { result } = renderHook(() => useMessages('session-1'), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data?.data).toHaveLength(1);
      expect(eqMock).toHaveBeenCalledWith('conversation_id', 'session-1');
      expect(orderMock).toHaveBeenCalledWith('created_at', { ascending: true });
    });

    it('sessionId가 null이면 빈 배열을 반환해야 함', async () => {
      const { result } = renderHook(() => useMessages(null), { wrapper });

      // enabled: false이므로 쿼리가 실행되지 않음 - isPending 상태 확인
      await waitFor(() => {
        // sessionId가 null이면 쿼리가 비활성화되어 data가 undefined
        expect(result.current.fetchStatus).toBe('idle');
      });

      // 쿼리가 비활성화되어 있으므로 data는 undefined
      expect(result.current.data).toBeUndefined();
    });
  });

  describe('useCreateConversation - 대화 생성', () => {
    it('새 대화를 생성할 수 있어야 함', async () => {
      const singleMock = vi.fn().mockResolvedValue({
        data: mockSession,
        error: null,
      });

      const selectMock = vi.fn().mockReturnValue({
        single: singleMock,
      });

      const insertMock = vi.fn().mockReturnValue({
        select: selectMock,
      });

      vi.mocked(supabase.from).mockReturnValue({
        insert: insertMock,
      } as any);

      const { result } = renderHook(() => useCreateConversation(), { wrapper });

      let createdSession: any;
      await act(async () => {
        createdSession = await result.current.mutateAsync({
          title: '새 대화',
        });
      });

      expect(createdSession.id).toBe('session-1');
      expect(insertMock).toHaveBeenCalled();
    });

    it('제목이 없으면 기본 제목을 생성해야 함', async () => {
      const singleMock = vi.fn().mockResolvedValue({
        data: mockSession,
        error: null,
      });

      const selectMock = vi.fn().mockReturnValue({
        single: singleMock,
      });

      const insertMock = vi.fn().mockReturnValue({
        select: selectMock,
      });

      vi.mocked(supabase.from).mockReturnValue({
        insert: insertMock,
      } as any);

      const { result } = renderHook(() => useCreateConversation(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({});
      });

      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining('새 대화'),
        })
      );
    });

    it('템플릿 ID가 제공되면 시스템 프롬프트를 조회해야 함', async () => {
      const templateSingleMock = vi.fn().mockResolvedValue({
        data: { system_prompt: '템플릿 프롬프트' },
        error: null,
      });

      const sessionSingleMock = vi.fn().mockResolvedValue({
        data: mockSession,
        error: null,
      });

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'prompt_templates') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: templateSingleMock,
              }),
            }),
          } as any;
        }
        if (table === 'ai_conversations') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: sessionSingleMock,
              }),
            }),
          } as any;
        }
        return {} as any;
      });

      const { result } = renderHook(() => useCreateConversation(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({
          templateId: 'template-1',
        });
      });

      expect(supabase.from).toHaveBeenCalledWith('prompt_templates');
    });
  });

  describe('useUpdateConversation - 대화 수정', () => {
    it('대화를 수정할 수 있어야 함', async () => {
      const singleMock = vi.fn().mockResolvedValue({
        data: { ...mockSession, title: '수정된 제목' },
        error: null,
      });

      const selectMock = vi.fn().mockReturnValue({
        single: singleMock,
      });

      const eqMock = vi.fn().mockReturnValue({
        select: selectMock,
      });

      const updateMock = vi.fn().mockReturnValue({
        eq: eqMock,
      });

      vi.mocked(supabase.from).mockReturnValue({
        update: updateMock,
      } as any);

      const { result } = renderHook(() => useUpdateConversation(), { wrapper });

      let updatedSession: any;
      await act(async () => {
        updatedSession = await result.current.mutateAsync({
          id: 'session-1',
          title: '수정된 제목',
        });
      });

      expect(updatedSession.title).toBe('수정된 제목');
      expect(updateMock).toHaveBeenCalled();
    });
  });

  describe('useArchiveConversation - 대화 아카이브', () => {
    it('대화를 아카이브할 수 있어야 함', async () => {
      const eqMock = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      const updateMock = vi.fn().mockReturnValue({
        eq: eqMock,
      });

      vi.mocked(supabase.from).mockReturnValue({
        update: updateMock,
      } as any);

      const { result } = renderHook(() => useArchiveConversation(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync('session-1');
      });

      expect(updateMock).toHaveBeenCalledWith({ status: 'archived' });
      expect(eqMock).toHaveBeenCalledWith('id', 'session-1');
    });
  });

  describe('useAddMessage - 메시지 추가', () => {
    it('메시지를 추가할 수 있어야 함', async () => {
      const singleMock = vi.fn().mockResolvedValue({
        data: mockMessage,
        error: null,
      });

      const selectMock = vi.fn().mockReturnValue({
        single: singleMock,
      });

      const insertMock = vi.fn().mockReturnValue({
        select: selectMock,
      });

      vi.mocked(supabase.from).mockReturnValue({
        insert: insertMock,
      } as any);

      const { result } = renderHook(() => useAddMessage(), { wrapper });

      let addedMessage: any;
      await act(async () => {
        addedMessage = await result.current.mutateAsync({
          sessionId: 'session-1',
          role: 'user',
          content: '안녕하세요',
        });
      });

      expect(addedMessage.content).toBe('안녕하세요');
      expect(insertMock).toHaveBeenCalled();
    });

    it('토큰 수가 제공되지 않으면 추정해야 함', async () => {
      const singleMock = vi.fn().mockResolvedValue({
        data: mockMessage,
        error: null,
      });

      const selectMock = vi.fn().mockReturnValue({
        single: singleMock,
      });

      const insertMock = vi.fn().mockReturnValue({
        select: selectMock,
      });

      vi.mocked(supabase.from).mockReturnValue({
        insert: insertMock,
      } as any);

      const { result } = renderHook(() => useAddMessage(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({
          sessionId: 'session-1',
          role: 'user',
          content: '안녕하세요',
        });
      });

      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          token_count: expect.any(Number),
        })
      );
    });
  });

  describe('useSummarizeContext - 컨텍스트 요약', () => {
    it('대화를 요약할 수 있어야 함', async () => {
      // 메시지 조회 모킹
      const orderMock = vi.fn().mockResolvedValue({
        data: Array(15)
          .fill(null)
          .map((_, i) => ({
            ...mockMessage,
            sequence: i + 1,
            content: `메시지 ${i + 1}`,
          })),
        error: null,
      });

      const eqMock = vi.fn().mockReturnValue({
        order: orderMock,
      });

      const selectMock = vi.fn().mockReturnValue({
        eq: eqMock,
      });

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'ai_messages') {
          return {
            select: selectMock,
          } as any;
        }
        if (table === 'ai_conversations') {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          } as any;
        }
        return {} as any;
      });

      // Claude API 응답 모킹
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: {
          success: true,
          data: {
            content: '대화 요약입니다.',
          },
        },
        error: null,
      });

      const { result } = renderHook(() => useSummarizeContext(), { wrapper });

      let summaryResult: any;
      await act(async () => {
        summaryResult = await result.current.mutateAsync({
          sessionId: 'session-1',
        });
      });

      expect(summaryResult.summary).toBe('대화 요약입니다.');
      expect(summaryResult.summarizedCount).toBeGreaterThan(0);
      expect(supabase.functions.invoke).toHaveBeenCalledWith(
        'claude-ai/chat',
        expect.any(Object)
      );
    });

    it('메시지가 충분하지 않으면 에러를 던져야 함', async () => {
      const orderMock = vi.fn().mockResolvedValue({
        data: Array(5)
          .fill(null)
          .map((_, i) => ({ ...mockMessage, sequence: i + 1 })),
        error: null,
      });

      const eqMock = vi.fn().mockReturnValue({
        order: orderMock,
      });

      const selectMock = vi.fn().mockReturnValue({
        eq: eqMock,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: selectMock,
      } as any);

      const { result } = renderHook(() => useSummarizeContext(), { wrapper });

      await expect(
        act(async () => {
          await result.current.mutateAsync({ sessionId: 'session-1' });
        })
      ).rejects.toThrow('요약할 메시지가 충분하지 않습니다');
    });
  });

  describe('useForkConversation - 대화 포크', () => {
    it('대화를 포크할 수 있어야 함', async () => {
      let callCount = 0;

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        callCount++;

        // 첫 번째 호출: 부모 세션 조회
        if (callCount === 1 && table === 'ai_conversations') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockSession,
                  error: null,
                }),
              }),
            }),
          } as any;
        }

        // 두 번째 호출: 포크 카운트
        if (callCount === 2 && table === 'ai_conversations') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                count: 1,
                data: null,
                error: null,
              }),
            }),
          } as any;
        }

        // 세 번째 호출: 새 세션 생성
        if (callCount === 3 && table === 'ai_conversations') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { ...mockSession, id: 'session-2' },
                  error: null,
                }),
              }),
            }),
          } as any;
        }

        // 네 번째 호출: 메시지 조회
        if (callCount === 4 && table === 'ai_messages') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({
                    data: [mockMessage],
                    error: null,
                  }),
                }),
              }),
            }),
          } as any;
        }

        // 다섯 번째 호출: 메시지 삽입
        if (callCount === 5 && table === 'ai_messages') {
          return {
            insert: vi.fn().mockResolvedValue({ data: null, error: null }),
          } as any;
        }

        return {} as any;
      });

      const { result } = renderHook(() => useForkConversation(), { wrapper });

      let forkResult: any;
      await act(async () => {
        forkResult = await result.current.mutateAsync({
          parentSessionId: 'session-1',
          forkFromSequence: 5,
        });
      });

      expect(forkResult.newSession).toBeDefined();
      expect(forkResult.copiedMessageCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('useExportToMarkdown - Markdown 내보내기', () => {
    it('대화를 Markdown으로 내보낼 수 있어야 함', async () => {
      const sessionSingleMock = vi.fn().mockResolvedValue({
        data: mockSession,
        error: null,
      });

      const messagesMock = vi.fn().mockResolvedValue({
        data: [mockMessage],
        error: null,
      });

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'ai_conversations') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: sessionSingleMock,
              }),
            }),
          } as any;
        }
        if (table === 'ai_messages') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: messagesMock,
              }),
            }),
          } as any;
        }
        return {} as any;
      });

      const { result } = renderHook(() => useExportToMarkdown(), { wrapper });

      let exportResult: any;
      await act(async () => {
        exportResult = await result.current.mutateAsync('session-1');
      });

      expect(exportResult.content).toContain('# 테스트 대화');
      expect(exportResult.content).toContain('안녕하세요');
      expect(exportResult.filename).toContain('.md');
    });
  });

  describe('useConversationManager - 통합 훅', () => {
    it('모든 기능을 통합하여 제공해야 함', async () => {
      const selectMock = vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          range: vi.fn().mockResolvedValue({
            data: [mockSession],
            error: null,
            count: 1,
          }),
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: selectMock,
      } as any);

      const { result } = renderHook(() => useConversationManager(), { wrapper });

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
      const selectMock = vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          range: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database error' },
            count: null,
          }),
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: selectMock,
      } as any);

      const { result } = renderHook(() => useConversationManager(), { wrapper });

      await waitFor(() => {
        expect(result.current.error).not.toBe(null);
      });
    });
  });
});

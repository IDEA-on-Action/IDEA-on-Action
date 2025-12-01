/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useClaudeStreaming } from '@/hooks/useClaudeStreaming';
import { supabase } from '@/integrations/supabase/client';
import React, { type ReactNode } from 'react';

// Mock supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
  },
}));

// Mock fetch
global.fetch = vi.fn();

describe('useClaudeStreaming', () => {
  let queryClient: QueryClient;

  const mockSession = {
    access_token: 'mock-token-123',
    user: { id: 'user-123' },
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    vi.clearAllMocks();

    // 기본 세션 모킹
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: mockSession as any },
      error: null,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe('초기 상태', () => {
    it('빈 상태로 초기화되어야 함', () => {
      const { result } = renderHook(() => useClaudeStreaming(), { wrapper });

      expect(result.current.state.messages).toEqual([]);
      expect(result.current.state.streamingText).toBe('');
      expect(result.current.state.isStreaming).toBe(false);
      expect(result.current.state.isLoading).toBe(false);
      expect(result.current.state.error).toBe(null);
      expect(result.current.state.conversationId).not.toBeNull();
    });

    it('필요한 모든 함수가 정의되어 있어야 함', () => {
      const { result } = renderHook(() => useClaudeStreaming(), { wrapper });

      expect(typeof result.current.sendMessage).toBe('function');
      expect(typeof result.current.stopStreaming).toBe('function');
      expect(typeof result.current.clearConversation).toBe('function');
      expect(typeof result.current.setMessages).toBe('function');
      expect(typeof result.current.setSystemPrompt).toBe('function');
    });

    it('시스템 프롬프트를 초기 설정할 수 있어야 함', () => {
      const systemPrompt = '당신은 친절한 AI입니다.';
      const { result } = renderHook(() => useClaudeStreaming({ systemPrompt }), { wrapper });

      expect(result.current.systemPrompt).toBe(systemPrompt);
    });
  });

  describe('메시지 전송 (비스트리밍)', () => {
    it('메시지 전송 성공 시 사용자 메시지와 AI 응답이 추가되어야 함', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          content: [{ type: 'text', text: 'AI 응답입니다.' }],
          usage: { input_tokens: 10, output_tokens: 20 },
          stop_reason: 'end_turn',
        }),
      };

      vi.mocked(fetch).mockResolvedValue(mockResponse as any);

      const { result } = renderHook(() => useClaudeStreaming({ streaming: false }), { wrapper });

      await act(async () => {
        await result.current.sendMessage('안녕하세요');
      });

      await waitFor(() => {
        expect(result.current.state.messages).toHaveLength(2);
      });

      expect(result.current.state.messages[0].role).toBe('user');
      expect(result.current.state.messages[0].content).toBe('안녕하세요');
      expect(result.current.state.messages[1].role).toBe('assistant');
      expect(result.current.state.messages[1].content).toBe('AI 응답입니다.');
    });

    it('토큰 사용량이 올바르게 업데이트되어야 함', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          content: [{ type: 'text', text: '테스트 응답' }],
          usage: { input_tokens: 15, output_tokens: 25 },
          stop_reason: 'end_turn',
        }),
      };

      vi.mocked(fetch).mockResolvedValue(mockResponse as any);

      const { result } = renderHook(() => useClaudeStreaming({ streaming: false }), { wrapper });

      await act(async () => {
        await result.current.sendMessage('테스트');
      });

      await waitFor(() => {
        expect(result.current.state.lastUsage).not.toBe(null);
      });

      expect(result.current.state.lastUsage).toEqual({
        input_tokens: 15,
        output_tokens: 25,
      });

      expect(result.current.state.totalUsage.input_tokens).toBe(15);
      expect(result.current.state.totalUsage.output_tokens).toBe(25);
    });

    it('onComplete 콜백이 호출되어야 함', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          content: [{ type: 'text', text: 'AI 응답' }],
          usage: { input_tokens: 10, output_tokens: 20 },
          stop_reason: 'end_turn',
        }),
      };

      vi.mocked(fetch).mockResolvedValue(mockResponse as any);

      const onComplete = vi.fn();
      const { result } = renderHook(
        () => useClaudeStreaming({ streaming: false, onComplete }),
        { wrapper }
      );

      await act(async () => {
        await result.current.sendMessage('테스트');
      });

      await waitFor(() => {
        expect(onComplete).toHaveBeenCalled();
      });

      expect(onComplete).toHaveBeenCalledWith(
        'AI 응답',
        expect.objectContaining({
          input_tokens: 10,
          output_tokens: 20,
        })
      );
    });
  });

  describe('메시지 전송 (스트리밍)', () => {
    it('스트리밍 응답이 실시간으로 업데이트되어야 함', async () => {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          controller.enqueue(
            encoder.encode('event: content_block_delta\ndata: {"type":"content_block_delta","delta":{"type":"text_delta","text":"안녕"}}\n\n')
          );
          controller.enqueue(
            encoder.encode('event: content_block_delta\ndata: {"type":"content_block_delta","delta":{"type":"text_delta","text":"하세요"}}\n\n')
          );
          controller.enqueue(
            encoder.encode('event: message_delta\ndata: {"type":"message_delta","usage":{"output_tokens":10}}\n\n')
          );
          controller.close();
        },
      });

      const mockResponse = {
        ok: true,
        body: stream,
      };

      vi.mocked(fetch).mockResolvedValue(mockResponse as any);

      const onStreamingText = vi.fn();
      const { result } = renderHook(
        () => useClaudeStreaming({ streaming: true, onStreamingText }),
        { wrapper }
      );

      await act(async () => {
        await result.current.sendMessage('테스트');
      });

      await waitFor(() => {
        expect(onStreamingText).toHaveBeenCalled();
      }, { timeout: 5000 });

      expect(result.current.state.isStreaming).toBe(false);
    });

    it('스트리밍 중지 기능이 동작해야 함', async () => {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          controller.enqueue(
            encoder.encode('event: content_block_delta\ndata: {"type":"content_block_delta","delta":{"type":"text_delta","text":"시작"}}\n\n')
          );
          await new Promise(resolve => setTimeout(resolve, 100));
          controller.enqueue(
            encoder.encode('event: content_block_delta\ndata: {"type":"content_block_delta","delta":{"type":"text_delta","text":"끝"}}\n\n')
          );
          controller.close();
        },
      });

      const mockResponse = {
        ok: true,
        body: stream,
      };

      vi.mocked(fetch).mockResolvedValue(mockResponse as any);

      const { result } = renderHook(() => useClaudeStreaming({ streaming: true }), { wrapper });

      act(() => {
        result.current.sendMessage('테스트');
      });

      await waitFor(() => {
        expect(result.current.state.isStreaming).toBe(true);
      });

      act(() => {
        result.current.stopStreaming();
      });

      expect(result.current.state.isStreaming).toBe(false);
      expect(result.current.state.isLoading).toBe(false);
    });
  });

  describe('에러 처리', () => {
    it('인증 토큰이 없으면 에러가 발생해야 함', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const { result } = renderHook(() => useClaudeStreaming({ streaming: false }), { wrapper });

      await act(async () => {
        try {
          await result.current.sendMessage('테스트');
        } catch (error) {
          // 에러 예상
        }
      });

      await waitFor(() => {
        expect(result.current.state.error).not.toBe(null);
      });

      expect(result.current.state.error?.code).toBe('CLAUDE_002');
    });

    it('HTTP 에러 발생 시 에러 상태가 업데이트되어야 함', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({
          error: { message: 'Invalid request' },
        }),
      };

      vi.mocked(fetch).mockResolvedValue(mockResponse as any);

      const { result } = renderHook(() => useClaudeStreaming({ streaming: false }), { wrapper });

      await act(async () => {
        try {
          await result.current.sendMessage('테스트');
        } catch (error) {
          // 에러 예상
        }
      });

      await waitFor(() => {
        expect(result.current.state.error).not.toBe(null);
      });

      expect(result.current.isError).toBe(true);
    });

    it('onError 콜백이 호출되어야 함', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({}),
      };

      vi.mocked(fetch).mockResolvedValue(mockResponse as any);

      const onError = vi.fn();
      const { result } = renderHook(
        () => useClaudeStreaming({ streaming: false, onError }),
        { wrapper }
      );

      await act(async () => {
        try {
          await result.current.sendMessage('테스트');
        } catch (error) {
          // 에러 예상
        }
      });

      await waitFor(() => {
        expect(onError).toHaveBeenCalled();
      });

      expect(onError).toHaveBeenCalledWith(expect.any(Object));
    });
  });

  describe('대화 관리', () => {
    it('clearConversation으로 모든 상태를 초기화할 수 있어야 함', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          content: [{ type: 'text', text: '응답' }],
          usage: { input_tokens: 10, output_tokens: 20 },
          stop_reason: 'end_turn',
        }),
      };

      vi.mocked(fetch).mockResolvedValue(mockResponse as any);

      const { result } = renderHook(() => useClaudeStreaming({ streaming: false }), { wrapper });

      await act(async () => {
        await result.current.sendMessage('테스트');
      });

      await waitFor(() => {
        expect(result.current.state.messages.length).toBeGreaterThan(0);
      });

      const oldConversationId = result.current.state.conversationId;

      act(() => {
        result.current.clearConversation();
      });

      expect(result.current.state.messages).toEqual([]);
      expect(result.current.state.conversationId).not.toBe(oldConversationId);
      expect(result.current.state.totalUsage.input_tokens).toBe(0);
      expect(result.current.state.totalUsage.output_tokens).toBe(0);
    });

    it('setMessages로 메시지를 직접 설정할 수 있어야 함', () => {
      const { result } = renderHook(() => useClaudeStreaming(), { wrapper });

      const newMessages = [
        { role: 'user' as const, content: '메시지 1' },
        { role: 'assistant' as const, content: '응답 1' },
      ];

      act(() => {
        result.current.setMessages(newMessages);
      });

      expect(result.current.state.messages).toEqual(newMessages);
    });

    it('setSystemPrompt로 시스템 프롬프트를 변경할 수 있어야 함', () => {
      const { result } = renderHook(() => useClaudeStreaming(), { wrapper });

      const newPrompt = '새로운 시스템 프롬프트';

      act(() => {
        result.current.setSystemPrompt(newPrompt);
      });

      expect(result.current.systemPrompt).toBe(newPrompt);
    });
  });

  describe('로딩 상태', () => {
    it('메시지 전송 중 isLoading이 true여야 함', async () => {
      const mockResponse = {
        ok: true,
        json: async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
          return {
            content: [{ type: 'text', text: '응답' }],
            usage: { input_tokens: 10, output_tokens: 20 },
            stop_reason: 'end_turn',
          };
        },
      };

      vi.mocked(fetch).mockResolvedValue(mockResponse as any);

      const { result } = renderHook(() => useClaudeStreaming({ streaming: false }), { wrapper });

      act(() => {
        result.current.sendMessage('테스트');
      });

      expect(result.current.state.isLoading).toBe(true);

      await waitFor(
        () => {
          expect(result.current.state.isLoading).toBe(false);
        },
        { timeout: 3000 }
      );
    });
  });
});

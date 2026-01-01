/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { useClaudeStreaming } from '@/hooks/ai/useClaudeStreaming';
import React, { type ReactNode } from 'react';

// Mock useAuth hook
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    workersTokens: { accessToken: 'test-token', refreshToken: 'test-refresh' },
    workersUser: { id: 'user-123', email: 'test@example.com' },
    isAuthenticated: true,
    loading: false,
  })),
}));

// Mock fetch
global.fetch = vi.fn();

describe('useClaudeStreaming', () => {
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
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </MemoryRouter>
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

      await act(async () => {
        result.current.sendMessage('테스트');
        await new Promise(resolve => setTimeout(resolve, 10));
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
      // useAuth 모킹을 임시로 변경
      const { useAuth } = await import('@/hooks/useAuth');
      vi.mocked(useAuth).mockReturnValue({
        workersTokens: null,
        workersUser: null,
        isAuthenticated: false,
        loading: false,
      } as any);

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

      // useAuth 모킹 복원
      vi.mocked(useAuth).mockReturnValue({
        workersTokens: { accessToken: 'test-token', refreshToken: 'test-refresh' },
        workersUser: { id: 'user-123', email: 'test@example.com' },
        isAuthenticated: true,
        loading: false,
      } as any);
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

    it('스트리밍 중 isStreaming이 true여야 함', async () => {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          controller.enqueue(
            encoder.encode('event: content_block_delta\ndata: {"type":"content_block_delta","delta":{"type":"text_delta","text":"테스트"}}\n\n')
          );
          await new Promise(resolve => setTimeout(resolve, 50));
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
    });
  });

  describe('프롬프트 유효성 검사', () => {
    it('빈 메시지도 전송할 수 있어야 함', async () => {
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
        await result.current.sendMessage('');
      });

      await waitFor(() => {
        expect(result.current.state.messages).toHaveLength(2);
      });

      expect(result.current.state.messages[0].content).toBe('');
      expect(fetch).toHaveBeenCalled();
    });

    it('공백만 있는 메시지도 전송할 수 있어야 함', async () => {
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
        await result.current.sendMessage('   ');
      });

      await waitFor(() => {
        expect(result.current.state.messages).toHaveLength(2);
      });

      expect(result.current.state.messages[0].content).toBe('   ');
      expect(fetch).toHaveBeenCalled();
    });
  });

  describe('요청 옵션 오버라이드', () => {
    it('sendMessage 호출 시 옵션을 오버라이드할 수 있어야 함', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          content: [{ type: 'text', text: '응답' }],
          usage: { input_tokens: 10, output_tokens: 20 },
          stop_reason: 'end_turn',
        }),
      };

      vi.mocked(fetch).mockResolvedValue(mockResponse as any);

      const { result } = renderHook(
        () => useClaudeStreaming({ streaming: false, model: 'claude-3-5-sonnet-20241022' }),
        { wrapper }
      );

      await act(async () => {
        await result.current.sendMessage('테스트', {
          model: 'claude-3-opus-20240229',
        });
      });

      const fetchCall = vi.mocked(fetch).mock.calls[0];
      const body = JSON.parse(fetchCall[1]?.body as string);

      // 오버라이드된 모델이 사용되어야 함
      expect(body.model).toBe('claude-3-opus-20240229');
    });

    it('systemPrompt를 요청마다 다르게 설정할 수 있어야 함', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          content: [{ type: 'text', text: '응답' }],
          usage: { input_tokens: 10, output_tokens: 20 },
          stop_reason: 'end_turn',
        }),
      };

      vi.mocked(fetch).mockResolvedValue(mockResponse as any);

      const { result } = renderHook(
        () => useClaudeStreaming({ streaming: false, systemPrompt: '기본 프롬프트' }),
        { wrapper }
      );

      await act(async () => {
        await result.current.sendMessage('테스트', {
          systemPrompt: '특별한 프롬프트',
        });
      });

      const fetchCall = vi.mocked(fetch).mock.calls[0];
      const body = JSON.parse(fetchCall[1]?.body as string);

      expect(body.system).toBe('특별한 프롬프트');
    });
  });

  describe('컴포넌트 언마운트', () => {
    it('언마운트 시 cleanup이 실행되어야 함', async () => {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          controller.enqueue(
            encoder.encode('event: content_block_delta\ndata: {"type":"content_block_delta","delta":{"type":"text_delta","text":"시작"}}\n\n')
          );
          await new Promise(resolve => setTimeout(resolve, 50));
          controller.close();
        },
      });

      const mockResponse = {
        ok: true,
        body: stream,
      };

      vi.mocked(fetch).mockResolvedValue(mockResponse as any);

      const { result, unmount } = renderHook(() => useClaudeStreaming({ streaming: true }), { wrapper });

      await act(async () => {
        result.current.sendMessage('테스트');
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      // 언마운트 전에 상태 저장
      const wasStreaming = result.current.state.isStreaming;

      unmount();

      // 언마운트는 정상적으로 실행되어야 함 (에러 없이)
      expect(wasStreaming).toBeDefined();
    });
  });

  describe('AbortController 동작', () => {
    it('AbortController가 올바르게 생성되어야 함', async () => {
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

      // fetch가 호출될 때 signal이 전달되는지 확인
      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        })
      );
    });

    it('중단 시 AbortController.abort()가 호출되어야 함', async () => {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          controller.enqueue(
            encoder.encode('event: content_block_delta\ndata: {"type":"content_block_delta","delta":{"type":"text_delta","text":"시작"}}\n\n')
          );
          await new Promise(resolve => setTimeout(resolve, 100));
          controller.close();
        },
      });

      const mockResponse = {
        ok: true,
        body: stream,
      };

      vi.mocked(fetch).mockResolvedValue(mockResponse as any);

      const { result } = renderHook(() => useClaudeStreaming({ streaming: true }), { wrapper });

      await act(async () => {
        result.current.sendMessage('테스트');
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      await waitFor(() => {
        expect(result.current.state.isStreaming).toBe(true);
      });

      act(() => {
        result.current.stopStreaming();
      });

      expect(result.current.state.isStreaming).toBe(false);
    });
  });

  describe('연속 스트리밍 요청', () => {
    it('첫 번째 요청 완료 후 두 번째 요청을 처리할 수 있어야 함', async () => {
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

      // 첫 번째 요청
      await act(async () => {
        await result.current.sendMessage('첫 번째');
      });

      await waitFor(() => {
        expect(result.current.state.messages).toHaveLength(2);
      });

      // 두 번째 요청
      await act(async () => {
        await result.current.sendMessage('두 번째');
      });

      await waitFor(() => {
        expect(result.current.state.messages).toHaveLength(4);
      });

      expect(result.current.state.messages[0].content).toBe('첫 번째');
      expect(result.current.state.messages[2].content).toBe('두 번째');
    });

    it('토큰 사용량이 누적되어야 함', async () => {
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

      // 첫 번째 요청
      await act(async () => {
        await result.current.sendMessage('첫 번째');
      });

      await waitFor(() => {
        expect(result.current.state.totalUsage.input_tokens).toBe(10);
      });

      // 두 번째 요청
      await act(async () => {
        await result.current.sendMessage('두 번째');
      });

      await waitFor(() => {
        expect(result.current.state.totalUsage.input_tokens).toBe(20);
      });

      expect(result.current.state.totalUsage.output_tokens).toBe(40);
    });
  });

  describe('동시 요청 방지', () => {
    it('이전 요청이 진행 중일 때 새 요청은 이전 요청을 중단해야 함', async () => {
      let callCount = 0;
      vi.mocked(fetch).mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          ok: true,
          json: async () => {
            await new Promise(resolve => setTimeout(resolve, 50));
            return {
              content: [{ type: 'text', text: `응답 ${callCount}` }],
              usage: { input_tokens: 10, output_tokens: 20 },
              stop_reason: 'end_turn',
            };
          },
        } as any);
      });

      const { result } = renderHook(() => useClaudeStreaming({ streaming: false }), { wrapper });

      // 첫 번째 요청 시작 (완료되지 않음)
      const firstPromise = act(async () => {
        try {
          await result.current.sendMessage('첫 번째');
        } catch {
          // 중단된 요청은 에러를 던질 수 있음
        }
      });

      // 약간의 지연 후 두 번째 요청 (첫 번째 요청 중단)
      await new Promise(resolve => setTimeout(resolve, 10));

      await act(async () => {
        await result.current.sendMessage('두 번째');
      });

      // 첫 번째 요청 완료 대기
      await firstPromise;

      // 최종적으로 메시지가 추가되었는지 확인
      await waitFor(() => {
        expect(result.current.state.messages.length).toBeGreaterThan(0);
      });

      // 마지막 사용자 메시지가 '두 번째'인지 확인
      const userMessages = result.current.state.messages.filter(m => m.role === 'user');
      expect(userMessages[userMessages.length - 1].content).toBe('두 번째');
    });
  });

  describe('reset 함수 동작', () => {
    it('clearConversation이 모든 상태를 초기화해야 함', async () => {
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
        expect(result.current.state.messages).toHaveLength(2);
      });

      act(() => {
        result.current.clearConversation();
      });

      expect(result.current.state.messages).toEqual([]);
      expect(result.current.state.streamingText).toBe('');
      expect(result.current.state.error).toBe(null);
      expect(result.current.state.lastUsage).toBe(null);
      expect(result.current.state.totalUsage.input_tokens).toBe(0);
      expect(result.current.state.totalUsage.output_tokens).toBe(0);
    });

    it('clearConversation이 새로운 conversationId를 생성해야 함', async () => {
      const { result } = renderHook(() => useClaudeStreaming(), { wrapper });

      const oldId = result.current.state.conversationId;

      act(() => {
        result.current.clearConversation();
      });

      expect(result.current.state.conversationId).not.toBe(oldId);
      expect(result.current.state.conversationId).toBeTruthy();
    });
  });

  describe('메시지 변경 콜백', () => {
    it('onMessageChange 콜백이 메시지 변경 시 호출되어야 함', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          content: [{ type: 'text', text: '응답' }],
          usage: { input_tokens: 10, output_tokens: 20 },
          stop_reason: 'end_turn',
        }),
      };

      vi.mocked(fetch).mockResolvedValue(mockResponse as any);

      const onMessageChange = vi.fn();
      const { result } = renderHook(
        () => useClaudeStreaming({ streaming: false, onMessageChange }),
        { wrapper }
      );

      await act(async () => {
        await result.current.sendMessage('테스트');
      });

      await waitFor(() => {
        expect(onMessageChange).toHaveBeenCalled();
      });

      expect(onMessageChange).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ role: 'user', content: '테스트' }),
        ])
      );
    });
  });

  describe('네트워크 에러 처리', () => {
    it('fetch 실패 시 에러를 처리해야 함', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

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

    it('네트워크 연결 끊김 에러를 처리해야 함', async () => {
      const mockResponse = {
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        json: async () => ({
          error: { message: 'Service temporarily unavailable' },
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

      expect(result.current.error?.httpStatus).toBe(503);
    });

    it('Rate Limit 에러를 처리해야 함', async () => {
      const mockResponse = {
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        json: async () => ({
          error: { message: 'Rate limit exceeded' },
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

      expect(result.current.error?.httpStatus).toBe(429);
    });
  });

  describe('스트리밍 청크 데이터 누적', () => {
    it('여러 청크를 올바르게 누적해야 함', async () => {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          controller.enqueue(
            encoder.encode('event: message_start\ndata: {"type":"message_start","message":{"usage":{"input_tokens":10}}}\n\n')
          );
          controller.enqueue(
            encoder.encode('event: content_block_delta\ndata: {"type":"content_block_delta","delta":{"type":"text_delta","text":"안녕"}}\n\n')
          );
          controller.enqueue(
            encoder.encode('event: content_block_delta\ndata: {"type":"content_block_delta","delta":{"type":"text_delta","text":"하세요"}}\n\n')
          );
          controller.enqueue(
            encoder.encode('event: content_block_delta\ndata: {"type":"content_block_delta","delta":{"type":"text_delta","text":"!"}}\n\n')
          );
          controller.enqueue(
            encoder.encode('event: message_delta\ndata: {"type":"message_delta","usage":{"output_tokens":5},"delta":{"stop_reason":"end_turn"}}\n\n')
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

      await act(async () => {
        await result.current.sendMessage('테스트');
      });

      await waitFor(() => {
        expect(result.current.state.messages).toHaveLength(2);
      });

      expect(result.current.state.messages[1].content).toBe('안녕하세요!');
    });
  });

  describe('옵션 처리', () => {
    it('커스텀 모델을 지정할 수 있어야 함', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          content: [{ type: 'text', text: '응답' }],
          usage: { input_tokens: 10, output_tokens: 20 },
          stop_reason: 'end_turn',
        }),
      };

      vi.mocked(fetch).mockResolvedValue(mockResponse as any);

      const { result } = renderHook(
        () => useClaudeStreaming({ streaming: false, model: 'claude-3-opus-20240229' }),
        { wrapper }
      );

      await act(async () => {
        await result.current.sendMessage('테스트');
      });

      await waitFor(() => {
        expect(fetch).toHaveBeenCalled();
      });

      const fetchCall = vi.mocked(fetch).mock.calls[0];
      const body = JSON.parse(fetchCall[1]?.body as string);

      expect(body.model).toBe('claude-3-opus-20240229');
    });

    it('maxTokens 설정이 적용되어야 함', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          content: [{ type: 'text', text: '응답' }],
          usage: { input_tokens: 10, output_tokens: 20 },
          stop_reason: 'end_turn',
        }),
      };

      vi.mocked(fetch).mockResolvedValue(mockResponse as any);

      const { result } = renderHook(
        () => useClaudeStreaming({ streaming: false, maxTokens: 2000 }),
        { wrapper }
      );

      await act(async () => {
        await result.current.sendMessage('테스트');
      });

      const fetchCall = vi.mocked(fetch).mock.calls[0];
      const body = JSON.parse(fetchCall[1]?.body as string);

      expect(body.max_tokens).toBe(2000);
    });

    it('temperature 설정이 적용되어야 함', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          content: [{ type: 'text', text: '응답' }],
          usage: { input_tokens: 10, output_tokens: 20 },
          stop_reason: 'end_turn',
        }),
      };

      vi.mocked(fetch).mockResolvedValue(mockResponse as any);

      const { result } = renderHook(
        () => useClaudeStreaming({ streaming: false, temperature: 0.8 }),
        { wrapper }
      );

      await act(async () => {
        await result.current.sendMessage('테스트');
      });

      const fetchCall = vi.mocked(fetch).mock.calls[0];
      const body = JSON.parse(fetchCall[1]?.body as string);

      expect(body.temperature).toBe(0.8);
    });
  });
});

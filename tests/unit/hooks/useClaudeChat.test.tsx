/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useClaudeChat } from '@/hooks/useClaudeChat';
import { supabase } from '@/integrations/supabase/client';
import React, { type ReactNode } from 'react';

// Mock supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
    functions: {
      invoke: vi.fn(),
    },
  },
}));

// Mock localStorage
const localStorageMock: Record<string, string> = {};
global.localStorage = {
  getItem: vi.fn((key: string) => localStorageMock[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    localStorageMock[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete localStorageMock[key];
  }),
  clear: vi.fn(() => {
    Object.keys(localStorageMock).forEach((key) => delete localStorageMock[key]);
  }),
  length: 0,
  key: vi.fn(),
} as Storage;

describe('useClaudeChat', () => {
  let queryClient: QueryClient;

  const mockSession = {
    access_token: 'mock-token-123',
    user: { id: 'user-123' },
  };

  const mockClaudeResponse = {
    success: true,
    data: {
      id: 'msg_123',
      content: 'Claude AI 응답입니다.',
      model: 'claude-3-5-sonnet-20241022',
      usage: {
        input_tokens: 10,
        output_tokens: 20,
        total_tokens: 30,
      },
      stop_reason: 'end_turn',
    },
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    vi.clearAllMocks();
    localStorage.clear();

    // 기본 세션 모킹
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: mockSession as any },
      error: null,
    });
  });

  afterEach(() => {
    localStorage.clear();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe('초기 상태', () => {
    it('빈 메시지 배열로 초기화되어야 함', () => {
      const { result } = renderHook(() => useClaudeChat(), { wrapper });

      expect(result.current.messages).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isStreaming).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.tokenUsage).toBe(null);
      expect(result.current.totalTokenUsage).toEqual({
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
      });
    });

    it('초기 메시지가 제공되면 해당 메시지로 초기화되어야 함', () => {
      const initialMessages = [
        {
          id: 'msg_1',
          role: 'user' as const,
          content: '안녕하세요',
          createdAt: new Date(),
        },
      ];

      const { result } = renderHook(() => useClaudeChat({ initialMessages }), { wrapper });

      expect(result.current.messages).toEqual(initialMessages);
    });

    it('필요한 모든 함수가 정의되어 있어야 함', () => {
      const { result } = renderHook(() => useClaudeChat(), { wrapper });

      expect(typeof result.current.sendMessage).toBe('function');
      expect(typeof result.current.clearMessages).toBe('function');
      expect(typeof result.current.deleteMessage).toBe('function');
      expect(typeof result.current.retryLastMessage).toBe('function');
    });
  });

  describe('로컬 스토리지 통합', () => {
    it('storageKey가 제공되면 로컬 스토리지에서 메시지를 불러와야 함', () => {
      const storedMessages = [
        {
          id: 'msg_1',
          role: 'user',
          content: '저장된 메시지',
          createdAt: new Date().toISOString(),
        },
      ];

      localStorage.setItem('test-storage-key', JSON.stringify(storedMessages));

      const { result } = renderHook(() => useClaudeChat({ storageKey: 'test-storage-key' }), {
        wrapper,
      });

      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0].content).toBe('저장된 메시지');
    });

    it('메시지가 변경되면 로컬 스토리지에 저장되어야 함', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: mockClaudeResponse,
        error: null,
      });

      const { result } = renderHook(
        () => useClaudeChat({ storageKey: 'test-storage-key', enableStreaming: false }),
        { wrapper }
      );

      await act(async () => {
        await result.current.sendMessage('테스트 메시지');
      });

      await waitFor(() => {
        expect(result.current.messages.length).toBeGreaterThan(0);
      });

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'test-storage-key',
        expect.any(String)
      );
    });

    it('clearMessages 호출 시 로컬 스토리지에서도 제거되어야 함', () => {
      localStorage.setItem('test-storage-key', JSON.stringify([]));

      const { result } = renderHook(() => useClaudeChat({ storageKey: 'test-storage-key' }), {
        wrapper,
      });

      act(() => {
        result.current.clearMessages();
      });

      expect(localStorage.removeItem).toHaveBeenCalledWith('test-storage-key');
    });
  });

  describe('메시지 전송 (비스트리밍)', () => {
    it('메시지 전송 성공 시 사용자 메시지와 AI 응답이 추가되어야 함', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: mockClaudeResponse,
        error: null,
      });

      const { result } = renderHook(() => useClaudeChat({ enableStreaming: false }), { wrapper });

      await act(async () => {
        await result.current.sendMessage('안녕하세요');
      });

      await waitFor(() => {
        expect(result.current.messages).toHaveLength(2);
      });

      expect(result.current.messages[0].role).toBe('user');
      expect(result.current.messages[0].content).toBe('안녕하세요');
      expect(result.current.messages[1].role).toBe('assistant');
      expect(result.current.messages[1].content).toBe('Claude AI 응답입니다.');
    });

    it('토큰 사용량이 올바르게 업데이트되어야 함', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: mockClaudeResponse,
        error: null,
      });

      const { result } = renderHook(() => useClaudeChat({ enableStreaming: false }), { wrapper });

      await act(async () => {
        await result.current.sendMessage('테스트');
      });

      await waitFor(() => {
        expect(result.current.tokenUsage).not.toBe(null);
      });

      expect(result.current.tokenUsage).toEqual({
        inputTokens: 10,
        outputTokens: 20,
        totalTokens: 30,
      });

      expect(result.current.totalTokenUsage).toEqual({
        inputTokens: 10,
        outputTokens: 20,
        totalTokens: 30,
      });
    });

    it('빈 메시지는 전송되지 않아야 함', async () => {
      const { result } = renderHook(() => useClaudeChat({ enableStreaming: false }), { wrapper });

      await act(async () => {
        await result.current.sendMessage('   ');
      });

      expect(result.current.messages).toHaveLength(0);
      expect(supabase.functions.invoke).not.toHaveBeenCalled();
    });

    it('onSuccess 콜백이 호출되어야 함', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: mockClaudeResponse,
        error: null,
      });

      const onSuccess = vi.fn();
      const { result } = renderHook(
        () => useClaudeChat({ enableStreaming: false, onSuccess }),
        { wrapper }
      );

      await act(async () => {
        await result.current.sendMessage('테스트');
      });

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
      });

      expect(onSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'assistant',
          content: 'Claude AI 응답입니다.',
        }),
        expect.objectContaining({
          inputTokens: 10,
          outputTokens: 20,
          totalTokens: 30,
        })
      );
    });
  });

  describe('에러 처리', () => {
    it('인증 토큰이 없으면 에러가 발생해야 함', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const { result } = renderHook(() => useClaudeChat({ enableStreaming: false }), { wrapper });

      await act(async () => {
        await result.current.sendMessage('테스트');
      });

      await waitFor(() => {
        expect(result.current.error).not.toBe(null);
      });

      expect(result.current.error?.message).toContain('인증이 필요합니다');
    });

    it('API 에러 발생 시 에러 상태가 업데이트되어야 함', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: null,
        error: { message: 'API 에러' },
      });

      const { result } = renderHook(() => useClaudeChat({ enableStreaming: false }), { wrapper });

      await act(async () => {
        await result.current.sendMessage('테스트');
      });

      await waitFor(() => {
        expect(result.current.error).not.toBe(null);
      });

      expect(result.current.error?.message).toContain('API 에러');
    });

    it('onError 콜백이 호출되어야 함', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: null,
        error: { message: 'API 에러' },
      });

      const onError = vi.fn();
      const { result } = renderHook(
        () => useClaudeChat({ enableStreaming: false, onError }),
        { wrapper }
      );

      await act(async () => {
        await result.current.sendMessage('테스트');
      });

      await waitFor(() => {
        expect(onError).toHaveBeenCalled();
      });

      expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });

    it('응답 success가 false면 에러가 발생해야 함', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: {
          success: false,
          error: {
            code: 'RATE_LIMIT',
            message: 'Rate limit exceeded',
            request_id: 'req_123',
            timestamp: new Date().toISOString(),
          },
        },
        error: null,
      });

      const { result } = renderHook(() => useClaudeChat({ enableStreaming: false }), { wrapper });

      await act(async () => {
        await result.current.sendMessage('테스트');
      });

      await waitFor(() => {
        expect(result.current.error).not.toBe(null);
      });

      expect(result.current.error?.message).toContain('Rate limit exceeded');
    });
  });

  describe('메시지 관리', () => {
    it('clearMessages로 모든 메시지를 초기화할 수 있어야 함', () => {
      const { result } = renderHook(() => useClaudeChat({ enableStreaming: false }), { wrapper });

      // 임시 메시지 추가
      act(() => {
        result.current.messages.push({
          id: 'msg_1',
          role: 'user',
          content: '테스트',
          createdAt: new Date(),
        });
      });

      act(() => {
        result.current.clearMessages();
      });

      expect(result.current.messages).toEqual([]);
      expect(result.current.tokenUsage).toBe(null);
      expect(result.current.totalTokenUsage).toEqual({
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
      });
    });

    it('deleteMessage로 특정 메시지를 삭제할 수 있어야 함', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: mockClaudeResponse,
        error: null,
      });

      const { result } = renderHook(() => useClaudeChat({ enableStreaming: false }), { wrapper });

      await act(async () => {
        await result.current.sendMessage('메시지 1');
      });

      await waitFor(() => {
        expect(result.current.messages).toHaveLength(2);
      });

      const messageId = result.current.messages[0].id;

      act(() => {
        result.current.deleteMessage(messageId);
      });

      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages.find((m) => m.id === messageId)).toBeUndefined();
    });

    it('retryLastMessage로 마지막 사용자 메시지를 재전송할 수 있어야 함', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: mockClaudeResponse,
        error: null,
      });

      const { result } = renderHook(() => useClaudeChat({ enableStreaming: false }), { wrapper });

      await act(async () => {
        await result.current.sendMessage('첫 번째 메시지');
      });

      await waitFor(() => {
        expect(result.current.messages).toHaveLength(2);
      });

      // 재시도
      await act(async () => {
        await result.current.retryLastMessage();
      });

      await waitFor(() => {
        expect(result.current.messages).toHaveLength(2); // 사용자 메시지는 슬라이스 후 재전송
      });

      expect(supabase.functions.invoke).toHaveBeenCalledTimes(2);
    });

    it('사용자 메시지가 없을 때 retryLastMessage는 아무것도 하지 않아야 함', async () => {
      const { result } = renderHook(() => useClaudeChat({ enableStreaming: false }), { wrapper });

      await act(async () => {
        await result.current.retryLastMessage();
      });

      expect(result.current.messages).toHaveLength(0);
      expect(supabase.functions.invoke).not.toHaveBeenCalled();
    });
  });

  describe('옵션 처리', () => {
    it('커스텀 모델을 지정할 수 있어야 함', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: mockClaudeResponse,
        error: null,
      });

      const { result } = renderHook(
        () => useClaudeChat({ enableStreaming: false, defaultModel: 'claude-3-opus-20240229' }),
        { wrapper }
      );

      await act(async () => {
        await result.current.sendMessage('테스트');
      });

      await waitFor(() => {
        expect(supabase.functions.invoke).toHaveBeenCalled();
      });

      expect(supabase.functions.invoke).toHaveBeenCalledWith(
        'claude-ai/chat',
        expect.objectContaining({
          body: expect.objectContaining({
            model: 'claude-3-opus-20240229',
          }),
        })
      );
    });

    it('커스텀 시스템 프롬프트를 사용할 수 있어야 함', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: mockClaudeResponse,
        error: null,
      });

      const customPrompt = '당신은 전문 코딩 어시스턴트입니다.';
      const { result } = renderHook(
        () => useClaudeChat({ enableStreaming: false, systemPrompt: customPrompt }),
        { wrapper }
      );

      await act(async () => {
        await result.current.sendMessage('테스트');
      });

      await waitFor(() => {
        expect(supabase.functions.invoke).toHaveBeenCalled();
      });

      expect(supabase.functions.invoke).toHaveBeenCalledWith(
        'claude-ai/chat',
        expect.objectContaining({
          body: expect.objectContaining({
            system: customPrompt,
          }),
        })
      );
    });

    it('maxTokens와 temperature를 설정할 수 있어야 함', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: mockClaudeResponse,
        error: null,
      });

      const { result } = renderHook(
        () => useClaudeChat({ enableStreaming: false, maxTokens: 500, temperature: 0.8 }),
        { wrapper }
      );

      await act(async () => {
        await result.current.sendMessage('테스트');
      });

      await waitFor(() => {
        expect(supabase.functions.invoke).toHaveBeenCalled();
      });

      expect(supabase.functions.invoke).toHaveBeenCalledWith(
        'claude-ai/chat',
        expect.objectContaining({
          body: expect.objectContaining({
            max_tokens: 500,
            temperature: 0.8,
          }),
        })
      );
    });
  });

  describe('로딩 상태', () => {
    it('메시지 전송 중 isLoading이 true여야 함', async () => {
      vi.mocked(supabase.functions.invoke).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ data: mockClaudeResponse, error: null }), 100)
          )
      );

      const { result } = renderHook(() => useClaudeChat({ enableStreaming: false }), { wrapper });

      act(() => {
        result.current.sendMessage('테스트');
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(
        () => {
          expect(result.current.isLoading).toBe(false);
        },
        { timeout: 3000 }
      );
    });
  });
});

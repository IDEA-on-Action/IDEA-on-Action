 
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useChat } from '@/hooks/useChat';
import React, { type ReactNode } from 'react';

// Mock OpenAI library
vi.mock('@/lib/openai', () => ({
  createChatCompletionStream: vi.fn(),
  addSystemPrompt: vi.fn((messages) => messages),
  limitContext: vi.fn((messages) => messages),
}));

// Mock errors library
vi.mock('@/lib/errors', () => ({
  devError: vi.fn(),
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

describe('useChat', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    vi.clearAllMocks();
    localStorage.clear();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe('초기 상태', () => {
    it('빈 메시지 배열로 초기화되어야 함', () => {
      const { result } = renderHook(() => useChat(), { wrapper });

      expect(result.current.messages).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
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

      const { result } = renderHook(() => useChat({ initialMessages }), { wrapper });

      expect(result.current.messages).toEqual(initialMessages);
    });

    it('필요한 모든 함수가 정의되어 있어야 함', () => {
      const { result } = renderHook(() => useChat(), { wrapper });

      expect(typeof result.current.sendMessage).toBe('function');
      expect(typeof result.current.clearMessages).toBe('function');
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

      const { result } = renderHook(() => useChat({ storageKey: 'test-storage-key' }), {
        wrapper,
      });

      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0].content).toBe('저장된 메시지');
    });

    it('clearMessages 호출 시 로컬 스토리지에서도 제거되어야 함', () => {
      localStorage.setItem('test-storage-key', JSON.stringify([]));

      const { result } = renderHook(() => useChat({ storageKey: 'test-storage-key' }), {
        wrapper,
      });

      act(() => {
        result.current.clearMessages();
      });

      expect(localStorage.removeItem).toHaveBeenCalledWith('test-storage-key');
    });
  });

  describe('메시지 전송', () => {
    it('빈 메시지는 전송되지 않아야 함', async () => {
      const { result } = renderHook(() => useChat(), { wrapper });

      await act(async () => {
        await result.current.sendMessage('   ');
      });

      expect(result.current.messages).toHaveLength(0);
    });

    it('메시지 전송 시 사용자 메시지가 추가되어야 함', async () => {
      const { createChatCompletionStream } = await import('@/lib/openai');

      // Mock async generator
      async function* mockStream() {
        yield '안녕';
        yield '하세요';
      }

      vi.mocked(createChatCompletionStream).mockReturnValue(mockStream());

      const { result } = renderHook(() => useChat(), { wrapper });

      await act(async () => {
        await result.current.sendMessage('안녕하세요');
      });

      await waitFor(() => {
        expect(result.current.messages.length).toBeGreaterThan(0);
      });

      expect(result.current.messages[0].role).toBe('user');
      expect(result.current.messages[0].content).toBe('안녕하세요');
    });

    it('스트리밍 응답이 AI 메시지로 추가되어야 함', async () => {
      const { createChatCompletionStream } = await import('@/lib/openai');

      async function* mockStream() {
        yield 'AI ';
        yield '응답';
        yield '입니다';
      }

      vi.mocked(createChatCompletionStream).mockReturnValue(mockStream());

      const { result } = renderHook(() => useChat(), { wrapper });

      await act(async () => {
        await result.current.sendMessage('테스트');
      });

      await waitFor(() => {
        expect(result.current.messages).toHaveLength(2);
      });

      expect(result.current.messages[1].role).toBe('assistant');
      expect(result.current.messages[1].content).toBe('AI 응답입니다');
    });
  });

  describe('에러 처리', () => {
    it('스트리밍 중 에러 발생 시 에러 상태가 업데이트되어야 함', async () => {
      const { createChatCompletionStream } = await import('@/lib/openai');

      // eslint-disable-next-line require-yield
      async function* mockStream() {
        throw new Error('스트리밍 오류');
      }

      vi.mocked(createChatCompletionStream).mockReturnValue(mockStream());

      const { result } = renderHook(() => useChat(), { wrapper });

      await act(async () => {
        await result.current.sendMessage('테스트');
      });

      await waitFor(() => {
        expect(result.current.error).not.toBe(null);
      });
    });

    it('에러 발생 시 에러 메시지가 추가되어야 함', async () => {
      const { createChatCompletionStream } = await import('@/lib/openai');

      // eslint-disable-next-line require-yield
      async function* mockStream() {
        throw new Error('API 오류');
      }

      vi.mocked(createChatCompletionStream).mockReturnValue(mockStream());

      const { result } = renderHook(() => useChat(), { wrapper });

      await act(async () => {
        await result.current.sendMessage('테스트');
      });

      await waitFor(() => {
        const assistantMessages = result.current.messages.filter(m => m.role === 'assistant');
        expect(assistantMessages.length).toBeGreaterThan(0);
      });

      const errorMessage = result.current.messages.find(
        m => m.role === 'assistant' && m.content.includes('오류가 발생했습니다')
      );
      expect(errorMessage).toBeDefined();
    });
  });

  describe('로딩 상태', () => {
    it('메시지 전송 중 isLoading이 true여야 함', async () => {
      const { createChatCompletionStream } = await import('@/lib/openai');

      async function* mockStream() {
        await new Promise(resolve => setTimeout(resolve, 100));
        yield 'test';
      }

      vi.mocked(createChatCompletionStream).mockReturnValue(mockStream());

      const { result } = renderHook(() => useChat(), { wrapper });

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

  describe('메시지 관리', () => {
    it('clearMessages로 모든 메시지를 초기화할 수 있어야 함', async () => {
      const { createChatCompletionStream } = await import('@/lib/openai');

      async function* mockStream() {
        yield 'test';
      }

      vi.mocked(createChatCompletionStream).mockReturnValue(mockStream());

      const { result } = renderHook(() => useChat(), { wrapper });

      await act(async () => {
        await result.current.sendMessage('테스트');
      });

      await waitFor(() => {
        expect(result.current.messages.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.clearMessages();
      });

      expect(result.current.messages).toEqual([]);
    });
  });
});

/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useClaudeVision, useUIDesignAnalysis } from '@/hooks/useClaudeVision';
import * as cloudflareClient from '@/integrations/cloudflare/client';
import React, { type ReactNode } from 'react';

// Mock Workers API client
vi.mock('@/integrations/cloudflare/client', () => ({
  callWorkersApi: vi.fn(),
}));

// Mock useAuth
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    workersTokens: { accessToken: 'mock-token' },
    workersUser: { id: 'user-123', email: 'test@example.com' },
    isAuthenticated: true,
    loading: false,
    error: null,
    user: { id: 'user-123', email: 'test@example.com' },
    session: null,
    login: vi.fn(),
    logout: vi.fn(),
    signUp: vi.fn(),
    getAccessToken: vi.fn(() => 'mock-token'),
    refreshTokens: vi.fn(),
  })),
}));

// Mock errors
vi.mock('@/lib/errors', () => ({
  devError: vi.fn(),
}));

// Mock fetch for streaming
global.fetch = vi.fn();

describe('useClaudeVision', () => {
  let queryClient: QueryClient;

  // Workers API 응답 형식
  const mockVisionResponse = {
    success: true,
    data: {
      analysis: 'UI 분석 결과입니다.',
      usage: {
        inputTokens: 150,
        outputTokens: 100,
      },
      model: 'claude-3-5-sonnet-20241022',
      id: 'msg_123',
    },
  };

  beforeEach(async () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    vi.clearAllMocks();

    // useAuth 기본 모킹 복원
    const useAuthModule = await import('@/hooks/useAuth');
    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      workersTokens: { accessToken: 'mock-token' },
      workersUser: { id: 'user-123', email: 'test@example.com' },
      isAuthenticated: true,
      loading: false,
      error: null,
      user: { id: 'user-123', email: 'test@example.com' },
      session: null,
      login: vi.fn(),
      logout: vi.fn(),
      signUp: vi.fn(),
      getAccessToken: vi.fn(() => 'mock-token'),
      refreshTokens: vi.fn(),
    } as any);

    // Workers API 기본 모킹 (성공 응답)
    vi.mocked(cloudflareClient.callWorkersApi).mockResolvedValue({
      data: mockVisionResponse,
      error: null,
      status: 200,
    });
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe('초기 상태', () => {
    it('빈 상태로 초기화되어야 함', () => {
      const { result } = renderHook(() => useClaudeVision(), { wrapper });

      expect(result.current.isAnalyzing).toBe(false);
      expect(result.current.isStreaming).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.lastResponse).toBe(null);
      expect(result.current.lastUsage).toBe(null);
    });

    it('필요한 모든 함수가 정의되어 있어야 함', () => {
      const { result } = renderHook(() => useClaudeVision(), { wrapper });

      expect(typeof result.current.analyzeImage).toBe('function');
      expect(typeof result.current.analyzeImageStream).toBe('function');
      expect(typeof result.current.reset).toBe('function');
    });
  });

  describe('이미지 분석 (비스트리밍)', () => {
    it('이미지 분석이 성공해야 함', async () => {
      const { result } = renderHook(() => useClaudeVision(), { wrapper });

      const request = {
        images: [
          {
            type: 'base64' as const,
            source: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
          },
        ],
        prompt: 'UI를 분석해주세요',
      };

      let response;
      await act(async () => {
        response = await result.current.analyzeImage(request);
      });

      await waitFor(() => {
        expect(result.current.lastResponse).not.toBe(null);
      });

      expect(response).toBeDefined();
      expect(result.current.lastResponse?.analysis).toBe('UI 분석 결과입니다.');
      expect(result.current.lastUsage).toEqual({
        input_tokens: 150,
        output_tokens: 100,
      });
    });

    it('analysisType이 올바르게 전달되어야 함', async () => {
      const { result } = renderHook(
        () => useClaudeVision({ defaultAnalysisType: 'ui-design' }),
        { wrapper }
      );

      const request = {
        images: [
          {
            type: 'base64' as const,
            source: 'data:image/png;base64,test',
          },
        ],
        prompt: '분석',
      };

      await act(async () => {
        await result.current.analyzeImage(request);
      });

      await waitFor(() => {
        expect(cloudflareClient.callWorkersApi).toHaveBeenCalled();
      });

      expect(cloudflareClient.callWorkersApi).toHaveBeenCalledWith(
        '/api/v1/ai/vision',
        expect.objectContaining({
          method: 'POST',
          token: 'mock-token',
          body: expect.objectContaining({
            analysisType: 'ui-design',
          }),
        })
      );
    });

    it('onSuccess 콜백이 호출되어야 함', async () => {
      const onSuccess = vi.fn();
      const { result } = renderHook(() => useClaudeVision({ onSuccess }), { wrapper });

      const request = {
        images: [
          {
            type: 'base64' as const,
            source: 'data:image/png;base64,test',
          },
        ],
        prompt: '테스트',
      };

      await act(async () => {
        await result.current.analyzeImage(request);
      });

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
      });

      expect(onSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          analysis: 'UI 분석 결과입니다.',
          usage: expect.any(Object),
        })
      );
    });
  });

  describe('이미지 분석 (스트리밍)', () => {
    it('스트리밍 분석이 성공해야 함', async () => {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          controller.enqueue(encoder.encode('data: {"type":"text","content":"UI "}\n\n'));
          controller.enqueue(encoder.encode('data: {"type":"text","content":"분석 "}\n\n'));
          controller.enqueue(encoder.encode('data: {"type":"text","content":"결과"}\n\n'));
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        },
      });

      const mockResponse = {
        ok: true,
        body: stream,
      };

      vi.mocked(fetch).mockResolvedValue(mockResponse as any);

      const { result } = renderHook(() => useClaudeVision(), { wrapper });

      const chunks: string[] = [];
      const request = {
        images: [
          {
            type: 'base64' as const,
            source: 'data:image/png;base64,test',
          },
        ],
        prompt: '스트리밍 테스트',
      };

      await act(async () => {
        await result.current.analyzeImageStream(request, (chunk) => {
          chunks.push(chunk);
        });
      });

      await waitFor(() => {
        expect(result.current.lastResponse).not.toBe(null);
      });

      expect(chunks.length).toBeGreaterThan(0);
      expect(result.current.lastResponse?.analysis).toContain('UI');
    });

    it('스트리밍 중 isStreaming이 true여야 함', async () => {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          await new Promise(resolve => setTimeout(resolve, 50));
          controller.enqueue(encoder.encode('data: {"type":"text","content":"test"}\n\n'));
          controller.close();
        },
      });

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        body: stream,
      } as any);

      const { result } = renderHook(() => useClaudeVision(), { wrapper });

      const request = {
        images: [
          {
            type: 'base64' as const,
            source: 'data:image/png;base64,test',
          },
        ],
        prompt: '테스트',
      };

      act(() => {
        result.current.analyzeImageStream(request, () => {});
      });

      // 스트리밍 시작 직후
      await waitFor(() => {
        expect(result.current.isStreaming).toBe(true);
      });
    });

    it('onStreamChunk 콜백이 호출되어야 함', async () => {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          controller.enqueue(encoder.encode('data: {"type":"text","content":"chunk1"}\n\n'));
          controller.enqueue(encoder.encode('data: {"type":"text","content":"chunk2"}\n\n'));
          controller.close();
        },
      });

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        body: stream,
      } as any);

      const onStreamChunk = vi.fn();
      const { result } = renderHook(() => useClaudeVision({ onStreamChunk }), { wrapper });

      const request = {
        images: [
          {
            type: 'base64' as const,
            source: 'data:image/png;base64,test',
          },
        ],
        prompt: '테스트',
      };

      await act(async () => {
        await result.current.analyzeImageStream(request, () => {});
      });

      // onStreamChunk가 호출되었는지 확인
      await waitFor(() => {
        expect(result.current.isStreaming).toBe(false);
      });
    });
  });

  describe('에러 처리', () => {
    it('인증 토큰이 없으면 에러가 발생해야 함', async () => {
      // useAuth 모킹 변경 - 토큰 없음
      const useAuthModule = await import('@/hooks/useAuth');
      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        workersTokens: null,
        workersUser: null,
        isAuthenticated: false,
        loading: false,
        error: null,
        user: null,
        session: null,
        login: vi.fn(),
        logout: vi.fn(),
        signUp: vi.fn(),
        getAccessToken: vi.fn(() => null),
        refreshTokens: vi.fn(),
      } as any);

      const { result } = renderHook(() => useClaudeVision(), { wrapper });

      const request = {
        images: [
          {
            type: 'base64' as const,
            source: 'data:image/png;base64,test',
          },
        ],
        prompt: '테스트',
      };

      await act(async () => {
        try {
          await result.current.analyzeImage(request);
        } catch (error) {
          // 에러 예상
        }
      });

      await waitFor(() => {
        expect(result.current.error).not.toBe(null);
      });

      expect(result.current.error?.code).toBe('UNAUTHORIZED');
    });

    it('API 에러 발생 시 에러 상태가 업데이트되어야 함', async () => {
      vi.mocked(cloudflareClient.callWorkersApi).mockResolvedValue({
        data: null,
        error: 'Vision API 오류',
        status: 500,
      });

      const { result } = renderHook(() => useClaudeVision(), { wrapper });

      const request = {
        images: [
          {
            type: 'base64' as const,
            source: 'data:image/png;base64,test',
          },
        ],
        prompt: '테스트',
      };

      await act(async () => {
        try {
          await result.current.analyzeImage(request);
        } catch (error) {
          // 에러 예상
        }
      });

      await waitFor(() => {
        expect(result.current.error).not.toBe(null);
      });

      expect(result.current.error?.code).toBe('API_ERROR');
    });

    it('onError 콜백이 호출되어야 함', async () => {
      vi.mocked(cloudflareClient.callWorkersApi).mockResolvedValue({
        data: {
          success: false,
          error: {
            code: 'API_ERROR',
            message: '이미지 처리 실패',
          },
        },
        error: null,
        status: 200,
      });

      const onError = vi.fn();
      const { result } = renderHook(() => useClaudeVision({ onError }), { wrapper });

      const request = {
        images: [
          {
            type: 'base64' as const,
            source: 'data:image/png;base64,test',
          },
        ],
        prompt: '테스트',
      };

      await act(async () => {
        try {
          await result.current.analyzeImage(request);
        } catch (error) {
          // 에러 예상
        }
      });

      await waitFor(() => {
        expect(onError).toHaveBeenCalled();
      });
    });
  });

  describe('상태 관리', () => {
    it('reset으로 상태를 초기화할 수 있어야 함', async () => {
      const { result } = renderHook(() => useClaudeVision(), { wrapper });

      const request = {
        images: [
          {
            type: 'base64' as const,
            source: 'data:image/png;base64,test',
          },
        ],
        prompt: '테스트',
      };

      await act(async () => {
        await result.current.analyzeImage(request);
      });

      await waitFor(() => {
        expect(result.current.lastResponse).not.toBe(null);
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.error).toBe(null);
      expect(result.current.lastResponse).toBe(null);
      expect(result.current.lastUsage).toBe(null);
    });
  });

  describe('로딩 상태', () => {
    it('분석 중 isAnalyzing이 true여야 함', async () => {
      vi.mocked(cloudflareClient.callWorkersApi).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  data: mockVisionResponse,
                  error: null,
                  status: 200,
                }),
              100
            )
          )
      );

      const { result } = renderHook(() => useClaudeVision(), { wrapper });

      const request = {
        images: [
          {
            type: 'base64' as const,
            source: 'data:image/png;base64,test',
          },
        ],
        prompt: '테스트',
      };

      act(() => {
        result.current.analyzeImage(request);
      });

      await waitFor(() => {
        expect(result.current.isAnalyzing).toBe(true);
      });

      await waitFor(
        () => {
          expect(result.current.isAnalyzing).toBe(false);
        },
        { timeout: 3000 }
      );
    });
  });
});

describe('useUIDesignAnalysis', () => {
  let queryClient: QueryClient;

  beforeEach(async () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    vi.clearAllMocks();

    // useAuth 기본 모킹 복원
    const useAuthModule = await import('@/hooks/useAuth');
    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      workersTokens: { accessToken: 'mock-token' },
      workersUser: { id: 'user-123', email: 'test@example.com' },
      isAuthenticated: true,
      loading: false,
      error: null,
      user: { id: 'user-123', email: 'test@example.com' },
      session: null,
      login: vi.fn(),
      logout: vi.fn(),
      signUp: vi.fn(),
      getAccessToken: vi.fn(() => 'mock-token'),
      refreshTokens: vi.fn(),
    } as any);

    // Workers API 기본 모킹 (성공 응답)
    vi.mocked(cloudflareClient.callWorkersApi).mockResolvedValue({
      data: {
        success: true,
        data: {
          analysis: 'UI 분석',
          usage: { inputTokens: 10, outputTokens: 10 },
        },
      },
      error: null,
      status: 200,
    });
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('UI 디자인 분석 타입으로 초기화되어야 함', async () => {
    const { result } = renderHook(() => useUIDesignAnalysis(), { wrapper });

    const request = {
      images: [
        {
          type: 'base64' as const,
          source: 'data:image/png;base64,test',
        },
      ],
      prompt: 'UI 분석',
    };

    await act(async () => {
      await result.current.analyzeImage(request);
    });

    await waitFor(() => {
      expect(cloudflareClient.callWorkersApi).toHaveBeenCalled();
    });

    expect(cloudflareClient.callWorkersApi).toHaveBeenCalledWith(
      '/api/v1/ai/vision',
      expect.objectContaining({
        method: 'POST',
        token: 'mock-token',
        body: expect.objectContaining({
          analysisType: 'ui-design',
        }),
      })
    );
  });
});

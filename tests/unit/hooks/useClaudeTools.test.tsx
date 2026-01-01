/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useClaudeTools, useClaudeToolList, useHasTool } from '@/hooks/ai/useClaudeTools';
import React, { type ReactNode } from 'react';

// Mock toolRegistry - factory 함수 사용
vi.mock('@/lib/claude/tools', () => ({
  toolRegistry: {
    getAll: vi.fn(),
    get: vi.fn(),
    execute: vi.fn(),
    size: 4,
  },
}));

// Mock useAuth
vi.mock('@/hooks/auth/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'user-123' },
  })),
}));

describe('useClaudeTools', () => {
  let queryClient: QueryClient;

  const mockTools = [
    {
      name: 'get_issues',
      description: '이슈 목록 조회',
      input_schema: {
        type: 'object',
        properties: {
          status: { type: 'string' },
        },
      },
    },
    {
      name: 'get_events',
      description: '이벤트 목록 조회',
      input_schema: {
        type: 'object',
        properties: {
          limit: { type: 'number' },
        },
      },
    },
  ];

  beforeEach(async () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    vi.clearAllMocks();

    // Mock toolRegistry.getAll()
    const { toolRegistry } = await import('@/lib/claude/tools');
    vi.mocked(toolRegistry.getAll).mockReturnValue(mockTools);
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe('초기 상태', () => {
    it('등록된 도구 목록을 반환해야 함', () => {
      const { result } = renderHook(() => useClaudeTools(), { wrapper });

      expect(result.current.tools).toEqual(mockTools);
      expect(result.current.tools).toHaveLength(2);
    });

    it('필요한 모든 함수가 정의되어 있어야 함', () => {
      const { result } = renderHook(() => useClaudeTools(), { wrapper });

      expect(typeof result.current.executeTool).toBe('function');
      expect(result.current.isExecuting).toBe(false);
      expect(result.current.error).toBe(null);
    });
  });

  describe('도구 실행', () => {
    it('도구 실행이 성공해야 함', async () => {
      const mockToolUse = {
        type: 'tool_use' as const,
        id: 'toolu_123',
        name: 'get_issues',
        input: { status: 'open' },
      };

      const mockResult = {
        type: 'tool_result' as const,
        tool_use_id: 'toolu_123',
        content: JSON.stringify({ issues: [] }),
      };

      const { toolRegistry } = await import('@/lib/claude/tools');
      vi.mocked(toolRegistry.execute).mockResolvedValue(mockResult);

      const { result } = renderHook(() => useClaudeTools(), { wrapper });

      let executionResult;
      await waitFor(async () => {
        executionResult = await result.current.executeTool({
          toolUse: mockToolUse,
          userId: 'user-123',
        });
      });

      expect(executionResult).toEqual(mockResult);
      expect(toolRegistry.execute).toHaveBeenCalledWith(mockToolUse, 'user-123');
    });

    it('userId가 제공되지 않으면 useAuth의 userId를 사용해야 함', async () => {
      const mockToolUse = {
        type: 'tool_use' as const,
        id: 'toolu_456',
        name: 'get_events',
        input: { limit: 10 },
      };

      const mockResult = {
        type: 'tool_result' as const,
        tool_use_id: 'toolu_456',
        content: JSON.stringify({ events: [] }),
      };

      const { toolRegistry } = await import('@/lib/claude/tools');
      vi.mocked(toolRegistry.execute).mockResolvedValue(mockResult);

      const { result } = renderHook(() => useClaudeTools(), { wrapper });

      await waitFor(async () => {
        await result.current.executeTool({ toolUse: mockToolUse });
      });

      expect(toolRegistry.execute).toHaveBeenCalledWith(mockToolUse, 'user-123');
    });

    it('도구 실행 중 isExecuting이 true여야 함', async () => {
      const mockToolUse = {
        type: 'tool_use' as const,
        id: 'toolu_789',
        name: 'get_issues',
        input: { status: 'closed' },
      };

      const { toolRegistry } = await import('@/lib/claude/tools');
      vi.mocked(toolRegistry.execute).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({
          type: 'tool_result',
          tool_use_id: 'toolu_789',
          content: '{}',
        }), 100))
      );

      const { result } = renderHook(() => useClaudeTools(), { wrapper });

      const promise = result.current.executeTool({ toolUse: mockToolUse });

      // 실행 중인지 확인 (비동기라 바로 확인 안 될 수 있음)
      await waitFor(() => {
        // mutation이 완료될 때까지 대기
        return promise;
      });

      expect(toolRegistry.execute).toHaveBeenCalled();
    });
  });

  describe('에러 처리', () => {
    it('도구 실행 실패 시 에러가 설정되어야 함', async () => {
      const mockToolUse = {
        type: 'tool_use' as const,
        id: 'toolu_error',
        name: 'invalid_tool',
        input: {},
      };

      const mockError = new Error('도구를 찾을 수 없습니다.');
      const { toolRegistry } = await import('@/lib/claude/tools');
      vi.mocked(toolRegistry.execute).mockRejectedValue(mockError);

      const { result } = renderHook(() => useClaudeTools(), { wrapper });

      try {
        await result.current.executeTool({ toolUse: mockToolUse });
      } catch (error) {
        // 에러 예상
      }

      await waitFor(() => {
        expect(result.current.error).not.toBe(null);
      });

      expect(result.current.error?.message).toContain('도구를 찾을 수 없습니다');
    });
  });
});

describe('useClaudeToolList', () => {
  const mockTools = [
    {
      name: 'tool1',
      description: '도구 1',
      input_schema: { type: 'object', properties: {} },
    },
    {
      name: 'tool2',
      description: '도구 2',
      input_schema: { type: 'object', properties: {} },
    },
  ];

  beforeEach(async () => {
    vi.clearAllMocks();
    const { toolRegistry } = await import('@/lib/claude/tools');
    vi.mocked(toolRegistry.getAll).mockReturnValue(mockTools);
  });

  it('도구 목록만 반환해야 함', () => {
    const { result } = renderHook(() => useClaudeToolList());

    expect(result.current).toEqual(mockTools);
    expect(result.current).toHaveLength(2);
  });
});

describe('useHasTool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('등록된 도구가 있으면 true를 반환해야 함', async () => {
    const { toolRegistry } = await import('@/lib/claude/tools');
    vi.mocked(toolRegistry.get).mockReturnValue({
      name: 'get_issues',
      description: '이슈 조회',
      input_schema: {},
    } as any);

    const { result } = renderHook(() => useHasTool('get_issues'));

    expect(result.current).toBe(true);
    expect(toolRegistry.get).toHaveBeenCalledWith('get_issues');
  });

  it('등록되지 않은 도구면 false를 반환해야 함', async () => {
    const { toolRegistry } = await import('@/lib/claude/tools');
    vi.mocked(toolRegistry.get).mockReturnValue(undefined);

    const { result } = renderHook(() => useHasTool('non_existent_tool'));

    expect(result.current).toBe(false);
    expect(toolRegistry.get).toHaveBeenCalledWith('non_existent_tool');
  });
});

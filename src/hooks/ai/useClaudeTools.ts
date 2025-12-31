/**
 * useClaudeTools Hook
 *
 * Claude AI Tool Use 기능을 위한 React 훅
 * - 등록된 도구 목록 제공
 * - 도구 실행 및 결과 반환
 *
 * @module hooks/useClaudeTools
 * @see https://docs.anthropic.com/claude/docs/tool-use
 */

import { useMutation } from '@tanstack/react-query';
import { toolRegistry } from '@/lib/claude/tools';
import type { ClaudeTool, ClaudeToolUseBlock, ClaudeToolResultBlock } from '@/types/claude.types';
import { useAuth } from '@/hooks/useAuth';

// ============================================================================
// Types
// ============================================================================

interface ExecuteToolParams {
  /** Claude의 tool_use 블록 */
  toolUse: ClaudeToolUseBlock;
  /** 사용자 ID (선택, useAuth에서 자동 가져옴) */
  userId?: string;
}

interface UseClaudeToolsResult {
  /** 등록된 모든 도구 목록 (Claude API에 전달) */
  tools: ClaudeTool[];
  /** 도구 실행 함수 */
  executeTool: (params: ExecuteToolParams) => Promise<ClaudeToolResultBlock>;
  /** 도구 실행 중 여부 */
  isExecuting: boolean;
  /** 도구 실행 에러 */
  error: Error | null;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Claude Tool Use 기능을 사용하기 위한 훅
 *
 * @example
 * ```typescript
 * function ChatComponent() {
 *   const { tools, executeTool, isExecuting } = useClaudeTools();
 *
 *   // 1. Claude API에 도구 목록 전달
 *   const response = await fetch('/api/claude', {
 *     method: 'POST',
 *     body: JSON.stringify({
 *       messages: [...],
 *       tools: tools,  // <- 여기
 *       tool_choice: { type: 'auto' }
 *     })
 *   });
 *
 *   // 2. Claude가 tool_use를 반환하면 실행
 *   const data = await response.json();
 *   const toolUseBlock = data.content.find(block => block.type === 'tool_use');
 *
 *   if (toolUseBlock) {
 *     const result = await executeTool({ toolUse: toolUseBlock });
 *
 *     // 3. 결과를 다시 Claude에게 전달
 *     const finalResponse = await fetch('/api/claude', {
 *       method: 'POST',
 *       body: JSON.stringify({
 *         messages: [
 *           ...previousMessages,
 *           { role: 'assistant', content: data.content },
 *           { role: 'user', content: [result] }  // <- tool_result
 *         ]
 *       })
 *     });
 *   }
 * }
 * ```
 */
export function useClaudeTools(): UseClaudeToolsResult {
  const { user } = useAuth();

  // 도구 실행 Mutation
  const executeMutation = useMutation<ClaudeToolResultBlock, Error, ExecuteToolParams>({
    mutationFn: async ({ toolUse, userId }: ExecuteToolParams) => {
      const effectiveUserId = userId || user?.id;
      return await toolRegistry.execute(toolUse, effectiveUserId);
    },
    onError: (error) => {
      console.error('[useClaudeTools] 도구 실행 실패:', error);
    },
    onSuccess: (result) => {
      console.log('[useClaudeTools] 도구 실행 성공:', result);
    },
  });

  return {
    tools: toolRegistry.getAll(),
    executeTool: executeMutation.mutateAsync,
    isExecuting: executeMutation.isPending,
    error: executeMutation.error,
  };
}

/**
 * 도구 목록만 필요한 경우 사용하는 간단한 훅
 *
 * @example
 * ```typescript
 * function ToolList() {
 *   const tools = useClaudeToolList();
 *   return (
 *     <ul>
 *       {tools.map(tool => (
 *         <li key={tool.name}>{tool.name}: {tool.description}</li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */
export function useClaudeToolList(): ClaudeTool[] {
  return toolRegistry.getAll();
}

/**
 * 특정 도구가 등록되어 있는지 확인하는 유틸리티 훅
 *
 * @param toolName - 확인할 도구 이름
 * @returns 도구 등록 여부
 *
 * @example
 * ```typescript
 * function MyComponent() {
 *   const hasIssueTool = useHasTool('get_issues');
 *
 *   if (!hasIssueTool) {
 *     return <div>이슈 조회 기능을 사용할 수 없습니다.</div>;
 *   }
 *
 *   return <IssueList />;
 * }
 * ```
 */
export function useHasTool(toolName: string): boolean {
  return toolRegistry.get(toolName) !== undefined;
}

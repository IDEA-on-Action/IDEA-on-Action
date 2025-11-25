/**
 * Claude Tool Registry
 *
 * Claude AI의 Tool Use 기능을 위한 도구 레지스트리
 * - 도구 등록 및 관리
 * - 도구 실행 및 결과 반환
 *
 * @module lib/claude/tools
 * @see https://docs.anthropic.com/claude/docs/tool-use
 */

import type { ClaudeTool, ClaudeToolUseBlock, ClaudeToolResultBlock } from '@/types/claude.types';

// ============================================================================
// Types
// ============================================================================

/**
 * 도구 핸들러 인터페이스
 *
 * 각 도구는 이 인터페이스를 구현하여 등록됩니다.
 */
export interface ToolHandler {
  /** 도구 이름 (고유 식별자) */
  name: string;
  /** 도구 설명 (Claude가 도구 선택 시 참고) */
  description: string;
  /** 입력 스키마 (JSON Schema) */
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
  /** 도구 실행 함수 */
  execute: (input: Record<string, unknown>, userId?: string) => Promise<unknown>;
}

// ============================================================================
// Tool Registry Class
// ============================================================================

/**
 * 도구 레지스트리 클래스
 *
 * 도구를 등록하고 관리하며, Claude의 tool_use 요청을 처리합니다.
 *
 * @example
 * ```typescript
 * // 도구 등록
 * toolRegistry.register({
 *   name: 'get_weather',
 *   description: '날씨 정보를 조회합니다',
 *   inputSchema: {
 *     type: 'object',
 *     properties: {
 *       location: { type: 'string', description: '도시 이름' }
 *     },
 *     required: ['location']
 *   },
 *   execute: async (input) => {
 *     return { temperature: 20, weather: 'sunny' };
 *   }
 * });
 *
 * // 도구 목록 가져오기 (Claude API에 전달)
 * const tools = toolRegistry.getAll();
 *
 * // 도구 실행
 * const result = await toolRegistry.execute(toolUse, userId);
 * ```
 */
export class ToolRegistry {
  private tools: Map<string, ToolHandler> = new Map();

  /**
   * 도구 등록
   *
   * @param handler - 도구 핸들러
   * @throws 이미 등록된 도구 이름이면 에러 발생
   */
  register(handler: ToolHandler): void {
    if (this.tools.has(handler.name)) {
      console.warn(`[ToolRegistry] 도구 '${handler.name}'이(가) 이미 등록되어 있습니다. 덮어씁니다.`);
    }
    this.tools.set(handler.name, handler);
    console.log(`[ToolRegistry] 도구 등록: ${handler.name}`);
  }

  /**
   * 도구 가져오기
   *
   * @param name - 도구 이름
   * @returns 도구 핸들러 또는 undefined
   */
  get(name: string): ToolHandler | undefined {
    return this.tools.get(name);
  }

  /**
   * 등록된 모든 도구 목록 가져오기 (Claude API 형식)
   *
   * @returns ClaudeTool 배열
   */
  getAll(): ClaudeTool[] {
    return Array.from(this.tools.values()).map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.inputSchema,
    }));
  }

  /**
   * 도구 실행
   *
   * Claude의 tool_use 블록을 받아 해당 도구를 실행하고 결과를 반환합니다.
   *
   * @param toolUse - Claude의 tool_use 블록
   * @param userId - 사용자 ID (선택, 권한 확인용)
   * @returns tool_result 블록
   */
  async execute(toolUse: ClaudeToolUseBlock, userId?: string): Promise<ClaudeToolResultBlock> {
    const handler = this.tools.get(toolUse.name);

    // 도구를 찾을 수 없는 경우
    if (!handler) {
      console.error(`[ToolRegistry] 도구를 찾을 수 없습니다: ${toolUse.name}`);
      return {
        type: 'tool_result',
        tool_use_id: toolUse.id,
        content: `도구 '${toolUse.name}'을(를) 찾을 수 없습니다.`,
        is_error: true,
      };
    }

    // 도구 실행
    try {
      console.log(`[ToolRegistry] 도구 실행 시작: ${toolUse.name}`, { input: toolUse.input, userId });
      const result = await handler.execute(toolUse.input, userId);
      console.log(`[ToolRegistry] 도구 실행 성공: ${toolUse.name}`);

      return {
        type: 'tool_result',
        tool_use_id: toolUse.id,
        content: JSON.stringify(result, null, 2),
      };
    } catch (error) {
      console.error(`[ToolRegistry] 도구 실행 실패: ${toolUse.name}`, error);

      return {
        type: 'tool_result',
        tool_use_id: toolUse.id,
        content: error instanceof Error ? error.message : String(error),
        is_error: true,
      };
    }
  }

  /**
   * 등록된 도구 개수
   */
  get size(): number {
    return this.tools.size;
  }

  /**
   * 모든 도구 초기화 (테스트용)
   */
  clear(): void {
    this.tools.clear();
    console.log('[ToolRegistry] 모든 도구가 초기화되었습니다.');
  }
}

// ============================================================================
// Global Registry Instance
// ============================================================================

/**
 * 전역 도구 레지스트리 인스턴스
 *
 * 애플리케이션 전역에서 사용되는 단일 레지스트리입니다.
 */
export const toolRegistry = new ToolRegistry();

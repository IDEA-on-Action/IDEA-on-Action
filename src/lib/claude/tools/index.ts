/**
 * Claude Tools - 도구 등록 및 Export
 *
 * 모든 Claude Tool을 등록하고 내보냅니다.
 *
 * @module lib/claude/tools
 */

import { toolRegistry } from './tools';
import { issuesTool } from './issues.tool';
import { eventsTool } from './events.tool';
import { healthTool } from './health.tool';
import { projectsTool } from './projects.tool';

// ============================================================================
// Tool Registration
// ============================================================================

/**
 * 모든 도구를 레지스트리에 등록
 *
 * 이 함수는 애플리케이션 초기화 시 한 번만 호출되어야 합니다.
 */
export function registerAllTools(): void {
  console.log('[Claude Tools] 도구 등록 시작...');

  // Central Hub 관련 도구
  toolRegistry.register(issuesTool);
  toolRegistry.register(eventsTool);
  toolRegistry.register(healthTool);

  // 프로젝트 관련 도구
  toolRegistry.register(projectsTool);

  console.log(`[Claude Tools] 총 ${toolRegistry.size}개의 도구가 등록되었습니다.`);
}

// ============================================================================
// Exports
// ============================================================================

export { toolRegistry } from './tools';
export type { ToolHandler } from './tools';

// 개별 도구 export (필요 시 직접 접근)
export { issuesTool } from './issues.tool';
export { eventsTool } from './events.tool';
export { healthTool } from './health.tool';
export { projectsTool } from './projects.tool';

/**
 * 사용 가이드:
 *
 * 1. 앱 초기화 시 도구 등록:
 * ```typescript
 * import { registerAllTools } from '@/lib/claude/tools';
 * registerAllTools();
 * ```
 *
 * 2. React 컴포넌트에서 사용:
 * ```typescript
 * import { useClaudeTools } from '@/hooks/ai/useClaudeTools';
 *
 * function MyComponent() {
 *   const { tools, executeTool } = useClaudeTools();
 *
 *   // Claude API에 tools 전달
 *   // Claude가 tool_use 블록을 반환하면:
 *   const result = await executeTool({ toolUse, userId });
 * }
 * ```
 *
 * 3. 새로운 도구 추가:
 * ```typescript
 * // src/lib/claude/tools/my-tool.tool.ts
 * export const myTool: ToolHandler = {
 *   name: 'my_tool',
 *   description: '...',
 *   inputSchema: { ... },
 *   execute: async (input, userId) => { ... }
 * };
 *
 * // src/lib/claude/tools/index.ts
 * import { myTool } from './my-tool.tool';
 * toolRegistry.register(myTool);
 * export { myTool } from './my-tool.tool';
 * ```
 */

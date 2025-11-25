/**
 * Claude Tools 테스트 스크립트
 *
 * 등록된 모든 도구를 테스트하고 결과를 출력합니다.
 *
 * 실행 방법:
 * ```bash
 * npx tsx scripts/test-claude-tools.ts
 * ```
 */

import { toolRegistry, registerAllTools } from '../src/lib/claude/tools';
import type { ClaudeToolUseBlock } from '../src/types/claude.types';

// ============================================================================
// Helper Functions
// ============================================================================

function createToolUseBlock(name: string, input: Record<string, unknown>): ClaudeToolUseBlock {
  return {
    type: 'tool_use',
    id: `test-${Date.now()}-${Math.random()}`,
    name,
    input,
  };
}

function printResult(toolName: string, result: unknown) {
  console.log('\n' + '='.repeat(80));
  console.log(`📊 도구: ${toolName}`);
  console.log('='.repeat(80));
  console.log(JSON.stringify(result, null, 2));
}

// ============================================================================
// Test Cases
// ============================================================================

async function testIssuesTool() {
  console.log('\n🧪 테스트 1: get_issues (전체 조회)');
  const toolUse = createToolUseBlock('get_issues', { limit: 5 });
  const result = await toolRegistry.execute(toolUse);
  printResult('get_issues', result);
}

async function testIssuesToolWithFilters() {
  console.log('\n🧪 테스트 2: get_issues (필터링)');
  const toolUse = createToolUseBlock('get_issues', {
    service_id: 'minu-find',
    status: 'open',
    limit: 3,
  });
  const result = await toolRegistry.execute(toolUse);
  printResult('get_issues (filtered)', result);
}

async function testEventsTool() {
  console.log('\n🧪 테스트 3: get_events');
  const toolUse = createToolUseBlock('get_events', {
    service_id: 'minu-build',
    event_type: 'deployment',
    limit: 5,
  });
  const result = await toolRegistry.execute(toolUse);
  printResult('get_events', result);
}

async function testHealthTool() {
  console.log('\n🧪 테스트 4: get_health');
  const toolUse = createToolUseBlock('get_health', {
    status: 'healthy',
    limit: 5,
  });
  const result = await toolRegistry.execute(toolUse);
  printResult('get_health', result);
}

async function testProjectsTool() {
  console.log('\n🧪 테스트 5: get_projects');
  const toolUse = createToolUseBlock('get_projects', {
    status: 'in-progress',
    limit: 5,
  });
  const result = await toolRegistry.execute(toolUse);
  printResult('get_projects', result);
}

async function testProjectsToolWithSearch() {
  console.log('\n🧪 테스트 6: get_projects (검색)');
  const toolUse = createToolUseBlock('get_projects', {
    search: 'AI',
    limit: 5,
  });
  const result = await toolRegistry.execute(toolUse);
  printResult('get_projects (search)', result);
}

async function testInvalidTool() {
  console.log('\n🧪 테스트 7: 존재하지 않는 도구');
  const toolUse = createToolUseBlock('invalid_tool', {});
  const result = await toolRegistry.execute(toolUse);
  printResult('invalid_tool (error expected)', result);
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log('\n' + '🚀 Claude Tools 테스트 시작'.padEnd(80, '='));

  // 도구 등록
  registerAllTools();

  console.log(`\n✅ 등록된 도구: ${toolRegistry.size}개`);
  const tools = toolRegistry.getAll();
  tools.forEach((tool) => {
    console.log(`   - ${tool.name}: ${tool.description.split('\n')[0]}`);
  });

  // 테스트 실행
  try {
    await testIssuesTool();
    await testIssuesToolWithFilters();
    await testEventsTool();
    await testHealthTool();
    await testProjectsTool();
    await testProjectsToolWithSearch();
    await testInvalidTool();

    console.log('\n' + '✅ 모든 테스트 완료'.padEnd(80, '=') + '\n');
  } catch (error) {
    console.error('\n❌ 테스트 실패:', error);
    process.exit(1);
  }
}

// 실행
main();

# Claude Tool Use 구현 가이드

> IDEA on Action 프로젝트의 Claude AI Tool Use 기능 구현 문서

**작성일**: 2025-11-25
**버전**: 1.0.0
**관련 PR**: (추후 추가)

## 📋 개요

Claude AI의 **Tool Use** 기능을 IDEA on Action 프로젝트에 통합하여, AI가 프로젝트 데이터를 직접 조회하고 활용할 수 있도록 구현했습니다.

### 핵심 기능

- ✅ **ToolRegistry 클래스**: 도구 등록 및 관리
- ✅ **4개의 도구**: 이슈, 이벤트, 헬스, 프로젝트 조회
- ✅ **React 훅**: `useClaudeTools` (도구 실행 및 관리)
- ✅ **TypeScript 타입 안전성**: 모든 도구에 타입 정의

## 🗂️ 파일 구조

```
src/
├── lib/
│   └── claude/
│       ├── tools.ts                  # ToolRegistry 클래스
│       └── tools/
│           ├── index.ts              # 도구 등록 및 export
│           ├── issues.tool.ts        # 이슈 조회 도구
│           ├── events.tool.ts        # 이벤트 조회 도구
│           ├── health.tool.ts        # 헬스 조회 도구
│           └── projects.tool.ts      # 프로젝트 조회 도구
└── hooks/
    └── useClaudeTools.ts             # Tool Use React 훅
```

## 🛠️ 구현된 도구 목록

### 1. `get_issues` - 서비스 이슈 조회

**설명**: 서비스 이슈 목록을 조회합니다.

**파라미터**:
- `service_id` (선택): `minu-find` | `minu-frame` | `minu-build` | `minu-keep`
- `status` (선택): `open` | `in_progress` | `resolved` | `closed`
- `limit` (선택): 조회 개수 (기본 10, 최대 50)

**예시**:
```json
{
  "name": "get_issues",
  "input": {
    "service_id": "minu-find",
    "status": "open",
    "limit": 5
  }
}
```

**응답**:
```json
{
  "total": 5,
  "issues": [
    {
      "id": "uuid",
      "service_id": "minu-find",
      "title": "API 응답 지연",
      "status": "open",
      "severity": "high",
      "created_at": "2025-11-25T10:00:00Z"
    }
  ]
}
```

---

### 2. `get_events` - 서비스 이벤트 조회

**설명**: 서비스 이벤트 목록을 조회합니다.

**파라미터**:
- `service_id` (선택): `minu-find` | `minu-frame` | `minu-build` | `minu-keep`
- `event_type` (선택): `deployment` | `api_call` | `error` | `performance` | `user_action`
- `project_id` (선택): 프로젝트 ID
- `limit` (선택): 조회 개수 (기본 10, 최대 100)

**예시**:
```json
{
  "name": "get_events",
  "input": {
    "service_id": "minu-build",
    "event_type": "deployment",
    "limit": 10
  }
}
```

---

### 3. `get_health` - 서비스 헬스 조회

**설명**: 서비스 헬스 상태를 조회합니다.

**파라미터**:
- `service_id` (선택): `minu-find` | `minu-frame` | `minu-build` | `minu-keep`
- `status` (선택): `healthy` | `degraded` | `unhealthy`
- `limit` (선택): 조회 개수 (기본 10, 최대 50)

**예시**:
```json
{
  "name": "get_health",
  "input": {
    "service_id": "minu-keep",
    "status": "healthy"
  }
}
```

---

### 4. `get_projects` - 프로젝트 조회

**설명**: 프로젝트 목록을 조회합니다.

**파라미터**:
- `status` (선택): `planned` | `in-progress` | `completed` | `on-hold`
- `limit` (선택): 조회 개수 (기본 10, 최대 50)
- `search` (선택): 검색 키워드 (제목, 설명)

**예시**:
```json
{
  "name": "get_projects",
  "input": {
    "status": "in-progress",
    "search": "AI",
    "limit": 5
  }
}
```

## 📚 사용 방법

### 1. 앱 초기화 시 도구 등록

```typescript
// src/main.tsx 또는 App.tsx
import { registerAllTools } from '@/lib/claude/tools';

// 앱 시작 시 한 번만 실행
registerAllTools();
```

### 2. React 컴포넌트에서 사용

```typescript
import { useClaudeTools } from '@/hooks/useClaudeTools';
import { useClaudeChat } from '@/hooks/useClaudeChat';

function ChatComponent() {
  const { tools, executeTool, isExecuting } = useClaudeTools();
  const { sendMessage } = useClaudeChat();

  const handleSendMessage = async (userMessage: string) => {
    // 1. Claude에게 메시지 전송 (도구 목록 포함)
    const response = await sendMessage(userMessage, {
      tools: tools,
      tool_choice: { type: 'auto' }  // Claude가 필요하면 도구 사용
    });

    // 2. Claude가 tool_use를 반환했는지 확인
    const toolUseBlock = response.content.find(
      block => block.type === 'tool_use'
    );

    if (toolUseBlock) {
      // 3. 도구 실행
      const result = await executeTool({ toolUse: toolUseBlock });

      // 4. 결과를 Claude에게 다시 전달
      const finalResponse = await sendMessage('', {
        tools: tools,
        messages: [
          ...previousMessages,
          { role: 'assistant', content: response.content },
          { role: 'user', content: [result] }  // tool_result
        ]
      });

      return finalResponse;
    }

    return response;
  };

  return (
    <div>
      {/* UI 구현 */}
    </div>
  );
}
```

### 3. 도구 목록만 사용하는 경우

```typescript
import { useClaudeToolList } from '@/hooks/useClaudeTools';

function ToolListDisplay() {
  const tools = useClaudeToolList();

  return (
    <ul>
      {tools.map(tool => (
        <li key={tool.name}>
          <strong>{tool.name}</strong>: {tool.description}
        </li>
      ))}
    </ul>
  );
}
```

### 4. 특정 도구 사용 가능 여부 확인

```typescript
import { useHasTool } from '@/hooks/useClaudeTools';

function IssueListPage() {
  const hasIssueTool = useHasTool('get_issues');

  if (!hasIssueTool) {
    return <div>이슈 조회 기능을 사용할 수 없습니다.</div>;
  }

  return <IssueList />;
}
```

## 🔧 새로운 도구 추가하기

### 1. 도구 파일 생성

```typescript
// src/lib/claude/tools/my-tool.tool.ts
import type { ToolHandler } from '../tools';
import { supabase } from '@/integrations/supabase/client';

export const myTool: ToolHandler = {
  name: 'my_custom_tool',
  description: '내 커스텀 도구입니다.',
  inputSchema: {
    type: 'object',
    properties: {
      param1: {
        type: 'string',
        description: '파라미터 1'
      }
    },
    required: ['param1']
  },
  execute: async (input, userId) => {
    // 도구 로직 구현
    const { param1 } = input;

    const { data, error } = await supabase
      .from('my_table')
      .select('*')
      .eq('column', param1);

    if (error) throw error;

    return { result: data };
  }
};
```

### 2. 도구 등록

```typescript
// src/lib/claude/tools/index.ts
import { myTool } from './my-tool.tool';

export function registerAllTools(): void {
  // 기존 도구들...
  toolRegistry.register(myTool);
}

export { myTool } from './my-tool.tool';
```

## 🎯 Tool Use 워크플로우

```
1. 사용자 메시지
   ↓
2. Claude API 호출 (tools 포함)
   ↓
3. Claude 응답
   ├─ 텍스트만 있으면 → 완료
   └─ tool_use 있으면 → 4번으로
   ↓
4. executeTool() 실행
   ↓
5. tool_result 생성
   ↓
6. Claude API 재호출 (result 포함)
   ↓
7. 최종 응답 (텍스트)
```

## 🔒 보안 고려사항

1. **권한 확인**: `execute()` 함수에 `userId` 전달하여 권한 확인 가능
2. **Rate Limiting**: 도구 실행 횟수 제한 (추후 구현)
3. **입력 검증**: JSON Schema로 입력 검증
4. **에러 처리**: try-catch로 안전하게 에러 처리

## 📊 테스트

### 단위 테스트 (예시)

```typescript
// __tests__/lib/claude/tools/issues.tool.test.ts
import { issuesTool } from '@/lib/claude/tools/issues.tool';

describe('issuesTool', () => {
  it('should fetch issues by service_id', async () => {
    const result = await issuesTool.execute({
      service_id: 'minu-find',
      limit: 5
    });

    expect(result).toHaveProperty('total');
    expect(result).toHaveProperty('issues');
    expect(Array.isArray(result.issues)).toBe(true);
  });

  it('should filter by status', async () => {
    const result = await issuesTool.execute({
      status: 'open',
      limit: 10
    });

    expect(result.issues.every(issue => issue.status === 'open')).toBe(true);
  });
});
```

### E2E 테스트 (예시)

```typescript
// __tests__/e2e/claude-tools.spec.ts
import { test, expect } from '@playwright/test';

test('Claude should use tools to fetch issues', async ({ page }) => {
  await page.goto('/chat');

  await page.fill('[data-testid="chat-input"]', '최근 open 상태 이슈를 보여줘');
  await page.click('[data-testid="send-button"]');

  // Claude가 get_issues 도구를 사용했는지 확인
  await expect(page.locator('[data-testid="tool-use-badge"]')).toContainText('get_issues');

  // 결과가 표시되는지 확인
  await expect(page.locator('[data-testid="chat-message"]')).toContainText('이슈');
});
```

## 📖 참고 자료

- [Anthropic Claude Tool Use 공식 문서](https://docs.anthropic.com/claude/docs/tool-use)
- [IDEA on Action 타입 정의](../../src/types/claude.types.ts)
- [ToolRegistry 소스 코드](../../src/lib/claude/tools.ts)

## 🚀 다음 단계

- [ ] Rate Limiting 구현
- [ ] 도구 사용 로그 기록
- [ ] 도구 성능 모니터링
- [ ] 추가 도구 개발 (로드맵, 블로그 등)
- [ ] E2E 테스트 작성

---

**문의**: sinclairseo@gmail.com
**업데이트 주기**: 새로운 도구 추가 시

# AI Tool Use 아키텍처 설계

> **작성일**: 2025-11-25
> **버전**: 1.0.0
> **상태**: Draft

---

## 📋 개요

AI Tool Use 기능의 전체 아키텍처, 컴포넌트 구조, 데이터 흐름, 기술 스택을 정의합니다.

---

## 🏗️ 시스템 아키텍처

### 전체 구조도

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌────────────────┐  │
│  │ ChatInterface   │  │ useClaudeTools  │  │ ToolResult UI  │  │
│  └────────┬────────┘  └────────┬────────┘  └────────┬───────┘  │
└───────────┼────────────────────┼────────────────────┼───────────┘
            │                    │                    │
            │ (1) user message   │ (3) streaming      │ (5) display
            ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Supabase Edge Functions                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              claude-ai/index.ts (Main Handler)            │   │
│  │  ┌───────────┐  ┌────────────────┐  ┌────────────────┐  │   │
│  │  │ Auth Check│  │  Rate Limiter  │  │  Usage Logger  │  │   │
│  │  └─────┬─────┘  └────────┬───────┘  └────────┬───────┘  │   │
│  └────────┼─────────────────┼───────────────────┼──────────┘   │
│           │                 │                   │              │
│           ▼                 ▼                   ▼              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Claude API Call (with tools option)          │   │
│  └────────────────────────┬─────────────────────────────────┘   │
│                           │                                     │
│           (2) tool_use    │    (4) tool_result                 │
│                ┌──────────▼──────────┐                          │
│                │  ToolOrchestrator   │                          │
│                │  ┌──────────────┐   │                          │
│                │  │ToolRegistry  │   │                          │
│                │  └──────┬───────┘   │                          │
│                │         │           │                          │
│                │    ┌────▼────┐      │                          │
│                │    │Tool Exec│      │                          │
│                │    └────┬────┘      │                          │
│                └─────────┼───────────┘                          │
│                          │                                      │
│  ┌───────────────────────▼────────────────────────────────┐    │
│  │              tools-handler.ts (Tool Executor)          │    │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐         │    │
│  │  │issues.tool│  │events.tool│  │health.tool│  + more │    │
│  │  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘         │    │
│  └────────┼───────────────┼───────────────┼───────────────┘    │
└───────────┼───────────────┼───────────────┼────────────────────┘
            │               │               │
            ▼               ▼               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Supabase Database                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │service_issues│  │service_events│  │service_health│          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│  ┌──────────────┐  ┌──────────────┐                            │
│  │   projects   │  │   profiles   │                            │
│  └──────────────┘  └──────────────┘                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🧩 컴포넌트 설계

### 1. ToolRegistry (도구 등록소)

**역할**: 도구 정의를 등록, 조회, 관리하는 중앙 레지스트리

**위치**: `supabase/functions/claude-ai/tool-registry.ts`

**클래스 구조**:
```typescript
export class ToolRegistry {
  private tools: Map<string, ClaudeTool>;
  private executors: Map<string, ToolExecutor>;

  constructor() {
    this.tools = new Map();
    this.executors = new Map();
    this.initializeDefaultTools();
  }

  /**
   * 도구 등록
   */
  register(tool: ClaudeTool, executor: ToolExecutor): void {
    this.tools.set(tool.name, tool);
    this.executors.set(tool.name, executor);
  }

  /**
   * 도구 목록 조회 (Claude API 전달용)
   */
  getAllTools(): ClaudeTool[] {
    return Array.from(this.tools.values());
  }

  /**
   * 도구 실행
   */
  async execute(
    toolName: string,
    input: Record<string, unknown>,
    context: ToolExecutionContext
  ): Promise<ToolResult> {
    const executor = this.executors.get(toolName);
    if (!executor) {
      throw new Error(`Tool not found: ${toolName}`);
    }

    return await executor(input, context);
  }

  /**
   * 기본 도구 5개 등록
   */
  private initializeDefaultTools(): void {
    this.register(ISSUES_TOOL, executeIssues);
    this.register(EVENTS_TOOL, executeEvents);
    this.register(HEALTH_TOOL, executeHealth);
    this.register(PROJECTS_TOOL, executeProjects);
    this.register(USERS_TOOL, executeUsers);
  }
}
```

**타입 정의**:
```typescript
export type ToolExecutor = (
  input: Record<string, unknown>,
  context: ToolExecutionContext
) => Promise<ToolResult>;

export interface ToolExecutionContext {
  userId: string;
  supabase: SupabaseClient;
  requestId: string;
}

export interface ToolResult {
  type: 'tool_result';
  tool_use_id: string;
  content: string;
  is_error?: boolean;
}
```

---

### 2. tools-handler.ts (도구 실행자)

**역할**: 각 도구의 실제 로직 구현

**위치**: `supabase/functions/claude-ai/tools-handler.ts`

**구조**:
```typescript
/**
 * 이슈 조회 도구
 */
export const ISSUES_TOOL: ClaudeTool = {
  name: 'issues.tool',
  description: 'Minu 서비스의 이슈 목록을 조회합니다. service_id, severity, status 등으로 필터링 가능.',
  input_schema: {
    type: 'object',
    properties: {
      service_id: {
        type: 'string',
        enum: ['minu-find', 'minu-frame', 'minu-build', 'minu-keep'],
        description: '조회할 서비스 ID'
      },
      severity: {
        type: 'string',
        enum: ['critical', 'high', 'medium', 'low'],
        description: '이슈 심각도'
      },
      status: {
        type: 'string',
        enum: ['open', 'in_progress', 'resolved', 'closed'],
        description: '이슈 상태'
      },
      limit: {
        type: 'number',
        default: 20,
        description: '조회할 최대 개수'
      }
    },
    required: []
  }
};

/**
 * 이슈 조회 실행 함수
 */
export const executeIssues: ToolExecutor = async (input, context) => {
  const { service_id, severity, status, limit = 20 } = input;
  const { userId, supabase, requestId } = context;

  try {
    // Supabase 쿼리 (RLS 자동 적용)
    let query = supabase
      .from('service_issues')
      .select('id, service_id, severity, title, description, status, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(Math.min(limit as number, 100));

    // 필터 적용
    if (service_id) query = query.eq('service_id', service_id);
    if (severity) query = query.eq('severity', severity);
    if (status) query = query.eq('status', status);

    const { data, error, count } = await query;

    if (error) {
      console.error('Issues query error:', error);
      throw error;
    }

    // JSON 결과 생성
    const result = {
      total: count ?? data?.length ?? 0,
      issues: data ?? []
    };

    return {
      type: 'tool_result',
      tool_use_id: requestId,
      content: JSON.stringify(result, null, 2),
      is_error: false
    };
  } catch (error) {
    console.error('executeIssues error:', error);
    return {
      type: 'tool_result',
      tool_use_id: requestId,
      content: `이슈 조회 실패: ${error instanceof Error ? error.message : 'Unknown error'}`,
      is_error: true
    };
  }
};
```

**도구별 파일 분리** (옵션):
```
supabase/functions/claude-ai/tools/
├── issues.tool.ts
├── events.tool.ts
├── health.tool.ts
├── projects.tool.ts
└── users.tool.ts
```

---

### 3. Claude API 통합 (index.ts 수정)

**기존 코드 수정 사항**:

```typescript
// supabase/functions/claude-ai/index.ts

import { ToolRegistry } from './tool-registry.ts';

// 전역 ToolRegistry 인스턴스
const toolRegistry = new ToolRegistry();

/**
 * POST /claude-ai/chat - 채팅 요청 (Tool Use 지원)
 */
async function handleChat(
  req: Request,
  supabase: ReturnType<typeof createClient>,
  requestId: string
): Promise<Response> {
  // ... 기존 인증, Rate Limiting 코드 ...

  // 요청 본문 파싱
  const body: ChatRequest = await req.json();

  // 메시지 턴 제한 (무한 루프 방지)
  const MAX_TURNS = 3;
  let turnCount = 0;
  let messages = [...body.messages];

  while (turnCount < MAX_TURNS) {
    turnCount++;

    // Claude API 호출 (tools 옵션 추가)
    const response = await callClaudeAPI(messages, {
      model: body.model,
      max_tokens: body.max_tokens,
      temperature: body.temperature,
      system: body.system,
      tools: toolRegistry.getAllTools(), // 👈 도구 정의 전달
    });

    // tool_use 블록 확인
    const toolUseBlocks = response.content.filter(
      (block): block is ClaudeToolUseBlock => block.type === 'tool_use'
    );

    // 도구 사용 없으면 응답 반환
    if (toolUseBlocks.length === 0) {
      // ... 기존 성공 응답 코드 ...
      return successResponse(...);
    }

    // 도구 실행
    const toolResults: ClaudeToolResultBlock[] = [];
    for (const toolUse of toolUseBlocks) {
      const result = await toolRegistry.execute(
        toolUse.name,
        toolUse.input,
        { userId, supabase, requestId: toolUse.id }
      );
      toolResults.push({
        ...result,
        tool_use_id: toolUse.id
      });
    }

    // 메시지 히스토리에 assistant 응답과 tool_result 추가
    messages.push({
      role: 'assistant',
      content: response.content
    });
    messages.push({
      role: 'user',
      content: toolResults
    });

    // 다음 턴으로 계속 (Claude가 tool_result를 바탕으로 응답 생성)
  }

  // 최대 턴 초과
  return errorResponse(
    'max_turns_exceeded',
    '도구 사용이 너무 많습니다. 질문을 단순화해주세요.',
    400,
    requestId
  );
}
```

**스트리밍 지원 (handleChatStream)**:
```typescript
async function handleChatStream(
  req: Request,
  supabase: ReturnType<typeof createClient>,
  requestId: string
): Promise<Response> {
  // ... 인증, Rate Limiting ...

  const body: ChatRequest = await req.json();
  let messages = [...body.messages];
  let turnCount = 0;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      while (turnCount < MAX_TURNS) {
        turnCount++;

        // 스트리밍 시작 이벤트
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'turn_start', turn: turnCount })}\n\n`));

        // Claude API 스트리밍 호출 (tools 포함)
        let toolUseBlocks: ClaudeToolUseBlock[] = [];

        for await (const event of callClaudeAPIStreamEvents(messages, {
          model: body.model,
          tools: toolRegistry.getAllTools()
        })) {
          // content_block_start 이벤트에서 tool_use 감지
          if (event.type === 'content_block_start' && event.content_block.type === 'tool_use') {
            toolUseBlocks.push(event.content_block);
          }

          // 텍스트 델타 전송
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'text', content: event.delta.text })}\n\n`));
          }
        }

        // 도구 사용 없으면 종료
        if (toolUseBlocks.length === 0) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
          break;
        }

        // 도구 실행
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'tools_executing', count: toolUseBlocks.length })}\n\n`));

        const toolResults = await Promise.all(
          toolUseBlocks.map(toolUse =>
            toolRegistry.execute(toolUse.name, toolUse.input, { userId, supabase, requestId: toolUse.id })
          )
        );

        // 메시지 업데이트
        messages.push({ role: 'assistant', content: toolUseBlocks });
        messages.push({ role: 'user', content: toolResults });

        // 도구 실행 완료 이벤트
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'tools_completed' })}\n\n`));
      }

      controller.close();
    }
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/event-stream',
      'X-Request-Id': requestId
    }
  });
}
```

---

### 4. 프론트엔드 훅 (useClaudeTools)

**위치**: `src/hooks/ai/useClaudeTools.ts`

**구조**:
```typescript
import { useState, useCallback } from 'react';
import { ClaudeMessage, ClaudeToolUseBlock, ClaudeToolResultBlock } from '@/types/claude.types';
import { useAuth } from '@/hooks/useAuth';

interface UseClaudeToolsOptions {
  model?: string;
  systemPrompt?: string;
  onToolExecuting?: (toolName: string) => void;
  onToolCompleted?: (toolName: string, result: string) => void;
}

interface UseClaudeToolsResult {
  messages: ClaudeMessage[];
  streamingText: string;
  isLoading: boolean;
  isToolExecuting: boolean;
  error: string | null;
  sendMessage: (content: string) => Promise<void>;
  clearConversation: () => void;
}

export function useClaudeTools(options: UseClaudeToolsOptions = {}): UseClaudeToolsResult {
  const { user, getAccessToken } = useAuth();
  const [messages, setMessages] = useState<ClaudeMessage[]>([]);
  const [streamingText, setStreamingText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isToolExecuting, setIsToolExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (content: string) => {
    if (!user) {
      setError('로그인이 필요합니다.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setStreamingText('');

    const userMessage: ClaudeMessage = { role: 'user', content };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);

    try {
      const token = await getAccessToken();
      const response = await fetch('/functions/v1/claude-ai/chat/stream', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: newMessages,
          model: options.model,
          system: options.systemPrompt
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));

            if (data.type === 'text') {
              setStreamingText(prev => prev + data.content);
            } else if (data.type === 'tools_executing') {
              setIsToolExecuting(true);
              options.onToolExecuting?.(data.tool_name);
            } else if (data.type === 'tools_completed') {
              setIsToolExecuting(false);
              options.onToolCompleted?.(data.tool_name, data.result);
            } else if (data.type === 'done') {
              const assistantMessage: ClaudeMessage = {
                role: 'assistant',
                content: streamingText
              };
              setMessages(prev => [...prev, assistantMessage]);
              setStreamingText('');
            }
          }
        }
      }
    } catch (err) {
      console.error('Send message error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
      setIsToolExecuting(false);
    }
  }, [messages, user, options, streamingText, getAccessToken]);

  const clearConversation = useCallback(() => {
    setMessages([]);
    setStreamingText('');
    setError(null);
  }, []);

  return {
    messages,
    streamingText,
    isLoading,
    isToolExecuting,
    error,
    sendMessage,
    clearConversation
  };
}
```

---

## 🔄 데이터 흐름

### 시퀀스 다이어그램

```
사용자     ChatInterface     useClaudeTools     claude-ai/index     ToolRegistry     Supabase
  │              │                  │                    │                 │              │
  │ "이슈 보여줘" │                  │                    │                 │              │
  ├──────────────>│                  │                    │                 │              │
  │              │ sendMessage()    │                    │                 │              │
  │              ├─────────────────>│                    │                 │              │
  │              │                  │ POST /chat/stream  │                 │              │
  │              │                  ├───────────────────>│                 │              │
  │              │                  │                    │ Claude API Call │              │
  │              │                  │                    │ (with tools)    │              │
  │              │                  │                    ├─────────────────┤              │
  │              │                  │                    │                 │              │
  │              │                  │   tool_use block   │                 │              │
  │              │                  │<───────────────────┤                 │              │
  │              │                  │                    │ execute()       │              │
  │              │                  │                    ├────────────────>│              │
  │              │                  │                    │                 │ SELECT query │
  │              │                  │                    │                 ├─────────────>│
  │              │                  │                    │                 │              │
  │              │                  │                    │                 │ data (RLS)   │
  │              │                  │                    │                 │<─────────────┤
  │              │                  │                    │                 │              │
  │              │                  │                    │   tool_result   │              │
  │              │                  │                    │<────────────────┤              │
  │              │                  │                    │                 │              │
  │              │                  │                    │ Claude API Call │              │
  │              │                  │                    │ (with result)   │              │
  │              │                  │                    ├─────────────────┤              │
  │              │                  │                    │                 │              │
  │              │                  │   final response   │                 │              │
  │              │                  │<───────────────────┤                 │              │
  │              │                  │                    │                 │              │
  │              │ streaming text   │                    │                 │              │
  │              │<─────────────────┤                    │                 │              │
  │              │                  │                    │                 │              │
  │ AI 응답 표시  │                  │                    │                 │              │
  │<──────────────                  │                    │                 │              │
  │              │                  │                    │                 │              │
```

---

## 🗂️ 파일 구조

```
idea-on-action/
├── spec/
│   └── ai-tool-use/
│       ├── requirements.md          ✅ 작성 완료
│       ├── acceptance-criteria.md   ✅ 작성 완료
│       └── constraints.md            ✅ 작성 완료
├── plan/
│   └── ai-tool-use/
│       ├── architecture.md           📝 현재 문서
│       ├── tech-stack.md             ⏳ 다음
│       └── implementation-strategy.md ⏳ 다음
├── tasks/
│   └── ai-tool-use/
│       └── sprint-1.md               ⏳ 다음
├── src/
│   ├── types/
│   │   └── claude.types.ts           ✅ 이미 정의됨 (ClaudeTool, ClaudeToolUseBlock)
│   └── hooks/
│       └── ai/
│           └── useClaudeTools.ts     ⏳ 구현 필요
├── supabase/
│   └── functions/
│       └── claude-ai/
│           ├── index.ts              ⏳ 수정 필요 (tools 옵션 추가)
│           ├── tool-registry.ts      ⏳ 신규 생성
│           └── tools-handler.ts      ⏳ 신규 생성 (또는 tools/ 폴더)
└── tests/
    └── e2e/
        └── ai/
            └── tool-use.spec.ts      ⏳ 신규 생성
```

---

## 🔐 보안 설계

### 1. 인증 흐름

```
User Login → JWT Token → Frontend
                           ↓
                    useClaudeTools (Bearer Token)
                           ↓
                    Edge Function (verifyJWT)
                           ↓
                    ToolRegistry (userId 전달)
                           ↓
                    Tool Executor (RLS 적용)
```

### 2. RLS 정책

**service_issues 테이블**:
```sql
CREATE POLICY "Users can view their service issues"
ON service_issues FOR SELECT
USING (
  auth.uid() IN (
    SELECT user_id FROM project_members WHERE project_id = service_issues.project_id
  )
  OR
  auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
);
```

**projects 테이블**:
```sql
CREATE POLICY "Users can view their projects"
ON projects FOR SELECT
USING (
  auth.uid() IN (SELECT user_id FROM project_members WHERE project_id = projects.id)
  OR
  auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
);
```

### 3. Rate Limiting

- 기존 `claude_rate_limits` 테이블 활용
- 도구 실행도 API 호출 카운트에 포함
- 사용자별 독립 카운터

---

## 📊 모니터링 및 로깅

### 로그 항목 (claude_usage_logs 확장)

**신규 컬럼**:
```sql
ALTER TABLE claude_usage_logs ADD COLUMN tools_used TEXT[];
ALTER TABLE claude_usage_logs ADD COLUMN tool_execution_time_ms INTEGER;
ALTER TABLE claude_usage_logs ADD COLUMN tool_error_count INTEGER DEFAULT 0;
```

**로깅 시점**:
1. 도구 실행 시작 (tool_name, input)
2. 도구 실행 완료 (duration, result_size)
3. 도구 실행 실패 (error_message)

---

## 🧪 테스트 전략

### 1. 유닛 테스트

- ToolRegistry 클래스 메서드
- 각 도구의 executor 함수
- 입력 검증 로직

### 2. 통합 테스트

- Edge Function과 Supabase 연동
- RLS 정책 적용 확인
- Rate Limiting 동작

### 3. E2E 테스트

- 사용자 시나리오 (5개 사용자 스토리)
- 에러 복구 시나리오
- 성능 벤치마크

---

## 🚀 배포 전략

### Phase 1: MVP (1주차)
- 5개 기본 도구 구현
- 비스트리밍 모드 지원
- 단위 테스트

### Phase 2: 고도화 (2주차)
- 스트리밍 모드 지원
- E2E 테스트
- 문서 작성

### Phase 3: 프로덕션 (3주차)
- 스테이징 배포
- 10% Canary 배포
- 모니터링 설정

---

**작성자**: Claude (AI Developer)
**리뷰어**: 서민원
**승인일**: TBD

# AI Tool Use Sprint 1: 인프라 & 기본 도구

> **기간**: 1주차 (40시간)
> **목표**: ToolRegistry 구조 + 2개 도구 MVP (issues.tool, events.tool)
> **상태**: 📝 Ready

---

## 📋 Sprint 목표

1. ToolRegistry 클래스 설계 및 구현
2. 기본 도구 2개 (issues.tool, events.tool) 완성
3. claude-ai/index.ts에 Tool Use 통합
4. 유닛 테스트 및 통합 테스트 작성

---

## 📝 작업 목록 (Tasks)

### TU-001: ToolRegistry 클래스 생성

**우선순위**: P0 (Critical)
**예상 시간**: 3시간
**담당자**: TBD

**설명**:
도구 등록, 조회, 실행을 관리하는 중앙 레지스트리 클래스를 생성합니다.

**상세 작업**:
1. `supabase/functions/claude-ai/tool-registry.ts` 파일 생성
2. ToolRegistry 클래스 구현
   - `register(tool, executor)` 메서드
   - `getAllTools()` 메서드
   - `execute(toolName, input, context)` 메서드
3. 타입 정의
   - `ToolExecutor` 타입
   - `ToolExecutionContext` 인터페이스
   - `ToolResult` 인터페이스
4. 에러 핸들링 (도구 없음, 실행 실패)

**입력**:
- `src/types/claude.types.ts` (ClaudeTool, ClaudeToolUseBlock 참고)

**출력**:
- `supabase/functions/claude-ai/tool-registry.ts`
- 타입 정의 파일 (같은 파일 또는 별도)

**완료 기준**:
- [ ] ToolRegistry 클래스 구현 완료
- [ ] 타입 정의 완료
- [ ] 에러 핸들링 구현
- [ ] 코드 주석 작성 (JSDoc)
- [ ] TypeScript 컴파일 성공

**코드 스니펫**:
```typescript
// supabase/functions/claude-ai/tool-registry.ts

import { ClaudeTool } from '../../../src/types/claude.types.ts';

export type ToolExecutor = (
  input: Record<string, unknown>,
  context: ToolExecutionContext
) => Promise<ToolResult>;

export interface ToolExecutionContext {
  userId: string;
  supabase: any; // Supabase Client
  requestId: string;
}

export interface ToolResult {
  type: 'tool_result';
  tool_use_id: string;
  content: string;
  is_error?: boolean;
}

export class ToolRegistry {
  private tools: Map<string, ClaudeTool>;
  private executors: Map<string, ToolExecutor>;

  constructor() {
    this.tools = new Map();
    this.executors = new Map();
  }

  register(tool: ClaudeTool, executor: ToolExecutor): void {
    // 구현
  }

  getAllTools(): ClaudeTool[] {
    // 구현
  }

  async execute(
    toolName: string,
    input: Record<string, unknown>,
    context: ToolExecutionContext
  ): Promise<ToolResult> {
    // 구현
  }
}
```

**테스트 시나리오**:
1. 도구 등록 후 조회 가능
2. 등록되지 않은 도구 실행 시 에러
3. executor 실행 결과 반환

**의존성**: 없음

---

### TU-002: issues.tool 구현

**우선순위**: P0 (Critical)
**예상 시간**: 3시간
**담당자**: TBD

**설명**:
service_issues 테이블을 조회하는 도구를 구현합니다.

**상세 작업**:
1. `supabase/functions/claude-ai/tools-handler.ts` 파일 생성
2. Zod 스키마 정의 (입력 검증)
3. `ISSUES_TOOL` 상수 정의 (ClaudeTool 타입)
4. `executeIssues` 함수 구현
   - Supabase 쿼리 작성 (RLS 자동 적용)
   - 필터 적용 (service_id, severity, status)
   - 페이지네이션 (limit)
   - 에러 핸들링
5. ToolRegistry에 등록

**입력**:
- `src/types/central-hub.types.ts` (ServiceId, IssueSeverity, IssueStatus)
- TU-001의 ToolRegistry

**출력**:
- `supabase/functions/claude-ai/tools-handler.ts`

**완료 기준**:
- [ ] Zod 스키마 정의 완료
- [ ] ISSUES_TOOL 상수 정의 완료
- [ ] executeIssues 함수 구현 완료
- [ ] 에러 핸들링 구현
- [ ] ToolRegistry에 등록
- [ ] 코드 주석 작성

**코드 스니펫**:
```typescript
// supabase/functions/claude-ai/tools-handler.ts

import { z } from 'https://esm.sh/zod@3';
import { ClaudeTool } from '../../../src/types/claude.types.ts';
import { ToolExecutor } from './tool-registry.ts';

// 입력 스키마
const IssuesToolInputSchema = z.object({
  service_id: z.enum(['minu-find', 'minu-frame', 'minu-build', 'minu-keep']).optional(),
  severity: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  status: z.enum(['open', 'in_progress', 'resolved', 'closed']).optional(),
  limit: z.number().min(1).max(100).default(20)
});

// 도구 정의
export const ISSUES_TOOL: ClaudeTool = {
  name: 'issues.tool',
  description: 'Minu 서비스의 이슈 목록을 조회합니다. service_id, severity, status로 필터링 가능합니다.',
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
        description: '조회할 최대 개수 (1-100)'
      }
    },
    required: []
  }
};

// 실행 함수
export const executeIssues: ToolExecutor = async (input, context) => {
  try {
    // 입력 검증
    const validated = IssuesToolInputSchema.parse(input);

    // Supabase 쿼리
    let query = context.supabase
      .from('service_issues')
      .select('id, service_id, severity, title, description, status, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(validated.limit);

    // 필터 적용
    if (validated.service_id) query = query.eq('service_id', validated.service_id);
    if (validated.severity) query = query.eq('severity', validated.severity);
    if (validated.status) query = query.eq('status', validated.status);

    const { data, error, count } = await query;

    if (error) throw error;

    // 결과 반환
    const result = {
      total: count ?? data?.length ?? 0,
      issues: data ?? []
    };

    return {
      type: 'tool_result',
      tool_use_id: context.requestId,
      content: JSON.stringify(result, null, 2),
      is_error: false
    };
  } catch (error) {
    console.error('executeIssues error:', error);
    return {
      type: 'tool_result',
      tool_use_id: context.requestId,
      content: `이슈 조회 실패: ${error instanceof Error ? error.message : 'Unknown error'}`,
      is_error: true
    };
  }
};
```

**테스트 시나리오**:
1. 필터 없이 조회 (전체)
2. service_id 필터링
3. severity 필터링
4. 여러 필터 조합
5. limit 적용
6. RLS 적용 확인 (본인 프로젝트만)
7. 에러 발생 시 graceful fallback

**의존성**: TU-001 (ToolRegistry)

---

### TU-003: events.tool 구현

**우선순위**: P0 (Critical)
**예상 시간**: 2.5시간
**담당자**: TBD

**설명**:
service_events 테이블을 조회하는 도구를 구현합니다.

**상세 작업**:
1. Zod 스키마 정의 (날짜 범위 포함)
2. `EVENTS_TOOL` 상수 정의
3. `executeEvents` 함수 구현
   - 날짜 범위 파싱 (ISO 8601)
   - 필터 적용 (service_id, event_type, project_id)
   - 시간 내림차순 정렬 (최신순)
   - 페이지네이션
4. ToolRegistry에 등록

**입력**:
- TU-001의 ToolRegistry
- TU-002의 tools-handler.ts (확장)

**출력**:
- `supabase/functions/claude-ai/tools-handler.ts` (EVENTS_TOOL 추가)

**완료 기준**:
- [ ] Zod 스키마 정의 완료
- [ ] EVENTS_TOOL 상수 정의 완료
- [ ] executeEvents 함수 구현 완료
- [ ] 날짜 범위 파싱 구현
- [ ] ToolRegistry에 등록
- [ ] 코드 주석 작성

**코드 스니펫**:
```typescript
// 입력 스키마
const EventsToolInputSchema = z.object({
  service_id: z.enum(['minu-find', 'minu-frame', 'minu-build', 'minu-keep']).optional(),
  event_type: z.enum([
    'progress.updated',
    'task.completed',
    'task.started',
    'milestone.reached',
    'issue.created',
    'issue.resolved',
    'issue.updated',
    'service.health',
    'user.action'
  ]).optional(),
  project_id: z.string().uuid().optional(),
  from_date: z.string().datetime().optional(),
  to_date: z.string().datetime().optional(),
  limit: z.number().min(1).max(100).default(50)
});

// 도구 정의
export const EVENTS_TOOL: ClaudeTool = {
  name: 'events.tool',
  description: '서비스 이벤트 목록을 조회합니다. 날짜 범위, 이벤트 타입으로 필터링 가능합니다.',
  input_schema: {
    type: 'object',
    properties: {
      service_id: { /* ... */ },
      event_type: { /* ... */ },
      project_id: { /* ... */ },
      from_date: {
        type: 'string',
        format: 'date-time',
        description: '시작 날짜 (ISO 8601)'
      },
      to_date: {
        type: 'string',
        format: 'date-time',
        description: '종료 날짜 (ISO 8601)'
      },
      limit: { /* ... */ }
    },
    required: []
  }
};

// 실행 함수
export const executeEvents: ToolExecutor = async (input, context) => {
  try {
    const validated = EventsToolInputSchema.parse(input);

    let query = context.supabase
      .from('service_events')
      .select('id, service_id, event_type, project_id, payload, created_at')
      .order('created_at', { ascending: false })
      .limit(validated.limit);

    // 필터 적용
    if (validated.service_id) query = query.eq('service_id', validated.service_id);
    if (validated.event_type) query = query.eq('event_type', validated.event_type);
    if (validated.project_id) query = query.eq('project_id', validated.project_id);
    if (validated.from_date) query = query.gte('created_at', validated.from_date);
    if (validated.to_date) query = query.lte('created_at', validated.to_date);

    const { data, error, count } = await query;

    if (error) throw error;

    const result = {
      total: count ?? data?.length ?? 0,
      events: data ?? []
    };

    return {
      type: 'tool_result',
      tool_use_id: context.requestId,
      content: JSON.stringify(result, null, 2),
      is_error: false
    };
  } catch (error) {
    console.error('executeEvents error:', error);
    return {
      type: 'tool_result',
      tool_use_id: context.requestId,
      content: `이벤트 조회 실패: ${error instanceof Error ? error.message : 'Unknown error'}`,
      is_error: true
    };
  }
};
```

**테스트 시나리오**:
1. 전체 이벤트 조회
2. 날짜 범위 필터링 ("최근 24시간")
3. event_type 필터링
4. 시간 내림차순 정렬 확인
5. RLS 적용 확인

**의존성**: TU-001, TU-002

---

### TU-004: claude-ai/index.ts Tool Use 통합

**우선순위**: P0 (Critical)
**예상 시간**: 4시간
**담당자**: TBD

**설명**:
기존 claude-ai/index.ts의 handleChat 함수에 Tool Use 로직을 통합합니다.

**상세 작업**:
1. ToolRegistry 전역 인스턴스 생성
2. `handleChat()` 함수 수정
   - tools 옵션 추가하여 Claude API 호출
   - tool_use 블록 감지
   - ToolRegistry로 도구 실행
   - tool_result 생성하여 다음 턴 요청
   - 메시지 턴 제한 (최대 3턴)
3. 에러 핸들링 (타임아웃, 실행 실패)
4. 로깅 (도구 사용 기록)

**입력**:
- `supabase/functions/claude-ai/index.ts` (기존 파일)
- TU-001의 ToolRegistry
- TU-002, TU-003의 도구 정의

**출력**:
- `supabase/functions/claude-ai/index.ts` (수정됨)

**완료 기준**:
- [ ] ToolRegistry 인스턴스 생성 및 도구 등록
- [ ] handleChat() 함수 수정 완료
- [ ] tool_use 블록 처리 로직 구현
- [ ] 메시지 턴 관리 (최대 3턴)
- [ ] 에러 핸들링 구현
- [ ] 로깅 추가
- [ ] TypeScript 컴파일 성공

**코드 스니펫**:
```typescript
// supabase/functions/claude-ai/index.ts

import { ToolRegistry } from './tool-registry.ts';
import { ISSUES_TOOL, executeIssues, EVENTS_TOOL, executeEvents } from './tools-handler.ts';

// 전역 ToolRegistry
const toolRegistry = new ToolRegistry();
toolRegistry.register(ISSUES_TOOL, executeIssues);
toolRegistry.register(EVENTS_TOOL, executeEvents);

async function handleChat(
  req: Request,
  supabase: ReturnType<typeof createClient>,
  requestId: string
): Promise<Response> {
  // ... 기존 인증, Rate Limiting 코드 ...

  const body: ChatRequest = await req.json();
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
      tools: toolRegistry.getAllTools() // 👈 도구 정의 전달
    });

    // tool_use 블록 확인
    const toolUseBlocks = response.content.filter(
      (block): block is ClaudeToolUseBlock => block.type === 'tool_use'
    );

    // 도구 사용 없으면 응답 반환
    if (toolUseBlocks.length === 0) {
      const content = extractTextFromResponse(response);
      await logger.logSuccess(userId, requestId, req, {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        model: response.model,
        latencyMs: Date.now() - startTime
      });

      return successResponse({
        id: response.id,
        content,
        model: response.model,
        usage: response.usage,
        stop_reason: response.stop_reason
      }, requestId);
    }

    // 도구 실행
    const toolResults: ClaudeToolResultBlock[] = [];
    for (const toolUse of toolUseBlocks) {
      console.log(`Executing tool: ${toolUse.name}`);
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

    // 메시지 히스토리 업데이트
    messages.push({
      role: 'assistant',
      content: response.content
    });
    messages.push({
      role: 'user',
      content: toolResults
    });

    console.log(`Turn ${turnCount} completed, continuing...`);
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

**테스트 시나리오**:
1. 도구 사용 없는 일반 채팅
2. 단일 도구 사용 (issues.tool)
3. 여러 턴의 도구 사용 (최대 3턴)
4. 도구 실행 실패 시 에러 처리
5. 최대 턴 초과 시 에러

**의존성**: TU-001, TU-002, TU-003

---

### TU-005: 유닛 테스트 작성

**우선순위**: P1 (High)
**예상 시간**: 3시간
**담당자**: TBD

**설명**:
ToolRegistry 및 도구 executor 함수의 유닛 테스트를 작성합니다.

**상세 작업**:
1. `tests/unit/tool-registry.test.ts` 생성
   - ToolRegistry 메서드 테스트
2. `tests/unit/tools-handler.test.ts` 생성
   - executeIssues 함수 테스트
   - executeEvents 함수 테스트
3. Supabase Client 모킹 (MSW 또는 jest.mock)
4. 테스트 커버리지 80% 이상 달성

**입력**:
- TU-001, TU-002, TU-003의 코드

**출력**:
- `tests/unit/tool-registry.test.ts`
- `tests/unit/tools-handler.test.ts`

**완료 기준**:
- [ ] ToolRegistry 테스트 작성 완료 (5개 이상)
- [ ] executeIssues 테스트 작성 완료 (7개 이상)
- [ ] executeEvents 테스트 작성 완료 (5개 이상)
- [ ] Supabase Client 모킹 구현
- [ ] 테스트 커버리지 80% 이상
- [ ] 모든 테스트 통과

**테스트 케이스 예시**:
```typescript
// tests/unit/tool-registry.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import { ToolRegistry } from '../../supabase/functions/claude-ai/tool-registry';

describe('ToolRegistry', () => {
  let registry: ToolRegistry;

  beforeEach(() => {
    registry = new ToolRegistry();
  });

  it('should register a tool', () => {
    const tool = { name: 'test.tool', description: 'Test', input_schema: { type: 'object', properties: {} } };
    const executor = async () => ({ type: 'tool_result', tool_use_id: '1', content: 'ok' });

    registry.register(tool, executor);
    const tools = registry.getAllTools();

    expect(tools).toHaveLength(1);
    expect(tools[0].name).toBe('test.tool');
  });

  it('should execute a registered tool', async () => {
    const tool = { name: 'test.tool', description: 'Test', input_schema: { type: 'object', properties: {} } };
    const executor = async (input: any, context: any) => ({
      type: 'tool_result',
      tool_use_id: context.requestId,
      content: JSON.stringify({ result: 'success' })
    });

    registry.register(tool, executor);

    const result = await registry.execute('test.tool', {}, {
      userId: 'user1',
      supabase: {},
      requestId: 'req1'
    });

    expect(result.content).toContain('success');
  });

  it('should throw error for unregistered tool', async () => {
    await expect(
      registry.execute('unknown.tool', {}, { userId: 'user1', supabase: {}, requestId: 'req1' })
    ).rejects.toThrow('Tool not found');
  });
});
```

**의존성**: TU-001, TU-002, TU-003

---

### TU-006: 통합 테스트 작성

**우선순위**: P1 (High)
**예상 시간**: 4시간
**담당자**: TBD

**설명**:
Edge Function과 Supabase DB 연동을 테스트합니다.

**상세 작업**:
1. `tests/integration/tool-use.integration.test.ts` 생성
2. Supabase 로컬 환경 설정
3. 테스트 데이터 시드 (service_issues, service_events)
4. API 호출 테스트 (실제 Edge Function 호출)
5. RLS 정책 테스트 (권한 검증)
6. Rate Limiting 테스트

**입력**:
- TU-004의 claude-ai/index.ts
- Supabase 로컬 환경

**출력**:
- `tests/integration/tool-use.integration.test.ts`

**완료 기준**:
- [ ] Supabase 로컬 환경 구축
- [ ] 테스트 데이터 시드 스크립트 작성
- [ ] API 호출 테스트 작성 완료 (10개 이상)
- [ ] RLS 정책 테스트 작성 완료 (5개 이상)
- [ ] Rate Limiting 테스트 작성 완료 (3개 이상)
- [ ] 모든 테스트 통과

**테스트 케이스 예시**:
```typescript
// tests/integration/tool-use.integration.test.ts

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

describe('Tool Use Integration', () => {
  let supabaseUrl: string;
  let anonKey: string;
  let userToken: string;

  beforeAll(async () => {
    // Supabase 로컬 환경 시작
    // 테스트 데이터 시드
  });

  afterAll(async () => {
    // 환경 정리
  });

  it('should execute issues.tool and return results', async () => {
    const response = await fetch(`${supabaseUrl}/functions/v1/claude-ai/chat`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: [
          { role: 'user', content: 'Minu Build의 critical 이슈를 보여줘' }
        ]
      })
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.content).toContain('critical');
  });

  it('should apply RLS and return only accessible data', async () => {
    // 사용자 A로 로그인
    // 사용자 B의 프로젝트 이슈 조회 시도
    // 결과 없음 확인
  });

  it('should enforce rate limiting', async () => {
    // 25개 요청 연속 전송
    // 일부 요청 429 응답 확인
  });
});
```

**의존성**: TU-004

---

### TU-007: 수동 테스트 및 디버깅

**우선순위**: P1 (High)
**예상 시간**: 2.5시간
**담당자**: TBD

**설명**:
Postman 또는 curl로 수동 테스트를 진행하고 버그를 수정합니다.

**상세 작업**:
1. Postman Collection 작성
2. 성공 시나리오 테스트 (5개)
3. 에러 시나리오 테스트 (5개)
4. 버그 발견 시 수정
5. 테스트 결과 문서화

**입력**:
- TU-004의 Edge Function

**출력**:
- Postman Collection 파일 (`postman/tool-use.json`)
- 테스트 결과 문서 (`docs/testing/manual-test-results.md`)

**완료 기준**:
- [ ] Postman Collection 작성 완료
- [ ] 10개 테스트 케이스 실행 완료
- [ ] 발견된 버그 모두 수정
- [ ] 테스트 결과 문서 작성
- [ ] 스테이징 배포 성공

**테스트 시나리오**:
1. 정상 도구 실행 (issues.tool)
2. 필터 조합 테스트
3. 토큰 없이 요청 (401)
4. 잘못된 도구 이름 (404)
5. 타임아웃 시뮬레이션
6. Rate Limit 초과 (429)
7. RLS 적용 확인
8. 여러 턴 도구 사용
9. 에러 복구 (graceful fallback)
10. 성능 측정 (응답 시간)

**의존성**: TU-004, TU-005, TU-006

---

## 📊 Sprint 완료 기준 (Definition of Done)

- [ ] 모든 TASK (TU-001 ~ TU-007) 완료
- [ ] 유닛 테스트 커버리지 80% 이상
- [ ] 통합 테스트 모두 통과
- [ ] 코드 리뷰 완료
- [ ] 린트 에러 0개
- [ ] TypeScript 컴파일 에러 0개
- [ ] 스테이징 환경 배포 성공
- [ ] 수동 테스트 10개 통과
- [ ] 문서 업데이트 (CLAUDE.md, changelog.md)
- [ ] Sprint 회고 작성

---

## 📈 진행 현황

| TASK | 상태 | 담당자 | 시작일 | 완료일 | 소요 시간 |
|------|------|--------|--------|--------|----------|
| TU-001 | 📝 Ready | - | - | - | - |
| TU-002 | 📝 Ready | - | - | - | - |
| TU-003 | 📝 Ready | - | - | - | - |
| TU-004 | 📝 Ready | - | - | - | - |
| TU-005 | 📝 Ready | - | - | - | - |
| TU-006 | 📝 Ready | - | - | - | - |
| TU-007 | 📝 Ready | - | - | - | - |

**전체 진행률**: 0% (0/7 완료)

---

## 🔥 리스크 및 블로커

| ID | 설명 | 영향 | 대응 방안 | 상태 |
|----|------|------|----------|------|
| R-001 | Deno 환경 Zod 호환성 | 중 | esm.sh CDN 사용 | 📝 Open |
| R-002 | Supabase 로컬 환경 구축 | 중 | Docker Compose | 📝 Open |
| R-003 | Claude API Rate Limit | 낮 | 테스트용 별도 키 | 📝 Open |

---

## 📝 Sprint 회고 (Retrospective)

**작성일**: Sprint 종료 후

**Keep (계속할 것)**:
- TBD

**Problem (문제점)**:
- TBD

**Try (시도할 것)**:
- TBD

---

**작성자**: Claude (AI Developer)
**승인자**: 서민원
**시작일**: TBD
**완료일**: TBD

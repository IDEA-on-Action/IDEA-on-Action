# Sprint 1: Claude AI 기본 인프라

> Claude API 연동을 위한 기반 인프라 구축

**시작일**: 2025-11-24
**예상 소요**: 8시간 (1일)
**관련 명세**: [spec/claude-integration/requirements.md](../../spec/claude-integration/requirements.md)
**관련 설계**: [plan/claude-integration/architecture.md](../../plan/claude-integration/architecture.md)
**선행 조건**: Claude Skills Sprint 5 완료 ✅

---

## 목표

1. Edge Function claude-ai 생성 (API 프록시)
2. TypeScript 타입 정의 (claude.types.ts)
3. useClaudeChat 훅 구현
4. useClaudeStreaming 훅 구현 (SSE 스트리밍)
5. Rate Limiting 미들웨어
6. 에러 핸들링 & 로깅
7. E2E 테스트 10개
8. 환경 변수 문서화

---

## 병렬 실행 전략

```
┌─────────────────────────────────────────────────────────────┐
│                      Phase 1 (2h)                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ Agent 1      │  │ Agent 2      │  │ Agent 3      │       │
│  │ TASK-AI-001  │  │ TASK-AI-002  │  │ TASK-AI-005  │       │
│  │ Edge Function│  │ TypeScript   │  │ Rate Limit   │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      Phase 2 (3h)                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ Agent 1      │  │ Agent 2      │  │ Agent 3      │       │
│  │ TASK-AI-003  │  │ TASK-AI-004  │  │ TASK-AI-006  │       │
│  │ useClaudeChat│  │ Streaming    │  │ Error/Log    │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      Phase 3 (3h)                            │
│  ┌──────────────┐  ┌──────────────┐                         │
│  │ Agent 1      │  │ Agent 2      │                         │
│  │ TASK-AI-007  │  │ TASK-AI-008  │                         │
│  │ E2E 테스트   │  │ 환경 변수 문서│                         │
│  └──────────────┘  └──────────────┘                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 작업 목록

### TASK-AI-001: Edge Function claude-ai 생성

**예상 시간**: 1.5시간
**상태**: ⏳ 대기
**의존성**: 없음
**담당**: Agent 1 (Phase 1)

**작업 내용**:

```typescript
// supabase/functions/claude-ai/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Anthropic from 'npm:@anthropic-ai/sdk@0.25.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ChatRequest {
  messages: Array<{
    role: 'user' | 'assistant'
    content: string
  }>
  model?: string
  maxTokens?: number
  temperature?: number
  systemPrompt?: string
  stream?: boolean
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // 인증 확인
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Supabase 클라이언트로 사용자 검증
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Rate Limiting 체크
    const rateLimitKey = `claude:${user.id}`
    const { data: rateLimit } = await supabase
      .from('api_rate_limits')
      .select('*')
      .eq('key', rateLimitKey)
      .single()

    if (rateLimit && rateLimit.count >= rateLimit.limit) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          retryAfter: rateLimit.reset_at
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body: ChatRequest = await req.json()

    // Claude API 호출
    const anthropic = new Anthropic({
      apiKey: Deno.env.get('ANTHROPIC_API_KEY'),
    })

    const messages = body.messages.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

    // 스트리밍 모드
    if (body.stream) {
      const stream = await anthropic.messages.stream({
        model: body.model || 'claude-sonnet-4-20250514',
        max_tokens: body.maxTokens || 4096,
        temperature: body.temperature ?? 0.7,
        system: body.systemPrompt || '',
        messages,
      })

      // SSE 스트림 반환
      const encoder = new TextEncoder()
      const readable = new ReadableStream({
        async start(controller) {
          for await (const event of stream) {
            if (event.type === 'content_block_delta') {
              const delta = event.delta
              if ('text' in delta) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ text: delta.text })}\n\n`)
                )
              }
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        },
      })

      return new Response(readable, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      })
    }

    // 일반 모드
    const response = await anthropic.messages.create({
      model: body.model || 'claude-sonnet-4-20250514',
      max_tokens: body.maxTokens || 4096,
      temperature: body.temperature ?? 0.7,
      system: body.systemPrompt || '',
      messages,
    })

    // 토큰 사용량 기록
    await supabase.from('ai_usage_logs').insert({
      user_id: user.id,
      model: body.model || 'claude-sonnet-4-20250514',
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
      created_at: new Date().toISOString(),
    })

    // Rate Limit 업데이트
    await supabase.rpc('increment_rate_limit', { p_key: rateLimitKey })

    return new Response(
      JSON.stringify({
        content: response.content[0].type === 'text' ? response.content[0].text : '',
        usage: response.usage,
        model: response.model,
        stopReason: response.stop_reason,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Claude API Error:', error)

    // 에러 유형별 처리
    if (error.status === 429) {
      return new Response(
        JSON.stringify({ error: 'API rate limit exceeded', retryAfter: 60 }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

**완료 조건**:
- [ ] Edge Function 파일 생성
- [ ] 인증 검증 로직 구현
- [ ] Claude API 호출 로직 구현
- [ ] 스트리밍 지원 구현
- [ ] 토큰 사용량 기록 구현
- [ ] 로컬 테스트 통과

---

### TASK-AI-002: TypeScript 타입 정의

**예상 시간**: 1시간
**상태**: ⏳ 대기
**의존성**: 없음
**담당**: Agent 2 (Phase 1)

**작업 내용**:

```typescript
// src/types/claude.types.ts

// ============================================
// 기본 타입
// ============================================

export type ClaudeModel =
  | 'claude-sonnet-4-20250514'
  | 'claude-3-5-sonnet-20241022'
  | 'claude-3-haiku-20240307';

export type MessageRole = 'user' | 'assistant';

export interface Message {
  role: MessageRole;
  content: string;
  timestamp?: string;
}

export interface ConversationContext {
  id: string;
  messages: Message[];
  systemPrompt?: string;
  metadata?: Record<string, unknown>;
}

// ============================================
// API 요청/응답 타입
// ============================================

export interface ClaudeChatRequest {
  messages: Message[];
  model?: ClaudeModel;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  stream?: boolean;
}

export interface ClaudeChatResponse {
  content: string;
  usage: TokenUsage;
  model: ClaudeModel;
  stopReason: StopReason;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export type StopReason = 'end_turn' | 'max_tokens' | 'stop_sequence';

// ============================================
// 스트리밍 타입
// ============================================

export interface StreamingChunk {
  text: string;
  isComplete: boolean;
}

export interface StreamingState {
  isStreaming: boolean;
  currentText: string;
  error: ClaudeError | null;
}

export type OnStreamCallback = (chunk: StreamingChunk) => void;
export type OnCompleteCallback = (fullText: string, usage: TokenUsage) => void;
export type OnErrorCallback = (error: ClaudeError) => void;

// ============================================
// 에러 타입
// ============================================

export type ClaudeErrorCode =
  | 'UNAUTHORIZED'
  | 'RATE_LIMITED'
  | 'INVALID_REQUEST'
  | 'API_ERROR'
  | 'NETWORK_ERROR'
  | 'STREAMING_ERROR'
  | 'UNKNOWN_ERROR';

export interface ClaudeError {
  code: ClaudeErrorCode;
  message: string;
  details?: unknown;
  retryAfter?: number;
}

// ============================================
// 훅 옵션 타입
// ============================================

export interface UseClaudeChatOptions {
  model?: ClaudeModel;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  onError?: OnErrorCallback;
}

export interface UseClaudeChatResult {
  messages: Message[];
  sendMessage: (content: string) => Promise<void>;
  isLoading: boolean;
  error: ClaudeError | null;
  clearMessages: () => void;
  retryLastMessage: () => Promise<void>;
}

export interface UseClaudeStreamingOptions extends UseClaudeChatOptions {
  onStream?: OnStreamCallback;
  onComplete?: OnCompleteCallback;
}

export interface UseClaudeStreamingResult {
  messages: Message[];
  sendMessage: (content: string) => Promise<void>;
  isStreaming: boolean;
  currentStreamText: string;
  error: ClaudeError | null;
  clearMessages: () => void;
  stopStreaming: () => void;
}

// ============================================
// Rate Limiting 타입
// ============================================

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetAt: string;
}

export interface RateLimitConfig {
  maxRequestsPerMinute: number;
  maxRequestsPerHour: number;
  maxTokensPerDay: number;
}

// ============================================
// 토큰 사용량 추적 타입
// ============================================

export interface UsageLog {
  id: string;
  userId: string;
  model: ClaudeModel;
  inputTokens: number;
  outputTokens: number;
  createdAt: string;
}

export interface UsageSummary {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCost: number;
  period: 'day' | 'week' | 'month';
}

// ============================================
// Minu 서비스별 프롬프트 타입
// ============================================

export type MinuService = 'minu-find' | 'minu-frame' | 'minu-build' | 'minu-keep';

export interface ServicePromptConfig {
  serviceId: MinuService;
  systemPrompt: string;
  contextVariables?: Record<string, string>;
}

export interface RFPGenerationRequest {
  projectName: string;
  projectDescription: string;
  targetIndustry?: string;
  budget?: string;
  timeline?: string;
  requirements?: string[];
}

export interface RequirementsAssistRequest {
  projectContext: string;
  currentRequirements?: string[];
  targetAudience?: string;
}

export interface ProjectPlanRequest {
  projectName: string;
  objectives: string[];
  constraints?: string[];
  teamSize?: number;
  duration?: string;
}

export interface OperationsReportRequest {
  serviceId: MinuService;
  reportPeriod: 'weekly' | 'monthly';
  metrics?: Record<string, number>;
  incidents?: string[];
}
```

**완료 조건**:
- [ ] claude.types.ts 파일 생성
- [ ] 모든 API 요청/응답 타입 정의
- [ ] 스트리밍 관련 타입 정의
- [ ] 에러 타입 정의
- [ ] 훅 옵션 및 결과 타입 정의
- [ ] Minu 서비스별 요청 타입 정의
- [ ] TypeScript 컴파일 에러 없음

---

### TASK-AI-003: useClaudeChat 훅 구현

**예상 시간**: 1.5시간
**상태**: ⏳ 대기
**의존성**: TASK-AI-001, TASK-AI-002
**담당**: Agent 1 (Phase 2)

**작업 내용**:

```typescript
// src/hooks/useClaudeChat.ts

import { useState, useCallback } from 'react';
import { useSupabase } from '@/hooks/useSupabase';
import type {
  Message,
  UseClaudeChatOptions,
  UseClaudeChatResult,
  ClaudeError,
  ClaudeChatResponse,
} from '@/types/claude.types';

export function useClaudeChat(options: UseClaudeChatOptions = {}): UseClaudeChatResult {
  const { supabase, session } = useSupabase();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ClaudeError | null>(null);
  const [lastUserMessage, setLastUserMessage] = useState<string | null>(null);

  const {
    model = 'claude-sonnet-4-20250514',
    maxTokens = 4096,
    temperature = 0.7,
    systemPrompt,
    onError,
  } = options;

  const sendMessage = useCallback(async (content: string) => {
    if (!session?.access_token) {
      const authError: ClaudeError = {
        code: 'UNAUTHORIZED',
        message: '로그인이 필요합니다.',
      };
      setError(authError);
      onError?.(authError);
      return;
    }

    setIsLoading(true);
    setError(null);
    setLastUserMessage(content);

    // 사용자 메시지 추가
    const userMessage: Message = {
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/claude-ai`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            messages: newMessages.map(m => ({ role: m.role, content: m.content })),
            model,
            maxTokens,
            temperature,
            systemPrompt,
            stream: false,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'API 요청 실패');
      }

      const data: ClaudeChatResponse = await response.json();

      // 어시스턴트 응답 추가
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.content,
        timestamp: new Date().toISOString(),
      };

      setMessages([...newMessages, assistantMessage]);

    } catch (err) {
      const claudeError: ClaudeError = {
        code: 'API_ERROR',
        message: err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.',
        details: err,
      };
      setError(claudeError);
      onError?.(claudeError);

      // 실패한 메시지 롤백
      setMessages(messages);
    } finally {
      setIsLoading(false);
    }
  }, [session, messages, model, maxTokens, temperature, systemPrompt, onError]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
    setLastUserMessage(null);
  }, []);

  const retryLastMessage = useCallback(async () => {
    if (lastUserMessage) {
      // 마지막 실패한 사용자 메시지 제거
      setMessages(messages.slice(0, -1));
      await sendMessage(lastUserMessage);
    }
  }, [lastUserMessage, messages, sendMessage]);

  return {
    messages,
    sendMessage,
    isLoading,
    error,
    clearMessages,
    retryLastMessage,
  };
}
```

**완료 조건**:
- [ ] useClaudeChat 훅 구현 완료
- [ ] 메시지 상태 관리 정상 작동
- [ ] 에러 핸들링 정상 작동
- [ ] 재시도 기능 구현
- [ ] 메시지 초기화 기능 구현
- [ ] TypeScript 타입 안전성 확인

---

### TASK-AI-004: useClaudeStreaming 훅 구현

**예상 시간**: 2시간
**상태**: ⏳ 대기
**의존성**: TASK-AI-001, TASK-AI-002
**담당**: Agent 2 (Phase 2)

**작업 내용**:

```typescript
// src/hooks/useClaudeStreaming.ts

import { useState, useCallback, useRef } from 'react';
import { useSupabase } from '@/hooks/useSupabase';
import type {
  Message,
  UseClaudeStreamingOptions,
  UseClaudeStreamingResult,
  ClaudeError,
  StreamingChunk,
} from '@/types/claude.types';

export function useClaudeStreaming(
  options: UseClaudeStreamingOptions = {}
): UseClaudeStreamingResult {
  const { supabase, session } = useSupabase();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentStreamText, setCurrentStreamText] = useState('');
  const [error, setError] = useState<ClaudeError | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const {
    model = 'claude-sonnet-4-20250514',
    maxTokens = 4096,
    temperature = 0.7,
    systemPrompt,
    onStream,
    onComplete,
    onError,
  } = options;

  const sendMessage = useCallback(async (content: string) => {
    if (!session?.access_token) {
      const authError: ClaudeError = {
        code: 'UNAUTHORIZED',
        message: '로그인이 필요합니다.',
      };
      setError(authError);
      onError?.(authError);
      return;
    }

    // 이전 스트림 중단
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsStreaming(true);
    setError(null);
    setCurrentStreamText('');

    // 사용자 메시지 추가
    const userMessage: Message = {
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/claude-ai`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            messages: newMessages.map(m => ({ role: m.role, content: m.content })),
            model,
            maxTokens,
            temperature,
            systemPrompt,
            stream: true,
          }),
          signal: abortControllerRef.current.signal,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'API 요청 실패');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('스트림을 읽을 수 없습니다.');
      }

      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);

            if (data === '[DONE]') {
              // 스트리밍 완료
              const assistantMessage: Message = {
                role: 'assistant',
                content: fullText,
                timestamp: new Date().toISOString(),
              };
              setMessages([...newMessages, assistantMessage]);

              onComplete?.(fullText, {
                inputTokens: 0, // 서버에서 계산
                outputTokens: 0,
                totalTokens: 0,
              });
              break;
            }

            try {
              const parsed = JSON.parse(data) as { text: string };
              fullText += parsed.text;
              setCurrentStreamText(fullText);

              const streamChunk: StreamingChunk = {
                text: parsed.text,
                isComplete: false,
              };
              onStream?.(streamChunk);
            } catch {
              // JSON 파싱 실패 시 무시
            }
          }
        }
      }

    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // 사용자가 중단한 경우
        return;
      }

      const claudeError: ClaudeError = {
        code: 'STREAMING_ERROR',
        message: err instanceof Error ? err.message : '스트리밍 중 오류가 발생했습니다.',
        details: err,
      };
      setError(claudeError);
      onError?.(claudeError);

      // 실패한 메시지 롤백
      setMessages(messages);
    } finally {
      setIsStreaming(false);
      setCurrentStreamText('');
      abortControllerRef.current = null;
    }
  }, [session, messages, model, maxTokens, temperature, systemPrompt, onStream, onComplete, onError]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
    setCurrentStreamText('');
  }, []);

  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  return {
    messages,
    sendMessage,
    isStreaming,
    currentStreamText,
    error,
    clearMessages,
    stopStreaming,
  };
}
```

**완료 조건**:
- [ ] useClaudeStreaming 훅 구현 완료
- [ ] SSE 스트리밍 정상 작동
- [ ] 스트리밍 중단 기능 구현
- [ ] 콜백 함수 (onStream, onComplete) 정상 호출
- [ ] 에러 핸들링 정상 작동
- [ ] AbortController 메모리 정리 확인

---

### TASK-AI-005: Rate Limiting 미들웨어

**예상 시간**: 1시간
**상태**: ⏳ 대기
**의존성**: 없음
**담당**: Agent 3 (Phase 1)

**작업 내용**:

```sql
-- 마이그레이션 파일: 20251124100000_create_api_rate_limits.sql

-- Rate Limit 테이블
CREATE TABLE api_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  count INTEGER NOT NULL DEFAULT 0,
  limit_value INTEGER NOT NULL DEFAULT 60,
  reset_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_api_rate_limits_key ON api_rate_limits(key);
CREATE INDEX idx_api_rate_limits_reset ON api_rate_limits(reset_at);

-- Rate Limit 증가 함수
CREATE OR REPLACE FUNCTION increment_rate_limit(p_key TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reset_at TIMESTAMPTZ;
BEGIN
  v_reset_at := NOW() + INTERVAL '1 minute';

  INSERT INTO api_rate_limits (key, count, limit_value, reset_at)
  VALUES (p_key, 1, 60, v_reset_at)
  ON CONFLICT (key) DO UPDATE
  SET
    count = CASE
      WHEN api_rate_limits.reset_at < NOW() THEN 1
      ELSE api_rate_limits.count + 1
    END,
    reset_at = CASE
      WHEN api_rate_limits.reset_at < NOW() THEN v_reset_at
      ELSE api_rate_limits.reset_at
    END,
    updated_at = NOW();
END;
$$;

-- AI 사용량 로그 테이블
CREATE TABLE ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users,
  model TEXT NOT NULL,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cost_usd DECIMAL(10, 6) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_usage_logs_user ON ai_usage_logs(user_id);
CREATE INDEX idx_ai_usage_logs_created ON ai_usage_logs(created_at DESC);

-- RLS 정책
ALTER TABLE api_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service can manage rate limits"
ON api_rate_limits FOR ALL
USING (true);

CREATE POLICY "Users can read own usage logs"
ON ai_usage_logs FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Service can insert usage logs"
ON ai_usage_logs FOR INSERT
WITH CHECK (true);
```

```typescript
// src/lib/rateLimiter.ts

import type { RateLimitInfo, RateLimitConfig } from '@/types/claude.types';

export const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  maxRequestsPerMinute: 60,
  maxRequestsPerHour: 500,
  maxTokensPerDay: 100000,
};

export async function checkRateLimit(
  supabase: SupabaseClient,
  userId: string
): Promise<RateLimitInfo | null> {
  const key = `claude:${userId}`;

  const { data, error } = await supabase
    .from('api_rate_limits')
    .select('*')
    .eq('key', key)
    .single();

  if (error || !data) {
    return null;
  }

  // 리셋 시간이 지났으면 카운트 초기화
  const resetAt = new Date(data.reset_at);
  if (resetAt < new Date()) {
    return null;
  }

  return {
    limit: data.limit_value,
    remaining: Math.max(0, data.limit_value - data.count),
    resetAt: data.reset_at,
  };
}

export function isRateLimited(info: RateLimitInfo | null): boolean {
  if (!info) return false;
  return info.remaining <= 0;
}
```

**완료 조건**:
- [ ] 마이그레이션 파일 생성
- [ ] api_rate_limits 테이블 생성
- [ ] ai_usage_logs 테이블 생성
- [ ] increment_rate_limit 함수 구현
- [ ] RLS 정책 설정
- [ ] rateLimiter.ts 유틸리티 구현

---

### TASK-AI-006: 에러 핸들링 & 로깅

**예상 시간**: 1시간
**상태**: ⏳ 대기
**의존성**: TASK-AI-002
**담당**: Agent 3 (Phase 2)

**작업 내용**:

```typescript
// src/lib/claude/errorHandler.ts

import type { ClaudeError, ClaudeErrorCode } from '@/types/claude.types';

export function parseClaudeError(error: unknown): ClaudeError {
  // HTTP 응답 에러
  if (error instanceof Response) {
    return handleHttpError(error);
  }

  // Anthropic API 에러
  if (isAnthropicError(error)) {
    return handleAnthropicError(error);
  }

  // 네트워크 에러
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return {
      code: 'NETWORK_ERROR',
      message: '네트워크 연결을 확인해주세요.',
      details: error,
    };
  }

  // 일반 에러
  if (error instanceof Error) {
    return {
      code: 'UNKNOWN_ERROR',
      message: error.message,
      details: error,
    };
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: '알 수 없는 오류가 발생했습니다.',
    details: error,
  };
}

function handleHttpError(response: Response): ClaudeError {
  const statusMap: Record<number, { code: ClaudeErrorCode; message: string }> = {
    401: { code: 'UNAUTHORIZED', message: '인증이 필요합니다. 다시 로그인해주세요.' },
    429: { code: 'RATE_LIMITED', message: '요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.' },
    400: { code: 'INVALID_REQUEST', message: '잘못된 요청입니다.' },
    500: { code: 'API_ERROR', message: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' },
  };

  const mapped = statusMap[response.status] || {
    code: 'API_ERROR' as ClaudeErrorCode,
    message: `HTTP ${response.status} 오류가 발생했습니다.`,
  };

  return {
    ...mapped,
    details: { status: response.status, statusText: response.statusText },
  };
}

interface AnthropicAPIError {
  type: string;
  message: string;
  error?: {
    type: string;
    message: string;
  };
}

function isAnthropicError(error: unknown): error is AnthropicAPIError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    typeof (error as AnthropicAPIError).type === 'string'
  );
}

function handleAnthropicError(error: AnthropicAPIError): ClaudeError {
  const errorType = error.error?.type || error.type;

  const typeMap: Record<string, { code: ClaudeErrorCode; message: string }> = {
    authentication_error: { code: 'UNAUTHORIZED', message: 'API 키가 유효하지 않습니다.' },
    rate_limit_error: { code: 'RATE_LIMITED', message: 'API 요청 한도를 초과했습니다.' },
    invalid_request_error: { code: 'INVALID_REQUEST', message: '요청 형식이 올바르지 않습니다.' },
    api_error: { code: 'API_ERROR', message: 'Claude API 오류가 발생했습니다.' },
    overloaded_error: { code: 'API_ERROR', message: 'API 서버가 과부하 상태입니다. 잠시 후 다시 시도해주세요.' },
  };

  const mapped = typeMap[errorType] || {
    code: 'API_ERROR' as ClaudeErrorCode,
    message: error.error?.message || error.message || 'API 오류가 발생했습니다.',
  };

  return {
    ...mapped,
    details: error,
  };
}

// ============================================
// 로깅 유틸리티
// ============================================

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  context?: Record<string, unknown>;
}

export function logClaudeRequest(
  userId: string,
  model: string,
  messageCount: number
): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level: 'info',
    message: 'Claude API 요청',
    context: { userId, model, messageCount },
  };

  console.log('[Claude]', JSON.stringify(entry));

  // Sentry 통합 (프로덕션)
  if (import.meta.env.PROD && window.Sentry) {
    window.Sentry.addBreadcrumb({
      category: 'claude-api',
      message: 'API Request',
      level: 'info',
      data: entry.context,
    });
  }
}

export function logClaudeError(error: ClaudeError, userId?: string): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level: 'error',
    message: `Claude API 에러: ${error.code}`,
    context: { userId, error },
  };

  console.error('[Claude Error]', JSON.stringify(entry));

  // Sentry 통합 (프로덕션)
  if (import.meta.env.PROD && window.Sentry) {
    window.Sentry.captureException(new Error(error.message), {
      tags: { errorCode: error.code },
      extra: { ...error.details, userId },
    });
  }
}

export function logTokenUsage(
  userId: string,
  model: string,
  inputTokens: number,
  outputTokens: number
): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level: 'info',
    message: '토큰 사용량',
    context: { userId, model, inputTokens, outputTokens, total: inputTokens + outputTokens },
  };

  console.log('[Claude Usage]', JSON.stringify(entry));
}
```

**완료 조건**:
- [ ] errorHandler.ts 파일 생성
- [ ] HTTP 에러 핸들링 구현
- [ ] Anthropic API 에러 핸들링 구현
- [ ] 네트워크 에러 핸들링 구현
- [ ] 로깅 유틸리티 구현
- [ ] Sentry 통합 (프로덕션)

---

### TASK-AI-007: E2E 테스트 10개

**예상 시간**: 2시간
**상태**: ⏳ 대기
**의존성**: TASK-AI-001 ~ TASK-AI-006
**담당**: Agent 1 (Phase 3)

**작업 내용**:

```typescript
// tests/e2e/claude-ai/claude-chat.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Claude AI 채팅', () => {
  test.beforeEach(async ({ page }) => {
    // 테스트 사용자 로그인
    await page.goto('/login');
    await page.fill('[name="email"]', process.env.TEST_USER_EMAIL!);
    await page.fill('[name="password"]', process.env.TEST_USER_PASSWORD!);
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test('AI 채팅 페이지 접근 가능', async ({ page }) => {
    await page.goto('/ai-chat');
    await expect(page.getByRole('heading', { name: /AI 어시스턴트/i })).toBeVisible();
  });

  test('메시지 전송 및 응답 수신', async ({ page }) => {
    await page.goto('/ai-chat');

    const input = page.getByPlaceholder(/메시지를 입력/i);
    await input.fill('안녕하세요, 테스트 메시지입니다.');
    await page.click('button:has-text("전송")');

    // 로딩 상태 확인
    await expect(page.getByText(/처리 중/i)).toBeVisible();

    // 응답 수신 확인 (최대 30초 대기)
    await expect(page.locator('.assistant-message')).toBeVisible({ timeout: 30000 });
  });

  test('스트리밍 응답 표시', async ({ page }) => {
    await page.goto('/ai-chat?streaming=true');

    const input = page.getByPlaceholder(/메시지를 입력/i);
    await input.fill('짧은 답변을 해주세요.');
    await page.click('button:has-text("전송")');

    // 스트리밍 텍스트가 점진적으로 표시되는지 확인
    const streamingText = page.locator('.streaming-text');
    await expect(streamingText).toBeVisible({ timeout: 10000 });
  });

  test('스트리밍 중단 가능', async ({ page }) => {
    await page.goto('/ai-chat?streaming=true');

    const input = page.getByPlaceholder(/메시지를 입력/i);
    await input.fill('아주 긴 답변을 해주세요.');
    await page.click('button:has-text("전송")');

    // 중단 버튼 클릭
    await page.click('button:has-text("중단")');

    // 스트리밍 중단 확인
    await expect(page.getByText(/중단됨/i)).toBeVisible();
  });

  test('대화 초기화 가능', async ({ page }) => {
    await page.goto('/ai-chat');

    // 메시지 전송
    const input = page.getByPlaceholder(/메시지를 입력/i);
    await input.fill('첫 번째 메시지');
    await page.click('button:has-text("전송")');
    await expect(page.locator('.assistant-message')).toBeVisible({ timeout: 30000 });

    // 초기화 클릭
    await page.click('button:has-text("새 대화")');

    // 메시지 목록 비어있음 확인
    await expect(page.locator('.message-list')).toBeEmpty();
  });

  test('비인증 사용자 접근 불가', async ({ page }) => {
    // 로그아웃
    await page.goto('/logout');
    await page.goto('/ai-chat');

    // 로그인 페이지로 리다이렉트
    await expect(page).toHaveURL(/\/login/);
  });

  test('Rate Limit 초과 시 에러 표시', async ({ page }) => {
    await page.goto('/ai-chat');

    // Rate Limit Mock 설정 (테스트용)
    await page.route('**/functions/v1/claude-ai', route => {
      route.fulfill({
        status: 429,
        body: JSON.stringify({ error: 'Rate limit exceeded', retryAfter: 60 }),
      });
    });

    const input = page.getByPlaceholder(/메시지를 입력/i);
    await input.fill('테스트 메시지');
    await page.click('button:has-text("전송")');

    // 에러 메시지 표시 확인
    await expect(page.getByText(/요청 한도를 초과/i)).toBeVisible();
  });

  test('네트워크 에러 시 재시도 버튼 표시', async ({ page }) => {
    await page.goto('/ai-chat');

    // 네트워크 에러 Mock
    await page.route('**/functions/v1/claude-ai', route => {
      route.abort('failed');
    });

    const input = page.getByPlaceholder(/메시지를 입력/i);
    await input.fill('테스트 메시지');
    await page.click('button:has-text("전송")');

    // 재시도 버튼 표시 확인
    await expect(page.getByRole('button', { name: /재시도/i })).toBeVisible();
  });

  test('긴 대화 히스토리 스크롤', async ({ page }) => {
    await page.goto('/ai-chat');

    // 여러 메시지 전송
    for (let i = 0; i < 5; i++) {
      const input = page.getByPlaceholder(/메시지를 입력/i);
      await input.fill(`테스트 메시지 ${i + 1}`);
      await page.click('button:has-text("전송")');
      await expect(page.locator('.assistant-message').nth(i)).toBeVisible({ timeout: 30000 });
    }

    // 스크롤 가능 확인
    const messageList = page.locator('.message-list');
    const scrollHeight = await messageList.evaluate(el => el.scrollHeight);
    const clientHeight = await messageList.evaluate(el => el.clientHeight);
    expect(scrollHeight).toBeGreaterThan(clientHeight);
  });

  test('토큰 사용량 표시', async ({ page }) => {
    await page.goto('/ai-chat');

    const input = page.getByPlaceholder(/메시지를 입력/i);
    await input.fill('짧은 메시지');
    await page.click('button:has-text("전송")');
    await expect(page.locator('.assistant-message')).toBeVisible({ timeout: 30000 });

    // 토큰 사용량 표시 확인
    await expect(page.getByText(/토큰/i)).toBeVisible();
  });
});
```

**완료 조건**:
- [ ] E2E 테스트 10개 작성
- [ ] 모든 테스트 통과
- [ ] 테스트 커버리지 주요 시나리오 포함
- [ ] Mock 및 실제 API 테스트 분리
- [ ] CI/CD 파이프라인에 테스트 추가

---

### TASK-AI-008: 환경 변수 문서화

**예상 시간**: 30분
**상태**: ⏳ 대기
**의존성**: TASK-AI-001
**담당**: Agent 2 (Phase 3)

**작업 내용**:

```markdown
<!-- docs/guides/claude-integration/environment-variables.md -->

# Claude AI 통합 환경 변수

## 필수 환경 변수

### Edge Function (Supabase)

| 변수명 | 설명 | 예시 |
|--------|------|------|
| `ANTHROPIC_API_KEY` | Anthropic API 키 | `sk-ant-api03-...` |
| `SUPABASE_URL` | Supabase 프로젝트 URL | 자동 설정 |
| `SUPABASE_SERVICE_ROLE_KEY` | Service Role 키 | 자동 설정 |

### 프론트엔드 (.env.local)

| 변수명 | 설명 | 예시 |
|--------|------|------|
| `VITE_SUPABASE_URL` | Supabase 프로젝트 URL | `https://xxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase Anon Key | `eyJhbGciOiJ...` |

## 설정 방법

### 1. Anthropic API 키 발급

1. [Anthropic Console](https://console.anthropic.com/) 접속
2. API Keys 메뉴에서 새 키 생성
3. 키 복사 (한 번만 표시됨)

### 2. Supabase Edge Function 환경 변수 설정

```bash
# Supabase CLI 사용
supabase secrets set ANTHROPIC_API_KEY=sk-ant-api03-...

# 또는 대시보드에서 직접 설정
# Project Settings > Edge Functions > Secrets
```

### 3. 로컬 개발 환경 설정

```bash
# .env.local 파일 생성
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJ...
```

## Rate Limit 설정

기본값:
- 분당 60회 요청
- 시간당 500회 요청
- 일일 100,000 토큰

커스텀 설정:
```sql
-- 특정 사용자 Rate Limit 변경
UPDATE api_rate_limits
SET limit_value = 100
WHERE key = 'claude:user-uuid';
```

## 보안 주의사항

1. **API 키 노출 금지**: ANTHROPIC_API_KEY는 절대 프론트엔드에 노출하지 않음
2. **환경 분리**: 개발/스테이징/프로덕션 환경별 별도 API 키 사용
3. **키 로테이션**: 정기적으로 API 키 갱신 (권장: 90일)
4. **모니터링**: Anthropic Console에서 사용량 모니터링

## 비용 관리

| 모델 | 입력 토큰 (1M) | 출력 토큰 (1M) |
|------|----------------|----------------|
| claude-sonnet-4-20250514 | $3.00 | $15.00 |
| claude-3-5-sonnet-20241022 | $3.00 | $15.00 |
| claude-3-haiku-20240307 | $0.25 | $1.25 |

예상 월 비용 (일 100회 요청, 평균 2000 토큰/요청):
- Sonnet: ~$27/월
- Haiku: ~$2.25/월
```

**완료 조건**:
- [ ] 환경 변수 문서 작성
- [ ] 설정 방법 상세 설명
- [ ] 보안 주의사항 포함
- [ ] 비용 가이드 포함
- [ ] 예시 코드 포함

---

## 검증 계획

### 단위 테스트
- [ ] useClaudeChat 훅 로직 테스트
- [ ] useClaudeStreaming 훅 로직 테스트
- [ ] 에러 핸들러 함수 테스트
- [ ] Rate Limiter 로직 테스트

### 통합 테스트
- [ ] Edge Function 배포 및 호출 테스트
- [ ] Claude API 연동 테스트
- [ ] 스트리밍 응답 테스트
- [ ] 토큰 사용량 기록 테스트

### 성능 테스트
- [ ] 응답 시간 3초 이내 (일반 모드)
- [ ] 첫 청크 응답 1초 이내 (스트리밍)
- [ ] 동시 요청 10건 처리 가능

### 보안 테스트
- [ ] 비인증 요청 거부 확인
- [ ] Rate Limit 작동 확인
- [ ] API 키 노출 없음 확인

---

## 완료 조건

- [ ] Edge Function claude-ai 배포 완료
- [ ] TypeScript 타입 정의 완료
- [ ] useClaudeChat 훅 구현 완료
- [ ] useClaudeStreaming 훅 구현 완료
- [ ] Rate Limiting 미들웨어 구현 완료
- [ ] 에러 핸들링 & 로깅 구현 완료
- [ ] E2E 테스트 10개 통과
- [ ] 환경 변수 문서화 완료
- [ ] 빌드 성공

---

## 다음 Sprint

[Sprint 2: Minu Skills 통합](sprint-2.md)

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|----------|--------|
| 1.0.0 | 2025-11-24 | 초기 작성 | Claude |

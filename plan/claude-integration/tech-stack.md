# Claude AI 통합 기술 스택

> Claude AI 통합을 위한 기술 선택 및 의존성 관리

**작성일**: 2025-11-24
**버전**: 1.0.0
**상태**: Draft
**관련 설계**: [architecture.md](architecture.md)

---

## 1. 기술 스택 개요

```
Claude AI 통합 기술 스택
├── Frontend
│   ├── React 18.x (UI 프레임워크)
│   ├── TypeScript 5.x (타입 시스템)
│   ├── React Query 5.x (서버 상태 관리)
│   └── Tailwind CSS 3.4.x (스타일링)
│
├── Claude Integration
│   ├── @anthropic-ai/sdk ^0.30.x (Anthropic 공식 SDK)
│   ├── SSE Parser (스트리밍 처리)
│   └── Zod (요청/응답 검증)
│
├── Backend (Edge Functions)
│   ├── Deno Runtime (Supabase Edge Functions)
│   ├── jose (JWT 처리)
│   └── @supabase/supabase-js (DB 접근)
│
├── Database
│   ├── PostgreSQL (Supabase)
│   └── Supabase Realtime (선택)
│
└── Security
    ├── Supabase Auth (사용자 인증)
    └── Rate Limiting (토큰 버킷)
```

---

## 2. @anthropic-ai/sdk 사용법

### 2.1 SDK 개요

**버전**: ^0.30.x (2025년 1월 기준 최신)
**런타임**: Node.js, Deno, Browser (Edge Function에서 사용)

**공식 문서**: https://docs.anthropic.com/claude/reference/getting-started-with-the-api

### 2.2 Edge Function에서 SDK 설치

Supabase Edge Functions는 Deno 런타임을 사용하므로, esm.sh를 통해 SDK를 가져옵니다:

```typescript
// supabase/functions/claude-proxy/index.ts

// Deno에서 Anthropic SDK 가져오기
import Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.30.1";
```

### 2.3 기본 사용법 - 단일 메시지

```typescript
import Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.30.1";

// 클라이언트 초기화
const anthropic = new Anthropic({
  apiKey: Deno.env.get("ANTHROPIC_API_KEY"),
});

// 메시지 생성
async function generateMessage(
  userMessage: string,
  systemPrompt?: string
): Promise<Anthropic.Message> {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 4096,
    system: systemPrompt || "You are a helpful assistant.",
    messages: [
      {
        role: "user",
        content: userMessage,
      },
    ],
  });

  return message;
}

// 사용 예시
const response = await generateMessage(
  "RFP 문서의 개요 섹션을 작성해주세요.",
  "당신은 전문 RFP 작성 도우미입니다. 한국어로 응답하세요."
);

console.log(response.content[0].text);
// 응답: "## 1. 개요\n\n### 1.1 사업 배경\n..."
```

### 2.4 스트리밍 응답 처리

```typescript
import Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.30.1";

const anthropic = new Anthropic({
  apiKey: Deno.env.get("ANTHROPIC_API_KEY"),
});

// 스트리밍 메시지 생성
async function* streamMessage(
  userMessage: string,
  systemPrompt?: string
): AsyncGenerator<string> {
  const stream = await anthropic.messages.stream({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  // 스트림 이벤트 처리
  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      yield event.delta.text;
    }
  }

  // 최종 메시지 (사용량 등)
  const finalMessage = await stream.finalMessage();
  console.log("Total tokens:", finalMessage.usage.input_tokens + finalMessage.usage.output_tokens);
}

// SSE 응답으로 변환 (Edge Function)
async function handleStreamRequest(req: Request): Promise<Response> {
  const { userMessage, systemPrompt } = await req.json();

  const encoder = new TextEncoder();
  const body = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of streamMessage(userMessage, systemPrompt)) {
          const data = JSON.stringify({ type: "text", text: chunk });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        }
        controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
      } catch (error) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "error", error: error.message })}\n\n`)
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
```

### 2.5 대화 컨텍스트 관리

```typescript
import Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.30.1";

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

// 대화 히스토리를 포함한 메시지 생성
async function chatWithHistory(
  history: ConversationMessage[],
  newMessage: string,
  systemPrompt?: string
): Promise<{ response: string; history: ConversationMessage[] }> {
  const anthropic = new Anthropic({
    apiKey: Deno.env.get("ANTHROPIC_API_KEY"),
  });

  // 새 메시지를 히스토리에 추가
  const messages: ConversationMessage[] = [
    ...history,
    { role: "user", content: newMessage },
  ];

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 4096,
    system: systemPrompt,
    messages,
  });

  const assistantMessage = response.content[0].text;

  // 응답을 히스토리에 추가
  const updatedHistory: ConversationMessage[] = [
    ...messages,
    { role: "assistant", content: assistantMessage },
  ];

  return {
    response: assistantMessage,
    history: updatedHistory,
  };
}
```

### 2.6 시스템 프롬프트 패턴

```typescript
// 프롬프트 템플릿
const SYSTEM_PROMPTS = {
  // RFP 작성 도우미
  rfpAssistant: `당신은 전문 RFP(제안요청서) 작성 도우미입니다.

역할:
- 프로젝트 요구사항을 체계적으로 정리합니다
- 명확하고 측정 가능한 기준을 제시합니다
- 업계 표준 RFP 형식을 따릅니다

규칙:
- 항상 한국어로 응답하세요
- 마크다운 형식을 사용하세요
- 불명확한 부분은 질문하세요
- 구체적인 예시를 포함하세요`,

  // 문서 요약
  documentSummarizer: `당신은 문서 요약 전문가입니다.

역할:
- 핵심 내용을 추출합니다
- 간결하고 명확한 요약을 제공합니다
- 중요도 순으로 정리합니다

규칙:
- 원문의 의미를 왜곡하지 마세요
- 불필요한 수식어는 제거하세요
- 3-5개 핵심 포인트로 정리하세요`,

  // 코드 리뷰
  codeReviewer: `당신은 시니어 개발자로서 코드 리뷰를 수행합니다.

역할:
- 코드 품질을 평가합니다
- 개선 사항을 제안합니다
- 보안 취약점을 식별합니다

규칙:
- 건설적인 피드백을 제공하세요
- 구체적인 수정 예시를 포함하세요
- 좋은 부분도 언급하세요`,
};
```

### 2.7 에러 처리

```typescript
import Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.30.1";

// Anthropic SDK 에러 타입
type AnthropicError =
  | Anthropic.AuthenticationError    // 401: API 키 오류
  | Anthropic.RateLimitError         // 429: 요청 제한
  | Anthropic.APIStatusError         // 5xx: 서버 오류
  | Anthropic.APIConnectionError;    // 네트워크 오류

async function safeClaudeCall(
  fn: () => Promise<Anthropic.Message>
): Promise<{ success: true; data: Anthropic.Message } | { success: false; error: string; code: string }> {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      console.error("Authentication failed:", error.message);
      return {
        success: false,
        error: "API 인증에 실패했습니다.",
        code: "CLAUDE_AUTH_001",
      };
    }

    if (error instanceof Anthropic.RateLimitError) {
      console.error("Rate limit exceeded:", error.message);
      return {
        success: false,
        error: "요청 제한을 초과했습니다. 잠시 후 다시 시도하세요.",
        code: "CLAUDE_RATE_001",
      };
    }

    if (error instanceof Anthropic.APIStatusError) {
      console.error("API error:", error.status, error.message);
      return {
        success: false,
        error: "Claude API 오류가 발생했습니다.",
        code: "CLAUDE_API_001",
      };
    }

    if (error instanceof Anthropic.APIConnectionError) {
      console.error("Connection error:", error.message);
      return {
        success: false,
        error: "네트워크 연결 오류입니다.",
        code: "CLAUDE_API_002",
      };
    }

    // 알 수 없는 에러
    console.error("Unknown error:", error);
    return {
      success: false,
      error: "알 수 없는 오류가 발생했습니다.",
      code: "CLAUDE_UNKNOWN",
    };
  }
}
```

---

## 3. React 훅 패턴

### 3.1 useClaudeGenerate (단일 응답)

```typescript
// src/hooks/useClaudeGenerate.ts

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { claudeClient } from "@/lib/claude-client";
import type {
  ClaudeGenerateOptions,
  ClaudeResponse,
  ClaudeError,
} from "@/types/claude.types";

export interface UseClaudeGenerateResult {
  generate: (prompt: string, options?: ClaudeGenerateOptions) => Promise<ClaudeResponse>;
  isGenerating: boolean;
  error: ClaudeError | null;
  reset: () => void;
}

export function useClaudeGenerate(): UseClaudeGenerateResult {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationKey: ["claude", "generate"],
    mutationFn: async ({
      prompt,
      options,
    }: {
      prompt: string;
      options?: ClaudeGenerateOptions;
    }) => {
      return claudeClient.generate(prompt, options);
    },
    onSuccess: () => {
      // 사용량 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ["claude", "usage"] });
    },
  });

  return {
    generate: (prompt, options) => mutation.mutateAsync({ prompt, options }),
    isGenerating: mutation.isPending,
    error: mutation.error as ClaudeError | null,
    reset: mutation.reset,
  };
}
```

### 3.2 useClaudeChat (대화형)

```typescript
// src/hooks/useClaudeChat.ts

import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { claudeClient } from "@/lib/claude-client";
import type { ChatMessage, ClaudeChatOptions } from "@/types/claude.types";

export interface UseClaudeChatResult {
  messages: ChatMessage[];
  sendMessage: (content: string) => Promise<void>;
  isLoading: boolean;
  error: Error | null;
  clearHistory: () => void;
}

export function useClaudeChat(options?: ClaudeChatOptions): UseClaudeChatResult {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const mutation = useMutation({
    mutationFn: async (userMessage: string) => {
      // 사용자 메시지 추가
      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: userMessage,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMsg]);

      // Claude API 호출
      const response = await claudeClient.chat(
        [...messages, { role: "user", content: userMessage }],
        options
      );

      // 응답 메시지 추가
      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: response.content,
        timestamp: new Date(),
        usage: response.usage,
      };

      setMessages((prev) => [...prev, assistantMsg]);

      return response;
    },
  });

  const clearHistory = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    sendMessage: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
    clearHistory,
  };
}
```

### 3.3 useClaudeStream (스트리밍)

```typescript
// src/hooks/useClaudeStream.ts

import { useState, useCallback, useRef } from "react";
import { claudeClient } from "@/lib/claude-client";
import type { ClaudeStreamOptions } from "@/types/claude.types";

export interface UseClaudeStreamResult {
  content: string;
  isStreaming: boolean;
  error: Error | null;
  startStream: (prompt: string, options?: ClaudeStreamOptions) => Promise<void>;
  stopStream: () => void;
  reset: () => void;
}

export function useClaudeStream(): UseClaudeStreamResult {
  const [content, setContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const startStream = useCallback(
    async (prompt: string, options?: ClaudeStreamOptions) => {
      // 기존 스트림 중단
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      setContent("");
      setIsStreaming(true);
      setError(null);

      try {
        const stream = claudeClient.stream(prompt, {
          ...options,
          signal: abortControllerRef.current.signal,
        });

        for await (const chunk of stream) {
          setContent((prev) => prev + chunk);
        }
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError") {
          setError(err);
        }
      } finally {
        setIsStreaming(false);
        abortControllerRef.current = null;
      }
    },
    []
  );

  const stopStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  const reset = useCallback(() => {
    stopStream();
    setContent("");
    setError(null);
  }, [stopStream]);

  return {
    content,
    isStreaming,
    error,
    startStream,
    stopStream,
    reset,
  };
}
```

---

## 4. React Query 캐싱 전략

### 4.1 캐싱 설정

```typescript
// src/lib/claude-query.ts

import { QueryClient } from "@tanstack/react-query";

// Claude 전용 캐싱 설정
export const claudeQueryConfig = {
  // 사용량 조회 (자주 변경)
  usage: {
    staleTime: 30 * 1000,      // 30초
    gcTime: 5 * 60 * 1000,     // 5분
    refetchOnWindowFocus: true,
  },

  // 대화 히스토리 (세션 동안 유지)
  chatHistory: {
    staleTime: Infinity,        // 수동 무효화까지 유지
    gcTime: 30 * 60 * 1000,    // 30분
    refetchOnWindowFocus: false,
  },

  // 생성 결과 (캐싱 안함)
  generate: {
    staleTime: 0,
    gcTime: 0,
    retry: false,
  },
};

// Query Keys
export const claudeQueryKeys = {
  all: ["claude"] as const,
  usage: () => [...claudeQueryKeys.all, "usage"] as const,
  usageByUser: (userId: string) => [...claudeQueryKeys.usage(), userId] as const,
  chat: () => [...claudeQueryKeys.all, "chat"] as const,
  chatSession: (sessionId: string) => [...claudeQueryKeys.chat(), sessionId] as const,
};
```

### 4.2 사용량 조회 훅

```typescript
// src/hooks/useClaudeUsage.ts

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { claudeClient } from "@/lib/claude-client";
import { claudeQueryKeys, claudeQueryConfig } from "@/lib/claude-query";

export interface ClaudeUsageStats {
  today: {
    requests: number;
    inputTokens: number;
    outputTokens: number;
  };
  thisMonth: {
    requests: number;
    inputTokens: number;
    outputTokens: number;
    estimatedCost: number;
  };
  limit: {
    dailyTokens: number;
    monthlyTokens: number;
    remainingToday: number;
  };
}

export function useClaudeUsage() {
  const { user } = useAuth();

  return useQuery({
    queryKey: claudeQueryKeys.usageByUser(user?.id ?? ""),
    queryFn: () => claudeClient.getUsage(),
    enabled: !!user,
    ...claudeQueryConfig.usage,
  });
}
```

### 4.3 Mutation 후 캐시 무효화

```typescript
// src/hooks/useClaudeGenerate.ts

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { claudeQueryKeys } from "@/lib/claude-query";

export function useClaudeGenerate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params) => {
      return claudeClient.generate(params);
    },
    onSuccess: () => {
      // 사용량 캐시 무효화 (다음 조회 시 최신 데이터)
      queryClient.invalidateQueries({
        queryKey: claudeQueryKeys.usage(),
      });
    },
    onError: (error) => {
      console.error("[Claude Generate] Error:", error);
    },
  });
}
```

---

## 5. 클라이언트 라이브러리

### 5.1 Claude Client 구현

```typescript
// src/lib/claude-client.ts

import { supabase } from "@/integrations/supabase/client";

const CLAUDE_PROXY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/claude-proxy`;

export interface ClaudeClientConfig {
  maxRetries?: number;
  timeout?: number;
}

class ClaudeClient {
  private config: Required<ClaudeClientConfig>;

  constructor(config: ClaudeClientConfig = {}) {
    this.config = {
      maxRetries: config.maxRetries ?? 3,
      timeout: config.timeout ?? 30000,
    };
  }

  // 인증 헤더 가져오기
  private async getAuthHeaders(): Promise<Record<string, string>> {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error("인증이 필요합니다.");
    }

    return {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    };
  }

  // 단일 메시지 생성
  async generate(
    prompt: string,
    options?: {
      systemPrompt?: string;
      maxTokens?: number;
      temperature?: number;
    }
  ): Promise<{
    content: string;
    usage: { inputTokens: number; outputTokens: number };
  }> {
    const headers = await this.getAuthHeaders();

    const response = await fetch(`${CLAUDE_PROXY_URL}/messages`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        messages: [{ role: "user", content: prompt }],
        system: options?.systemPrompt,
        max_tokens: options?.maxTokens ?? 4096,
        temperature: options?.temperature ?? 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "API 오류가 발생했습니다.");
    }

    const data = await response.json();

    return {
      content: data.content[0].text,
      usage: {
        inputTokens: data.usage.input_tokens,
        outputTokens: data.usage.output_tokens,
      },
    };
  }

  // 대화형 메시지 생성
  async chat(
    messages: Array<{ role: "user" | "assistant"; content: string }>,
    options?: {
      systemPrompt?: string;
      maxTokens?: number;
    }
  ): Promise<{
    content: string;
    usage: { inputTokens: number; outputTokens: number };
  }> {
    const headers = await this.getAuthHeaders();

    const response = await fetch(`${CLAUDE_PROXY_URL}/messages`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        messages,
        system: options?.systemPrompt,
        max_tokens: options?.maxTokens ?? 4096,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "API 오류가 발생했습니다.");
    }

    const data = await response.json();

    return {
      content: data.content[0].text,
      usage: {
        inputTokens: data.usage.input_tokens,
        outputTokens: data.usage.output_tokens,
      },
    };
  }

  // 스트리밍 메시지 생성
  async *stream(
    prompt: string,
    options?: {
      systemPrompt?: string;
      maxTokens?: number;
      signal?: AbortSignal;
    }
  ): AsyncGenerator<string> {
    const headers = await this.getAuthHeaders();

    const response = await fetch(`${CLAUDE_PROXY_URL}/messages/stream`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        messages: [{ role: "user", content: prompt }],
        system: options?.systemPrompt,
        max_tokens: options?.maxTokens ?? 4096,
        stream: true,
      }),
      signal: options?.signal,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "API 오류가 발생했습니다.");
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("스트림을 읽을 수 없습니다.");

    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split("\n");

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") return;

          try {
            const parsed = JSON.parse(data);
            if (parsed.type === "text" && parsed.text) {
              yield parsed.text;
            }
          } catch {
            // JSON 파싱 실패 무시
          }
        }
      }
    }
  }

  // 사용량 조회
  async getUsage(): Promise<{
    today: { requests: number; inputTokens: number; outputTokens: number };
    thisMonth: { requests: number; inputTokens: number; outputTokens: number };
  }> {
    const headers = await this.getAuthHeaders();

    const response = await fetch(`${CLAUDE_PROXY_URL}/usage`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      throw new Error("사용량 조회에 실패했습니다.");
    }

    return response.json();
  }
}

export const claudeClient = new ClaudeClient();
```

---

## 6. 타입 정의

### 6.1 Claude 타입

```typescript
// src/types/claude.types.ts

// 모델 타입
export type ClaudeModel =
  | "claude-sonnet-4-5-20250929"  // 기본 (빠르고 효율적)
  | "claude-sonnet-4-5-20250929"; // 향후 확장 가능

// 메시지 역할
export type MessageRole = "user" | "assistant";

// 컨텐츠 블록
export interface TextContentBlock {
  type: "text";
  text: string;
}

export interface ImageContentBlock {
  type: "image";
  source: {
    type: "base64";
    media_type: "image/jpeg" | "image/png" | "image/gif" | "image/webp";
    data: string;
  };
}

export type ContentBlock = TextContentBlock | ImageContentBlock;

// 메시지
export interface ClaudeMessage {
  role: MessageRole;
  content: string | ContentBlock[];
}

// 채팅 메시지 (UI용)
export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

// 생성 옵션
export interface ClaudeGenerateOptions {
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  model?: ClaudeModel;
}

// 채팅 옵션
export interface ClaudeChatOptions extends ClaudeGenerateOptions {
  persistHistory?: boolean;
}

// 스트리밍 옵션
export interface ClaudeStreamOptions extends ClaudeGenerateOptions {
  signal?: AbortSignal;
}

// 응답 타입
export interface ClaudeResponse {
  id: string;
  content: string;
  model: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
  stopReason: "end_turn" | "max_tokens" | "stop_sequence";
}

// 에러 타입
export interface ClaudeError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}
```

---

## 7. 의존성 목록

### 7.1 프로덕션 의존성

| 패키지 | 버전 | 용도 | 번들 영향 |
|--------|------|------|----------|
| 없음 (Edge Function에서만 사용) | - | - | - |

**참고**: `@anthropic-ai/sdk`는 Edge Function(서버 사이드)에서만 사용되므로 클라이언트 번들에 포함되지 않습니다.

### 7.2 Edge Function 의존성 (Deno)

| 패키지 | 버전 | 소스 |
|--------|------|------|
| `@anthropic-ai/sdk` | ^0.30.x | esm.sh |
| `@supabase/supabase-js` | ^2.x | esm.sh |
| `jose` | ^5.x | deno.land/x |

### 7.3 개발 의존성

| 패키지 | 버전 | 용도 |
|--------|------|------|
| `@types/node` | ^20.x | 타입 정의 (SSE 등) |

---

## 8. 환경 변수

### 8.1 서버 (Edge Function)

```bash
# 필수
ANTHROPIC_API_KEY=sk-ant-...        # Anthropic API 키

# 선택 (Rate Limiting)
CLAUDE_RATE_LIMIT_RPM=60            # 분당 요청 제한
CLAUDE_RATE_LIMIT_TPM=100000        # 분당 토큰 제한

# 선택 (캐싱)
CLAUDE_CACHE_ENABLED=false          # 캐시 사용 여부
CLAUDE_CACHE_TTL_SECONDS=3600       # 캐시 TTL
```

### 8.2 클라이언트 (브라우저)

```bash
# 기존 환경 변수 활용 (VITE_ 접두사)
VITE_SUPABASE_URL=https://...       # Edge Function 호출에 사용
VITE_SUPABASE_ANON_KEY=...          # 인증에 사용
```

---

## 9. 성능 최적화

### 9.1 코드 스플리팅

```typescript
// Claude 관련 코드 동적 로딩
const ClaudeChat = lazy(() => import("@/components/claude/ClaudeChat"));
const ClaudeAssistant = lazy(() => import("@/components/claude/ClaudeAssistant"));

// 사용 시
<Suspense fallback={<ChatSkeleton />}>
  <ClaudeChat />
</Suspense>
```

### 9.2 요청 최적화

- **Debouncing**: 연속 입력 시 마지막 요청만 전송
- **Batching**: 여러 요청을 하나로 묶기 (향후)
- **캐싱**: 동일 프롬프트 응답 캐싱 (선택)

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|----------|--------|
| 1.0.0 | 2025-11-24 | 초기 작성 | Claude |

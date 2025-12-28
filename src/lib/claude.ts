/**
 * Claude AI Client Library
 *
 * Claude API를 사용한 AI 채팅 기능
 * - 단일 응답 (generate)
 * - 스트리밍 응답 (stream)
 * - 사용량 조회 (getUsage)
 * - Supabase Auth 토큰 자동 주입
 *
 * @module lib/claude
 */

import { callWorkersApi } from '@/integrations/cloudflare/client';
import { devError, devLog } from '@/lib/errors';

// ============================================================================
// Types
// ============================================================================

/**
 * Claude 메시지 역할
 */
export type ClaudeRole = 'user' | 'assistant';

/**
 * Claude 메시지 인터페이스
 */
export interface ClaudeMessage {
  role: ClaudeRole;
  content: string;
}

/**
 * Claude API 응답의 콘텐츠 블록
 */
export interface ClaudeContentBlock {
  type: 'text';
  text: string;
}

/**
 * Claude API 토큰 사용량
 */
export interface ClaudeUsage {
  input_tokens: number;
  output_tokens: number;
}

/**
 * Claude API 응답 인터페이스
 */
export interface ClaudeResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: ClaudeContentBlock[];
  model: string;
  stop_reason: 'end_turn' | 'max_tokens' | 'stop_sequence' | null;
  usage: ClaudeUsage;
}

/**
 * Claude 생성 옵션
 */
export interface ClaudeGenerateOptions {
  /** 대화 메시지 목록 */
  messages: ClaudeMessage[];
  /** 모델 ID (기본: claude-sonnet-4-20250514) */
  model?: string;
  /** 최대 토큰 수 (기본: 4096) */
  maxTokens?: number;
  /** 온도 (0~1, 기본: 0.7) */
  temperature?: number;
  /** 시스템 프롬프트 */
  systemPrompt?: string;
  /** 요청 타임아웃 (밀리초, 기본: 60000) */
  timeout?: number;
  /** AbortController 시그널 */
  signal?: AbortSignal;
}

/**
 * Claude 스트리밍 옵션
 */
export interface ClaudeStreamOptions extends ClaudeGenerateOptions {
  /** 청크 콜백 (각 텍스트 청크 수신 시 호출) */
  onChunk?: (chunk: string) => void;
  /** 완료 콜백 (스트리밍 완료 시 호출) */
  onComplete?: (fullResponse: string, usage?: ClaudeUsage) => void;
  /** 에러 콜백 */
  onError?: (error: Error) => void;
}

/**
 * 스트리밍 이벤트 타입
 */
export interface ClaudeStreamEvent {
  type:
    | 'message_start'
    | 'content_block_start'
    | 'content_block_delta'
    | 'content_block_stop'
    | 'message_delta'
    | 'message_stop'
    | 'error';
  index?: number;
  delta?: {
    type: 'text_delta';
    text: string;
  };
  message?: ClaudeResponse;
  usage?: ClaudeUsage;
  error?: {
    type: string;
    message: string;
  };
}

/**
 * Claude 사용량 조회 응답
 */
export interface ClaudeUsageResponse {
  userId: string;
  period: {
    start: string;
    end: string;
  };
  usage: {
    totalInputTokens: number;
    totalOutputTokens: number;
    totalRequests: number;
  };
  limits: {
    dailyTokenLimit: number;
    remainingTokens: number;
  };
}

/**
 * Claude 에러 코드
 */
export type ClaudeErrorCode =
  | 'AUTH_REQUIRED'
  | 'AUTH_FAILED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'INVALID_REQUEST'
  | 'MODEL_OVERLOADED'
  | 'INTERNAL_ERROR'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'CANCELLED'
  | 'UNKNOWN';

/**
 * Claude 에러 클래스
 */
export class ClaudeError extends Error {
  code: ClaudeErrorCode;
  statusCode?: number;
  retryAfter?: number;

  constructor(
    message: string,
    code: ClaudeErrorCode,
    options?: {
      statusCode?: number;
      retryAfter?: number;
      cause?: Error;
    }
  ) {
    super(message);
    this.name = 'ClaudeError';
    this.code = code;
    this.statusCode = options?.statusCode;
    this.retryAfter = options?.retryAfter;
    if (options?.cause) {
      this.cause = options.cause;
    }
  }

  /**
   * 재시도 가능한 에러인지 확인
   */
  get isRetryable(): boolean {
    return ['RATE_LIMIT_EXCEEDED', 'MODEL_OVERLOADED', 'NETWORK_ERROR', 'TIMEOUT'].includes(
      this.code
    );
  }
}

// ============================================================================
// Configuration
// ============================================================================

/**
 * Supabase Edge Function URL
 */
const CLAUDE_FUNCTION_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
  'https://zykjdneewbzyazfukzyg.supabase.co';

const CLAUDE_CHAT_ENDPOINT = '/functions/v1/claude-chat';

/**
 * 기본 설정
 */
const DEFAULT_MODEL = 'claude-sonnet-4-20250514';
const DEFAULT_MAX_TOKENS = 4096;
const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_TIMEOUT = 60000;

/**
 * 시스템 프롬프트 (프로젝트 컨텍스트)
 */
export const CLAUDE_SYSTEM_PROMPT = `당신은 IDEA on Action (생각과행동, IdeaonAction)의 AI 어시스턴트입니다.

회사 정보:
- 회사명: 생각과행동 (IdeaonAction)
- 슬로건: KEEP AWAKE, LIVE PASSIONATE
- 목적: 아이디어 실험실 & 커뮤니티형 프로덕트 스튜디오
- 웹사이트: https://www.ideaonaction.ai/

주요 서비스 (Minu 시리즈):
1. Minu Find - 사업기회 탐색 (시장 분석, 트렌드 발굴)
2. Minu Frame - 문제정의 & RFP (요구사항 정의, 제안서 작성)
3. Minu Build - 프로젝트 진행 (애자일 개발, 협업)
4. Minu Keep - 운영/유지보수 (모니터링, 개선)

당신의 역할:
- 사용자의 질문에 친절하고 정확하게 답변
- 회사 서비스에 대한 상세 정보 제공
- 프로젝트 관련 문의 및 문제 해결 지원
- 한국어와 영어 모두 지원

답변 스타일:
- 친절하고 전문적인 톤
- 간결하고 명확한 설명
- 필요시 구체적인 예시 제공
- 마크다운 포맷 사용 (코드 블록, 리스트 등)

제한사항:
- 회사 서비스 외 질문은 정중히 안내
- 개인정보 수집 금지
- 부적절한 요청은 거절`;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Supabase Auth 토큰 가져오기
 */
async function getAuthToken(): Promise<string | null> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  } catch (error) {
    devError(error, { service: 'Claude', operation: 'getAuthToken' });
    return null;
  }
}

/**
 * HTTP 상태 코드를 Claude 에러 코드로 변환
 */
function statusToErrorCode(status: number): ClaudeErrorCode {
  switch (status) {
    case 401:
      return 'AUTH_FAILED';
    case 403:
      return 'AUTH_REQUIRED';
    case 429:
      return 'RATE_LIMIT_EXCEEDED';
    case 400:
      return 'INVALID_REQUEST';
    case 503:
    case 529:
      return 'MODEL_OVERLOADED';
    case 500:
    case 502:
    case 504:
      return 'INTERNAL_ERROR';
    default:
      return 'UNKNOWN';
  }
}

/**
 * 에러 응답 파싱
 */
async function parseErrorResponse(
  response: Response
): Promise<{ message: string; retryAfter?: number }> {
  try {
    const data = await response.json();
    return {
      message: data.message || data.error || response.statusText,
      retryAfter: data.retryAfter || parseInt(response.headers.get('Retry-After') || '0', 10),
    };
  } catch {
    return { message: response.statusText };
  }
}

// ============================================================================
// ClaudeClient Class
// ============================================================================

/**
 * Claude AI 클라이언트 클래스
 *
 * @example
 * ```ts
 * const client = new ClaudeClient();
 *
 * // 단일 응답
 * const response = await client.generate({
 *   messages: [{ role: 'user', content: '안녕하세요!' }],
 * });
 * console.log(response.content[0].text);
 *
 * // 스트리밍
 * await client.stream({
 *   messages: [{ role: 'user', content: '긴 이야기를 해주세요' }],
 *   onChunk: (chunk) => console.log(chunk),
 *   onComplete: (full, usage) => console.log('완료:', usage),
 * });
 *
 * // 사용량 조회
 * const usage = await client.getUsage();
 * console.log('남은 토큰:', usage.limits.remainingTokens);
 * ```
 */
export class ClaudeClient {
  private baseUrl: string;
  private defaultSystemPrompt: string;

  constructor(options?: { baseUrl?: string; systemPrompt?: string }) {
    this.baseUrl = options?.baseUrl || CLAUDE_FUNCTION_URL;
    this.defaultSystemPrompt = options?.systemPrompt || CLAUDE_SYSTEM_PROMPT;
  }

  /**
   * 단일 응답 생성
   *
   * @param options - 생성 옵션
   * @returns Claude API 응답
   * @throws ClaudeError
   */
  async generate(options: ClaudeGenerateOptions): Promise<ClaudeResponse> {
    const {
      messages,
      model = DEFAULT_MODEL,
      maxTokens = DEFAULT_MAX_TOKENS,
      temperature = DEFAULT_TEMPERATURE,
      systemPrompt = this.defaultSystemPrompt,
      timeout = DEFAULT_TIMEOUT,
      signal,
    } = options;

    // 인증 토큰 가져오기
    const authToken = await getAuthToken();
    if (!authToken) {
      throw new ClaudeError('로그인이 필요합니다.', 'AUTH_REQUIRED');
    }

    // 요청 본문 구성
    const requestBody = {
      messages,
      model,
      max_tokens: maxTokens,
      temperature,
      system: systemPrompt,
    };

    // AbortController 설정 (타임아웃 + 외부 시그널)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    // 외부 시그널 연결
    if (signal) {
      signal.addEventListener('abort', () => controller.abort());
    }

    try {
      devLog('[Claude] 요청 시작:', { model, messagesCount: messages.length });

      const response = await fetch(`${this.baseUrl}${CLAUDE_CHAT_ENDPOINT}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // 에러 응답 처리
      if (!response.ok) {
        const { message, retryAfter } = await parseErrorResponse(response);
        const code = statusToErrorCode(response.status);

        throw new ClaudeError(message, code, {
          statusCode: response.status,
          retryAfter,
        });
      }

      const data = (await response.json()) as ClaudeResponse;
      devLog('[Claude] 응답 수신:', { usage: data.usage, stopReason: data.stop_reason });

      return data;
    } catch (error) {
      clearTimeout(timeoutId);

      // 이미 ClaudeError인 경우 그대로 throw
      if (error instanceof ClaudeError) {
        throw error;
      }

      // AbortError 처리
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          // 외부 시그널로 취소된 경우
          if (signal?.aborted) {
            throw new ClaudeError('요청이 취소되었습니다.', 'CANCELLED', { cause: error });
          }
          // 타임아웃으로 취소된 경우
          throw new ClaudeError('요청 시간이 초과되었습니다.', 'TIMEOUT', { cause: error });
        }

        // 네트워크 에러
        if (error.message.includes('fetch') || error.message.includes('network')) {
          throw new ClaudeError('네트워크 연결에 실패했습니다.', 'NETWORK_ERROR', { cause: error });
        }
      }

      // 알 수 없는 에러
      devError(error, { service: 'Claude', operation: 'generate' });
      throw new ClaudeError(
        error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
        'UNKNOWN',
        { cause: error instanceof Error ? error : undefined }
      );
    }
  }

  /**
   * 스트리밍 응답 생성
   *
   * @param options - 스트리밍 옵션
   * @returns 완성된 응답 텍스트
   * @throws ClaudeError
   */
  async stream(options: ClaudeStreamOptions): Promise<string> {
    const {
      messages,
      model = DEFAULT_MODEL,
      maxTokens = DEFAULT_MAX_TOKENS,
      temperature = DEFAULT_TEMPERATURE,
      systemPrompt = this.defaultSystemPrompt,
      timeout = DEFAULT_TIMEOUT,
      signal,
      onChunk,
      onComplete,
      onError,
    } = options;

    // 인증 토큰 가져오기
    const authToken = await getAuthToken();
    if (!authToken) {
      const error = new ClaudeError('로그인이 필요합니다.', 'AUTH_REQUIRED');
      onError?.(error);
      throw error;
    }

    // 요청 본문 구성
    const requestBody = {
      messages,
      model,
      max_tokens: maxTokens,
      temperature,
      system: systemPrompt,
      stream: true,
    };

    // AbortController 설정
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    if (signal) {
      signal.addEventListener('abort', () => controller.abort());
    }

    let fullResponse = '';
    let finalUsage: ClaudeUsage | undefined;

    try {
      devLog('[Claude] 스트리밍 시작:', { model, messagesCount: messages.length });

      const response = await fetch(`${this.baseUrl}${CLAUDE_CHAT_ENDPOINT}?stream=true`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
          Accept: 'text/event-stream',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // 에러 응답 처리
      if (!response.ok) {
        const { message, retryAfter } = await parseErrorResponse(response);
        const code = statusToErrorCode(response.status);
        throw new ClaudeError(message, code, {
          statusCode: response.status,
          retryAfter,
        });
      }

      // 스트림 리더 설정
      const reader = response.body?.getReader();
      if (!reader) {
        throw new ClaudeError('스트리밍 응답을 읽을 수 없습니다.', 'INTERNAL_ERROR');
      }

      const decoder = new TextDecoder();

      // 스트림 읽기
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;

          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const event = JSON.parse(data) as ClaudeStreamEvent;

            // 텍스트 청크 처리
            if (event.type === 'content_block_delta' && event.delta?.text) {
              const chunk = event.delta.text;
              fullResponse += chunk;
              onChunk?.(chunk);
            }

            // 사용량 정보 (message_delta 또는 message_stop에서)
            if (event.usage) {
              finalUsage = event.usage;
            }

            // 에러 처리
            if (event.type === 'error' && event.error) {
              throw new ClaudeError(event.error.message, 'INTERNAL_ERROR');
            }
          } catch (parseError) {
            // JSON 파싱 실패는 무시 (부분적인 데이터일 수 있음)
            if (!(parseError instanceof SyntaxError)) {
              throw parseError;
            }
          }
        }
      }

      devLog('[Claude] 스트리밍 완료:', { length: fullResponse.length, usage: finalUsage });
      onComplete?.(fullResponse, finalUsage);

      return fullResponse;
    } catch (error) {
      clearTimeout(timeoutId);

      // ClaudeError 처리
      if (error instanceof ClaudeError) {
        onError?.(error);
        throw error;
      }

      // AbortError 처리
      if (error instanceof Error && error.name === 'AbortError') {
        const claudeError = signal?.aborted
          ? new ClaudeError('요청이 취소되었습니다.', 'CANCELLED', { cause: error })
          : new ClaudeError('요청 시간이 초과되었습니다.', 'TIMEOUT', { cause: error });
        onError?.(claudeError);
        throw claudeError;
      }

      // 기타 에러
      const claudeError = new ClaudeError(
        error instanceof Error ? error.message : '스트리밍 중 오류가 발생했습니다.',
        'UNKNOWN',
        { cause: error instanceof Error ? error : undefined }
      );
      onError?.(claudeError);
      throw claudeError;
    }
  }

  /**
   * 토큰 사용량 조회
   *
   * @returns 사용량 정보
   * @throws ClaudeError
   */
  async getUsage(): Promise<ClaudeUsageResponse> {
    // 인증 토큰 가져오기
    const authToken = await getAuthToken();
    if (!authToken) {
      throw new ClaudeError('로그인이 필요합니다.', 'AUTH_REQUIRED');
    }

    try {
      const response = await fetch(`${this.baseUrl}/functions/v1/claude-usage`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        const { message } = await parseErrorResponse(response);
        throw new ClaudeError(message, statusToErrorCode(response.status), {
          statusCode: response.status,
        });
      }

      return (await response.json()) as ClaudeUsageResponse;
    } catch (error) {
      if (error instanceof ClaudeError) {
        throw error;
      }

      devError(error, { service: 'Claude', operation: 'getUsage' });
      throw new ClaudeError(
        error instanceof Error ? error.message : '사용량 조회에 실패했습니다.',
        'UNKNOWN'
      );
    }
  }

  /**
   * 텍스트에서 응답 추출 (편의 메서드)
   *
   * @param response - Claude 응답
   * @returns 텍스트 콘텐츠
   */
  static extractText(response: ClaudeResponse): string {
    return response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('');
  }

  /**
   * 총 토큰 수 계산 (편의 메서드)
   *
   * @param usage - 사용량 정보
   * @returns 총 토큰 수
   */
  static calculateTotalTokens(usage: ClaudeUsage): number {
    return usage.input_tokens + usage.output_tokens;
  }
}

// ============================================================================
// Default Client Instance
// ============================================================================

/**
 * 기본 Claude 클라이언트 인스턴스
 *
 * @example
 * ```ts
 * import { claudeClient } from '@/lib/claude';
 *
 * const response = await claudeClient.generate({
 *   messages: [{ role: 'user', content: '안녕하세요!' }],
 * });
 * ```
 */
export const claudeClient = new ClaudeClient();

// ============================================================================
// Standalone Functions (for backwards compatibility)
// ============================================================================

/**
 * Claude 채팅 완료 요청 (비스트리밍)
 *
 * @param options - 생성 옵션
 * @returns 응답 텍스트
 */
export async function createClaudeCompletion(options: ClaudeGenerateOptions): Promise<string> {
  const response = await claudeClient.generate(options);
  return ClaudeClient.extractText(response);
}

/**
 * Claude 채팅 완료 요청 (스트리밍)
 *
 * @param options - 스트리밍 옵션
 * @returns AsyncGenerator of text chunks
 */
export async function* createClaudeCompletionStream(
  options: ClaudeGenerateOptions
): AsyncGenerator<string, void, unknown> {
  const chunks: string[] = [];
  let resolveChunk: ((chunk: string | null) => void) | null = null;

  const chunkPromise = () =>
    new Promise<string | null>((resolve) => {
      resolveChunk = resolve;
    });

  // 스트리밍 시작
  const streamPromise = claudeClient.stream({
    ...options,
    onChunk: (chunk) => {
      if (resolveChunk) {
        resolveChunk(chunk);
        resolveChunk = null;
      } else {
        chunks.push(chunk);
      }
    },
    onComplete: () => {
      if (resolveChunk) {
        resolveChunk(null);
      }
    },
  });

  // 청크 생성기
  while (true) {
    // 버퍼에 청크가 있으면 먼저 반환
    if (chunks.length > 0) {
      yield chunks.shift()!;
      continue;
    }

    // 새 청크 대기
    const chunk = await chunkPromise();
    if (chunk === null) break;
    yield chunk;
  }

  // 스트리밍 완료 대기
  await streamPromise;
}

/**
 * 메시지 배열에 시스템 프롬프트 추가
 */
export function addClaudeSystemPrompt(messages: ClaudeMessage[]): ClaudeMessage[] {
  // Claude API는 system 필드를 별도로 사용하므로 messages에는 추가하지 않음
  return messages;
}

/**
 * 컨텍스트 길이 제한 (최근 N개 메시지만 유지)
 */
export function limitClaudeContext(messages: ClaudeMessage[], maxMessages: number = 20): ClaudeMessage[] {
  return messages.slice(-maxMessages);
}

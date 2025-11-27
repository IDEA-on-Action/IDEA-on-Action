/**
 * Claude Streaming Hook
 *
 * Claude AI API와 SSE(Server-Sent Events) 스트리밍 통신을 위한 React 훅
 * - 실시간 텍스트 스트리밍
 * - AbortController로 취소 지원
 * - 청크 누적 및 완료 감지
 * - 에러 핸들링
 *
 * @module hooks/useClaudeStreaming
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  createClaudeError,
  extractTextFromMessage,
  sumUsage,
  isClaudeError,
  httpStatusToClaudeErrorCode,
  EMPTY_USAGE,
  DEFAULT_CLAUDE_MODEL,
  DEFAULT_MAX_TOKENS,
  DEFAULT_TEMPERATURE,
  DEFAULT_TIMEOUT,
  SSE_DATA_PREFIX,
  SSE_DELIMITER,
} from '@/types/claude.types';
import type {
  ClaudeMessage,
  ClaudeStreamEvent,
  ClaudeError,
  ClaudeUsage,
  ClaudeRequestOptions,
  ClaudeConversationState,
  UseClaudeStreamingResult,
  UseClaudeChatOptions,
  ClaudeTextDelta,
  ClaudeModel,
} from '@/types/claude.types';

// ============================================================================
// Constants
// ============================================================================

/** Edge Function URL */
const CLAUDE_EDGE_FUNCTION_URL = '/functions/v1/claude-chat';

/** 초기 상태 */
const initialState: ClaudeConversationState = {
  conversationId: null,
  messages: [],
  streamingText: '',
  isStreaming: false,
  isLoading: false,
  error: null,
  lastUsage: null,
  totalUsage: { ...EMPTY_USAGE },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * SSE 라인 파싱
 */
function parseSSELine(line: string): { event?: string; data?: string } {
  if (line.startsWith('event: ')) {
    return { event: line.slice(7).trim() };
  }
  if (line.startsWith(SSE_DATA_PREFIX)) {
    return { data: line.slice(SSE_DATA_PREFIX.length) };
  }
  return {};
}

/**
 * SSE 데이터를 ClaudeStreamEvent로 파싱
 */
function parseSSEData(data: string): ClaudeStreamEvent | null {
  if (data === '[DONE]') {
    return null;
  }

  try {
    return JSON.parse(data) as ClaudeStreamEvent;
  } catch {
    console.warn('[Claude Streaming] SSE 데이터 파싱 실패:', data);
    return null;
  }
}

/**
 * 고유 ID 생성
 */
function generateConversationId(): string {
  return `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// ============================================================================
// Main Hook
// ============================================================================

/**
 * Claude 스트리밍 훅
 *
 * Claude AI API와 실시간 스트리밍 통신을 관리합니다.
 *
 * @param options - 훅 옵션
 * @returns 스트리밍 상태 및 제어 함수
 *
 * @example
 * ```tsx
 * function ChatComponent() {
 *   const {
 *     state,
 *     sendMessage,
 *     stopStreaming,
 *     clearConversation,
 *     isStreaming,
 *   } = useClaudeStreaming({
 *     systemPrompt: '당신은 친절한 AI 어시스턴트입니다.',
 *     onStreamingText: (text) => console.log('실시간:', text),
 *     onComplete: (response, usage) => console.log('완료:', response, usage),
 *   });
 *
 *   const handleSend = async () => {
 *     try {
 *       const response = await sendMessage('안녕하세요!');
 *       console.log('응답:', response);
 *     } catch (error) {
 *       console.error('에러:', error);
 *     }
 *   };
 *
 *   return (
 *     <div>
 *       {state.messages.map((msg, i) => (
 *         <div key={i}>{msg.role}: {extractTextFromMessage(msg)}</div>
 *       ))}
 *       {isStreaming && <div>AI: {state.streamingText}</div>}
 *       <button onClick={handleSend} disabled={isStreaming}>전송</button>
 *       <button onClick={stopStreaming} disabled={!isStreaming}>중지</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useClaudeStreaming(options: UseClaudeChatOptions = {}): UseClaudeStreamingResult {
  const {
    model: defaultModel = DEFAULT_CLAUDE_MODEL,
    systemPrompt: initialSystemPrompt,
    maxTokens: defaultMaxTokens = DEFAULT_MAX_TOKENS,
    temperature: defaultTemperature = DEFAULT_TEMPERATURE,
    streaming: defaultStreaming = true,
    onMessageChange,
    onStreamingText,
    onComplete,
    onError,
  } = options;

  // 상태
  const [state, setState] = useState<ClaudeConversationState>({
    ...initialState,
    conversationId: generateConversationId(),
  });
  const [systemPrompt, setSystemPrompt] = useState<string | null>(initialSystemPrompt ?? null);

  // Refs
  const abortControllerRef = useRef<AbortController | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);

  // ========================================================================
  // 클린업
  // ========================================================================

  useEffect(() => {
    return () => {
      // 컴포넌트 언마운트 시 스트리밍 중지
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (readerRef.current) {
        readerRef.current.cancel().catch(() => {});
      }
    };
  }, []);

  // ========================================================================
  // 메시지 변경 감지
  // ========================================================================

  useEffect(() => {
    if (onMessageChange && state.messages.length > 0) {
      onMessageChange(state.messages);
    }
  }, [state.messages, onMessageChange]);

  // ========================================================================
  // 스트리밍 중지
  // ========================================================================

  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (readerRef.current) {
      readerRef.current.cancel().catch(() => {});
      readerRef.current = null;
    }

    setState((prev) => ({
      ...prev,
      isStreaming: false,
      isLoading: false,
    }));
  }, []);

  // ========================================================================
  // SSE 스트림 처리
  // ========================================================================

  const processSSEStream = useCallback(
    async (
      reader: ReadableStreamDefaultReader<Uint8Array>,
      signal: AbortSignal
    ): Promise<{ text: string; usage: ClaudeUsage }> => {
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulatedText = '';
      let finalUsage: ClaudeUsage = { ...EMPTY_USAGE };

      try {
        while (!signal.aborted) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });

          // 이벤트 단위로 분리
          const events = buffer.split(SSE_DELIMITER);
          buffer = events.pop() ?? ''; // 마지막 불완전한 청크는 버퍼에 유지

          for (const eventStr of events) {
            if (!eventStr.trim()) continue;

            const lines = eventStr.split('\n');
            let eventType: string | undefined;
            let eventData: string | undefined;

            for (const line of lines) {
              const parsed = parseSSELine(line);
              if (parsed.event) eventType = parsed.event;
              if (parsed.data) eventData = parsed.data;
            }

            if (!eventData) continue;

            const event = parseSSEData(eventData);
            if (!event) continue;

            // 이벤트 처리
            switch (event.type) {
              case 'content_block_delta': {
                const delta = event.delta;
                if (delta.type === 'text_delta') {
                  const textDelta = delta as ClaudeTextDelta;
                  accumulatedText += textDelta.text;

                  // 실시간 업데이트
                  setState((prev) => ({
                    ...prev,
                    streamingText: accumulatedText,
                  }));

                  // 콜백 호출
                  if (onStreamingText) {
                    onStreamingText(accumulatedText);
                  }
                }
                break;
              }

              case 'message_start': {
                if (event.message.usage) {
                  finalUsage = {
                    ...finalUsage,
                    input_tokens: event.message.usage.input_tokens,
                  };
                }
                break;
              }

              case 'message_delta': {
                if (event.usage) {
                  finalUsage = {
                    ...finalUsage,
                    output_tokens: event.usage.output_tokens,
                  };
                }
                break;
              }

              case 'error': {
                throw createClaudeError('CLAUDE_009', event.error.message);
              }
            }
          }
        }
      } catch (error) {
        if (signal.aborted) {
          throw createClaudeError('CLAUDE_013', '사용자에 의해 취소됨');
        }
        throw error;
      }

      return { text: accumulatedText, usage: finalUsage };
    },
    [onStreamingText]
  );

  // ========================================================================
  // 메시지 전송
  // ========================================================================

  const sendMessage = useCallback(
    async (content: string, requestOptions?: ClaudeRequestOptions): Promise<string> => {
      // 이전 스트리밍 중지
      stopStreaming();

      const model = requestOptions?.model ?? defaultModel;
      const maxTokens = requestOptions?.maxTokens ?? defaultMaxTokens;
      const temperature = requestOptions?.temperature ?? defaultTemperature;
      const streaming = requestOptions?.streaming ?? defaultStreaming;
      const effectiveSystemPrompt = requestOptions?.systemPrompt ?? systemPrompt;
      const timeout = requestOptions?.timeout ?? DEFAULT_TIMEOUT;

      // 새 AbortController 생성
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      // 타임아웃 설정
      const timeoutId = setTimeout(() => {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
      }, timeout);

      // 사용자 메시지 추가
      const userMessage: ClaudeMessage = {
        role: 'user',
        content,
      };

      const updatedMessages = [...state.messages, userMessage];

      setState((prev) => ({
        ...prev,
        messages: updatedMessages,
        isLoading: true,
        isStreaming: streaming,
        streamingText: '',
        error: null,
      }));

      try {
        // Supabase 세션 토큰 가져오기
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
          throw createClaudeError('CLAUDE_002', '로그인이 필요합니다');
        }

        // Edge Function 호출
        const baseUrl = import.meta.env.VITE_SUPABASE_URL;
        const response = await fetch(`${baseUrl}${CLAUDE_EDGE_FUNCTION_URL}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            model,
            messages: updatedMessages,
            max_tokens: maxTokens,
            system: effectiveSystemPrompt,
            temperature,
            stream: streaming,
          }),
          signal,
        });

        clearTimeout(timeoutId);

        // 응답 상태 확인
        if (!response.ok) {
          const errorCode = httpStatusToClaudeErrorCode(response.status);
          let errorDetails: string | undefined;

          try {
            const errorBody = await response.json();
            errorDetails = errorBody.error?.message ?? errorBody.message;
          } catch {
            errorDetails = response.statusText;
          }

          throw createClaudeError(errorCode, errorDetails, undefined, response.status);
        }

        let responseText: string;
        let usage: ClaudeUsage;

        if (streaming && response.body) {
          // 스트리밍 응답 처리
          readerRef.current = response.body.getReader();
          const result = await processSSEStream(readerRef.current, signal);
          responseText = result.text;
          usage = result.usage;
        } else {
          // 일반 응답 처리
          const data = await response.json();
          responseText = data.content?.[0]?.text ?? '';
          usage = data.usage ?? { ...EMPTY_USAGE };
        }

        // 어시스턴트 메시지 추가
        const assistantMessage: ClaudeMessage = {
          role: 'assistant',
          content: responseText,
        };

        const newTotalUsage = sumUsage(state.totalUsage, usage);

        setState((prev) => ({
          ...prev,
          messages: [...updatedMessages, assistantMessage],
          streamingText: '',
          isStreaming: false,
          isLoading: false,
          lastUsage: usage,
          totalUsage: newTotalUsage,
        }));

        // 완료 콜백
        if (onComplete) {
          onComplete(responseText, usage);
        }

        return responseText;
      } catch (error) {
        clearTimeout(timeoutId);

        const claudeError = isClaudeError(error)
          ? error
          : createClaudeError(
              'CLAUDE_012',
              error instanceof Error ? error.message : String(error),
              error instanceof Error ? error : undefined
            );

        setState((prev) => ({
          ...prev,
          isStreaming: false,
          isLoading: false,
          error: claudeError,
        }));

        // 에러 콜백
        if (onError) {
          onError(claudeError);
        }

        throw claudeError;
      } finally {
        abortControllerRef.current = null;
        readerRef.current = null;
      }
    },
    [
      state.messages,
      state.totalUsage,
      systemPrompt,
      defaultModel,
      defaultMaxTokens,
      defaultTemperature,
      defaultStreaming,
      stopStreaming,
      processSSEStream,
      onComplete,
      onError,
    ]
  );

  // ========================================================================
  // 대화 초기화
  // ========================================================================

  const clearConversation = useCallback(() => {
    stopStreaming();
    setState({
      ...initialState,
      conversationId: generateConversationId(),
    });
  }, [stopStreaming]);

  // ========================================================================
  // 메시지 설정
  // ========================================================================

  const setMessages = useCallback((messages: ClaudeMessage[]) => {
    setState((prev) => ({
      ...prev,
      messages,
    }));
  }, []);

  // ========================================================================
  // Return
  // ========================================================================

  return {
    state,
    sendMessage,
    stopStreaming,
    clearConversation,
    setMessages,
    setSystemPrompt,
    systemPrompt,
    isStreaming: state.isStreaming,
    isLoading: state.isLoading,
    isError: !!state.error,
    error: state.error,
  };
}

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Claude 단일 요청 훅
 *
 * 대화 컨텍스트 없이 단일 요청만 수행할 때 사용합니다.
 *
 * @example
 * ```tsx
 * function SingleRequestComponent() {
 *   const { sendRequest, isLoading, error } = useClaudeRequest();
 *
 *   const handleRequest = async () => {
 *     const response = await sendRequest('간단한 질문입니다.');
 *     console.log(response);
 *   };
 *
 *   return <button onClick={handleRequest} disabled={isLoading}>요청</button>;
 * }
 * ```
 */
export function useClaudeRequest(defaultOptions?: ClaudeRequestOptions) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ClaudeError | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendRequest = useCallback(
    async (
      content: string,
      options?: ClaudeRequestOptions
    ): Promise<{ text: string; usage: ClaudeUsage }> => {
      // 이전 요청 취소
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      const model = options?.model ?? defaultOptions?.model ?? DEFAULT_CLAUDE_MODEL;
      const maxTokens = options?.maxTokens ?? defaultOptions?.maxTokens ?? DEFAULT_MAX_TOKENS;
      const temperature =
        options?.temperature ?? defaultOptions?.temperature ?? DEFAULT_TEMPERATURE;
      const effectiveSystemPrompt = options?.systemPrompt ?? defaultOptions?.systemPrompt;
      const timeout = options?.timeout ?? defaultOptions?.timeout ?? DEFAULT_TIMEOUT;

      setIsLoading(true);
      setError(null);

      const timeoutId = setTimeout(() => {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
      }, timeout);

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
          throw createClaudeError('CLAUDE_002', '로그인이 필요합니다');
        }

        const baseUrl = import.meta.env.VITE_SUPABASE_URL;
        const response = await fetch(`${baseUrl}${CLAUDE_EDGE_FUNCTION_URL}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content }],
            max_tokens: maxTokens,
            system: effectiveSystemPrompt,
            temperature,
            stream: false,
          }),
          signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorCode = httpStatusToClaudeErrorCode(response.status);
          let errorDetails: string | undefined;

          try {
            const errorBody = await response.json();
            errorDetails = errorBody.error?.message ?? errorBody.message;
          } catch {
            errorDetails = response.statusText;
          }

          throw createClaudeError(errorCode, errorDetails, undefined, response.status);
        }

        const data = await response.json();
        const text = data.content?.[0]?.text ?? '';
        const usage: ClaudeUsage = data.usage ?? { ...EMPTY_USAGE };

        return { text, usage };
      } catch (err) {
        clearTimeout(timeoutId);

        const claudeError = isClaudeError(err)
          ? err
          : createClaudeError(
              'CLAUDE_012',
              err instanceof Error ? err.message : String(err),
              err instanceof Error ? err : undefined
            );

        setError(claudeError);
        throw claudeError;
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    },
    [defaultOptions]
  );

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      cancel();
    };
  }, [cancel]);

  return {
    sendRequest,
    cancel,
    isLoading,
    error,
    isError: !!error,
  };
}

/**
 * Claude 모델 선택 훅
 *
 * 사용 가능한 모델 목록과 선택 상태를 관리합니다.
 *
 * @example
 * ```tsx
 * function ModelSelector() {
 *   const { models, selectedModel, selectModel, modelInfo } = useClaudeModel();
 *
 *   return (
 *     <select value={selectedModel} onChange={(e) => selectModel(e.target.value)}>
 *       {models.map((m) => (
 *         <option key={m.id} value={m.id}>{m.name}</option>
 *       ))}
 *     </select>
 *   );
 * }
 * ```
 */
export function useClaudeModel(initialModel: ClaudeModel = DEFAULT_CLAUDE_MODEL) {
  const [selectedModel, setSelectedModel] = useState<ClaudeModel>(initialModel);
  const [models, setModels] = useState<Array<{ id: string; name: string }>>([]);

  // 모델 정보 로드 (컴포넌트 마운트 시 한 번만)
  useEffect(() => {
    // 별도 모듈에서 동적으로 로드하여 Vite 경고 회피
    // claude.types.ts는 이미 정적으로 import되어 있으므로
    // 동적 import 대신 lazy 초기화 사용
    (async () => {
      const { CLAUDE_MODEL_INFO } = await import('@/lib/claude/model-info');
      setModels(Object.values(CLAUDE_MODEL_INFO));
    })();
  }, []);

  const selectModel = useCallback((model: ClaudeModel) => {
    setSelectedModel(model);
  }, []);

  return {
    models,
    selectedModel,
    selectModel,
  };
}

export default useClaudeStreaming;

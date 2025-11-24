/**
 * useClaudeChat Hook
 *
 * Claude AI 채팅 기능을 위한 React Hook
 * - React Query mutation 기반
 * - 메시지 히스토리 관리
 * - 스트리밍 응답 지원
 * - 로딩/에러 상태 관리
 * - 토큰 사용량 추적
 *
 * @version 1.0.0
 */

import { useState, useCallback, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { devError } from '@/lib/errors'

// ============================================================================
// 타입 정의
// ============================================================================

/**
 * 메시지 역할
 */
export type MessageRole = 'user' | 'assistant'

/**
 * 채팅 메시지
 */
export interface ClaudeMessage {
  id: string
  role: MessageRole
  content: string
  createdAt: Date
}

/**
 * 토큰 사용량
 */
export interface TokenUsage {
  inputTokens: number
  outputTokens: number
  totalTokens: number
}

/**
 * 채팅 요청 옵션
 */
export interface ChatRequestOptions {
  model?: string
  maxTokens?: number
  temperature?: number
  system?: string
}

/**
 * Claude API 응답
 */
interface ClaudeAPIResponse {
  success: boolean
  data?: {
    id: string
    content: string
    model: string
    usage: {
      input_tokens: number
      output_tokens: number
      total_tokens: number
    }
    stop_reason: string | null
  }
  error?: {
    code: string
    message: string
    request_id: string
    timestamp: string
  }
}

/**
 * 훅 옵션
 */
export interface UseClaudeChatOptions {
  /** 초기 메시지 */
  initialMessages?: ClaudeMessage[]
  /** 로컬 스토리지 키 (지정 시 메시지 영속화) */
  storageKey?: string
  /** 스트리밍 사용 여부 */
  enableStreaming?: boolean
  /** 시스템 프롬프트 */
  systemPrompt?: string
  /** 기본 모델 */
  defaultModel?: string
  /** 최대 토큰 수 */
  maxTokens?: number
  /** Temperature */
  temperature?: number
  /** 메시지 전송 성공 콜백 */
  onSuccess?: (message: ClaudeMessage, usage: TokenUsage) => void
  /** 에러 콜백 */
  onError?: (error: Error) => void
}

/**
 * 훅 반환 타입
 */
export interface UseClaudeChatReturn {
  /** 채팅 메시지 목록 */
  messages: ClaudeMessage[]
  /** 메시지 전송 함수 */
  sendMessage: (content: string, options?: ChatRequestOptions) => Promise<void>
  /** 메시지 초기화 */
  clearMessages: () => void
  /** 특정 메시지 삭제 */
  deleteMessage: (messageId: string) => void
  /** 메시지 재시도 */
  retryLastMessage: () => Promise<void>
  /** 로딩 상태 */
  isLoading: boolean
  /** 스트리밍 중 여부 */
  isStreaming: boolean
  /** 에러 */
  error: Error | null
  /** 토큰 사용량 (마지막 응답) */
  tokenUsage: TokenUsage | null
  /** 누적 토큰 사용량 */
  totalTokenUsage: TokenUsage
}

// ============================================================================
// 상수
// ============================================================================

const DEFAULT_STORAGE_KEY = 'claude-chat-messages'
const DEFAULT_SYSTEM_PROMPT = `당신은 IDEA on Action의 AI 어시스턴트입니다.

회사 정보:
- 회사명: 생각과행동 (IdeaonAction)
- 슬로건: KEEP AWAKE, LIVE PASSIONATE
- 웹사이트: https://www.ideaonaction.ai/

주요 서비스 (Minu 시리즈):
1. Minu Find - 사업기회 탐색
2. Minu Frame - 문제정의 & RFP 작성
3. Minu Build - 프로젝트 진행 관리
4. Minu Keep - 운영/유지보수

답변 스타일:
- 친절하고 전문적인 톤
- 간결하고 명확한 설명
- 한국어와 영어 모두 지원`

const SUPABASE_FUNCTION_URL = '/functions/v1/claude-ai'

// ============================================================================
// 유틸리티 함수
// ============================================================================

/**
 * UUID 생성
 */
function generateId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

/**
 * 로컬 스토리지에서 메시지 불러오기
 */
function loadMessagesFromStorage(key: string): ClaudeMessage[] {
  try {
    const stored = localStorage.getItem(key)
    if (!stored) return []

    const parsed = JSON.parse(stored) as Array<Omit<ClaudeMessage, 'createdAt'> & { createdAt: string }>
    return parsed.map((msg) => ({
      ...msg,
      createdAt: new Date(msg.createdAt),
    }))
  } catch (err) {
    devError(err, { operation: '로컬 스토리지에서 메시지 로드' })
    return []
  }
}

/**
 * 로컬 스토리지에 메시지 저장
 */
function saveMessagesToStorage(key: string, messages: ClaudeMessage[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(messages))
  } catch (err) {
    devError(err, { operation: '로컬 스토리지에 메시지 저장' })
  }
}

/**
 * 인증 토큰 가져오기
 */
async function getAuthToken(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token || null
  } catch (err) {
    devError(err, { operation: '인증 토큰 가져오기' })
    return null
  }
}

// ============================================================================
// API 호출 함수
// ============================================================================

/**
 * Claude API 호출 (비스트리밍)
 */
async function callClaudeAPI(
  messages: Array<{ role: MessageRole; content: string }>,
  options: ChatRequestOptions & { system?: string }
): Promise<ClaudeAPIResponse> {
  const token = await getAuthToken()
  if (!token) {
    throw new Error('인증이 필요합니다. 로그인 후 다시 시도해주세요.')
  }

  const { data, error } = await supabase.functions.invoke('claude-ai/chat', {
    body: {
      messages,
      model: options.model,
      max_tokens: options.maxTokens,
      temperature: options.temperature,
      system: options.system,
    },
  })

  if (error) {
    throw new Error(error.message || 'AI 응답을 받는 중 오류가 발생했습니다.')
  }

  return data as ClaudeAPIResponse
}

/**
 * Claude API 스트리밍 호출
 */
async function* callClaudeAPIStream(
  messages: Array<{ role: MessageRole; content: string }>,
  options: ChatRequestOptions & { system?: string }
): AsyncGenerator<string, void, unknown> {
  const token = await getAuthToken()
  if (!token) {
    throw new Error('인증이 필요합니다. 로그인 후 다시 시도해주세요.')
  }

  // Supabase Functions URL
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const functionUrl = `${supabaseUrl}${SUPABASE_FUNCTION_URL}/chat/stream`

  const response = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      messages,
      model: options.model,
      max_tokens: options.maxTokens,
      temperature: options.temperature,
      system: options.system,
      stream: true,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`스트리밍 오류: ${response.status} - ${errorText}`)
  }

  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error('응답 스트림을 읽을 수 없습니다.')
  }

  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })

      // SSE 형식 파싱
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data === '[DONE]') continue

          try {
            const parsed = JSON.parse(data)

            // 텍스트 청크
            if (parsed.type === 'text' && parsed.content) {
              yield parsed.content
            }

            // 에러
            if (parsed.type === 'error') {
              throw new Error(parsed.error || '스트리밍 중 오류가 발생했습니다.')
            }
          } catch (parseError) {
            // JSON 파싱 실패는 무시 (불완전한 데이터일 수 있음)
            if (parseError instanceof Error && parseError.message !== '스트리밍 중 오류가 발생했습니다.') {
              continue
            }
            throw parseError
          }
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

// ============================================================================
// 메인 훅
// ============================================================================

/**
 * useClaudeChat Hook
 */
export function useClaudeChat(options: UseClaudeChatOptions = {}): UseClaudeChatReturn {
  const {
    initialMessages = [],
    storageKey,
    enableStreaming = true,
    systemPrompt = DEFAULT_SYSTEM_PROMPT,
    defaultModel,
    maxTokens,
    temperature,
    onSuccess,
    onError,
  } = options

  // 상태
  const [messages, setMessages] = useState<ClaudeMessage[]>(initialMessages)
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [tokenUsage, setTokenUsage] = useState<TokenUsage | null>(null)
  const [totalTokenUsage, setTotalTokenUsage] = useState<TokenUsage>({
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
  })

  // 로컬 스토리지에서 메시지 불러오기
  useEffect(() => {
    if (storageKey) {
      const loaded = loadMessagesFromStorage(storageKey)
      if (loaded.length > 0) {
        setMessages(loaded)
      }
    }
  }, [storageKey])

  // 메시지 변경 시 로컬 스토리지에 저장
  useEffect(() => {
    if (storageKey && messages.length > 0) {
      saveMessagesToStorage(storageKey, messages)
    }
  }, [messages, storageKey])

  // React Query mutation (비스트리밍용)
  const mutation = useMutation({
    mutationFn: async ({
      content,
      opts,
    }: {
      content: string
      opts?: ChatRequestOptions
    }) => {
      // API 메시지 형식으로 변환
      const apiMessages = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }))

      // 사용자 메시지 추가
      apiMessages.push({ role: 'user' as const, content })

      // API 호출
      const response = await callClaudeAPI(apiMessages, {
        model: opts?.model || defaultModel,
        maxTokens: opts?.maxTokens || maxTokens,
        temperature: opts?.temperature || temperature,
        system: opts?.system || systemPrompt,
      })

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'AI 응답을 받는 중 오류가 발생했습니다.')
      }

      return response.data
    },
    onError: (err) => {
      const error = err instanceof Error ? err : new Error('알 수 없는 오류가 발생했습니다.')
      setError(error)
      onError?.(error)
    },
  })

  /**
   * 메시지 전송
   */
  const sendMessage = useCallback(
    async (content: string, requestOptions?: ChatRequestOptions) => {
      if (!content.trim()) return

      // 사용자 메시지 추가
      const userMessage: ClaudeMessage = {
        id: generateId(),
        role: 'user',
        content: content.trim(),
        createdAt: new Date(),
      }

      setMessages((prev) => [...prev, userMessage])
      setError(null)

      if (enableStreaming) {
        // 스트리밍 모드
        setIsStreaming(true)

        // AI 응답 메시지 초기화
        const assistantMessage: ClaudeMessage = {
          id: generateId(),
          role: 'assistant',
          content: '',
          createdAt: new Date(),
        }

        setMessages((prev) => [...prev, assistantMessage])

        try {
          // API 메시지 형식으로 변환
          const apiMessages = messages.map((msg) => ({
            role: msg.role,
            content: msg.content,
          }))
          apiMessages.push({ role: 'user' as const, content: content.trim() })

          // 스트리밍 응답 처리
          let fullContent = ''
          for await (const chunk of callClaudeAPIStream(apiMessages, {
            model: requestOptions?.model || defaultModel,
            maxTokens: requestOptions?.maxTokens || maxTokens,
            temperature: requestOptions?.temperature || temperature,
            system: requestOptions?.system || systemPrompt,
          })) {
            fullContent += chunk

            // 실시간으로 메시지 업데이트
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessage.id
                  ? { ...msg, content: fullContent }
                  : msg
              )
            )
          }

          // 완료 후 콜백 (스트리밍에서는 토큰 사용량을 정확히 알 수 없음)
          const estimatedUsage: TokenUsage = {
            inputTokens: 0,
            outputTokens: 0,
            totalTokens: 0,
          }

          onSuccess?.({ ...assistantMessage, content: fullContent }, estimatedUsage)
        } catch (err) {
          const error = err instanceof Error ? err : new Error('스트리밍 중 오류가 발생했습니다.')
          setError(error)
          onError?.(error)

          // 에러 메시지로 교체
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessage.id
                ? { ...msg, content: '죄송합니다. 응답을 생성하는 중 오류가 발생했습니다.' }
                : msg
            )
          )
        } finally {
          setIsStreaming(false)
        }
      } else {
        // 비스트리밍 모드
        try {
          const response = await mutation.mutateAsync({
            content: content.trim(),
            opts: requestOptions,
          })

          // AI 응답 메시지 추가
          const assistantMessage: ClaudeMessage = {
            id: generateId(),
            role: 'assistant',
            content: response.content,
            createdAt: new Date(),
          }

          setMessages((prev) => [...prev, assistantMessage])

          // 토큰 사용량 업데이트
          const usage: TokenUsage = {
            inputTokens: response.usage.input_tokens,
            outputTokens: response.usage.output_tokens,
            totalTokens: response.usage.total_tokens,
          }

          setTokenUsage(usage)
          setTotalTokenUsage((prev) => ({
            inputTokens: prev.inputTokens + usage.inputTokens,
            outputTokens: prev.outputTokens + usage.outputTokens,
            totalTokens: prev.totalTokens + usage.totalTokens,
          }))

          onSuccess?.(assistantMessage, usage)
        } catch {
          // 에러는 mutation.onError에서 처리됨
        }
      }
    },
    [
      messages,
      enableStreaming,
      defaultModel,
      maxTokens,
      temperature,
      systemPrompt,
      mutation,
      onSuccess,
      onError,
    ]
  )

  /**
   * 메시지 초기화
   */
  const clearMessages = useCallback(() => {
    setMessages([])
    setError(null)
    setTokenUsage(null)
    setTotalTokenUsage({
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
    })

    if (storageKey) {
      localStorage.removeItem(storageKey)
    }
  }, [storageKey])

  /**
   * 특정 메시지 삭제
   */
  const deleteMessage = useCallback((messageId: string) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== messageId))
  }, [])

  /**
   * 마지막 메시지 재시도
   */
  const retryLastMessage = useCallback(async () => {
    // 마지막 사용자 메시지 찾기
    const lastUserMessageIndex = messages.findLastIndex((msg) => msg.role === 'user')
    if (lastUserMessageIndex === -1) return

    const lastUserMessage = messages[lastUserMessageIndex]

    // 마지막 사용자 메시지 이후의 메시지 삭제
    setMessages((prev) => prev.slice(0, lastUserMessageIndex))

    // 다시 전송
    await sendMessage(lastUserMessage.content)
  }, [messages, sendMessage])

  return {
    messages,
    sendMessage,
    clearMessages,
    deleteMessage,
    retryLastMessage,
    isLoading: mutation.isPending || isStreaming,
    isStreaming,
    error,
    tokenUsage,
    totalTokenUsage,
  }
}

/**
 * 기본 내보내기
 */
export default useClaudeChat

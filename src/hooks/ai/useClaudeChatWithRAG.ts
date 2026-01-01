/**
 * useClaudeChatWithRAG Hook
 *
 * Claude 채팅에 RAG 컨텍스트를 통합한 React Hook
 * - 사용자 질문에 대해 자동으로 RAG 검색 수행
 * - 검색 결과를 Claude 프롬프트에 컨텍스트로 주입
 * - RAG 활성화/비활성화 토글 지원
 * - 메시지별 RAG 컨텍스트 추적
 *
 * @version 1.0.0
 */

import { useState, useCallback, useEffect } from 'react'
import { useClaudeChat, type ClaudeMessage, type UseClaudeChatOptions } from '@/hooks/ai/useClaudeChat'
import { useRAGSearch, type UseRAGSearchOptions } from '@/hooks/ai/useRAGSearch'
import type {
  RAGSearchResult,
  RAGSearchOptions,
  RAGContext,
  buildRAGContext,
} from '@/types/ai/rag.types'
import { buildRAGContext as buildContext } from '@/types/ai/rag.types'

// ============================================================================
// 타입 정의
// ============================================================================

/**
 * RAG 컨텍스트가 포함된 메시지
 */
export interface ClaudeMessageWithRAG extends ClaudeMessage {
  /** RAG 컨텍스트 (있는 경우) */
  ragContext?: RAGContext
}

/**
 * useClaudeChatWithRAG 훅 옵션
 */
export interface UseClaudeChatWithRAGOptions extends UseClaudeChatOptions {
  /** RAG 활성화 여부 */
  ragEnabled?: boolean
  /** 서비스 ID 필터 */
  ragServiceId?: string
  /** 검색 결과 수 */
  ragLimit?: number
  /** 유사도 임계값 */
  ragThreshold?: number
  /** 대화 ID */
  conversationId?: string
  /** 컨텍스트 주입 방식 */
  contextInjectionMode?: 'prefix' | 'system' | 'both'
  /** 최대 컨텍스트 토큰 */
  maxContextTokens?: number
}

/**
 * useClaudeChatWithRAG 훅 반환 타입
 */
export interface UseClaudeChatWithRAGReturn {
  // 기존 채팅 기능
  /** 메시지 목록 (RAG 컨텍스트 포함) */
  messages: ClaudeMessageWithRAG[]
  /** 로딩 상태 */
  isLoading: boolean
  /** 에러 */
  error: Error | null

  // RAG 기능
  /** RAG 검색 결과 */
  ragResults: RAGSearchResult[]
  /** RAG 검색 중 */
  isSearchingRAG: boolean
  /** RAG 활성화 여부 */
  ragEnabled: boolean

  // 메서드
  /** RAG와 함께 메시지 전송 */
  sendMessageWithRAG: (message: string) => Promise<void>
  /** RAG 토글 */
  toggleRAG: (enabled: boolean) => void
  /** 메시지 초기화 */
  clearMessages: () => void
  /** 특정 메시지의 RAG 컨텍스트 가져오기 */
  getMessageRAGContext: (messageId: string) => RAGContext | undefined
}

// ============================================================================
// 상수
// ============================================================================

const DEFAULT_RAG_LIMIT = 5
const DEFAULT_RAG_THRESHOLD = 0.7
const DEFAULT_MAX_CONTEXT_TOKENS = 4000
const DEFAULT_CONTEXT_INJECTION_MODE = 'both'

// ============================================================================
// 유틸리티 함수
// ============================================================================

/**
 * RAG 컨텍스트를 시스템 프롬프트에 추가
 */
function injectContextToSystem(
  originalSystem: string,
  ragContext: RAGContext
): string {
  const contextSection = `

## 참고 문서 (RAG 컨텍스트)

다음은 사용자의 질문과 관련된 문서입니다. 이 정보를 참고하여 답변하세요.

${ragContext.context}

---

위 문서를 기반으로 답변하되, 정보가 부족하면 일반적인 지식을 활용해도 좋습니다.
`

  return originalSystem + contextSection
}

/**
 * RAG 컨텍스트를 사용자 메시지 앞에 추가
 */
function injectContextToMessage(
  originalMessage: string,
  ragContext: RAGContext
): string {
  const contextSection = `[참고 문서]
${ragContext.context}

---

위 문서를 참고하여 다음 질문에 답해주세요:

${originalMessage}
`

  return contextSection
}

// ============================================================================
// 메인 훅
// ============================================================================

/**
 * useClaudeChatWithRAG Hook
 *
 * @example
 * // 기본 사용
 * const {
 *   messages,
 *   sendMessageWithRAG,
 *   ragResults,
 *   ragEnabled,
 *   toggleRAG,
 * } = useClaudeChatWithRAG({
 *   ragEnabled: true,
 *   ragServiceId: 'minu-find',
 * })
 *
 * // RAG와 함께 메시지 전송
 * await sendMessageWithRAG('프로젝트 관리 방법은?')
 *
 * @example
 * // RAG 토글
 * <Button onClick={() => toggleRAG(!ragEnabled)}>
 *   RAG {ragEnabled ? '비활성화' : '활성화'}
 * </Button>
 */
export function useClaudeChatWithRAG(
  options: UseClaudeChatWithRAGOptions = {}
): UseClaudeChatWithRAGReturn {
  const {
    ragEnabled: initialRagEnabled = true,
    ragServiceId,
    ragLimit = DEFAULT_RAG_LIMIT,
    ragThreshold = DEFAULT_RAG_THRESHOLD,
    conversationId,
    contextInjectionMode = DEFAULT_CONTEXT_INJECTION_MODE,
    maxContextTokens = DEFAULT_MAX_CONTEXT_TOKENS,
    systemPrompt,
    ...claudeChatOptions
  } = options

  // 상태
  const [ragEnabled, setRagEnabled] = useState(initialRagEnabled)
  const [messagesWithRAG, setMessagesWithRAG] = useState<ClaudeMessageWithRAG[]>([])
  const [currentRAGContext, setCurrentRAGContext] = useState<RAGContext | null>(null)

  // Claude 채팅 훅
  const {
    messages,
    sendMessage,
    clearMessages: clearChatMessages,
    isLoading: isChatLoading,
    error: chatError,
  } = useClaudeChat({
    ...claudeChatOptions,
    systemPrompt,
  })

  // RAG 검색 훅
  const {
    results: ragResults,
    isSearching: isSearchingRAG,
    error: ragError,
    search: searchRAG,
    clearResults: clearRAGResults,
  } = useRAGSearch({
    serviceId: ragServiceId,
    limit: ragLimit,
    threshold: ragThreshold,
  })

  // 메시지 동기화 (Claude 메시지 → RAG 메시지)
  useEffect(() => {
    setMessagesWithRAG((prev) => {
      // 기존 RAG 컨텍스트 보존
      const contextMap = new Map(
        prev.map((msg) => [msg.id, msg.ragContext])
      )

      return messages.map((msg) => ({
        ...msg,
        ragContext: contextMap.get(msg.id),
      }))
    })
  }, [messages])

  /**
   * RAG 토글
   */
  const toggleRAG = useCallback((enabled: boolean) => {
    setRagEnabled(enabled)
  }, [])

  /**
   * RAG와 함께 메시지 전송
   */
  const sendMessageWithRAG = useCallback(
    async (message: string) => {
      if (!message.trim()) return

      // RAG가 비활성화된 경우 일반 채팅
      if (!ragEnabled) {
        await sendMessage(message)
        return
      }

      try {
        // 1. RAG 검색 수행
        const searchResults = await searchRAG(message, {
          serviceId: ragServiceId,
          limit: ragLimit,
          minSimilarity: ragThreshold,
        })

        // 2. RAG 컨텍스트 빌드
        const ragContext = buildContext(searchResults, {
          maxTokens: maxContextTokens,
        })

        setCurrentRAGContext(ragContext)

        // 3. 컨텍스트 주입
        let finalMessage = message
        let finalSystemPrompt = systemPrompt

        if (contextInjectionMode === 'prefix' || contextInjectionMode === 'both') {
          finalMessage = injectContextToMessage(message, ragContext)
        }

        if (contextInjectionMode === 'system' || contextInjectionMode === 'both') {
          finalSystemPrompt = injectContextToSystem(
            systemPrompt || '',
            ragContext
          )
        }

        // 4. Claude에게 메시지 전송
        await sendMessage(finalMessage, {
          system: finalSystemPrompt,
        })

        // 5. 현재 메시지에 RAG 컨텍스트 저장
        setMessagesWithRAG((prev) => {
          const lastUserMsg = prev.findLast((msg) => msg.role === 'user')
          if (lastUserMsg) {
            return prev.map((msg) =>
              msg.id === lastUserMsg.id
                ? { ...msg, ragContext }
                : msg
            )
          }
          return prev
        })
      } catch (err) {
        // RAG 실패 시에도 일반 채팅 진행
        console.error('RAG 검색 실패, 일반 채팅으로 진행:', err)
        await sendMessage(message)
      }
    },
    [
      ragEnabled,
      searchRAG,
      ragServiceId,
      ragLimit,
      ragThreshold,
      maxContextTokens,
      contextInjectionMode,
      systemPrompt,
      sendMessage,
    ]
  )

  /**
   * 메시지 초기화
   */
  const clearMessages = useCallback(() => {
    clearChatMessages()
    clearRAGResults()
    setMessagesWithRAG([])
    setCurrentRAGContext(null)
  }, [clearChatMessages, clearRAGResults])

  /**
   * 특정 메시지의 RAG 컨텍스트 가져오기
   */
  const getMessageRAGContext = useCallback(
    (messageId: string): RAGContext | undefined => {
      const message = messagesWithRAG.find((msg) => msg.id === messageId)
      return message?.ragContext
    },
    [messagesWithRAG]
  )

  return {
    // 기존 채팅 기능
    messages: messagesWithRAG,
    isLoading: isChatLoading || isSearchingRAG,
    error: chatError || ragError,

    // RAG 기능
    ragResults,
    isSearchingRAG,
    ragEnabled,

    // 메서드
    sendMessageWithRAG,
    toggleRAG,
    clearMessages,
    getMessageRAGContext,
  }
}

/**
 * 기본 내보내기
 */
export default useClaudeChatWithRAG

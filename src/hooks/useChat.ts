/**
 * useChat Hook
 *
 * AI 채팅 상태 관리
 * - 메시지 전송/수신
 * - 스트리밍 응답 처리
 * - 로컬 스토리지 저장
 * - 에러 핸들링
 */

import { useState, useEffect, useCallback } from 'react'
import {
  createChatCompletionStream,
  addSystemPrompt,
  limitContext,
  type ChatMessage,
} from '@/lib/openai'
import { devError } from '@/lib/errors'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: Date
}

export interface UseChatOptions {
  initialMessages?: Message[]
  storageKey?: string
}

export interface UseChatReturn {
  messages: Message[]
  sendMessage: (content: string) => Promise<void>
  clearMessages: () => void
  isLoading: boolean
  error: Error | null
}

// 로컬 스토리지 키
const DEFAULT_STORAGE_KEY = 'vibe-working-chat-messages'

/**
 * useChat Hook
 */
export function useChat(options: UseChatOptions = {}): UseChatReturn {
  const {
    initialMessages = [],
    storageKey = DEFAULT_STORAGE_KEY,
  } = options

  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // 로컬 스토리지에서 메시지 불러오기
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        const parsed = JSON.parse(stored) as Array<Omit<Message, 'createdAt'> & { createdAt: string }>
        const messagesWithDates = parsed.map((msg) => ({
          ...msg,
          createdAt: new Date(msg.createdAt),
        }))
        setMessages(messagesWithDates)
      }
    } catch (err) {
      devError(err, { operation: '로컬 스토리지에서 메시지 로드' })
    }
  }, [storageKey])

  // 메시지 변경 시 로컬 스토리지에 저장
  useEffect(() => {
    if (messages.length > 0) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(messages))
      } catch (err) {
        devError(err, { operation: '로컬 스토리지에 메시지 저장' })
      }
    }
  }, [messages, storageKey])

  /**
   * 메시지 전송
   */
  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return

      // 사용자 메시지 추가
      const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: content.trim(),
        createdAt: new Date(),
      }

      setMessages((prev) => [...prev, userMessage])
      setIsLoading(true)
      setError(null)

      try {
        // OpenAI API 메시지 형식으로 변환
        const apiMessages: ChatMessage[] = messages
          .concat(userMessage)
          .map((msg) => ({
            role: msg.role,
            content: msg.content,
          }))

        // 시스템 프롬프트 추가 및 컨텍스트 제한
        const messagesWithContext = limitContext(
          addSystemPrompt(apiMessages),
          20
        )

        // AI 응답 메시지 초기화
        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: '',
          createdAt: new Date(),
        }

        setMessages((prev) => [...prev, assistantMessage])

        // 스트리밍 응답 처리
        let fullContent = ''
        for await (const chunk of createChatCompletionStream({
          messages: messagesWithContext,
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
      } catch (err) {
        devError(err, { operation: '채팅 메시지 전송' })
        setError(
          err instanceof Error
            ? err
            : new Error('메시지 전송 중 오류가 발생했습니다.')
        )

        // 에러 메시지 추가
        const errorMessage: Message = {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content:
            '죄송합니다. 응답을 생성하는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
          createdAt: new Date(),
        }

        setMessages((prev) => [...prev, errorMessage])
      } finally {
        setIsLoading(false)
      }
    },
    [messages]
  )

  /**
   * 메시지 초기화
   */
  const clearMessages = useCallback(() => {
    setMessages([])
    localStorage.removeItem(storageKey)
  }, [storageKey])

  return {
    messages,
    sendMessage,
    clearMessages,
    isLoading,
    error,
  }
}

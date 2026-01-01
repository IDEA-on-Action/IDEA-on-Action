/**
 * ChatWindow Component
 *
 * 채팅 창 컨테이너
 * - 헤더 (제목, 닫기 버튼, 초기화 버튼)
 * - 메시지 목록 (스크롤)
 * - 입력 폼
 * - 로딩 상태
 */

import { useEffect, useRef } from 'react'
import { X, Trash2, Bot } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useTranslation } from 'react-i18next'
import { ChatMessage } from './ChatMessage'
import { ChatInput } from './ChatInput'
import { useChat } from '@/hooks/ai/useChat'

interface ChatWindowProps {
  onClose: () => void
}

export function ChatWindow({ onClose }: ChatWindowProps) {
  const { t } = useTranslation('common')
  const { messages, sendMessage, clearMessages, isLoading, error } = useChat()
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // 새 메시지 시 자동 스크롤
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector(
        '[data-radix-scroll-area-viewport]'
      )
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }, [messages])

  const handleClearMessages = () => {
    if (window.confirm(t('chat.confirmClear') || '대화 내역을 모두 삭제하시겠습니까?')) {
      clearMessages()
    }
  }

  return (
    <div className="fixed bottom-20 right-4 z-50 w-[380px] h-[600px] max-h-[80vh] bg-background border border-border rounded-lg shadow-2xl flex flex-col md:w-[400px] md:bottom-24">
      {/* 헤더 */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-gradient-to-r from-primary/10 to-accent/10">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-lg">
            {t('chat.title') || 'AI 어시스턴트'}
          </h3>
        </div>
        <div className="flex items-center gap-1">
          {/* 초기화 버튼 */}
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClearMessages}
              aria-label={t('chat.clear') || '대화 초기화'}
              className="h-8 w-8"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          {/* 닫기 버튼 */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label={t('common:buttons.close') || '닫기'}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 메시지 목록 */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
        {messages.length === 0 ? (
          // 빈 상태
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
            <Bot className="h-16 w-16 text-muted-foreground opacity-50" />
            <div className="space-y-2">
              <h4 className="font-semibold text-lg">
                {t('chat.welcome') || '안녕하세요! 👋'}
              </h4>
              <p className="text-sm text-muted-foreground max-w-xs">
                {t('chat.welcomeMessage') ||
                  'VIBE WORKING의 AI 어시스턴트입니다. 무엇을 도와드릴까요?'}
              </p>
            </div>
          </div>
        ) : (
          // 메시지 목록
          <div className="space-y-1">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}

            {/* 로딩 상태 */}
            {isLoading && (
              <div className="flex gap-3 mb-4">
                <div className="h-8 w-8 flex-shrink-0 rounded-full bg-secondary animate-pulse" />
                <div className="bg-secondary rounded-lg px-4 py-2">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                    <span
                      className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                      style={{ animationDelay: '0.1s' }}
                    />
                    <span
                      className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                      style={{ animationDelay: '0.2s' }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 에러 상태 */}
        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        )}
      </ScrollArea>

      {/* 입력 폼 */}
      <ChatInput onSend={sendMessage} disabled={isLoading} />
    </div>
  )
}

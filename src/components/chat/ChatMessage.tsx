/**
 * ChatMessage Component
 *
 * 채팅 메시지 아이템
 * - 역할별 정렬 (user: 우측, assistant: 좌측)
 * - 아바타 표시
 * - 마크다운 렌더링
 * - 타임스탬프
 */

import { User, Bot } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { format } from 'date-fns'
import { ko, enUS } from 'date-fns/locale'
import { useTranslation } from 'react-i18next'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Message } from '@/hooks/useChat'

interface ChatMessageProps {
  message: Message
}

export function ChatMessage({ message }: ChatMessageProps) {
  const { i18n } = useTranslation()
  const isUser = message.role === 'user'

  const dateLocale = i18n.language === 'ko' ? ko : enUS
  const timeFormat = i18n.language === 'ko' ? 'a h:mm' : 'h:mm a'

  return (
    <div
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} mb-4`}
    >
      {/* 아바타 */}
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarFallback
          className={
            isUser
              ? 'bg-gradient-primary text-white'
              : 'bg-secondary text-secondary-foreground'
          }
        >
          {isUser ? (
            <User className="h-4 w-4" />
          ) : (
            <Bot className="h-4 w-4" />
          )}
        </AvatarFallback>
      </Avatar>

      {/* 메시지 콘텐츠 */}
      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[80%]`}>
        {/* 메시지 버블 */}
        <div
          className={`rounded-lg px-4 py-2 ${
            isUser
              ? 'bg-gradient-primary text-white'
              : 'bg-secondary text-secondary-foreground'
          }`}
        >
          {isUser ? (
            // 사용자 메시지: 일반 텍스트
            <p className="text-sm whitespace-pre-wrap break-words">
              {message.content}
            </p>
          ) : (
            // AI 메시지: 마크다운 렌더링
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  // 링크 스타일
                  a: ({ node, ...props }) => (
                    <a
                      {...props}
                      className="text-primary underline hover:text-primary/80"
                      target="_blank"
                      rel="noopener noreferrer"
                    />
                  ),
                  // 코드 블록 스타일
                  code: ({ inline, ...props }: { inline?: boolean; [key: string]: unknown }) =>
                    inline ? (
                      <code
                        {...props}
                        className="bg-muted px-1 py-0.5 rounded text-xs font-mono"
                      />
                    ) : (
                      <code
                        {...props}
                        className="block bg-muted p-2 rounded text-xs font-mono overflow-x-auto"
                      />
                    ),
                  // 리스트 스타일
                  ul: ({ node, ...props }) => (
                    <ul {...props} className="list-disc list-inside space-y-1" />
                  ),
                  ol: ({ node, ...props }) => (
                    <ol {...props} className="list-decimal list-inside space-y-1" />
                  ),
                  // 단락 스타일
                  p: ({ node, ...props }) => (
                    <p {...props} className="mb-2 last:mb-0" />
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* 타임스탬프 */}
        <span className="text-xs text-muted-foreground mt-1">
          {format(message.createdAt, timeFormat, { locale: dateLocale })}
        </span>
      </div>
    </div>
  )
}

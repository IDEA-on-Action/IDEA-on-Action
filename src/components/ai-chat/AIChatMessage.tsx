import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AIChatMessage as MessageType } from '@/types/ai-chat-widget.types';

interface AIChatMessageProps {
  message: MessageType;
}

/**
 * AI 채팅 메시지 컴포넌트
 *
 * @description
 * 개별 메시지를 렌더링합니다. 사용자/AI를 구분하여 표시하며,
 * 마크다운 포맷을 지원합니다.
 */
export function AIChatMessage({ message }: AIChatMessageProps) {
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';

  const timestamp = useMemo(() => {
    const date = new Date(message.timestamp);
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [message.timestamp]);

  return (
    <div
      className={cn(
        'flex gap-3 px-4 py-3',
        isUser && 'flex-row-reverse',
        message.isStreaming && 'animate-pulse'
      )}
    >
      {/* 아바타 */}
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          isUser && 'bg-primary text-primary-foreground',
          isAssistant && 'bg-secondary text-secondary-foreground'
        )}
      >
        {isUser ? <User className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
      </div>

      {/* 메시지 내용 */}
      <div className={cn('flex flex-col gap-1 max-w-[80%]', isUser && 'items-end')}>
        <div
          className={cn(
            'rounded-lg px-4 py-2',
            isUser && 'bg-primary text-primary-foreground',
            isAssistant && 'bg-muted'
          )}
        >
          {isUser ? (
            <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  // 링크는 새 창에서 열기
                  a: ({ node, ...props }) => (
                    <a {...props} target="_blank" rel="noopener noreferrer" />
                  ),
                  // 코드 블록 스타일
                  code: ({ node, className, children, ...props }) => {
                    const isInline = !className;
                    return isInline ? (
                      <code
                        className="bg-muted px-1 py-0.5 rounded text-xs font-mono"
                        {...props}
                      >
                        {children}
                      </code>
                    ) : (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* 타임스탬프 */}
        <span className="text-xs text-muted-foreground px-1">{timestamp}</span>
      </div>
    </div>
  );
}

import { useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AIChatMessage } from './AIChatMessage';
import type { AIChatMessage as MessageType } from '@/types/ai-chat-widget.types';
import type { A2UIUserAction } from '@/lib/a2ui/types';

interface AIChatMessagesProps {
  messages: MessageType[];
  isLoading?: boolean;
  /** A2UI 액션 핸들러 */
  onA2UIAction?: (action: A2UIUserAction) => void;
}

/**
 * AI 채팅 메시지 목록 컴포넌트
 *
 * @description
 * 메시지 목록을 렌더링하고, 새 메시지가 추가되면 자동으로 스크롤합니다.
 * 로딩 중일 때는 타이핑 인디케이터를 표시합니다.
 */
export function AIChatMessages({ messages, isLoading = false, onA2UIAction }: AIChatMessagesProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 새 메시지 추가 시 자동 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-4">
        <div className="text-6xl">💬</div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-foreground">
            AI 어시스턴트에게 물어보세요
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            IDEA on Action의 서비스, 프로젝트, 기술 스택에 대해 궁금한 점을 물어보세요.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1 h-full" ref={scrollRef}>
      <div className="space-y-0">
        {messages.map((message) => (
          <AIChatMessage key={message.id} message={message} onA2UIAction={onA2UIAction} />
        ))}

        {/* 타이핑 인디케이터 */}
        {isLoading && (
          <div className="flex gap-3 px-4 py-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
            <div className="flex items-center gap-1 rounded-lg bg-muted px-4 py-2">
              <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" />
              <span
                className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce"
                style={{ animationDelay: '0.2s' }}
              />
              <span
                className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce"
                style={{ animationDelay: '0.4s' }}
              />
            </div>
          </div>
        )}

        {/* 자동 스크롤 앵커 */}
        <div ref={messagesEndRef} />
      </div>
    </ScrollArea>
  );
}

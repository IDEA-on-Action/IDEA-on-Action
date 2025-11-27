import { AIChatHeader } from './AIChatHeader';
import { AIChatMessages } from './AIChatMessages';
import { AIChatInput } from './AIChatInput';
import { AIChatToolStatus } from './AIChatToolStatus';
import type { AIChatMessage } from '@/types/ai-chat-widget.types';
import { cn } from '@/lib/utils';

interface AIChatWindowProps {
  messages: AIChatMessage[];
  isLoading: boolean;
  onClose: () => void;
  onNewChat: () => void;
  onSendMessage: (message: string) => void;
  position?: 'bottom-right' | 'bottom-left';
  /** 현재 실행 중인 도구 이름 (Tool Use 상태 표시) */
  executingTool?: string | null;
}

/**
 * AI 채팅창 컴포넌트
 *
 * @description
 * 채팅창의 레이아웃을 구성합니다. Header, Messages, Input을 포함합니다.
 */
export function AIChatWindow({
  messages,
  isLoading,
  onClose,
  onNewChat,
  onSendMessage,
  position = 'bottom-right',
  executingTool,
}: AIChatWindowProps) {
  return (
    <div
      className={cn(
        'fixed z-50 flex flex-col',
        'h-[600px] w-[400px]',
        'bg-background border rounded-lg shadow-2xl',
        'animate-in slide-in-from-bottom-4 duration-300',
        position === 'bottom-right' ? 'bottom-24 right-6' : 'bottom-24 left-6'
      )}
    >
      {/* 헤더 */}
      <AIChatHeader onClose={onClose} onNewChat={onNewChat} />

      {/* 메시지 목록 */}
      <AIChatMessages messages={messages} isLoading={isLoading} />

      {/* 도구 실행 상태 */}
      <AIChatToolStatus toolName={executingTool ?? null} />

      {/* 입력창 */}
      <AIChatInput onSend={onSendMessage} disabled={isLoading || !!executingTool} />
    </div>
  );
}

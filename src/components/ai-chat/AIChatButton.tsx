import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AIChatButtonProps {
  onClick: () => void;
  position?: 'bottom-right' | 'bottom-left';
  hasUnread?: boolean;
}

/**
 * AI 채팅 플로팅 버튼
 *
 * @description
 * 화면 우하단(또는 좌하단)에 고정된 플로팅 버튼입니다.
 * 클릭 시 채팅창을 열고, 읽지 않은 메시지가 있을 경우 배지를 표시합니다.
 */
export function AIChatButton({
  onClick,
  position = 'bottom-right',
  hasUnread = false,
}: AIChatButtonProps) {
  return (
    <Button
      onClick={onClick}
      size="lg"
      className={cn(
        'fixed z-50 h-14 w-14 rounded-full shadow-lg transition-all duration-300',
        'hover:scale-110 hover:shadow-xl',
        'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        position === 'bottom-right' ? 'bottom-6 right-6' : 'bottom-6 left-6'
      )}
      aria-label="AI 채팅 열기"
    >
      <MessageCircle className="h-6 w-6" />
      {hasUnread && (
        <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-destructive animate-pulse" />
      )}
    </Button>
  );
}

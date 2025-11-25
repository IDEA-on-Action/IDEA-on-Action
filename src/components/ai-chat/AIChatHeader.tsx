import { X, RotateCcw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AIChatHeaderProps {
  onClose: () => void;
  onNewChat: () => void;
  title?: string;
}

/**
 * AI 채팅 헤더 컴포넌트
 *
 * @description
 * 채팅창 상단 헤더입니다. 제목, 새 대화 버튼, 닫기 버튼을 포함합니다.
 */
export function AIChatHeader({
  onClose,
  onNewChat,
  title = 'AI 어시스턴트',
}: AIChatHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-2 px-4 py-3 border-b bg-background">
      {/* 제목 */}
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground">항상 도와드릴 준비가 되어 있습니다</p>
        </div>
      </div>

      {/* 액션 버튼 */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={onNewChat}
          className="h-8 w-8"
          aria-label="새 대화"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8"
          aria-label="닫기"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

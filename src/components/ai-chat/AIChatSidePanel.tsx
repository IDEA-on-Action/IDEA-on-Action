/**
 * AI 채팅 사이드 패널
 *
 * A2UI Surface를 사이드 패널에 렌더링합니다.
 * 상세 정보, 폼, 대시보드 등을 표시하는 데 사용됩니다.
 */

import { useCallback } from 'react';
import { X } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { A2UIRenderer } from '@/lib/a2ui/renderer';
import type { A2UIMessage, A2UIUserAction } from '@/lib/a2ui/types';
import { cn } from '@/lib/utils';

export type SidePanelSize = 'sm' | 'md' | 'lg' | 'xl';

interface AIChatSidePanelProps {
  /** 패널 열림 여부 */
  isOpen: boolean;
  /** 패널 닫기 핸들러 */
  onClose: () => void;
  /** A2UI 메시지 */
  message: A2UIMessage | null;
  /** 패널 제목 */
  title?: string;
  /** 패널 크기 */
  size?: SidePanelSize;
  /** A2UI 액션 핸들러 */
  onAction?: (action: A2UIUserAction) => void;
}

const sizeStyles: Record<SidePanelSize, string> = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
  xl: 'sm:max-w-xl',
};

/**
 * AI 채팅 사이드 패널
 *
 * @description
 * 채팅창 옆에 슬라이드로 열리는 사이드 패널입니다.
 * A2UI 메시지를 렌더링하여 상세 정보, 폼 등을 표시합니다.
 */
export function AIChatSidePanel({
  isOpen,
  onClose,
  message,
  title = '상세 정보',
  size = 'md',
  onAction,
}: AIChatSidePanelProps) {
  const handleAction = useCallback(
    (action: A2UIUserAction) => {
      console.log('[AIChatSidePanel] 액션:', action);

      // dismiss 액션 시 패널 닫기
      if (action.action === 'dismiss' || action.action === 'cancel') {
        onClose();
        return;
      }

      if (onAction) {
        onAction(action);
      }
    },
    [onAction, onClose]
  );

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className={cn('flex flex-col p-0', sizeStyles[size])}
      >
        {/* 헤더 */}
        <SheetHeader className="flex-shrink-0 border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-base font-semibold">{title}</SheetTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">닫기</span>
            </Button>
          </div>
        </SheetHeader>

        {/* 콘텐츠 */}
        <ScrollArea className="flex-1">
          <div className="p-4">
            {message ? (
              <A2UIRenderer message={message} onAction={handleAction} />
            ) : (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                콘텐츠가 없습니다.
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

export default AIChatSidePanel;

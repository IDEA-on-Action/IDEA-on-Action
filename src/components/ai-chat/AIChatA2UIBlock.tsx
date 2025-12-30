/**
 * AI 채팅 A2UI 블록 컴포넌트
 *
 * A2UI 메시지를 렌더링하는 블록 컴포넌트입니다.
 */

import { useCallback } from 'react';
import { A2UIRenderer } from '@/lib/a2ui/renderer';
import type { A2UIMessage, A2UIUserAction } from '@/lib/a2ui/types';
import { cn } from '@/lib/utils';

interface AIChatA2UIBlockProps {
  /** A2UI 메시지 */
  message: A2UIMessage;
  /** 액션 핸들러 */
  onAction?: (action: A2UIUserAction) => void;
  /** 추가 클래스명 */
  className?: string;
}

/**
 * AI 채팅 A2UI 블록
 *
 * @description
 * A2UI 메시지를 렌더링합니다. 버튼 클릭 등의 액션은
 * onAction 콜백을 통해 부모 컴포넌트로 전달됩니다.
 */
export function AIChatA2UIBlock({ message, onAction, className }: AIChatA2UIBlockProps) {
  const handleAction = useCallback(
    (action: A2UIUserAction) => {
      console.log('[AIChatA2UIBlock] 액션:', action);

      if (onAction) {
        onAction(action);
      }
    },
    [onAction]
  );

  return (
    <div className={cn('a2ui-block rounded-lg border bg-card p-4', className)}>
      <A2UIRenderer message={message} onAction={handleAction} />
    </div>
  );
}

export default AIChatA2UIBlock;

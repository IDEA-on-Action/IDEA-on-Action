/**
 * A2UI ListItem 컴포넌트
 * 리스트 아이템
 */

import { useCallback } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { A2UIActionHandler } from '../../types';

export interface A2UIListItemProps {
  /** 제목 */
  title?: string;
  /** 설명 */
  description?: string;
  /** 왼쪽 아이콘/이미지 (이모지 또는 텍스트) */
  leading?: string;
  /** 오른쪽 보조 텍스트 */
  trailing?: string;
  /** 클릭 가능 여부 */
  clickable?: boolean;
  /** 클릭 시 액션 */
  onClick?: {
    action: string;
    data?: Record<string, unknown>;
  };
  /** 비활성화 */
  disabled?: boolean;
}

interface Props extends A2UIListItemProps {
  className?: string;
  onAction?: A2UIActionHandler;
}

export function A2UIListItem({
  title,
  description,
  leading,
  trailing,
  clickable = false,
  onClick,
  disabled = false,
  className,
  onAction,
}: Props) {
  const handleClick = useCallback(() => {
    if (disabled || !onClick || !onAction) return;

    onAction({
      action: onClick.action,
      data: onClick.data,
    });
  }, [disabled, onClick, onAction]);

  const isClickable = clickable && onClick && !disabled;

  return (
    <div
      role="listitem"
      className={cn(
        'flex items-center gap-3 px-4 py-3',
        isClickable && 'cursor-pointer hover:bg-muted/50 transition-colors',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      onClick={isClickable ? handleClick : undefined}
    >
      {/* Leading (아이콘/이미지) */}
      {leading && (
        <div className="flex-shrink-0 text-2xl">
          {leading}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        {title && (
          <div className="font-medium text-sm truncate">
            {title}
          </div>
        )}
        {description && (
          <div className="text-sm text-muted-foreground truncate">
            {description}
          </div>
        )}
      </div>

      {/* Trailing */}
      {trailing && (
        <div className="flex-shrink-0 text-sm text-muted-foreground">
          {trailing}
        </div>
      )}

      {/* Chevron for clickable items */}
      {isClickable && (
        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      )}
    </div>
  );
}

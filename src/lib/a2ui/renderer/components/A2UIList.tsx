/**
 * A2UI List 컴포넌트
 * 리스트 컨테이너
 */

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface A2UIListProps {
  /** 리스트 스타일 */
  variant?: 'default' | 'bordered' | 'separated';
  /** 간격 */
  gap?: 'none' | 'sm' | 'md' | 'lg';
}

interface Props extends A2UIListProps {
  className?: string;
  /** 렌더링된 자식 컴포넌트 */
  renderedChildren?: ReactNode;
}

const gapStyles = {
  none: 'gap-0',
  sm: 'gap-1',
  md: 'gap-2',
  lg: 'gap-4',
};

const variantStyles = {
  default: '',
  bordered: 'border rounded-lg',
  separated: 'divide-y',
};

export function A2UIList({
  variant = 'default',
  gap = 'sm',
  className,
  renderedChildren,
}: Props) {
  return (
    <div
      className={cn(
        'flex flex-col',
        gapStyles[gap],
        variantStyles[variant],
        className
      )}
      role="list"
    >
      {renderedChildren}
    </div>
  );
}

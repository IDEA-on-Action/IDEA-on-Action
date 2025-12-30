/**
 * A2UI Column 컴포넌트 (세로 레이아웃)
 */

import { cn } from '@/lib/utils';
import type { A2UIColumnProps } from '../../types';
import type { ReactNode } from 'react';

interface Props extends A2UIColumnProps {
  className?: string;
  renderedChildren?: ReactNode;
}

const gapStyles: Record<string, string> = {
  none: 'gap-0',
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
};

const alignStyles: Record<string, string> = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
};

export function A2UIColumn({
  gap = 'md',
  align = 'start',
  className,
  renderedChildren,
}: Props) {
  return (
    <div
      className={cn(
        'flex flex-col w-full',
        gapStyles[gap],
        alignStyles[align],
        className
      )}
    >
      {renderedChildren}
    </div>
  );
}

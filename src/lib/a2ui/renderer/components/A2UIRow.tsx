/**
 * A2UI Row 컴포넌트 (가로 레이아웃)
 */

import { cn } from '@/lib/utils';
import type { A2UIRowProps } from '../../types';
import type { ReactNode } from 'react';

interface Props extends A2UIRowProps {
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

const justifyStyles: Record<string, string> = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
};

export function A2UIRow({
  gap = 'md',
  align = 'center',
  justify = 'start',
  className,
  renderedChildren,
}: Props) {
  return (
    <div
      className={cn(
        'flex flex-row flex-wrap',
        gapStyles[gap],
        alignStyles[align],
        justifyStyles[justify],
        className
      )}
    >
      {renderedChildren}
    </div>
  );
}

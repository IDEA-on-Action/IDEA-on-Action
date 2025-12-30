/**
 * A2UI Separator 컴포넌트
 */

import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { A2UISeparatorProps } from '../../types';

interface Props extends A2UISeparatorProps {
  className?: string;
}

export function A2UISeparator({
  orientation = 'horizontal',
  className,
}: Props) {
  return (
    <Separator
      orientation={orientation}
      className={cn(
        orientation === 'horizontal' ? 'my-2' : 'mx-2',
        className
      )}
    />
  );
}

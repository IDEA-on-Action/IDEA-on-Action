/**
 * A2UI Badge 컴포넌트
 */

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { A2UIBadgeProps } from '../../types';

interface Props extends A2UIBadgeProps {
  className?: string;
}

// 커스텀 variant 스타일 (shadcn/ui에 없는 것들)
const customVariantStyles: Record<string, string> = {
  success: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-100',
  warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 hover:bg-yellow-100',
};

export function A2UIBadge({ text, variant = 'default', className }: Props) {
  // 커스텀 variant 처리
  if (variant === 'success' || variant === 'warning') {
    return (
      <span
        className={cn(
          'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
          customVariantStyles[variant],
          className
        )}
      >
        {text}
      </span>
    );
  }

  // 기본 shadcn/ui Badge 사용
  return (
    <Badge
      variant={variant as 'default' | 'secondary' | 'outline' | 'destructive'}
      className={cn(className)}
    >
      {text}
    </Badge>
  );
}

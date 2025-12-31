/**
 * A2UI Spinner 컴포넌트
 * 로딩 스피너
 */

import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface A2UISpinnerProps {
  /** 크기 */
  size?: 'sm' | 'md' | 'lg';
  /** 레이블 텍스트 */
  label?: string;
  /** 중앙 정렬 여부 */
  centered?: boolean;
}

interface Props extends A2UISpinnerProps {
  className?: string;
}

const sizeStyles = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
};

export function A2UISpinner({
  size = 'md',
  label,
  centered = false,
  className,
}: Props) {
  return (
    <div
      className={cn(
        'flex items-center gap-2',
        centered && 'justify-center',
        className
      )}
      role="status"
      aria-label={label || '로딩 중'}
    >
      <Loader2 className={cn('animate-spin text-muted-foreground', sizeStyles[size])} />
      {label && (
        <span className="text-sm text-muted-foreground">{label}</span>
      )}
    </div>
  );
}

/**
 * A2UI StreamingIndicator 컴포넌트
 * 스트리밍 진행 상태를 시각적으로 표시
 */

import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export interface A2UIStreamingIndicatorProps {
  /** 스트리밍 진행 중 여부 */
  isStreaming?: boolean;
  /** 진행률 (0-100) */
  progress?: number;
  /** 표시 텍스트 */
  label?: string;
  /** 표시 variant */
  variant?: 'spinner' | 'dots' | 'progress' | 'pulse';
  /** 크기 */
  size?: 'sm' | 'md' | 'lg';
}

interface Props extends A2UIStreamingIndicatorProps {
  className?: string;
}

const sizeStyles = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
};

const textSizeStyles = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
};

export function A2UIStreamingIndicator({
  isStreaming = true,
  progress,
  label,
  variant = 'dots',
  size = 'md',
  className,
}: Props) {
  if (!isStreaming) return null;

  // 스피너 variant
  if (variant === 'spinner') {
    return (
      <div className={cn('flex items-center gap-2 text-muted-foreground', className)}>
        <Loader2 className={cn('animate-spin', sizeStyles[size])} />
        {label && <span className={textSizeStyles[size]}>{label}</span>}
      </div>
    );
  }

  // 점 애니메이션 variant
  if (variant === 'dots') {
    return (
      <div className={cn('flex items-center gap-2 text-muted-foreground', className)}>
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={cn(
                'rounded-full bg-current animate-bounce',
                size === 'sm' ? 'h-1 w-1' : size === 'md' ? 'h-1.5 w-1.5' : 'h-2 w-2'
              )}
              style={{
                animationDelay: `${i * 0.15}s`,
                animationDuration: '0.6s',
              }}
            />
          ))}
        </div>
        {label && <span className={textSizeStyles[size]}>{label}</span>}
      </div>
    );
  }

  // 진행률 바 variant
  if (variant === 'progress') {
    return (
      <div className={cn('space-y-1', className)}>
        {label && (
          <div className={cn('flex justify-between text-muted-foreground', textSizeStyles[size])}>
            <span>{label}</span>
            {progress !== undefined && <span>{progress}%</span>}
          </div>
        )}
        <div
          className={cn(
            'w-full rounded-full bg-muted overflow-hidden',
            size === 'sm' ? 'h-1' : size === 'md' ? 'h-1.5' : 'h-2'
          )}
        >
          <div
            className="h-full bg-primary transition-all duration-300 ease-out"
            style={{ width: `${progress ?? 0}%` }}
          />
        </div>
      </div>
    );
  }

  // 펄스 variant
  if (variant === 'pulse') {
    return (
      <div className={cn('flex items-center gap-2 text-muted-foreground', className)}>
        <span
          className={cn(
            'rounded-full bg-primary animate-pulse',
            size === 'sm' ? 'h-2 w-2' : size === 'md' ? 'h-2.5 w-2.5' : 'h-3 w-3'
          )}
        />
        {label && <span className={textSizeStyles[size]}>{label}</span>}
      </div>
    );
  }

  return null;
}

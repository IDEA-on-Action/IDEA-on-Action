/**
 * A2UI Progress 컴포넌트
 * 진행률 표시 바
 */

import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

export interface A2UIProgressProps {
  /** 진행률 (0-100) */
  value?: number;
  /** 최대값 */
  max?: number;
  /** 레이블 텍스트 */
  label?: string;
  /** 퍼센트 표시 여부 */
  showPercent?: boolean;
  /** 크기 */
  size?: 'sm' | 'md' | 'lg';
  /** 색상 변형 */
  variant?: 'default' | 'success' | 'warning' | 'destructive';
}

interface Props extends A2UIProgressProps {
  className?: string;
}

const sizeStyles = {
  sm: 'h-2',
  md: 'h-4',
  lg: 'h-6',
};

const variantStyles = {
  default: '[&>div]:bg-primary',
  success: '[&>div]:bg-green-500',
  warning: '[&>div]:bg-yellow-500',
  destructive: '[&>div]:bg-destructive',
};

export function A2UIProgress({
  value = 0,
  max = 100,
  label,
  showPercent = false,
  size = 'md',
  variant = 'default',
  className,
}: Props) {
  // 퍼센트 계산
  const percent = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={cn('space-y-2', className)}>
      {(label || showPercent) && (
        <div className="flex items-center justify-between text-sm">
          {label && <span className="text-muted-foreground">{label}</span>}
          {showPercent && (
            <span className="font-medium">{Math.round(percent)}%</span>
          )}
        </div>
      )}
      <Progress
        value={percent}
        className={cn(sizeStyles[size], variantStyles[variant])}
      />
    </div>
  );
}

/**
 * A2UI Skeleton 컴포넌트
 * 스켈레톤 로딩 플레이스홀더
 */

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export interface A2UISkeletonProps {
  /** 스켈레톤 유형 */
  variant?: 'text' | 'circular' | 'rectangular' | 'card';
  /** 너비 */
  width?: string;
  /** 높이 */
  height?: string;
  /** 라인 수 (text 유형일 때) */
  lines?: number;
  /** 애니메이션 비활성화 */
  noAnimation?: boolean;
}

interface Props extends A2UISkeletonProps {
  className?: string;
}

export function A2UISkeleton({
  variant = 'text',
  width,
  height,
  lines = 1,
  noAnimation = false,
  className,
}: Props) {
  const baseStyles = cn(
    noAnimation && 'animate-none',
    className
  );

  // 카드 스켈레톤
  if (variant === 'card') {
    return (
      <div className={cn('space-y-3 rounded-lg border p-4', baseStyles)}>
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  // 원형 스켈레톤
  if (variant === 'circular') {
    return (
      <Skeleton
        className={cn('rounded-full', baseStyles)}
        style={{
          width: width || '40px',
          height: height || '40px',
        }}
      />
    );
  }

  // 사각형 스켈레톤
  if (variant === 'rectangular') {
    return (
      <Skeleton
        className={cn('rounded-md', baseStyles)}
        style={{
          width: width || '100%',
          height: height || '100px',
        }}
      />
    );
  }

  // 텍스트 스켈레톤 (기본)
  if (lines === 1) {
    return (
      <Skeleton
        className={cn('h-4', baseStyles)}
        style={{ width: width || '100%' }}
      />
    );
  }

  // 여러 줄 텍스트 스켈레톤
  return (
    <div className={cn('space-y-2', baseStyles)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-4"
          style={{
            width: i === lines - 1 ? '60%' : width || '100%',
          }}
        />
      ))}
    </div>
  );
}

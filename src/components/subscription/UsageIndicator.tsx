/**
 * 기능별 사용량 표시 컴포넌트
 *
 * @description 프로그레스 바로 사용량을 시각화
 */

import React from 'react';
import { useCanAccess } from '@/hooks/subscription/useCanAccess';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/**
 * UsageIndicator 컴포넌트 Props
 */
interface UsageIndicatorProps {
  /** 기능 키 */
  feature_key: string;
  /** 라벨 표시 여부 */
  showLabel?: boolean;
  /** 크기 */
  size?: 'sm' | 'md' | 'lg';
  /** 커스텀 클래스명 */
  className?: string;
}

/**
 * 크기별 스타일
 */
const SIZE_STYLES = {
  sm: {
    progress: 'h-1',
    text: 'text-xs',
  },
  md: {
    progress: 'h-2',
    text: 'text-sm',
  },
  lg: {
    progress: 'h-3',
    text: 'text-base',
  },
};

/**
 * 사용률에 따른 색상 계산
 *
 * - 0~50%: 초록 (bg-green-500)
 * - 50~90%: 노랑 (bg-yellow-500)
 * - 90~100%: 빨강 (bg-red-500)
 */
function getUsageColor(percentage: number): string {
  if (percentage < 50) return 'bg-green-500';
  if (percentage < 90) return 'bg-yellow-500';
  return 'bg-red-500';
}

/**
 * 기능별 사용량 표시 컴포넌트
 *
 * @example
 * ```tsx
 * // 기본 사용
 * <UsageIndicator feature_key="api_calls" />
 *
 * // 라벨 표시
 * <UsageIndicator feature_key="storage_gb" showLabel />
 *
 * // 크기 조절
 * <UsageIndicator feature_key="team_members" size="lg" showLabel />
 * ```
 */
export function UsageIndicator({
  feature_key,
  showLabel = false,
  size = 'md',
  className,
}: UsageIndicatorProps) {
  const { remaining, limit, isUnlimited, isLoading } = useCanAccess(feature_key);

  const styles = SIZE_STYLES[size];

  // 로딩 중
  if (isLoading) {
    return (
      <div className={cn('space-y-1', className)}>
        {showLabel && <Skeleton className={cn('h-4 w-24', styles.text)} />}
        <Skeleton className={cn('w-full', styles.progress)} />
      </div>
    );
  }

  // 무제한
  if (isUnlimited) {
    return (
      <div className={cn('space-y-1', className)}>
        {showLabel && (
          <div className={cn('flex items-center justify-between', styles.text)}>
            <span className="text-muted-foreground">사용량</span>
            <span className="font-medium">무제한</span>
          </div>
        )}
        <div className={cn('flex items-center gap-2', styles.progress)}>
          <span className="text-2xl">∞</span>
        </div>
      </div>
    );
  }

  // 사용량 계산
  const used = limit - remaining;
  const percentage = limit > 0 ? (used / limit) * 100 : 0;
  const progressValue = Math.min(100, Math.max(0, percentage));
  const progressColor = getUsageColor(percentage);

  return (
    <div className={cn('space-y-1', className)}>
      {showLabel && (
        <div className={cn('flex items-center justify-between', styles.text)}>
          <span className="text-muted-foreground">사용량</span>
          <span className="font-medium">
            {used.toLocaleString()} / {limit.toLocaleString()}
          </span>
        </div>
      )}
      <div className="relative">
        <Progress
          value={progressValue}
          className={cn(styles.progress)}
          aria-label={`${feature_key} 사용량: ${percentage.toFixed(1)}%`}
        />
        {/* 색상 오버레이 */}
        <div
          className={cn(
            'absolute top-0 left-0 rounded-full transition-all',
            styles.progress,
            progressColor
          )}
          style={{ width: `${progressValue}%` }}
        />
      </div>
      {showLabel && percentage >= 90 && (
        <p className="text-xs text-red-600 dark:text-red-400">
          ⚠️ 사용량이 제한에 근접했습니다
        </p>
      )}
    </div>
  );
}

export default UsageIndicator;

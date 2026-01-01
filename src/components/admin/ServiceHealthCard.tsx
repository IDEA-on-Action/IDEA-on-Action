/**
 * ServiceHealthCard 컴포넌트 (Admin)
 *
 * 관리자 대시보드용 개별 서비스 상태 카드
 * Minu 서비스(Find, Frame, Build, Keep)의 헬스 상태를 상세하게 표시합니다.
 *
 * @module components/admin/ServiceHealthCard
 */

import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Activity,
  Clock,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { HealthStatus, HealthMetrics } from '@/types/services/central-hub.types';

// ============================================================================
// 타입 정의
// ============================================================================

export interface ServiceHealthCardProps {
  /** 서비스 이름 */
  serviceName: string;
  /** 서비스 설명 */
  serviceDescription: string;
  /** 헬스 상태 */
  status: HealthStatus;
  /** 마지막 통신 시간 (ISO 문자열) */
  lastPing?: string;
  /** 24시간 가동률 (0-100) */
  uptimePercent?: number;
  /** 요청 수 */
  requestCount?: number;
  /** 에러율 (0-1) */
  errorRate?: number;
  /** 메트릭 데이터 */
  metrics?: HealthMetrics;
  /** 로딩 상태 */
  isLoading?: boolean;
  /** 추가 CSS 클래스 */
  className?: string;
}

// ============================================================================
// 상수
// ============================================================================

/** 상태별 스타일 설정 */
const STATUS_CONFIG: Record<HealthStatus, {
  icon: React.ComponentType<{ className?: string }>;
  borderColor: string;
  badgeClass: string;
  label: string;
  dotClass: string;
}> = {
  healthy: {
    icon: CheckCircle2,
    borderColor: 'border-l-green-500',
    badgeClass: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    label: '정상',
    dotClass: 'bg-green-500',
  },
  degraded: {
    icon: AlertTriangle,
    borderColor: 'border-l-yellow-500',
    badgeClass: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    label: '주의',
    dotClass: 'bg-yellow-500',
  },
  unhealthy: {
    icon: XCircle,
    borderColor: 'border-l-red-500',
    badgeClass: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    label: '장애',
    dotClass: 'bg-red-500',
  },
  unknown: {
    icon: HelpCircle,
    borderColor: 'border-l-gray-500',
    badgeClass: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
    label: '알 수 없음',
    dotClass: 'bg-gray-500',
  },
};

// ============================================================================
// 유틸리티 함수
// ============================================================================

/**
 * 상대 시간 포맷 (방금, 5분 전, 1시간 전 등)
 */
function formatRelativeTime(dateString?: string): string {
  if (!dateString) return '연결 없음';

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);

  if (diffSec < 60) {
    return '방금';
  } else if (diffMin < 60) {
    return `${diffMin}분 전`;
  } else if (diffHour < 24) {
    return `${diffHour}시간 전`;
  } else {
    return date.toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}

/**
 * 숫자 포맷 (1000 -> 1K, 1000000 -> 1M)
 */
function formatNumber(num?: number): string {
  if (num === undefined || num === null) return '-';
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

// ============================================================================
// 서브 컴포넌트
// ============================================================================

/**
 * 로딩 스켈레톤
 */
function ServiceHealthCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn('border-l-4 border-l-gray-300', className)} aria-busy="true">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded-full" />
            <Skeleton className="h-5 w-24" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
        <Skeleton className="h-4 w-32 mt-1" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <Skeleton className="h-4 w-28" />
          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-10 rounded" />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * 메트릭 아이템
 */
function MetricItem({
  icon: Icon,
  label,
  value,
  unit,
  trend,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
}) {
  return (
    <div className="flex flex-col gap-1 p-2 bg-muted/50 rounded-md">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-xs">{label}</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-lg font-semibold">
          {value}
          {unit && <span className="text-xs text-muted-foreground ml-0.5">{unit}</span>}
        </span>
        {trend && (
          <TrendingUp
            className={cn(
              'h-3.5 w-3.5',
              trend === 'up' && 'text-green-500',
              trend === 'down' && 'text-red-500 rotate-180',
              trend === 'stable' && 'text-gray-500 rotate-90'
            )}
          />
        )}
      </div>
    </div>
  );
}

// ============================================================================
// 메인 컴포넌트
// ============================================================================

/**
 * ServiceHealthCard
 *
 * 관리자 대시보드용 개별 서비스 상태 카드입니다.
 * 서비스 상태, 가동률, 요청 수, 에러율 등의 메트릭을 표시합니다.
 *
 * @example
 * ```tsx
 * <ServiceHealthCard
 *   serviceName="Minu Find"
 *   serviceDescription="사업기회 탐색"
 *   status="healthy"
 *   lastPing="2025-11-24T10:30:00Z"
 *   uptimePercent={99.9}
 *   requestCount={12500}
 *   errorRate={0.001}
 * />
 * ```
 */
export function ServiceHealthCard({
  serviceName,
  serviceDescription,
  status,
  lastPing,
  uptimePercent,
  requestCount,
  errorRate,
  metrics,
  isLoading = false,
  className,
}: ServiceHealthCardProps) {
  // 로딩 상태
  if (isLoading) {
    return <ServiceHealthCardSkeleton className={className} />;
  }

  const config = STATUS_CONFIG[status];
  const StatusIcon = config.icon;

  // 실제 값 또는 메트릭에서 가져오기
  const displayUptime = uptimePercent ?? metrics?.uptime_percent;
  const displayRequests = requestCount ?? metrics?.request_count;
  const displayErrorRate = errorRate ?? metrics?.error_rate;

  return (
    <Card
      className={cn('border-l-4', config.borderColor, className)}
      role="article"
      aria-label={`${serviceName} 서비스 상태`}
    >
      <CardHeader className="pb-2">
        {/* 서비스명 + 상태 배지 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StatusIcon
              className={cn('h-5 w-5', {
                'text-green-500': status === 'healthy',
                'text-yellow-500': status === 'degraded',
                'text-red-500': status === 'unhealthy',
                'text-gray-500': status === 'unknown',
              })}
              aria-hidden="true"
            />
            <CardTitle className="text-base">{serviceName}</CardTitle>
          </div>
          <Badge variant="outline" className={cn('text-xs', config.badgeClass)}>
            <span
              className={cn('inline-block h-1.5 w-1.5 rounded-full mr-1.5', config.dotClass)}
              aria-hidden="true"
            />
            {config.label}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{serviceDescription}</p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 마지막 통신 시간 */}
        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <span className="text-muted-foreground">마지막 통신:</span>
          <span className="font-medium">{formatRelativeTime(lastPing)}</span>
        </div>

        {/* 메트릭 그리드 */}
        <div className="grid grid-cols-2 gap-2">
          <MetricItem
            icon={Activity}
            label="24시간 가동률"
            value={displayUptime?.toFixed(1) ?? '-'}
            unit={displayUptime !== undefined ? '%' : undefined}
          />
          <MetricItem
            icon={TrendingUp}
            label="요청 수"
            value={formatNumber(displayRequests)}
          />
          <MetricItem
            icon={AlertCircle}
            label="에러율"
            value={displayErrorRate !== undefined ? (displayErrorRate * 100).toFixed(2) : '-'}
            unit={displayErrorRate !== undefined ? '%' : undefined}
          />
          <MetricItem
            icon={Clock}
            label="응답시간"
            value={metrics?.response_time_ms ?? '-'}
            unit={metrics?.response_time_ms !== undefined ? 'ms' : undefined}
          />
        </div>
      </CardContent>
    </Card>
  );
}

export default ServiceHealthCard;

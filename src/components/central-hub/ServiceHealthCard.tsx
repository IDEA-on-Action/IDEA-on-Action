/**
 * ServiceHealthCard 컴포넌트
 *
 * Central Hub 대시보드용 서비스 상태 카드
 * Minu 서비스(Find, Frame, Build, Keep)의 헬스 상태를 표시합니다.
 *
 * @module components/central-hub/ServiceHealthCard
 */

import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Activity,
  Clock,
  Cpu,
  HardDrive,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useServiceHealth,
  formatLastPing,
  getHealthStatusLabel,
} from '@/hooks/useServiceHealth';
import { cn } from '@/lib/utils';
import type { ServiceId, HealthStatus, HealthMetrics } from '@/types/services/central-hub.types';
import { SERVICE_INFO } from '@/types/services/central-hub.types';

// ============================================================================
// 타입 정의
// ============================================================================

interface ServiceHealthCardProps {
  serviceId: ServiceId;
  className?: string;
}

// ============================================================================
// 상태별 스타일 헬퍼
// ============================================================================

/**
 * 상태별 아이콘 컴포넌트 반환
 */
function getStatusIcon(status: HealthStatus) {
  const iconProps = { className: 'h-5 w-5' };

  switch (status) {
    case 'healthy':
      return <CheckCircle2 {...iconProps} className={cn(iconProps.className, 'text-green-500')} />;
    case 'degraded':
      return <AlertTriangle {...iconProps} className={cn(iconProps.className, 'text-yellow-500')} />;
    case 'unhealthy':
      return <XCircle {...iconProps} className={cn(iconProps.className, 'text-red-500')} />;
    default:
      return <HelpCircle {...iconProps} className={cn(iconProps.className, 'text-gray-500')} />;
  }
}

/**
 * 상태별 테두리 색상 반환
 */
function getBorderColor(status: HealthStatus): string {
  switch (status) {
    case 'healthy':
      return 'border-l-green-500';
    case 'degraded':
      return 'border-l-yellow-500';
    case 'unhealthy':
      return 'border-l-red-500';
    default:
      return 'border-l-gray-500';
  }
}

/**
 * 상태별 배지 배경색 반환
 */
function getStatusBadgeClass(status: HealthStatus): string {
  switch (status) {
    case 'healthy':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    case 'degraded':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    case 'unhealthy':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
  }
}

// ============================================================================
// 서브 컴포넌트
// ============================================================================

/**
 * 로딩 스켈레톤
 */
function HealthCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn('border-l-4 border-l-gray-300', className)}>
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
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * 에러 상태
 */
function HealthCardError({
  serviceId,
  error,
  className,
}: {
  serviceId: ServiceId;
  error: Error;
  className?: string;
}) {
  const serviceInfo = SERVICE_INFO[serviceId];

  return (
    <Card className={cn('border-l-4 border-l-red-500', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-500" />
            <CardTitle className="text-base">{serviceInfo.name}</CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-red-600 dark:text-red-400">
          데이터를 불러오는 중 오류가 발생했습니다.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {error.message}
        </p>
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
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number | undefined;
  unit?: string;
}) {
  const displayValue = value !== undefined && value !== null ? value : '-';

  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <div className="flex flex-col">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-sm font-medium">
          {displayValue}
          {unit && value !== undefined && value !== null && (
            <span className="text-xs text-muted-foreground ml-0.5">{unit}</span>
          )}
        </span>
      </div>
    </div>
  );
}

/**
 * 메트릭 그리드
 */
function MetricsGrid({ metrics }: { metrics: HealthMetrics }) {
  return (
    <div className="grid grid-cols-2 gap-3 mt-4">
      <MetricItem
        icon={Activity}
        label="업타임"
        value={metrics.uptime_percent?.toFixed(1)}
        unit="%"
      />
      <MetricItem
        icon={Clock}
        label="응답시간"
        value={metrics.response_time_ms}
        unit="ms"
      />
      <MetricItem
        icon={AlertTriangle}
        label="에러율"
        value={metrics.error_rate !== undefined ? (metrics.error_rate * 100).toFixed(2) : undefined}
        unit="%"
      />
      <MetricItem
        icon={Cpu}
        label="CPU"
        value={metrics.cpu_usage_percent?.toFixed(1)}
        unit="%"
      />
    </div>
  );
}

// ============================================================================
// 메인 컴포넌트
// ============================================================================

/**
 * ServiceHealthCard
 *
 * 특정 Minu 서비스의 헬스 상태를 카드 형태로 표시합니다.
 *
 * @param serviceId - 서비스 ID ('minu-find' | 'minu-frame' | 'minu-build' | 'minu-keep')
 * @param className - 추가 CSS 클래스
 */
export function ServiceHealthCard({ serviceId, className }: ServiceHealthCardProps) {
  const { data: health, isLoading, error } = useServiceHealth(serviceId);
  const serviceInfo = SERVICE_INFO[serviceId];

  // 로딩 상태
  if (isLoading) {
    return <HealthCardSkeleton className={className} />;
  }

  // 에러 상태
  if (error) {
    return <HealthCardError serviceId={serviceId} error={error as Error} className={className} />;
  }

  // 데이터가 없는 경우
  if (!health) {
    return (
      <HealthCardError
        serviceId={serviceId}
        error={new Error('서비스 상태 정보가 없습니다.')}
        className={className}
      />
    );
  }

  const status = health.status;
  const borderClass = getBorderColor(status);
  const statusBadgeClass = getStatusBadgeClass(status);
  const statusLabel = getHealthStatusLabel(status);

  return (
    <Card className={cn('border-l-4', borderClass, className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon(status)}
            <CardTitle className="text-base">{serviceInfo.name}</CardTitle>
          </div>
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
              statusBadgeClass
            )}
          >
            {statusLabel}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">{serviceInfo.description}</p>
      </CardHeader>
      <CardContent>
        {/* 마지막 핑 시간 */}
        <div className="flex items-center gap-2 text-sm">
          <HardDrive className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">마지막 연결:</span>
          <span className="font-medium">{formatLastPing(health.last_ping)}</span>
        </div>

        {/* 메트릭 그리드 */}
        {health.metrics && <MetricsGrid metrics={health.metrics} />}
      </CardContent>
    </Card>
  );
}

export default ServiceHealthCard;

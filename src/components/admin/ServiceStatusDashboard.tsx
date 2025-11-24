/**
 * ServiceStatusDashboard 컴포넌트 (Admin)
 *
 * 4개 Minu 서비스(Find, Frame, Build, Keep)의 상태를 그리드로 표시하는 대시보드
 * 실시간 연결 상태, 마지막 업데이트 시간, 반응형 레이아웃을 지원합니다.
 *
 * @module components/admin/ServiceStatusDashboard
 */

import { useMemo, useState, useEffect } from 'react';
import {
  RefreshCw,
  Wifi,
  WifiOff,
  Clock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ServiceHealthCard } from '@/components/admin/ServiceHealthCard';
import { cn } from '@/lib/utils';
import type { ServiceId, ServiceHealth, HealthStatus } from '@/types/central-hub.types';
import { SERVICE_INFO } from '@/types/central-hub.types';

// ============================================================================
// 타입 정의
// ============================================================================

export interface ServiceStatusDashboardProps {
  /** 서비스별 헬스 데이터 */
  healthData?: Record<ServiceId, ServiceHealth>;
  /** 실시간 연결 상태 */
  isRealtimeConnected?: boolean;
  /** 마지막 업데이트 시간 (ISO 문자열) */
  lastUpdated?: string;
  /** 로딩 상태 */
  isLoading?: boolean;
  /** 새로고침 핸들러 */
  onRefresh?: () => void;
  /** 새로고침 중 상태 */
  isRefreshing?: boolean;
  /** 추가 CSS 클래스 */
  className?: string;
}

// ============================================================================
// 상수
// ============================================================================

/** 서비스 ID 목록 */
const SERVICE_IDS: ServiceId[] = ['minu-find', 'minu-frame', 'minu-build', 'minu-keep'];

// ============================================================================
// 유틸리티 함수
// ============================================================================

/**
 * 마지막 업데이트 시간 포맷
 */
function formatLastUpdated(dateString?: string): string {
  if (!dateString) return '업데이트 정보 없음';

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 10) return '방금 업데이트됨';
  if (diffSec < 60) return `${diffSec}초 전 업데이트`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}분 전 업데이트`;

  return date.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  }) + ' 업데이트';
}

/**
 * 전체 서비스 상태 요약 계산
 */
function calculateOverallStatus(
  healthData?: Record<ServiceId, ServiceHealth>
): { status: HealthStatus; healthyCount: number; totalCount: number } {
  if (!healthData) {
    return { status: 'unknown', healthyCount: 0, totalCount: SERVICE_IDS.length };
  }

  let healthyCount = 0;
  let degradedCount = 0;
  let unhealthyCount = 0;

  SERVICE_IDS.forEach((id) => {
    const health = healthData[id];
    if (!health) return;

    switch (health.status) {
      case 'healthy':
        healthyCount++;
        break;
      case 'degraded':
        degradedCount++;
        break;
      case 'unhealthy':
        unhealthyCount++;
        break;
    }
  });

  let status: HealthStatus;
  if (unhealthyCount > 0) {
    status = 'unhealthy';
  } else if (degradedCount > 0) {
    status = 'degraded';
  } else if (healthyCount === SERVICE_IDS.length) {
    status = 'healthy';
  } else {
    status = 'unknown';
  }

  return { status, healthyCount, totalCount: SERVICE_IDS.length };
}

// ============================================================================
// 서브 컴포넌트
// ============================================================================

/**
 * 상태 요약 배지
 */
function StatusSummaryBadge({ status, healthyCount, totalCount }: {
  status: HealthStatus;
  healthyCount: number;
  totalCount: number;
}) {
  const config: Record<HealthStatus, { className: string; label: string }> = {
    healthy: {
      className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      label: '모든 서비스 정상',
    },
    degraded: {
      className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      label: '일부 서비스 주의',
    },
    unhealthy: {
      className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      label: '서비스 장애 발생',
    },
    unknown: {
      className: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
      label: '상태 확인 중',
    },
  };

  return (
    <Badge variant="outline" className={cn('text-xs', config[status].className)}>
      <span className="mr-1.5">{healthyCount}/{totalCount}</span>
      {config[status].label}
    </Badge>
  );
}

/**
 * 연결 상태 표시
 */
function ConnectionStatus({
  isConnected,
  lastUpdated,
}: {
  isConnected?: boolean;
  lastUpdated?: string;
}) {
  return (
    <div className="flex items-center gap-4 text-sm text-muted-foreground">
      {/* 실시간 연결 상태 */}
      <div className="flex items-center gap-1.5">
        {isConnected ? (
          <>
            <Wifi className="h-4 w-4 text-green-500" aria-hidden="true" />
            <span className="text-green-600 dark:text-green-400">실시간 연결됨</span>
          </>
        ) : (
          <>
            <WifiOff className="h-4 w-4 text-gray-400" aria-hidden="true" />
            <span>오프라인</span>
          </>
        )}
      </div>

      {/* 구분선 */}
      <span className="text-muted-foreground/50">|</span>

      {/* 마지막 업데이트 */}
      <div className="flex items-center gap-1.5">
        <Clock className="h-4 w-4" aria-hidden="true" />
        <span>{formatLastUpdated(lastUpdated)}</span>
      </div>
    </div>
  );
}

// ============================================================================
// 메인 컴포넌트
// ============================================================================

/**
 * ServiceStatusDashboard
 *
 * 4개 Minu 서비스의 상태를 그리드로 표시하는 대시보드입니다.
 *
 * @example
 * ```tsx
 * <ServiceStatusDashboard
 *   healthData={healthData}
 *   isRealtimeConnected={true}
 *   lastUpdated="2025-11-24T10:30:00Z"
 *   onRefresh={() => refetch()}
 * />
 * ```
 */
export function ServiceStatusDashboard({
  healthData,
  isRealtimeConnected = false,
  lastUpdated,
  isLoading = false,
  onRefresh,
  isRefreshing = false,
  className,
}: ServiceStatusDashboardProps) {
  // 실시간 업데이트용 state
  const [currentTime, setCurrentTime] = useState(new Date());

  // 1분마다 시간 업데이트 (상대 시간 표시용)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  // 전체 상태 요약
  const overallStatus = useMemo(() => calculateOverallStatus(healthData), [healthData]);

  return (
    <Card className={cn('w-full', className)} role="region" aria-label="서비스 상태 대시보드">
      <CardHeader className="pb-4">
        {/* 헤더 영역 */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <CardTitle className="text-lg">서비스 상태</CardTitle>
              <StatusSummaryBadge {...overallStatus} />
            </div>
            <ConnectionStatus
              isConnected={isRealtimeConnected}
              lastUpdated={lastUpdated}
            />
          </div>

          {/* 새로고침 버튼 */}
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="self-start sm:self-auto"
              aria-label="서비스 상태 새로고침"
            >
              <RefreshCw
                className={cn('h-4 w-4 mr-2', isRefreshing && 'animate-spin')}
                aria-hidden="true"
              />
              새로고침
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {/* 서비스 카드 그리드 (2x2, 모바일: 1열) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {SERVICE_IDS.map((serviceId) => {
            const serviceInfo = SERVICE_INFO[serviceId];
            const health = healthData?.[serviceId];

            return (
              <ServiceHealthCard
                key={serviceId}
                serviceName={serviceInfo.name}
                serviceDescription={serviceInfo.description}
                status={health?.status ?? 'unknown'}
                lastPing={health?.last_ping}
                metrics={health?.metrics}
                isLoading={isLoading}
              />
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default ServiceStatusDashboard;

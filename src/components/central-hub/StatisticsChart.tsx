/**
 * StatisticsChart 컴포넌트
 *
 * Central Hub 대시보드용 통계 차트 및 KPI 카드
 *
 * @module components/central-hub/StatisticsChart
 */

import { useMemo } from 'react';
import {
  Activity,
  AlertCircle,
  Clock,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useServiceEvents } from '@/hooks/services/useServiceEvents';
import { useServiceIssues, useServiceIssueStats } from '@/hooks/services/useServiceIssues';
import { cn } from '@/lib/utils';
import type { ServiceId } from '@/types/services/central-hub.types';
import { SERVICE_INFO } from '@/types/services/central-hub.types';

// ============================================================================
// 타입 정의
// ============================================================================

interface StatisticsChartProps {
  className?: string;
}

type TrendDirection = 'up' | 'down' | 'neutral';

interface KPICardData {
  title: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: {
    direction: TrendDirection;
    value: string;
    isPositive: boolean; // 상승이 긍정적인지 (이벤트: true, 이슈: false)
  };
  highlight?: boolean;
}

interface ServiceDistribution {
  serviceId: ServiceId;
  name: string;
  count: number;
  percentage: number;
  color: string;
}

// ============================================================================
// 서비스별 색상 매핑
// ============================================================================

const SERVICE_COLORS: Record<ServiceId, string> = {
  'minu-find': 'bg-blue-500',
  'minu-frame': 'bg-purple-500',
  'minu-build': 'bg-green-500',
  'minu-keep': 'bg-orange-500',
};

const SERVICE_COLORS_LIGHT: Record<ServiceId, string> = {
  'minu-find': 'bg-blue-100 dark:bg-blue-900/30',
  'minu-frame': 'bg-purple-100 dark:bg-purple-900/30',
  'minu-build': 'bg-green-100 dark:bg-green-900/30',
  'minu-keep': 'bg-orange-100 dark:bg-orange-900/30',
};

// ============================================================================
// KPI 카드 컴포넌트
// ============================================================================

type KPICardProps = KPICardData;

function KPICard({ title, value, icon: Icon, trend, highlight }: KPICardProps) {
  const getTrendIcon = (direction: TrendDirection) => {
    switch (direction) {
      case 'up':
        return TrendingUp;
      case 'down':
        return TrendingDown;
      default:
        return Minus;
    }
  };

  const getTrendColor = (direction: TrendDirection, isPositive: boolean) => {
    if (direction === 'neutral') return 'text-gray-500';
    if (direction === 'up') {
      return isPositive ? 'text-green-500' : 'text-red-500';
    }
    return isPositive ? 'text-red-500' : 'text-green-500';
  };

  const TrendIcon = trend ? getTrendIcon(trend.direction) : null;

  return (
    <Card
      className={cn(
        'relative overflow-hidden',
        highlight && 'ring-2 ring-red-500 ring-offset-2 dark:ring-offset-gray-900'
      )}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold">{value}</p>
            {trend && TrendIcon && (
              <div
                className={cn(
                  'flex items-center gap-1 text-sm',
                  getTrendColor(trend.direction, trend.isPositive)
                )}
              >
                <TrendIcon className="h-4 w-4" />
                <span>{trend.value}</span>
              </div>
            )}
          </div>
          <div
            className={cn(
              'rounded-full p-3',
              highlight
                ? 'bg-red-100 dark:bg-red-900/30'
                : 'bg-gray-100 dark:bg-gray-800'
            )}
          >
            <Icon
              className={cn(
                'h-6 w-6',
                highlight ? 'text-red-500' : 'text-gray-600 dark:text-gray-400'
              )}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// 막대 그래프 컴포넌트
// ============================================================================

interface BarChartProps {
  title: string;
  data: ServiceDistribution[];
  emptyMessage?: string;
}

function BarChart({ title, data, emptyMessage = '데이터가 없습니다' }: BarChartProps) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 || data.every((d) => d.count === 0) ? (
          <p className="text-center text-muted-foreground py-8">{emptyMessage}</p>
        ) : (
          <div className="space-y-4">
            {data.map((item) => (
              <div key={item.serviceId} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{item.name}</span>
                  <span className="text-muted-foreground">
                    {item.count}건 ({item.percentage.toFixed(1)}%)
                  </span>
                </div>
                <div
                  className={cn(
                    'h-3 rounded-full overflow-hidden',
                    SERVICE_COLORS_LIGHT[item.serviceId]
                  )}
                >
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-500 ease-out',
                      SERVICE_COLORS[item.serviceId]
                    )}
                    style={{
                      width: `${(item.count / maxCount) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// 메인 컴포넌트
// ============================================================================

export function StatisticsChart({ className }: StatisticsChartProps) {
  // 데이터 조회
  const { data: events = [], isLoading: isLoadingEvents } = useServiceEvents();
  const { data: issues = [], isLoading: isLoadingIssues } = useServiceIssues();
  const { data: issueStats, isLoading: isLoadingStats } = useServiceIssueStats();

  // 이벤트 통계 계산
  const eventStats = useMemo(() => {
    const byService: Record<ServiceId, number> = {
      'minu-find': 0,
      'minu-frame': 0,
      'minu-build': 0,
      'minu-keep': 0,
    };

    events.forEach((event) => {
      if (event.service_id in byService) {
        byService[event.service_id as ServiceId]++;
      }
    });

    return { total: events.length, byService };
  }, [events]);

  // 이슈 통계 계산
  const calculatedIssueStats = useMemo(() => {
    const byService: Record<ServiceId, number> = {
      'minu-find': 0,
      'minu-frame': 0,
      'minu-build': 0,
      'minu-keep': 0,
    };

    let openCount = 0;
    let resolvedCount = 0;

    issues.forEach((issue) => {
      if (issue.service_id in byService) {
        byService[issue.service_id as ServiceId]++;
      }
      if (issue.status === 'open' || issue.status === 'in_progress') {
        openCount++;
      }
      if (issue.status === 'resolved' || issue.status === 'closed') {
        resolvedCount++;
      }
    });

    const total = issues.length;
    const resolutionRate = total > 0 ? (resolvedCount / total) * 100 : 0;

    return { total, byService, openCount, resolutionRate };
  }, [issues]);

  // 서비스별 이벤트 분포
  const eventDistribution: ServiceDistribution[] = useMemo(() => {
    const serviceIds: ServiceId[] = ['minu-find', 'minu-frame', 'minu-build', 'minu-keep'];
    const total = eventStats.total || 1;

    return serviceIds.map((serviceId) => ({
      serviceId,
      name: SERVICE_INFO[serviceId].name,
      count: eventStats.byService[serviceId],
      percentage: (eventStats.byService[serviceId] / total) * 100,
      color: SERVICE_COLORS[serviceId],
    }));
  }, [eventStats]);

  // 서비스별 이슈 분포
  const issueDistribution: ServiceDistribution[] = useMemo(() => {
    const serviceIds: ServiceId[] = ['minu-find', 'minu-frame', 'minu-build', 'minu-keep'];
    const total = calculatedIssueStats.total || 1;

    return serviceIds.map((serviceId) => ({
      serviceId,
      name: SERVICE_INFO[serviceId].name,
      count: calculatedIssueStats.byService[serviceId],
      percentage: (calculatedIssueStats.byService[serviceId] / total) * 100,
      color: SERVICE_COLORS[serviceId],
    }));
  }, [calculatedIssueStats]);

  // KPI 카드 데이터
  const kpiCards: KPICardData[] = useMemo(
    () => [
      {
        title: '총 이벤트 수',
        value: eventStats.total,
        icon: Activity,
        trend: {
          direction: 'neutral' as TrendDirection,
          value: '이전 기간 대비',
          isPositive: true,
        },
      },
      {
        title: '총 이슈 수',
        value: calculatedIssueStats.total,
        icon: AlertCircle,
        trend: {
          direction: 'neutral' as TrendDirection,
          value: '이전 기간 대비',
          isPositive: false,
        },
      },
      {
        title: '미해결 이슈 수',
        value: issueStats?.openCount ?? calculatedIssueStats.openCount,
        icon: Clock,
        highlight: (issueStats?.openCount ?? calculatedIssueStats.openCount) > 5,
        trend: {
          direction: 'neutral' as TrendDirection,
          value: '이전 기간 대비',
          isPositive: false,
        },
      },
      {
        title: '해결률',
        value: `${calculatedIssueStats.resolutionRate.toFixed(1)}%`,
        icon: CheckCircle,
        trend: {
          direction: 'neutral' as TrendDirection,
          value: '이전 기간 대비',
          isPositive: true,
        },
      },
    ],
    [eventStats, calculatedIssueStats, issueStats]
  );

  // 로딩 상태
  const isLoading = isLoadingEvents || isLoadingIssues || isLoadingStats;

  if (isLoading) {
    return (
      <div className={cn('space-y-6', className)}>
        {/* KPI 카드 스켈레톤 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24" />
                  <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        {/* 차트 스켈레톤 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="animate-pulse h-6 bg-gray-200 dark:bg-gray-700 rounded w-32" />
              </CardHeader>
              <CardContent>
                <div className="animate-pulse space-y-4">
                  {[...Array(4)].map((_, j) => (
                    <div key={j} className="space-y-2">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* KPI 카드 그리드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card, index) => (
          <KPICard key={index} {...card} />
        ))}
      </div>

      {/* 서비스별 분포 차트 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BarChart
          title="서비스별 이벤트 분포"
          data={eventDistribution}
          emptyMessage="이벤트가 없습니다"
        />
        <BarChart
          title="서비스별 이슈 분포"
          data={issueDistribution}
          emptyMessage="이슈가 없습니다"
        />
      </div>
    </div>
  );
}

export default StatisticsChart;

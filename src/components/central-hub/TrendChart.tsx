/**
 * TrendChart 컴포넌트
 *
 * 이벤트/이슈 발생 트렌드 및 응답 시간 추이 라인 차트
 *
 * @module components/central-hub/TrendChart
 */

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useServiceEvents } from '@/hooks/services/useServiceEvents';
import { useServiceIssues } from '@/hooks/services/useServiceIssues';
import { useServiceHealth } from '@/hooks/services/useServiceHealth';
import { cn } from '@/lib/utils';
import { format, subDays, subWeeks, startOfDay } from 'date-fns';
import { ko } from 'date-fns/locale';
import { TrendingUp, TrendingDown } from 'lucide-react';

// ============================================================================
// 타입 정의
// ============================================================================

interface TrendChartProps {
  metric: 'events' | 'issues' | 'response_time';
  period: 'week' | 'month';
  className?: string;
}

interface TrendDataPoint {
  date: string;
  value: number;
}

// ============================================================================
// 색상 상수
// ============================================================================

const METRIC_COLORS: Record<string, string> = {
  events: '#3B82F6', // blue-500
  issues: '#EF4444', // red-500
  response_time: '#8B5CF6', // violet-500
};

// ============================================================================
// 날짜 범위 헬퍼
// ============================================================================

/**
 * 기간에 따른 날짜 범위 생성
 */
function getDateRange(period: 'week' | 'month'): Date[] {
  const now = new Date();
  const dates: Date[] = [];

  switch (period) {
    case 'week':
      // 최근 7일
      for (let i = 6; i >= 0; i--) {
        dates.push(startOfDay(subDays(now, i)));
      }
      break;
    case 'month':
      // 최근 30일
      for (let i = 29; i >= 0; i--) {
        dates.push(startOfDay(subDays(now, i)));
      }
      break;
  }

  return dates;
}

/**
 * 날짜 포맷
 */
function formatDate(date: Date, period: 'week' | 'month'): string {
  if (period === 'week') {
    return format(date, 'M/d (E)', { locale: ko });
  }
  return format(date, 'M/d', { locale: ko });
}

// ============================================================================
// 메트릭 정보
// ============================================================================

interface MetricInfo {
  title: string;
  unit: string;
  color: string;
  description: string;
}

function getMetricInfo(metric: TrendChartProps['metric']): MetricInfo {
  switch (metric) {
    case 'events':
      return {
        title: '이벤트 발생 추이',
        unit: '건',
        color: METRIC_COLORS.events,
        description: '일별 발생한 이벤트 수',
      };
    case 'issues':
      return {
        title: '이슈 발생 추이',
        unit: '건',
        color: METRIC_COLORS.issues,
        description: '일별 발생한 이슈 수',
      };
    case 'response_time':
      return {
        title: '응답 시간 추이',
        unit: 'ms',
        color: METRIC_COLORS.response_time,
        description: '서비스 평균 응답 시간',
      };
  }
}

// ============================================================================
// 커스텀 툴팁
// ============================================================================

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
  }>;
  label?: string;
  unit: string;
}

function CustomTooltip({ active, payload, label, unit }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const value = payload[0].value;

  return (
    <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
      <p className="text-sm font-medium mb-1">{label}</p>
      <p className="text-xs text-muted-foreground">
        <span className="font-bold text-foreground">{value.toFixed(unit === 'ms' ? 1 : 0)}</span>{' '}
        {unit}
      </p>
    </div>
  );
}

// ============================================================================
// 트렌드 인디케이터
// ============================================================================

interface TrendIndicatorProps {
  current: number;
  previous: number;
  unit: string;
}

function TrendIndicator({ current, previous, unit }: TrendIndicatorProps) {
  const change = current - previous;
  const changePercent = previous !== 0 ? (change / previous) * 100 : 0;
  const isPositive = change >= 0;

  if (Math.abs(changePercent) < 0.1) {
    return (
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        <span>변화 없음</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex items-center gap-1 text-sm',
        isPositive ? 'text-red-500' : 'text-green-500'
      )}
    >
      {isPositive ? (
        <TrendingUp className="h-4 w-4" />
      ) : (
        <TrendingDown className="h-4 w-4" />
      )}
      <span>
        {isPositive ? '+' : ''}
        {changePercent.toFixed(1)}% ({isPositive ? '+' : ''}
        {change.toFixed(unit === 'ms' ? 1 : 0)}
        {unit})
      </span>
    </div>
  );
}

// ============================================================================
// 메인 컴포넌트
// ============================================================================

export function TrendChart({ metric, period, className }: TrendChartProps) {
  // 데이터 조회
  const { data: events = [], isLoading: isLoadingEvents } = useServiceEvents();
  const { data: issues = [], isLoading: isLoadingIssues } = useServiceIssues();
  const { data: healthData = [], isLoading: isLoadingHealth } = useServiceHealth();

  // 차트 데이터 계산
  const chartData = useMemo<TrendDataPoint[]>(() => {
    const dates = getDateRange(period);
    const dataMap = new Map<string, number>();

    // 날짜별 초기화
    dates.forEach((date) => {
      const dateKey = format(date, 'yyyy-MM-dd');
      dataMap.set(dateKey, 0);
    });

    // 메트릭별 데이터 집계
    if (metric === 'events') {
      events.forEach((event) => {
        const dateKey = format(startOfDay(new Date(event.created_at)), 'yyyy-MM-dd');
        const current = dataMap.get(dateKey) || 0;
        dataMap.set(dateKey, current + 1);
      });
    } else if (metric === 'issues') {
      issues.forEach((issue) => {
        const dateKey = format(startOfDay(new Date(issue.created_at)), 'yyyy-MM-dd');
        const current = dataMap.get(dateKey) || 0;
        dataMap.set(dateKey, current + 1);
      });
    } else if (metric === 'response_time') {
      // 응답 시간: 날짜별 평균 계산
      const countMap = new Map<string, number>();
      dates.forEach((date) => {
        const dateKey = format(date, 'yyyy-MM-dd');
        countMap.set(dateKey, 0);
      });

      healthData.forEach((health) => {
        if (health.metrics?.response_time_ms) {
          const dateKey = format(startOfDay(new Date(health.updated_at)), 'yyyy-MM-dd');
          const current = dataMap.get(dateKey) || 0;
          const count = countMap.get(dateKey) || 0;
          dataMap.set(dateKey, current + health.metrics.response_time_ms);
          countMap.set(dateKey, count + 1);
        }
      });

      // 평균 계산
      dataMap.forEach((total, dateKey) => {
        const count = countMap.get(dateKey) || 1;
        dataMap.set(dateKey, total / count);
      });
    }

    // 날짜 포맷과 함께 배열로 변환
    return dates.map((date) => ({
      date: formatDate(date, period),
      value: dataMap.get(format(date, 'yyyy-MM-dd')) || 0,
    }));
  }, [metric, period, events, issues, healthData]);

  // 평균값 및 트렌드 계산
  const stats = useMemo(() => {
    if (chartData.length === 0) {
      return { average: 0, current: 0, previous: 0 };
    }

    const values = chartData.map((d) => d.value);
    const average = values.reduce((sum, v) => sum + v, 0) / values.length;
    const current = values[values.length - 1] || 0;
    const previous = values[values.length - 2] || 0;

    return { average, current, previous };
  }, [chartData]);

  // 메트릭 정보
  const metricInfo = getMetricInfo(metric);

  // 로딩 상태
  const isLoading = isLoadingEvents || isLoadingIssues || isLoadingHealth;

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <div className="animate-pulse h-6 bg-gray-200 dark:bg-gray-700 rounded w-48" />
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">{metricInfo.title}</CardTitle>
            <p className="text-sm text-muted-foreground">{metricInfo.description}</p>
          </div>
          <div className="text-right space-y-1">
            <div className="text-sm text-muted-foreground">
              평균:{' '}
              <span className="font-bold text-foreground">
                {stats.average.toFixed(metricInfo.unit === 'ms' ? 1 : 0)}
              </span>{' '}
              {metricInfo.unit}
            </div>
            <TrendIndicator
              current={stats.current}
              previous={stats.previous}
              unit={metricInfo.unit}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {chartData.every((d) => d.value === 0) ? (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            해당 기간에 데이터가 없습니다
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={chartData}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
              <XAxis
                dataKey="date"
                className="text-xs"
                tick={{ fill: 'currentColor' }}
              />
              <YAxis
                className="text-xs"
                tick={{ fill: 'currentColor' }}
                allowDecimals={metricInfo.unit === 'ms'}
              />
              <Tooltip content={<CustomTooltip unit={metricInfo.unit} />} />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Line
                type="monotone"
                dataKey="value"
                name={metricInfo.title}
                stroke={metricInfo.color}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

export default TrendChart;

/**
 * UsageChart 컴포넌트
 *
 * 서비스별 일간/주간/월간 사용량 막대 차트
 *
 * @module components/central-hub/UsageChart
 */

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useServiceEvents } from '@/hooks/services/useServiceEvents';
import { SERVICE_INFO, type ServiceId } from '@/types/services/central-hub.types';
import { cn } from '@/lib/utils';
import { format, subDays, subWeeks, subMonths, startOfDay } from 'date-fns';
import { ko } from 'date-fns/locale';

// ============================================================================
// 타입 정의
// ============================================================================

interface UsageChartProps {
  serviceId?: ServiceId; // 특정 서비스 또는 전체
  period: 'daily' | 'weekly' | 'monthly';
  className?: string;
}

interface UsageDataPoint {
  date: string;
  'Minu Find': number;
  'Minu Frame': number;
  'Minu Build': number;
  'Minu Keep': number;
}

// ============================================================================
// 서비스별 색상 매핑 (recharts용 hex 색상)
// ============================================================================

const SERVICE_CHART_COLORS: Record<string, string> = {
  'Minu Find': '#3B82F6', // blue-500
  'Minu Frame': '#8B5CF6', // violet-500
  'Minu Build': '#F59E0B', // amber-500
  'Minu Keep': '#10B981', // emerald-500
};

// ============================================================================
// 날짜 범위 및 포맷 헬퍼
// ============================================================================

/**
 * 기간에 따른 날짜 범위 생성
 */
function getDateRange(period: 'daily' | 'weekly' | 'monthly'): Date[] {
  const now = new Date();
  const dates: Date[] = [];

  switch (period) {
    case 'daily':
      // 최근 7일
      for (let i = 6; i >= 0; i--) {
        dates.push(startOfDay(subDays(now, i)));
      }
      break;
    case 'weekly':
      // 최근 4주
      for (let i = 3; i >= 0; i--) {
        dates.push(startOfDay(subWeeks(now, i)));
      }
      break;
    case 'monthly':
      // 최근 6개월
      for (let i = 5; i >= 0; i--) {
        dates.push(startOfDay(subMonths(now, i)));
      }
      break;
  }

  return dates;
}

/**
 * 기간에 따른 날짜 포맷
 */
function formatDate(date: Date, period: 'daily' | 'weekly' | 'monthly'): string {
  switch (period) {
    case 'daily':
      return format(date, 'M/d (E)', { locale: ko });
    case 'weekly':
      return format(date, 'M/d', { locale: ko });
    case 'monthly':
      return format(date, 'yyyy/M', { locale: ko });
  }
}

/**
 * 기간 한글 표시
 */
function getPeriodLabel(period: 'daily' | 'weekly' | 'monthly'): string {
  switch (period) {
    case 'daily':
      return '일간';
    case 'weekly':
      return '주간';
    case 'monthly':
      return '월간';
  }
}

// ============================================================================
// 커스텀 툴팁 컴포넌트
// ============================================================================

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
      <p className="text-sm font-medium mb-2">{label}</p>
      <div className="space-y-1">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2 text-xs">
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-medium">{entry.value}건</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// 메인 컴포넌트
// ============================================================================

export function UsageChart({ serviceId, period, className }: UsageChartProps) {
  // 데이터 조회
  const { data: events = [], isLoading } = useServiceEvents();

  // 차트 데이터 계산
  const chartData = useMemo<UsageDataPoint[]>(() => {
    const dates = getDateRange(period);

    // 날짜별 서비스별 이벤트 카운트 초기화
    const dataMap = new Map<string, UsageDataPoint>();
    dates.forEach((date) => {
      const dateKey = format(date, 'yyyy-MM-dd');
      dataMap.set(dateKey, {
        date: formatDate(date, period),
        'Minu Find': 0,
        'Minu Frame': 0,
        'Minu Build': 0,
        'Minu Keep': 0,
      });
    });

    // 이벤트 카운트
    events.forEach((event) => {
      const eventDate = new Date(event.created_at);
      let dateKey: string;

      // 기간에 따라 날짜 키 생성
      switch (period) {
        case 'daily': {
          dateKey = format(startOfDay(eventDate), 'yyyy-MM-dd');
          break;
        }
        case 'weekly': {
          // 주의 시작일로 그룹화
          const weekStart = startOfDay(subDays(eventDate, eventDate.getDay()));
          dateKey = format(weekStart, 'yyyy-MM-dd');
          break;
        }
        case 'monthly': {
          // 월의 시작일로 그룹화
          dateKey = format(new Date(eventDate.getFullYear(), eventDate.getMonth(), 1), 'yyyy-MM-dd');
          break;
        }
      }

      const dataPoint = dataMap.get(dateKey);
      if (dataPoint && event.service_id in SERVICE_INFO) {
        const serviceName = SERVICE_INFO[event.service_id as ServiceId].name;
        dataPoint[serviceName as keyof UsageDataPoint] =
          (dataPoint[serviceName as keyof UsageDataPoint] as number) + 1;
      }
    });

    return Array.from(dataMap.values());
  }, [events, period]);

  // 필터링된 서비스 목록
  const services = useMemo(() => {
    if (serviceId) {
      return [SERVICE_INFO[serviceId].name];
    }
    return Object.values(SERVICE_INFO).map((s) => s.name);
  }, [serviceId]);

  // 총 이벤트 수
  const totalEvents = useMemo(() => {
    return chartData.reduce((sum, point) => {
      return (
        sum +
        (serviceId
          ? (point[SERVICE_INFO[serviceId].name as keyof UsageDataPoint] as number)
          : (point['Minu Find'] as number) +
            (point['Minu Frame'] as number) +
            (point['Minu Build'] as number) +
            (point['Minu Keep'] as number))
      );
    }, 0);
  }, [chartData, serviceId]);

  // 차트 제목
  const title = serviceId
    ? `${SERVICE_INFO[serviceId].name} ${getPeriodLabel(period)} 사용량`
    : `전체 서비스 ${getPeriodLabel(period)} 사용량`;

  // 로딩 상태
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
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{title}</CardTitle>
          <div className="text-sm text-muted-foreground">
            총 <span className="font-bold text-foreground">{totalEvents}</span>건
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {totalEvents === 0 ? (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            해당 기간에 데이터가 없습니다
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
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
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="circle"
              />
              {services.map((serviceName) => (
                <Bar
                  key={serviceName}
                  dataKey={serviceName}
                  fill={SERVICE_CHART_COLORS[serviceName]}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

export default UsageChart;

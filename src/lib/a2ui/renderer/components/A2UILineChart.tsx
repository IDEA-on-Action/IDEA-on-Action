/**
 * A2UI LineChart 컴포넌트
 * AI 에이전트가 선 차트를 렌더링할 수 있게 해주는 컴포넌트
 */

import { useMemo } from 'react';
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { cn } from '@/lib/utils';

/** 데이터 시리즈 정의 */
export interface A2UILineChartSeries {
  /** 데이터 키 (data 배열의 속성명) */
  dataKey: string;
  /** 시리즈 라벨 */
  label?: string;
  /** 색상 (CSS 색상값) */
  color?: string;
  /** 선 스타일 */
  strokeDasharray?: string;
  /** 점 표시 여부 */
  showDots?: boolean;
  /** 선 두께 */
  strokeWidth?: number;
}

export interface A2UILineChartProps {
  /** 차트 데이터 */
  data: Record<string, unknown>[];
  /** X축 데이터 키 */
  xAxisKey: string;
  /** 데이터 시리즈 배열 */
  series: A2UILineChartSeries[];
  /** 차트 제목 */
  title?: string;
  /** X축 라벨 */
  xAxisLabel?: string;
  /** Y축 라벨 */
  yAxisLabel?: string;
  /** 그리드 표시 여부 */
  showGrid?: boolean;
  /** 범례 표시 여부 */
  showLegend?: boolean;
  /** 툴팁 표시 여부 */
  showTooltip?: boolean;
  /** 차트 높이 */
  height?: number;
  /** 곡선 타입 */
  curveType?: 'linear' | 'monotone' | 'step';
}

interface Props extends A2UILineChartProps {
  className?: string;
}

/** 기본 색상 팔레트 */
const DEFAULT_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export function A2UILineChart({
  data,
  xAxisKey,
  series,
  title,
  xAxisLabel,
  yAxisLabel,
  showGrid = true,
  showLegend = true,
  showTooltip = true,
  height = 300,
  curveType = 'monotone',
  className,
}: Props) {
  // ChartConfig 생성
  const chartConfig = useMemo<ChartConfig>(() => {
    const config: ChartConfig = {};
    series.forEach((s, index) => {
      config[s.dataKey] = {
        label: s.label || s.dataKey,
        color: s.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
      };
    });
    return config;
  }, [series]);

  if (!data || data.length === 0) {
    return (
      <div className={cn('flex items-center justify-center h-[200px] text-muted-foreground', className)}>
        데이터가 없습니다
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      {title && (
        <h4 className="text-sm font-medium text-center">{title}</h4>
      )}
      <ChartContainer config={chartConfig} className="w-full" style={{ height }}>
        <LineChart
          data={data}
          margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
        >
          {showGrid && <CartesianGrid strokeDasharray="3 3" />}

          <XAxis
            dataKey={xAxisKey}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
          />
          <YAxis tickLine={false} axisLine={false} tickMargin={8} />

          {showTooltip && (
            <ChartTooltip content={<ChartTooltipContent />} />
          )}

          {showLegend && (
            <ChartLegend content={<ChartLegendContent />} />
          )}

          {series.map((s, index) => (
            <Line
              key={s.dataKey}
              dataKey={s.dataKey}
              type={curveType}
              stroke={s.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
              strokeWidth={s.strokeWidth || 2}
              strokeDasharray={s.strokeDasharray}
              dot={s.showDots !== false}
              activeDot={{ r: 6 }}
            />
          ))}
        </LineChart>
      </ChartContainer>
    </div>
  );
}

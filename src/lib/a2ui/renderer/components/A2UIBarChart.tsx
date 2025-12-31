/**
 * A2UI BarChart 컴포넌트
 * AI 에이전트가 막대 차트를 렌더링할 수 있게 해주는 컴포넌트
 */

import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
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
export interface A2UIChartSeries {
  /** 데이터 키 (data 배열의 속성명) */
  dataKey: string;
  /** 시리즈 라벨 */
  label?: string;
  /** 색상 (CSS 색상값) */
  color?: string;
  /** 스택 ID (같은 ID끼리 스택됨) */
  stackId?: string;
}

export interface A2UIBarChartProps {
  /** 차트 데이터 */
  data: Record<string, unknown>[];
  /** X축 데이터 키 */
  xAxisKey: string;
  /** 데이터 시리즈 배열 */
  series: A2UIChartSeries[];
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
  /** 수평 막대 차트 여부 */
  horizontal?: boolean;
}

interface Props extends A2UIBarChartProps {
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

export function A2UIBarChart({
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
  horizontal = false,
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
        <BarChart
          data={data}
          layout={horizontal ? 'vertical' : 'horizontal'}
          margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
        >
          {showGrid && <CartesianGrid strokeDasharray="3 3" vertical={!horizontal} horizontal={horizontal} />}

          {horizontal ? (
            <>
              <YAxis
                dataKey={xAxisKey}
                type="category"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                width={80}
              />
              <XAxis type="number" tickLine={false} axisLine={false} tickMargin={8} />
            </>
          ) : (
            <>
              <XAxis
                dataKey={xAxisKey}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} />
            </>
          )}

          {showTooltip && (
            <ChartTooltip content={<ChartTooltipContent />} />
          )}

          {showLegend && (
            <ChartLegend content={<ChartLegendContent />} />
          )}

          {series.map((s, index) => (
            <Bar
              key={s.dataKey}
              dataKey={s.dataKey}
              stackId={s.stackId}
              fill={s.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
              radius={[4, 4, 0, 0]}
            />
          ))}
        </BarChart>
      </ChartContainer>
    </div>
  );
}

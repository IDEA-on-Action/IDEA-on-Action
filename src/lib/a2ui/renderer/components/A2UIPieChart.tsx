/**
 * A2UI PieChart 컴포넌트
 * AI 에이전트가 파이/도넛 차트를 렌더링할 수 있게 해주는 컴포넌트
 */

import { useMemo } from 'react';
import { Pie, PieChart, Cell, Label } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { cn } from '@/lib/utils';

export interface A2UIPieChartProps {
  /** 차트 데이터 (name, value 필드 필수) */
  data: Array<{
    name: string;
    value: number;
    color?: string;
    [key: string]: unknown;
  }>;
  /** 차트 제목 */
  title?: string;
  /** 도넛 차트 여부 */
  donut?: boolean;
  /** 도넛 차트 중앙 라벨 */
  centerLabel?: string;
  /** 도넛 차트 중앙 값 */
  centerValue?: string | number;
  /** 범례 표시 여부 */
  showLegend?: boolean;
  /** 툴팁 표시 여부 */
  showTooltip?: boolean;
  /** 차트 높이 */
  height?: number;
  /** 차트 너비 (기본: 100%) */
  width?: number;
  /** 라벨 표시 여부 */
  showLabels?: boolean;
}

interface Props extends A2UIPieChartProps {
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

export function A2UIPieChart({
  data,
  title,
  donut = false,
  centerLabel,
  centerValue,
  showLegend = true,
  showTooltip = true,
  height = 300,
  width,
  showLabels = false,
  className,
}: Props) {
  // ChartConfig 생성
  const chartConfig = useMemo<ChartConfig>(() => {
    const config: ChartConfig = {};
    data.forEach((item, index) => {
      config[item.name] = {
        label: item.name,
        color: item.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
      };
    });
    return config;
  }, [data]);

  // 총 값 계산 (도넛 중앙 표시용)
  const totalValue = useMemo(() => {
    return data.reduce((sum, item) => sum + item.value, 0);
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <div className={cn('flex items-center justify-center h-[200px] text-muted-foreground', className)}>
        데이터가 없습니다
      </div>
    );
  }

  const innerRadius = donut ? 60 : 0;
  const outerRadius = 100;

  return (
    <div className={cn('space-y-2', className)}>
      {title && (
        <h4 className="text-sm font-medium text-center">{title}</h4>
      )}
      <ChartContainer
        config={chartConfig}
        className="mx-auto"
        style={{ height, width: width || '100%', maxWidth: 400 }}
      >
        <PieChart>
          {showTooltip && (
            <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
          )}

          {showLegend && (
            <ChartLegend content={<ChartLegendContent nameKey="name" />} />
          )}

          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={2}
            label={showLabels ? ({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%` : false}
            labelLine={showLabels}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
              />
            ))}

            {/* 도넛 차트 중앙 라벨 */}
            {donut && (centerLabel || centerValue !== undefined) && (
              <Label
                content={({ viewBox }) => {
                  if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          className="fill-foreground text-2xl font-bold"
                        >
                          {centerValue !== undefined ? centerValue : totalValue.toLocaleString()}
                        </tspan>
                        {centerLabel && (
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy || 0) + 20}
                            className="fill-muted-foreground text-sm"
                          >
                            {centerLabel}
                          </tspan>
                        )}
                      </text>
                    );
                  }
                  return null;
                }}
              />
            )}
          </Pie>
        </PieChart>
      </ChartContainer>
    </div>
  );
}

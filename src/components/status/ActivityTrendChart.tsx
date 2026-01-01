import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card } from '@/components/ui/card';
import type { Log } from '@/types/shared/v2';

interface ActivityTrendChartProps {
  logs: Log[];
}

export const ActivityTrendChart = ({ logs }: ActivityTrendChartProps) => {
  // 최근 30일간의 활동 데이터를 날짜별로 집계
  const chartData = useMemo(() => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // 날짜별 활동 카운트 맵 생성
    const activityMap = new Map<string, number>();

    // 최근 30일의 날짜 초기화
    for (let i = 0; i < 30; i++) {
      const date = new Date(thirtyDaysAgo);
      date.setDate(date.getDate() + i);
      const dateKey = date.toISOString().split('T')[0];
      activityMap.set(dateKey, 0);
    }

    // 로그 데이터를 날짜별로 집계
    logs.forEach((log) => {
      const logDate = new Date(log.created_at);
      if (logDate >= thirtyDaysAgo) {
        const dateKey = logDate.toISOString().split('T')[0];
        const currentCount = activityMap.get(dateKey) || 0;
        activityMap.set(dateKey, currentCount + 1);
      }
    });

    // 차트 데이터로 변환
    return Array.from(activityMap.entries())
      .map(([date, count]) => ({
        date: new Date(date).toLocaleDateString('ko-KR', {
          month: 'short',
          day: 'numeric',
        }),
        활동: count,
      }))
      .slice(-14); // 최근 14일만 표시
  }, [logs]);

  return (
    <Card className="glass-card p-8">
      <h2 className="text-2xl font-bold mb-6">활동 추세 (최근 14일)</h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
          <XAxis
            dataKey="date"
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
          />
          <YAxis
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              padding: '8px 12px',
            }}
            labelStyle={{
              color: 'hsl(var(--foreground))',
              fontWeight: 600,
            }}
          />
          <Line
            type="monotone"
            dataKey="활동"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ fill: 'hsl(var(--primary))', r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
};

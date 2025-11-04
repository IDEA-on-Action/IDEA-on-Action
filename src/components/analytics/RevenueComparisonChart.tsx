/**
 * Phase 14 Week 2: 매출 비교 차트 컴포넌트
 * 이전 기간 대비 매출 비교 (Grouped Bar Chart)
 */

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RevenueByDate } from '@/hooks/useRevenue'

interface RevenueComparisonChartProps {
  currentData: RevenueByDate[]
  previousData: RevenueByDate[]
  isLoading?: boolean
}

export function RevenueComparisonChart({
  currentData,
  previousData,
  isLoading,
}: RevenueComparisonChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>매출 비교</CardTitle>
          <CardDescription>이전 기간 대비 매출 비교</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-80">
            <p className="text-muted-foreground">데이터 로딩 중...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!currentData || currentData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>매출 비교</CardTitle>
          <CardDescription>이전 기간 대비 매출 비교</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-80">
            <p className="text-muted-foreground">데이터가 없습니다</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // 현재 기간과 이전 기간 데이터 병합
  const comparisonData = currentData.map((current, index) => ({
    date: current.date,
    current: current.total,
    previous: previousData[index]?.total || 0,
  }))

  // 총 매출 계산
  const currentTotal = currentData.reduce((sum, item) => sum + item.total, 0)
  const previousTotal = previousData.reduce((sum, item) => sum + item.total, 0)
  const growthRate = previousTotal > 0
    ? ((currentTotal - previousTotal) / previousTotal) * 100
    : 0

  // 금액 포맷 함수
  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K`
    }
    return value.toLocaleString()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>매출 비교</CardTitle>
        <CardDescription>
          현재: ₩{currentTotal.toLocaleString()} |
          이전: ₩{previousTotal.toLocaleString()} |
          <span className={growthRate >= 0 ? 'text-green-600' : 'text-red-600'}>
            {' '}{growthRate >= 0 ? '▲' : '▼'} {Math.abs(growthRate).toFixed(1)}%
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={comparisonData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis
              tickFormatter={formatCurrency}
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <Tooltip
              formatter={(value: number) => [`₩${value.toLocaleString()}`]}
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
            <Legend />
            <Bar dataKey="current" fill="#3b82f6" name="현재 기간" radius={[8, 8, 0, 0]} />
            <Bar dataKey="previous" fill="#94a3b8" name="이전 기간" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

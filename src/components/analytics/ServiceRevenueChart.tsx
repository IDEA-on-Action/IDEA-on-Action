/**
 * Phase 14 Week 2: 서비스별 매출 차트 컴포넌트
 * 서비스별 매출 비교 (Horizontal Bar Chart)
 */

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RevenueByService } from '@/hooks/payments/useRevenue'

interface ServiceRevenueChartProps {
  data: RevenueByService[]
  isLoading?: boolean
}

const COLORS = [
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#f59e0b', // orange
  '#10b981', // green
  '#ef4444', // red
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#84cc16', // lime
]

export function ServiceRevenueChart({ data, isLoading }: ServiceRevenueChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>서비스별 매출</CardTitle>
          <CardDescription>서비스별 매출 순위</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-80">
            <p className="text-muted-foreground">데이터 로딩 중...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>서비스별 매출</CardTitle>
          <CardDescription>서비스별 매출 순위</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-80">
            <p className="text-muted-foreground">데이터가 없습니다</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // 상위 10개만 표시
  const topServices = data.slice(0, 10)

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
        <CardTitle>서비스별 매출</CardTitle>
        <CardDescription>
          상위 {topServices.length}개 서비스 |
          총 매출: ₩{topServices.reduce((sum, item) => sum + item.total_revenue, 0).toLocaleString()}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={topServices}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              type="number"
              tickFormatter={formatCurrency}
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis
              type="category"
              dataKey="service_name"
              width={150}
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <Tooltip
              formatter={(value: number, name: string) => {
                if (name === 'total_revenue') return [`₩${value.toLocaleString()}`, '매출']
                return [value, name]
              }}
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
            <Legend />
            <Bar
              dataKey="total_revenue"
              name="매출"
              radius={[0, 8, 8, 0]}
            >
              {topServices.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* 테이블 형태 추가 정보 */}
        <div className="mt-6 space-y-2">
          <h4 className="text-sm font-medium">상세 정보</h4>
          <div className="space-y-1">
            {topServices.map((service, index) => (
              <div
                key={service.service_id}
                className="flex items-center justify-between text-sm py-2 px-3 rounded-md hover:bg-muted/50"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="font-medium">{service.service_name}</span>
                </div>
                <div className="flex items-center gap-4 text-muted-foreground">
                  <span>₩{service.total_revenue.toLocaleString()}</span>
                  <span className="text-xs">({service.order_count}건)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

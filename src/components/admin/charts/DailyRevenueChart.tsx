/**
 * DailyRevenueChart - 일별 매출 차트 컴포넌트
 * Phase 3: Recharts 동적 로딩으로 번들 크기 최적화
 */

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface DailyRevenueData {
  dateStr: string
  revenue: number
  orders: number
}

interface DailyRevenueChartProps {
  data: DailyRevenueData[]
}

export default function DailyRevenueChart({ data }: DailyRevenueChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="dateStr" />
        <YAxis />
        <Tooltip
          formatter={(value: number) => `₩${value.toLocaleString()}`}
          labelFormatter={(label) => `날짜: ${label}`}
        />
        <Bar dataKey="revenue" fill="#3b82f6" name="매출" />
      </BarChart>
    </ResponsiveContainer>
  )
}

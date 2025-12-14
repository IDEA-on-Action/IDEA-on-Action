/**
 * PaymentMethodChart - 결제 수단별 통계 차트 컴포넌트
 * Phase 3: Recharts 동적 로딩으로 번들 크기 최적화
 */

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface PaymentMethodData {
  name: string
  value: number
  amount: number
}

interface PaymentMethodChartProps {
  data: PaymentMethodData[]
  colors: string[]
}

export default function PaymentMethodChart({ data, colors }: PaymentMethodChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number, name: string, props: { payload: { amount: number } }) =>
            `${value}건 (₩${props.payload.amount.toLocaleString()})`
          }
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}

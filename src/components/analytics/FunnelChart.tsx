/**
 * Phase 14: 퍼널 차트 컴포넌트
 * 구매 퍼널 시각화 (회원가입 → 구매)
 */

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, LabelList } from 'recharts'
import { FunnelData } from '@/hooks/analytics/useAnalyticsEvents'

interface FunnelChartProps {
  data?: FunnelData
  loading?: boolean
}

export function FunnelChart({ data, loading }: FunnelChartProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>구매 퍼널</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-96" />
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>구매 퍼널</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">데이터가 없습니다.</p>
        </CardContent>
      </Card>
    )
  }

  const chartData = [
    { name: '회원가입', value: data.signup, fill: '#3b82f6' },
    { name: '서비스 조회', value: data.viewService, fill: '#8b5cf6' },
    { name: '장바구니 추가', value: data.addToCart, fill: '#f59e0b' },
    { name: '결제 시작', value: data.checkout, fill: '#10b981' },
    { name: '구매 완료', value: data.purchase, fill: '#ef4444' },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>구매 퍼널 분석</CardTitle>
        <p className="text-sm text-muted-foreground">
          사용자가 각 단계를 거치는 과정을 시각화합니다
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData} layout="horizontal">
            <XAxis type="category" dataKey="name" />
            <YAxis type="number" />
            <Tooltip
              formatter={(value) => `${value.toLocaleString()}명`}
              labelStyle={{ color: '#000' }}
            />
            <Bar dataKey="value" radius={[8, 8, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
              <LabelList dataKey="value" position="top" formatter={(value: number) => value.toLocaleString()} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* 전환율 표시 */}
        <div className="mt-6 space-y-3 border-t pt-4">
          <p className="text-sm font-semibold">단계별 전환율</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex justify-between items-center p-3 bg-accent rounded-lg">
              <span className="text-sm">회원가입 → 서비스 조회</span>
              <span className="text-sm font-bold text-blue-600">
                {data.conversionRate.signupToView.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-accent rounded-lg">
              <span className="text-sm">서비스 조회 → 장바구니</span>
              <span className="text-sm font-bold text-purple-600">
                {data.conversionRate.viewToCart.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-accent rounded-lg">
              <span className="text-sm">장바구니 → 결제</span>
              <span className="text-sm font-bold text-orange-600">
                {data.conversionRate.cartToCheckout.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-accent rounded-lg">
              <span className="text-sm">결제 → 구매</span>
              <span className="text-sm font-bold text-green-600">
                {data.conversionRate.checkoutToPurchase.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* 전체 전환율 */}
          <div className="flex justify-between items-center p-4 bg-primary/10 rounded-lg border-2 border-primary/20">
            <span className="font-semibold">전체 전환율 (회원가입 → 구매)</span>
            <span className="text-lg font-bold text-primary">
              {data.signup > 0 ? ((data.purchase / data.signup) * 100).toFixed(1) : 0}%
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

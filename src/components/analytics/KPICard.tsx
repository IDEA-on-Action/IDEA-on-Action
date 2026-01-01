/**
 * Phase 14 Week 2: KPI 카드 컴포넌트
 * 핵심 성과 지표 시각화 (총 매출, 주문 건수, AOV, 전환율, 신규/재구매 고객)
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Users, UserCheck, UserPlus, Percent } from 'lucide-react'
import { KPIs } from '@/hooks/payments/useRevenue'

interface KPICardProps {
  label: string
  value: string | number
  description?: string
  trend?: number // 증감률 (%)
  icon?: React.ReactNode
  isLoading?: boolean
}

export function KPICard({ label, value, description, trend, icon, isLoading }: KPICardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{label}</CardTitle>
          {icon}
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">로딩 중...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
        {trend !== undefined && (
          <div className={`flex items-center gap-1 mt-2 text-xs ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            <span>{Math.abs(trend).toFixed(1)}% 전월 대비</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================
// KPI 그리드 컴포넌트
// ============================================

interface KPIGridProps {
  data: KPIs
  isLoading?: boolean
}

export function KPIGrid({ data, isLoading }: KPIGridProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {/* 총 매출 */}
      <KPICard
        label="총 매출"
        value={`₩${data.totalRevenue.toLocaleString()}`}
        description="완료된 주문 매출"
        icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
        isLoading={isLoading}
      />

      {/* 주문 건수 */}
      <KPICard
        label="주문 건수"
        value={`${data.orderCount.toLocaleString()}건`}
        description="완료된 주문"
        icon={<ShoppingCart className="h-4 w-4 text-muted-foreground" />}
        isLoading={isLoading}
      />

      {/* 평균 주문 금액 (AOV) */}
      <KPICard
        label="평균 주문 금액"
        value={`₩${data.averageOrderValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
        description="AOV (Average Order Value)"
        icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
        isLoading={isLoading}
      />

      {/* 전환율 */}
      <KPICard
        label="전환율"
        value={`${data.conversionRate.toFixed(2)}%`}
        description="방문자 대비 구매 전환율"
        icon={<Percent className="h-4 w-4 text-muted-foreground" />}
        isLoading={isLoading}
      />

      {/* 신규 고객 */}
      <KPICard
        label="신규 고객"
        value={`${data.newCustomers.toLocaleString()}명`}
        description="첫 구매 고객"
        icon={<UserPlus className="h-4 w-4 text-muted-foreground" />}
        isLoading={isLoading}
      />

      {/* 재구매 고객 */}
      <KPICard
        label="재구매 고객"
        value={`${data.returningCustomers.toLocaleString()}명`}
        description="2회 이상 구매 고객"
        icon={<UserCheck className="h-4 w-4 text-muted-foreground" />}
        isLoading={isLoading}
      />
    </div>
  )
}

// ============================================
// 개별 KPI 카드 (사용자 정의용)
// ============================================

interface TotalRevenueCardProps {
  value: number
  isLoading?: boolean
}

export function TotalRevenueCard({ value, isLoading }: TotalRevenueCardProps) {
  return (
    <KPICard
      label="총 매출"
      value={`₩${value.toLocaleString()}`}
      description="완료된 주문 매출"
      icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
      isLoading={isLoading}
    />
  )
}

interface OrderCountCardProps {
  value: number
  isLoading?: boolean
}

export function OrderCountCard({ value, isLoading }: OrderCountCardProps) {
  return (
    <KPICard
      label="주문 건수"
      value={`${value.toLocaleString()}건`}
      description="완료된 주문"
      icon={<ShoppingCart className="h-4 w-4 text-muted-foreground" />}
      isLoading={isLoading}
    />
  )
}

interface AverageOrderValueCardProps {
  value: number
  isLoading?: boolean
}

export function AverageOrderValueCard({ value, isLoading }: AverageOrderValueCardProps) {
  return (
    <KPICard
      label="평균 주문 금액"
      value={`₩${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
      description="AOV (Average Order Value)"
      icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
      isLoading={isLoading}
    />
  )
}

interface ConversionRateCardProps {
  value: number
  isLoading?: boolean
}

export function ConversionRateCard({ value, isLoading }: ConversionRateCardProps) {
  return (
    <KPICard
      label="전환율"
      value={`${value.toFixed(2)}%`}
      description="방문자 대비 구매 전환율"
      icon={<Percent className="h-4 w-4 text-muted-foreground" />}
      isLoading={isLoading}
    />
  )
}

interface CustomerSegmentCardProps {
  newCustomers: number
  returningCustomers: number
  isLoading?: boolean
}

export function CustomerSegmentCard({ newCustomers, returningCustomers, isLoading }: CustomerSegmentCardProps) {
  const total = newCustomers + returningCustomers
  const returningRate = total > 0 ? (returningCustomers / total) * 100 : 0

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">고객 세그먼트</CardTitle>
        <Users className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-2xl font-bold">로딩 중...</div>
        ) : (
          <>
            <div className="text-2xl font-bold">{total.toLocaleString()}명</div>
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">신규 고객</span>
                <span className="font-medium">{newCustomers.toLocaleString()}명</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">재구매 고객</span>
                <span className="font-medium">{returningCustomers.toLocaleString()}명</span>
              </div>
              <div className="flex items-center justify-between text-sm pt-2 border-t">
                <span className="text-muted-foreground">재구매율</span>
                <span className="font-medium text-primary">{returningRate.toFixed(1)}%</span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

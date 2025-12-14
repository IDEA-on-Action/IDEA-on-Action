/**
 * Admin Dashboard
 *
 * 관리자 대시보드
 * - 통계 요약
 * - 최근 서비스
 * - 빠른 액션
 *
 * Phase 3: Recharts 동적 로딩으로 번들 크기 최적화
 */

import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Package, FileText, Users, TrendingUp, Plus, ArrowRight, DollarSign, ShoppingCart } from 'lucide-react'
import { Suspense, lazy } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { format, subDays, startOfDay } from 'date-fns'
import { ko } from 'date-fns/locale'
import { StatsCard, StatsCardGrid } from '@/components/analytics/StatsCard'
import { formatKoreanCurrency } from '@/types/analytics'

// 동적 import로 Recharts 로딩 최적화 (Phase 3)
// 차트 컴포넌트를 별도로 분리하여 lazy loading
const DailyRevenueChart = lazy(() => import('@/components/admin/charts/DailyRevenueChart'))
const PaymentMethodChart = lazy(() => import('@/components/admin/charts/PaymentMethodChart'))

// 로딩 폴백 컴포넌트
const ChartSkeleton = () => (
  <div className="h-[300px] flex items-center justify-center">
    <Skeleton className="h-full w-full" />
  </div>
)

export default function Dashboard() {
  // 통계 데이터
  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [servicesRes, categoriesRes, ordersRes, paymentsRes] = await Promise.all([
        supabase.from('services').select('id, status', { count: 'exact' }),
        supabase.from('service_categories').select('id', { count: 'exact' }),
        supabase.from('orders').select('id, status, total_amount, created_at'),
        supabase.from('payments').select('id, amount, provider, status'),
      ])

      const totalServices = servicesRes.count || 0
      const activeServices =
        servicesRes.data?.filter((s) => s.status === 'active').length || 0
      const totalCategories = categoriesRes.count || 0

      // 주문 통계
      const orders = ordersRes.data || []
      const totalOrders = orders.length
      const completedOrders = orders.filter((o) => o.status === 'delivered').length
      const totalRevenue = orders
        .filter((o) => o.status !== 'cancelled' && o.status !== 'refunded')
        .reduce((sum, o) => sum + o.total_amount, 0)

      // 평균 주문 금액
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

      // 일별 매출 (최근 7일)
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = startOfDay(subDays(new Date(), 6 - i))
        return {
          date,
          dateStr: format(date, 'MM/dd'),
          revenue: 0,
          orders: 0,
        }
      })

      orders.forEach((order) => {
        if (order.status === 'cancelled' || order.status === 'refunded') return
        const orderDate = startOfDay(new Date(order.created_at))
        const dayData = last7Days.find((d) => d.date.getTime() === orderDate.getTime())
        if (dayData) {
          dayData.revenue += order.total_amount
          dayData.orders += 1
        }
      })

      // 결제 수단별 통계
      const payments = paymentsRes.data || []
      const paymentsByProvider = payments
        .filter((p) => p.status === 'completed')
        .reduce((acc, p) => {
          const provider = p.provider || 'unknown'
          if (!acc[provider]) {
            acc[provider] = { count: 0, amount: 0 }
          }
          acc[provider].count += 1
          acc[provider].amount += p.amount
          return acc
        }, {} as Record<string, { count: number; amount: number }>)

      const paymentMethodChart = Object.entries(paymentsByProvider).map(([provider, data]) => ({
        name: provider === 'kakao' ? 'Kakao Pay' : provider === 'toss' ? 'Toss Payments' : provider,
        value: data.count,
        amount: data.amount,
      }))

      return {
        totalServices,
        activeServices,
        draftServices: servicesRes.data?.filter((s) => s.status === 'draft').length || 0,
        totalCategories,
        totalOrders,
        completedOrders,
        totalRevenue,
        averageOrderValue,
        dailyRevenue: last7Days,
        paymentMethodChart,
      }
    },
  })

  // 최근 서비스
  const { data: recentServices } = useQuery({
    queryKey: ['recent-services'],
    queryFn: async () => {
      const { data } = await supabase
        .from('services')
        .select('id, title, status, created_at')
        .order('created_at', { ascending: false })
        .limit(5)

      return data
    },
  })

  const isLoading = !stats

  // 차트 색상
  const COLORS = ['#3b82f6', '#f59e0b', '#8b5cf6', '#10b981']

  return (
    <>
      <Helmet>
        <title>대시보드 | VIBE WORKING</title>
      </Helmet>

      <div className="space-y-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">대시보드</h1>
            <p className="text-muted-foreground">서비스 관리 현황</p>
          </div>
          <Link to="/admin/services/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              서비스 등록
            </Button>
          </Link>
        </div>

        {/* 통계 카드 */}
        <StatsCardGrid columns={4}>
          <StatsCard
            title="전체 서비스"
            value={stats?.totalServices || 0}
            icon={<Package className="h-5 w-5 text-blue-600" />}
            description={`활성: ${stats?.activeServices || 0}`}
            loading={isLoading}
          />
          <StatsCard
            title="총 주문"
            value={stats?.totalOrders || 0}
            icon={<ShoppingCart className="h-5 w-5 text-green-600" />}
            description={`완료: ${stats?.completedOrders || 0}`}
            loading={isLoading}
          />
          <StatsCard
            title="총 매출"
            value={formatKoreanCurrency(stats?.totalRevenue || 0)}
            icon={<DollarSign className="h-5 w-5 text-purple-600" />}
            description="누적 매출"
            loading={isLoading}
          />
          <StatsCard
            title="평균 주문금액"
            value={formatKoreanCurrency(stats?.averageOrderValue || 0)}
            icon={<TrendingUp className="h-5 w-5 text-orange-600" />}
            description="주문당"
            loading={isLoading}
          />
        </StatsCardGrid>

        {/* 차트 섹션 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 일별 매출 차트 */}
          <Card>
            <CardHeader>
              <CardTitle>일별 매출 (최근 7일)</CardTitle>
              <CardDescription>날짜별 매출 추이</CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<ChartSkeleton />}>
                <DailyRevenueChart data={stats?.dailyRevenue || []} />
              </Suspense>
            </CardContent>
          </Card>

          {/* 결제 수단별 통계 */}
          <Card>
            <CardHeader>
              <CardTitle>결제 수단별 통계</CardTitle>
              <CardDescription>결제 수단 사용 현황</CardDescription>
            </CardHeader>
            <CardContent>
              {stats?.paymentMethodChart && stats.paymentMethodChart.length > 0 ? (
                <Suspense fallback={<ChartSkeleton />}>
                  <PaymentMethodChart data={stats.paymentMethodChart} colors={COLORS} />
                </Suspense>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  결제 데이터가 없습니다
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 최근 서비스 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>최근 서비스</CardTitle>
              <Link to="/admin/services">
                <Button variant="ghost" size="sm">
                  전체 보기
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentServices && recentServices.length > 0 ? (
              <div className="space-y-4">
                {recentServices.map((service) => (
                  <div
                    key={service.id}
                    className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0"
                  >
                    <div>
                      <p className="font-medium">{service.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(service.created_at).toLocaleDateString('ko-KR')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          service.status === 'active'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                            : service.status === 'draft'
                            ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                        }`}
                      >
                        {service.status === 'active'
                          ? '활성'
                          : service.status === 'draft'
                          ? '초안'
                          : '보관'}
                      </span>
                      <Link to={`/admin/services/${service.id}/edit`}>
                        <Button variant="ghost" size="sm">
                          편집
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                등록된 서비스가 없습니다
              </p>
            )}
          </CardContent>
        </Card>

        {/* 빠른 액션 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <Link to="/admin/services/new">
              <CardContent className="pt-6 text-center">
                <Plus className="h-12 w-12 mx-auto mb-4 text-primary" />
                <h3 className="font-semibold">새 서비스 등록</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  새로운 서비스를 등록합니다
                </p>
              </CardContent>
            </Link>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <Link to="/admin/services">
              <CardContent className="pt-6 text-center">
                <Package className="h-12 w-12 mx-auto mb-4 text-primary" />
                <h3 className="font-semibold">서비스 관리</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  등록된 서비스를 관리합니다
                </p>
              </CardContent>
            </Link>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <Link to="/admin/orders">
              <CardContent className="pt-6 text-center">
                <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-primary" />
                <h3 className="font-semibold">주문 관리</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  주문 현황을 관리합니다
                </p>
              </CardContent>
            </Link>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <Link to="/">
              <CardContent className="pt-6 text-center">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 text-primary" />
                <h3 className="font-semibold">사이트 보기</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  실제 사이트를 확인합니다
                </p>
              </CardContent>
            </Link>
          </Card>
        </div>
      </div>
    </>
  )
}

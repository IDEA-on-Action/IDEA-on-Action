/**
 * Phase 14 Week 2: 매출 분석 페이지
 * 일/주/월별 매출, 서비스별 매출, KPI, CSV 내보내기
 *
 * v2.24.0: 번들 크기 최적화를 위해 차트 컴포넌트 동적 import
 */

import { useState, Suspense, lazy } from 'react'
import { useRevenueByDate, useRevenueByService, useKPIs } from '@/hooks/payments/useRevenue'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Download, BarChart3, TrendingUp } from 'lucide-react'

// 동적 import로 번들 크기 최적화 (v2.24.0)
const DateRangePicker = lazy(() => import('@/components/analytics/DateRangePicker').then(m => ({ default: m.DateRangePicker })))
const RevenueChart = lazy(() => import('@/components/analytics/RevenueChart').then(m => ({ default: m.RevenueChart })))
const ServiceRevenueChart = lazy(() => import('@/components/analytics/ServiceRevenueChart').then(m => ({ default: m.ServiceRevenueChart })))
const OrdersChart = lazy(() => import('@/components/analytics/OrdersChart').then(m => ({ default: m.OrdersChart })))
const KPIGrid = lazy(() => import('@/components/analytics/KPICard').then(m => ({ default: m.KPIGrid })))

// 로딩 폴백 컴포넌트
const ChartSkeleton = () => (
  <div className="space-y-2">
    {[...Array(3)].map((_, i) => (
      <Skeleton key={i} className="h-24" />
    ))}
  </div>
)

export default function Revenue() {
  // 날짜 범위 상태 (기본: 최근 30일)
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    end: new Date(),
  })

  // 집계 단위 상태 (day, week, month)
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('day')

  // 차트 타입 상태 (line, bar)
  const [chartType, setChartType] = useState<'line' | 'bar'>('line')

  // 데이터 조회
  const { data: revenueData, isLoading: revenueLoading } = useRevenueByDate(
    dateRange.start,
    dateRange.end,
    groupBy
  )

  const { data: serviceData, isLoading: serviceLoading } = useRevenueByService(
    dateRange.start,
    dateRange.end
  )

  const { data: kpis, isLoading: kpisLoading } = useKPIs(
    dateRange.start,
    dateRange.end
  )

  // CSV 내보내기 함수
  const handleExportCSV = () => {
    if (!revenueData || revenueData.length === 0) {
      alert('내보낼 데이터가 없습니다.')
      return
    }

    const csv = revenueData
      .map((row) => `${row.date},${row.total},${row.count}`)
      .join('\n')

    const blob = new Blob([`Date,Revenue,Orders\n${csv}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `revenue_${dateRange.start.toISOString().split('T')[0]}_${dateRange.end.toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // 서비스 매출 CSV 내보내기
  const handleExportServiceCSV = () => {
    if (!serviceData || serviceData.length === 0) {
      alert('내보낼 데이터가 없습니다.')
      return
    }

    const csv = serviceData
      .map((row) => `${row.service_name},${row.total_revenue},${row.order_count}`)
      .join('\n')

    const blob = new Blob([`Service,Revenue,Orders\n${csv}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `service_revenue_${dateRange.start.toISOString().split('T')[0]}_${dateRange.end.toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <TrendingUp className="h-8 w-8 text-primary" />
            매출 분석
          </h1>
          <p className="text-muted-foreground mt-1">
            일/주/월별 매출, 서비스별 매출, KPI 지표
          </p>
        </div>

        {/* 날짜 범위 선택 */}
        <Suspense fallback={<Skeleton className="h-10 w-64" />}>
          <DateRangePicker
            startDate={dateRange.start}
            endDate={dateRange.end}
            onDateChange={setDateRange}
          />
        </Suspense>
      </div>

      {/* KPI 카드 그리드 */}
      <Suspense fallback={<ChartSkeleton />}>
        {kpis && (
          <KPIGrid data={kpis} isLoading={kpisLoading} />
        )}
      </Suspense>

      {/* 매출 분석 탭 */}
      <Tabs defaultValue="overview" className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <TabsList>
            <TabsTrigger value="overview">개요</TabsTrigger>
            <TabsTrigger value="revenue">매출 추이</TabsTrigger>
            <TabsTrigger value="services">서비스별 매출</TabsTrigger>
            <TabsTrigger value="orders">주문 건수</TabsTrigger>
          </TabsList>

          {/* 집계 단위 선택 */}
          <div className="flex items-center gap-2">
            <Button
              variant={groupBy === 'day' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setGroupBy('day')}
            >
              일별
            </Button>
            <Button
              variant={groupBy === 'week' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setGroupBy('week')}
            >
              주별
            </Button>
            <Button
              variant={groupBy === 'month' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setGroupBy('month')}
            >
              월별
            </Button>
          </div>
        </div>

        {/* 개요 탭 */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Suspense fallback={<ChartSkeleton />}>
              {revenueData && (
                <RevenueChart
                  data={revenueData}
                  isLoading={revenueLoading}
                  chartType={chartType}
                />
              )}
            </Suspense>
            <Suspense fallback={<ChartSkeleton />}>
              {revenueData && (
                <OrdersChart data={revenueData} isLoading={revenueLoading} />
              )}
            </Suspense>
          </div>

          <Suspense fallback={<ChartSkeleton />}>
            {serviceData && (
              <ServiceRevenueChart data={serviceData} isLoading={serviceLoading} />
            )}
          </Suspense>
        </TabsContent>

        {/* 매출 추이 탭 */}
        <TabsContent value="revenue" className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Button
                variant={chartType === 'line' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChartType('line')}
              >
                <BarChart3 className="h-4 w-4 mr-1" />
                선형
              </Button>
              <Button
                variant={chartType === 'bar' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChartType('bar')}
              >
                <BarChart3 className="h-4 w-4 mr-1" />
                막대
              </Button>
            </div>

            <Button onClick={handleExportCSV} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              CSV 내보내기
            </Button>
          </div>

          <Suspense fallback={<ChartSkeleton />}>
            {revenueData && (
              <RevenueChart
                data={revenueData}
                isLoading={revenueLoading}
                chartType={chartType}
              />
            )}
          </Suspense>
        </TabsContent>

        {/* 서비스별 매출 탭 */}
        <TabsContent value="services" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={handleExportServiceCSV} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              CSV 내보내기
            </Button>
          </div>

          <Suspense fallback={<ChartSkeleton />}>
            {serviceData && (
              <ServiceRevenueChart data={serviceData} isLoading={serviceLoading} />
            )}
          </Suspense>
        </TabsContent>

        {/* 주문 건수 탭 */}
        <TabsContent value="orders" className="space-y-4">
          <Suspense fallback={<ChartSkeleton />}>
            {revenueData && (
              <OrdersChart data={revenueData} isLoading={revenueLoading} />
            )}
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  )
}

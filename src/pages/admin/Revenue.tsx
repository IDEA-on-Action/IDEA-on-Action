/**
 * Phase 14 Week 2: 매출 분석 페이지
 * 일/주/월별 매출, 서비스별 매출, KPI, CSV 내보내기
 */

import { useState } from 'react'
import { useRevenueByDate, useRevenueByService, useKPIs } from '@/hooks/useRevenue'
import { RevenueChart } from '@/components/analytics/RevenueChart'
import { ServiceRevenueChart } from '@/components/analytics/ServiceRevenueChart'
import { OrdersChart } from '@/components/analytics/OrdersChart'
import { KPIGrid } from '@/components/analytics/KPICard'
import { DateRangePicker } from '@/components/analytics/DateRangePicker'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Download, BarChart3, TrendingUp } from 'lucide-react'

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
        <DateRangePicker
          startDate={dateRange.start}
          endDate={dateRange.end}
          onDateChange={setDateRange}
        />
      </div>

      {/* KPI 카드 그리드 */}
      {kpis && (
        <KPIGrid data={kpis} isLoading={kpisLoading} />
      )}

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
            {revenueData && (
              <RevenueChart
                data={revenueData}
                isLoading={revenueLoading}
                chartType={chartType}
              />
            )}
            {revenueData && (
              <OrdersChart data={revenueData} isLoading={revenueLoading} />
            )}
          </div>

          {serviceData && (
            <ServiceRevenueChart data={serviceData} isLoading={serviceLoading} />
          )}
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

          {revenueData && (
            <RevenueChart
              data={revenueData}
              isLoading={revenueLoading}
              chartType={chartType}
            />
          )}
        </TabsContent>

        {/* 서비스별 매출 탭 */}
        <TabsContent value="services" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={handleExportServiceCSV} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              CSV 내보내기
            </Button>
          </div>

          {serviceData && (
            <ServiceRevenueChart data={serviceData} isLoading={serviceLoading} />
          )}
        </TabsContent>

        {/* 주문 건수 탭 */}
        <TabsContent value="orders" className="space-y-4">
          {revenueData && (
            <OrdersChart data={revenueData} isLoading={revenueLoading} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

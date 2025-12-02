/**
 * Phase 14: 분석 대시보드 페이지
 * 사용자 행동 분석, 퍼널 분석, 이탈률 분석
 *
 * v2.30.0: 번들 크기 최적화를 위해 탭별 컴포넌트 동적 import
 * - 각 탭을 별도 청크로 분리하여 초기 로딩 성능 개선
 */

import { useState, Suspense, lazy } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { BarChart3, TrendingDown, Activity, Clock } from 'lucide-react'

// 동적 import로 번들 크기 최적화 (v2.30.0)
// 각 탭을 별도 컴포넌트로 분리하여 lazy loading
const DateRangePicker = lazy(() => import('@/components/analytics/DateRangePicker').then(m => ({ default: m.DateRangePicker })))
const AnalyticsDataProvider = lazy(() => import('./analytics/AnalyticsDataProvider'))
const OverviewTab = lazy(() => import('./analytics/OverviewTab'))
const FunnelTab = lazy(() => import('./analytics/FunnelTab'))
const BehaviorTab = lazy(() => import('./analytics/BehaviorTab'))
const EventsTab = lazy(() => import('./analytics/EventsTab'))

// 로딩 폴백 컴포넌트
const ChartSkeleton = () => (
  <div className="space-y-2">
    {[...Array(3)].map((_, i) => (
      <Skeleton key={i} className="h-24" />
    ))}
  </div>
)

export default function Analytics() {
  // 날짜 범위 (기본: 최근 30일)
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    end: new Date(),
  })

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 헤더 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="h-8 w-8" />
            분석 대시보드
          </h1>
          <p className="text-muted-foreground mt-1">
            사용자 행동 분석 및 비즈니스 인사이트
          </p>
        </div>
        <Suspense fallback={<Skeleton className="h-10 w-64" />}>
          <DateRangePicker value={dateRange} onChange={setDateRange} />
        </Suspense>
      </div>

      {/* 데이터 프로바이더로 래핑 */}
      <Suspense fallback={<ChartSkeleton />}>
        <AnalyticsDataProvider dateRange={dateRange}>
          {(analyticsData) => (
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview" className="flex items-center gap-2" aria-label="개요">
                  <Activity className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden sm:inline">개요</span>
                </TabsTrigger>
                <TabsTrigger value="funnel" className="flex items-center gap-2" aria-label="퍼널 분석">
                  <TrendingDown className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden sm:inline">퍼널 분석</span>
                </TabsTrigger>
                <TabsTrigger value="behavior" className="flex items-center gap-2" aria-label="사용자 행동">
                  <BarChart3 className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden sm:inline">사용자 행동</span>
                </TabsTrigger>
                <TabsTrigger value="events" className="flex items-center gap-2" aria-label="이벤트 로그">
                  <Clock className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden sm:inline">이벤트 로그</span>
                </TabsTrigger>
              </TabsList>

              {/* 개요 탭 */}
              <TabsContent value="overview">
                <Suspense fallback={<ChartSkeleton />}>
                  <OverviewTab data={analyticsData} />
                </Suspense>
              </TabsContent>

              {/* 퍼널 분석 탭 */}
              <TabsContent value="funnel">
                <Suspense fallback={<ChartSkeleton />}>
                  <FunnelTab data={analyticsData} />
                </Suspense>
              </TabsContent>

              {/* 사용자 행동 탭 */}
              <TabsContent value="behavior">
                <Suspense fallback={<ChartSkeleton />}>
                  <BehaviorTab data={analyticsData} />
                </Suspense>
              </TabsContent>

              {/* 이벤트 타임라인 탭 */}
              <TabsContent value="events">
                <Suspense fallback={<ChartSkeleton />}>
                  <EventsTab dateRange={dateRange} />
                </Suspense>
              </TabsContent>
            </Tabs>
          )}
        </AnalyticsDataProvider>
      </Suspense>
    </div>
  )
}

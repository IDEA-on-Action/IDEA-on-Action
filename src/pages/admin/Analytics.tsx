/**
 * Phase 14: 분석 대시보드 페이지
 * 사용자 행동 분석, 퍼널 분석, 이탈률 분석
 *
 * v2.24.0: 번들 크기 최적화를 위해 차트 컴포넌트 동적 import
 */

import { useState, Suspense, lazy } from 'react'
import { useFunnelAnalysis, useBounceRate, useEventCounts } from '@/hooks/useAnalyticsEvents'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { BarChart3, TrendingDown, Activity, Clock, Users } from 'lucide-react'
import { StatsCard, StatsCardGrid } from '@/components/analytics/StatsCard'
import { formatNumber } from '@/types/analytics'

// 동적 import로 번들 크기 최적화 (v2.24.0)
const DateRangePicker = lazy(() => import('@/components/analytics/DateRangePicker').then(m => ({ default: m.DateRangePicker })))
const FunnelChart = lazy(() => import('@/components/analytics/FunnelChart').then(m => ({ default: m.FunnelChart })))
const BounceRateCard = lazy(() => import('@/components/analytics/BounceRateCard').then(m => ({ default: m.BounceRateCard })))
const EventTimeline = lazy(() => import('@/components/analytics/EventTimeline').then(m => ({ default: m.EventTimeline })))

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

  // 데이터 훅
  const { data: funnelData, isLoading: funnelLoading } = useFunnelAnalysis(
    dateRange.start,
    dateRange.end
  )

  const { data: bounceData, isLoading: bounceLoading } = useBounceRate(
    dateRange.start,
    dateRange.end
  )

  const { data: eventCounts, isLoading: eventCountsLoading } = useEventCounts(
    dateRange.start,
    dateRange.end,
    10 // 상위 10개
  )

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

      {/* 탭 네비게이션 */}
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
        <TabsContent value="overview" className="space-y-6">
          <StatsCardGrid columns={3}>
            {/* 이탈률 카드 */}
            <Suspense fallback={<ChartSkeleton />}>
              <BounceRateCard data={bounceData} loading={bounceLoading} />
            </Suspense>

            {/* 총 이벤트 수 */}
            <StatsCard
              title="총 이벤트"
              value={formatNumber(eventCounts?.reduce((sum, e) => sum + Number(e.event_count), 0) || 0)}
              icon={<Activity className="h-5 w-5 text-blue-600" />}
              description="선택한 기간 동안 발생한 이벤트"
              loading={eventCountsLoading}
            />

            {/* 고유 사용자 수 */}
            <StatsCard
              title="고유 사용자"
              value={formatNumber(eventCounts?.reduce((sum, e) => sum + Number(e.unique_users), 0) || 0)}
              icon={<Users className="h-5 w-5 text-purple-600" />}
              description="활동한 사용자 수"
              loading={eventCountsLoading}
            />
          </StatsCardGrid>

          {/* 상위 이벤트 */}
          <Card>
            <CardHeader>
              <CardTitle>상위 이벤트</CardTitle>
            </CardHeader>
            <CardContent>
              {eventCountsLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12" />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {eventCounts?.map((event, index) => (
                    <div
                      key={event.event_name}
                      className="flex items-center justify-between p-3 rounded-lg bg-accent"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-bold text-muted-foreground">
                          #{index + 1}
                        </span>
                        <div>
                          <p className="font-semibold">{event.event_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {Number(event.unique_sessions).toLocaleString()} 세션
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold">
                          {Number(event.event_count).toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">발생 횟수</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 퍼널 분석 탭 */}
        <TabsContent value="funnel">
          <Suspense fallback={<ChartSkeleton />}>
            <FunnelChart data={funnelData} loading={funnelLoading} />
          </Suspense>
        </TabsContent>

        {/* 사용자 행동 탭 */}
        <TabsContent value="behavior">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Suspense fallback={<ChartSkeleton />}>
              <BounceRateCard data={bounceData} loading={bounceLoading} />
            </Suspense>

            {/* 평균 세션 시간 (추후 구현) */}
            <Card>
              <CardHeader>
                <CardTitle>평균 세션 시간</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center py-8">
                  Week 2에서 구현 예정
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 이벤트 타임라인 탭 */}
        <TabsContent value="events">
          <Suspense fallback={<ChartSkeleton />}>
            <EventTimeline startDate={dateRange.start} endDate={dateRange.end} />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  )
}

/**
 * Analytics Overview Tab Component
 * 분석 대시보드 개요 탭 - 동적 import를 위해 분리
 */

import { Suspense, lazy } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Activity, Users } from 'lucide-react'
import type { AnalyticsData } from './AnalyticsDataProvider'

const BounceRateCard = lazy(() => import('@/components/analytics/BounceRateCard').then(m => ({ default: m.BounceRateCard })))
const StatsCard = lazy(() => import('@/components/analytics/StatsCard').then(m => ({ default: m.StatsCard })))
const StatsCardGrid = lazy(() => import('@/components/analytics/StatsCard').then(m => ({ default: m.StatsCardGrid })))

const ChartSkeleton = () => (
  <div className="space-y-2">
    {[...Array(3)].map((_, i) => (
      <Skeleton key={i} className="h-24" />
    ))}
  </div>
)

interface OverviewTabProps {
  data: AnalyticsData
}

export default function OverviewTab({ data }: OverviewTabProps) {
  const { bounceData, bounceLoading, eventCounts, eventCountsLoading } = data

  return (
    <div className="space-y-6">
      <Suspense fallback={<ChartSkeleton />}>
        <StatsCardGrid columns={3}>
          {/* 이탈률 카드 */}
          <Suspense fallback={<ChartSkeleton />}>
            <BounceRateCard data={bounceData} loading={bounceLoading} />
          </Suspense>

          {/* 총 이벤트 수 */}
          <StatsCard
            title="총 이벤트"
            value={String(eventCounts?.reduce((sum, e) => sum + Number(e.event_count), 0) || 0)}
            icon={<Activity className="h-5 w-5 text-blue-600" />}
            description="선택한 기간 동안 발생한 이벤트"
            loading={eventCountsLoading}
          />

          {/* 고유 사용자 수 */}
          <StatsCard
            title="고유 사용자"
            value={String(eventCounts?.reduce((sum, e) => sum + Number(e.unique_users), 0) || 0)}
            icon={<Users className="h-5 w-5 text-purple-600" />}
            description="활동한 사용자 수"
            loading={eventCountsLoading}
          />
        </StatsCardGrid>
      </Suspense>

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
    </div>
  )
}

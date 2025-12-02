/**
 * Analytics Behavior Tab Component
 * 사용자 행동 분석 탭 - 동적 import를 위해 분리
 */

import { Suspense, lazy } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { AnalyticsData } from './AnalyticsDataProvider'

const BounceRateCard = lazy(() => import('@/components/analytics/BounceRateCard').then(m => ({ default: m.BounceRateCard })))

const ChartSkeleton = () => (
  <div className="space-y-2">
    {[...Array(3)].map((_, i) => (
      <Skeleton key={i} className="h-24" />
    ))}
  </div>
)

interface BehaviorTabProps {
  data: AnalyticsData
}

export default function BehaviorTab({ data }: BehaviorTabProps) {
  const { bounceData, bounceLoading } = data

  return (
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
  )
}

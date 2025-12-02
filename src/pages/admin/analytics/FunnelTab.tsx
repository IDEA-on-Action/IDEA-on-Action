/**
 * Analytics Funnel Tab Component
 * 퍼널 분석 탭 - 동적 import를 위해 분리
 */

import { Suspense, lazy } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import type { AnalyticsData } from './AnalyticsDataProvider'

const FunnelChart = lazy(() => import('@/components/analytics/FunnelChart').then(m => ({ default: m.FunnelChart })))

const ChartSkeleton = () => (
  <div className="space-y-2">
    {[...Array(3)].map((_, i) => (
      <Skeleton key={i} className="h-24" />
    ))}
  </div>
)

interface FunnelTabProps {
  data: AnalyticsData
}

export default function FunnelTab({ data }: FunnelTabProps) {
  const { funnelData, funnelLoading } = data

  return (
    <Suspense fallback={<ChartSkeleton />}>
      <FunnelChart data={funnelData} loading={funnelLoading} />
    </Suspense>
  )
}

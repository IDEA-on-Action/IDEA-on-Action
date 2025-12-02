/**
 * Analytics Events Tab Component
 * 이벤트 타임라인 탭 - 동적 import를 위해 분리
 */

import { Suspense, lazy } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

const EventTimeline = lazy(() => import('@/components/analytics/EventTimeline').then(m => ({ default: m.EventTimeline })))

const ChartSkeleton = () => (
  <div className="space-y-2">
    {[...Array(3)].map((_, i) => (
      <Skeleton key={i} className="h-24" />
    ))}
  </div>
)

interface EventsTabProps {
  dateRange: {
    start: Date
    end: Date
  }
}

export default function EventsTab({ dateRange }: EventsTabProps) {
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <EventTimeline startDate={dateRange.start} endDate={dateRange.end} />
    </Suspense>
  )
}

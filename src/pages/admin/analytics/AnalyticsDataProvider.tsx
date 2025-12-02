/**
 * Analytics Data Provider
 * v2.28.0: 번들 최적화를 위해 훅을 별도 컴포넌트로 분리
 *
 * 이 컴포넌트는 모든 analytics 훅을 포함하고 있어,
 * 동적 import 시 훅과 그 의존성들이 별도 청크로 분리됩니다.
 */

import { ReactNode } from 'react'
import { useFunnelAnalysis, useBounceRate, useEventCounts } from '@/hooks/useAnalyticsEvents'

export interface AnalyticsData {
  funnelData: ReturnType<typeof useFunnelAnalysis>['data']
  funnelLoading: boolean
  bounceData: ReturnType<typeof useBounceRate>['data']
  bounceLoading: boolean
  eventCounts: ReturnType<typeof useEventCounts>['data']
  eventCountsLoading: boolean
}

interface AnalyticsDataProviderProps {
  dateRange: {
    start: Date
    end: Date
  }
  children: (data: AnalyticsData) => ReactNode
}

export default function AnalyticsDataProvider({ dateRange, children }: AnalyticsDataProviderProps) {
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
    <>
      {children({
        funnelData,
        funnelLoading,
        bounceData,
        bounceLoading,
        eventCounts,
        eventCountsLoading,
      })}
    </>
  )
}

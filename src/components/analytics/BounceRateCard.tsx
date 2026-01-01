/**
 * Phase 14: 이탈률 카드 컴포넌트
 * 세션 이탈률 KPI 표시
 */

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { TrendingDown, TrendingUp, Users, UserX } from 'lucide-react'
import { BounceRateData } from '@/hooks/analytics/useAnalyticsEvents'
import { cn } from '@/lib/utils'

interface BounceRateCardProps {
  data?: BounceRateData
  loading?: boolean
}

export function BounceRateCard({ data, loading }: BounceRateCardProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>이탈률</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24" />
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>이탈률</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">데이터가 없습니다.</p>
        </CardContent>
      </Card>
    )
  }

  // 이탈률 상태 평가
  const getBounceRateStatus = (rate: number) => {
    if (rate < 30) return { label: '매우 좋음', color: 'text-green-600', icon: TrendingDown }
    if (rate < 50) return { label: '양호', color: 'text-blue-600', icon: TrendingDown }
    if (rate < 70) return { label: '보통', color: 'text-orange-600', icon: TrendingUp }
    return { label: '개선 필요', color: 'text-red-600', icon: TrendingUp }
  }

  const status = getBounceRateStatus(data.bounceRate)
  const StatusIcon = status.icon

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>이탈률</span>
          <StatusIcon className={cn('h-5 w-5', status.color)} />
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          단일 페이지만 보고 떠난 세션 비율
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 이탈률 메인 수치 */}
        <div className="text-center">
          <div className={cn('text-5xl font-bold', status.color)}>
            {data.bounceRate.toFixed(1)}%
          </div>
          <div className="text-sm text-muted-foreground mt-2">
            {status.label}
          </div>
        </div>

        {/* 세션 통계 */}
        <div className="grid grid-cols-2 gap-3 pt-4 border-t">
          <div className="flex items-center gap-2 p-3 bg-accent rounded-lg">
            <Users className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-xs text-muted-foreground">전체 세션</p>
              <p className="text-lg font-bold">{data.totalSessions.toLocaleString()}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 bg-accent rounded-lg">
            <UserX className="h-5 w-5 text-red-600" />
            <div>
              <p className="text-xs text-muted-foreground">이탈 세션</p>
              <p className="text-lg font-bold">{data.bouncedSessions.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* 개선 팁 */}
        {data.bounceRate > 50 && (
          <div className="p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
            <p className="text-sm font-semibold text-orange-900 dark:text-orange-100 mb-1">
              💡 개선 팁
            </p>
            <ul className="text-xs text-orange-800 dark:text-orange-200 space-y-1">
              <li>• 첫 페이지 로딩 속도 최적화</li>
              <li>• 명확한 CTA(Call-to-Action) 배치</li>
              <li>• 관련 콘텐츠 추천 강화</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

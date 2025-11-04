/**
 * Phase 14 Week 3: 실시간 메트릭 카드 컴포넌트
 * 실시간 업데이트 표시, 펄스 애니메이션
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Activity } from 'lucide-react'

interface LiveMetricCardProps {
  label: string
  value: string | number
  description?: string
  icon?: React.ReactNode
  isLoading?: boolean
  trend?: {
    value: number
    label: string
  }
}

export function LiveMetricCard({
  label,
  value,
  description,
  icon,
  isLoading,
  trend,
}: LiveMetricCardProps) {
  return (
    <Card className="relative overflow-hidden">
      {/* Live 인디케이터 */}
      <div className="absolute top-2 right-2">
        <Badge variant="outline" className="flex items-center gap-1 bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
          <Activity className="h-3 w-3 text-green-600 animate-pulse" />
          <span className="text-xs text-green-600">LIVE</span>
        </Badge>
      </div>

      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
        {icon}
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <div className="h-8 w-24 bg-muted animate-pulse rounded" />
            {description && <div className="h-3 w-32 bg-muted animate-pulse rounded" />}
          </div>
        ) : (
          <>
            <div className="text-2xl font-bold animate-in fade-in duration-300">
              {value}
            </div>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
            {trend && (
              <div className="mt-2 flex items-center gap-1">
                <span
                  className={`text-xs font-medium ${
                    trend.value >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {trend.value >= 0 ? '▲' : '▼'} {Math.abs(trend.value).toFixed(1)}%
                </span>
                <span className="text-xs text-muted-foreground">{trend.label}</span>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================
// 특수 메트릭 카드
// ============================================

interface OnlineUsersCardProps {
  count: number
  isLoading?: boolean
}

export function OnlineUsersCard({ count, isLoading }: OnlineUsersCardProps) {
  return (
    <LiveMetricCard
      label="실시간 사용자"
      value={`${count}명`}
      description="현재 접속 중"
      icon={<Activity className="h-4 w-4 text-muted-foreground" />}
      isLoading={isLoading}
    />
  )
}

interface ActiveSessionsCardProps {
  count: number
  isLoading?: boolean
}

export function ActiveSessionsCard({ count, isLoading }: ActiveSessionsCardProps) {
  return (
    <LiveMetricCard
      label="활성 세션"
      value={`${count}개`}
      description="최근 30분"
      icon={<Activity className="h-4 w-4 text-muted-foreground" />}
      isLoading={isLoading}
    />
  )
}

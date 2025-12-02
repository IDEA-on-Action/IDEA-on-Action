/**
 * StatsCard 컴포넌트
 * Analytics 대시보드용 KPI 통계 카드
 * 트렌드, 아이콘, 로딩 상태 지원
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { TrendingUp, TrendingDown, Minus, LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

// ============================================
// 타입 정의
// ============================================

export type TrendDirection = 'up' | 'down' | 'neutral'

export interface StatsCardProps {
  /** 카드 제목 (예: "총 매출") */
  title: string
  /** 표시할 값 (예: "₩165,000" 또는 1234) */
  value: string | number
  /** 변화율 퍼센트 (예: 12.5 → "+12.5%") */
  change?: number
  /** 트렌드 방향 (up: 증가, down: 감소, neutral: 변화 없음) */
  trend?: TrendDirection
  /** 좌측 상단 아이콘 */
  icon?: React.ReactNode
  /** 하단 설명 텍스트 (예: "지난 달 대비") */
  description?: string
  /** 로딩 상태 */
  loading?: boolean
  /** 추가 CSS 클래스 */
  className?: string
}

// ============================================
// 헬퍼 함수
// ============================================

/**
 * 트렌드에 따른 색상 클래스 반환
 */
function getTrendColorClass(trend: TrendDirection): string {
  switch (trend) {
    case 'up':
      return 'text-green-600 dark:text-green-400'
    case 'down':
      return 'text-red-600 dark:text-red-400'
    case 'neutral':
    default:
      return 'text-gray-600 dark:text-gray-400'
  }
}

/**
 * 트렌드에 따른 아이콘 컴포넌트 반환
 */
function getTrendIcon(trend: TrendDirection): LucideIcon {
  switch (trend) {
    case 'up':
      return TrendingUp
    case 'down':
      return TrendingDown
    case 'neutral':
    default:
      return Minus
  }
}

/**
 * 트렌드에 따른 배경 색상 클래스 반환
 */
function getTrendBgClass(trend: TrendDirection): string {
  switch (trend) {
    case 'up':
      return 'bg-green-50 dark:bg-green-950/30'
    case 'down':
      return 'bg-red-50 dark:bg-red-950/30'
    case 'neutral':
    default:
      return 'bg-gray-50 dark:bg-gray-950/30'
  }
}

// ============================================
// StatsCard 컴포넌트
// ============================================

export function StatsCard({
  title,
  value,
  change,
  trend = 'neutral',
  icon,
  description,
  loading = false,
  className,
}: StatsCardProps) {
  if (loading) {
    return (
      <Card className={cn('transition-shadow hover:shadow-md', className)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          {icon && <div className="h-5 w-5 text-muted-foreground">{icon}</div>}
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-24 mb-2" />
          {description && <Skeleton className="h-4 w-32" />}
          {change !== undefined && <Skeleton className="h-4 w-20 mt-2" />}
        </CardContent>
      </Card>
    )
  }

  const TrendIcon = getTrendIcon(trend)
  const trendColorClass = getTrendColorClass(trend)
  const trendBgClass = getTrendBgClass(trend)

  return (
    <Card className={cn('transition-shadow hover:shadow-md', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon && <div className="h-5 w-5 text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
        {change !== undefined && (
          <div className={cn('flex items-center gap-1 mt-2 px-2 py-1 rounded-md w-fit', trendBgClass)}>
            <TrendIcon className={cn('h-3 w-3', trendColorClass)} />
            <span className={cn('text-xs font-medium', trendColorClass)}>
              {change >= 0 ? '+' : ''}{change.toFixed(1)}%
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================
// StatsCardGrid 컴포넌트 (복수 카드 배치)
// ============================================

interface StatsCardGridProps {
  /** StatsCard 배열 */
  children: React.ReactNode
  /** 그리드 컬럼 수 (기본: 4) */
  columns?: 1 | 2 | 3 | 4
  /** 추가 CSS 클래스 */
  className?: string
}

export function StatsCardGrid({ children, columns = 4, className }: StatsCardGridProps) {
  const gridColsClass = {
    1: 'grid-cols-1',
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-2 lg:grid-cols-3',
    4: 'md:grid-cols-2 lg:grid-cols-4',
  }[columns]

  return (
    <div className={cn('grid grid-cols-1 gap-4', gridColsClass, className)}>
      {children}
    </div>
  )
}

// Default exports for lazy loading
export default StatsCard

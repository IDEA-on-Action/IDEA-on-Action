/**
 * Phase 14 Week 3: 실시간 대시보드 페이지
 * Supabase Realtime 구독, 자동 새로고침, 실시간 KPI
 */

import { useState } from 'react'
import { useRealtimeDashboard, useAutoRefresh, useRealtimeMetrics } from '@/hooks/useRealtimeDashboard'
import { useKPIs } from '@/hooks/useRevenue'
import { LiveActivityFeed } from '@/components/analytics/LiveActivityFeed'
import { LiveMetricCard, OnlineUsersCard, ActiveSessionsCard } from '@/components/analytics/LiveMetricCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Activity, DollarSign, ShoppingCart, Percent, RefreshCw } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'

export default function RealtimeDashboard() {
  const queryClient = useQueryClient()
  const [refreshInterval, setRefreshInterval] = useState(30000) // 30초
  const [lastRefreshed, setLastRefreshed] = useState(new Date())

  // 실시간 대시보드 훅
  const { liveOrders } = useRealtimeDashboard()
  const { onlineUsers, activeSessions } = useRealtimeMetrics()
  useAutoRefresh(refreshInterval)

  // 오늘 KPI (최근 24시간)
  const today = new Date()
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)

  const { data: kpis, isLoading: kpisLoading } = useKPIs(yesterday, today)

  // 수동 새로고침
  const handleManualRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['kpis'] })
    queryClient.invalidateQueries({ queryKey: ['revenue-by-date'] })
    queryClient.invalidateQueries({ queryKey: ['revenue-by-service'] })
    setLastRefreshed(new Date())
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Activity className="h-8 w-8 text-green-500 animate-pulse" />
          <div>
            <h1 className="text-3xl font-bold">실시간 대시보드</h1>
            <p className="text-sm text-muted-foreground mt-1">
              자동 새로고침: {refreshInterval / 1000}초 ·
              마지막 업데이트: {lastRefreshed.toLocaleTimeString()}
            </p>
          </div>
          <Badge variant="outline" className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
            <Activity className="h-3 w-3 text-green-600 mr-1 animate-pulse" />
            <span className="text-green-600">LIVE</span>
          </Badge>
        </div>

        {/* 수동 새로고침 & 간격 설정 */}
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <Button
              variant={refreshInterval === 10000 ? 'default' : 'outline'}
              size="sm"
              onClick={() => setRefreshInterval(10000)}
            >
              10초
            </Button>
            <Button
              variant={refreshInterval === 30000 ? 'default' : 'outline'}
              size="sm"
              onClick={() => setRefreshInterval(30000)}
            >
              30초
            </Button>
            <Button
              variant={refreshInterval === 60000 ? 'default' : 'outline'}
              size="sm"
              onClick={() => setRefreshInterval(60000)}
            >
              1분
            </Button>
          </div>
          <Button onClick={handleManualRefresh} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            새로고침
          </Button>
        </div>
      </div>

      {/* 실시간 메트릭 (상단) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <OnlineUsersCard count={onlineUsers} />
        <ActiveSessionsCard count={activeSessions} />
        <LiveMetricCard
          label="실시간 방문자"
          value="—"
          description="준비 중"
          icon={<Activity className="h-4 w-4 text-muted-foreground" />}
        />
        <LiveMetricCard
          label="이벤트/분"
          value="—"
          description="준비 중"
          icon={<Activity className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      {/* 오늘 KPI (실시간) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <LiveMetricCard
          label="오늘 매출"
          value={kpis ? `₩${kpis.totalRevenue.toLocaleString()}` : '—'}
          description="완료된 주문"
          icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
          isLoading={kpisLoading}
        />
        <LiveMetricCard
          label="오늘 주문"
          value={kpis ? `${kpis.orderCount}건` : '—'}
          description="완료된 주문"
          icon={<ShoppingCart className="h-4 w-4 text-muted-foreground" />}
          isLoading={kpisLoading}
        />
        <LiveMetricCard
          label="평균 주문액"
          value={kpis ? `₩${kpis.averageOrderValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '—'}
          description="AOV (Average Order Value)"
          icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
          isLoading={kpisLoading}
        />
        <LiveMetricCard
          label="전환율"
          value={kpis ? `${kpis.conversionRate.toFixed(2)}%` : '—'}
          description="방문자 대비 구매"
          icon={<Percent className="h-4 w-4 text-muted-foreground" />}
          isLoading={kpisLoading}
        />
      </div>

      {/* 실시간 활동 피드 */}
      <LiveActivityFeed orders={liveOrders} />

      {/* 안내 메시지 */}
      <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
        <p className="font-medium mb-2">💡 실시간 업데이트 정보</p>
        <ul className="list-disc list-inside space-y-1">
          <li>새로운 주문이 생성되면 자동으로 "실시간 활동" 피드에 표시됩니다.</li>
          <li>KPI 데이터는 {refreshInterval / 1000}초마다 자동으로 새로고침됩니다.</li>
          <li>Supabase Realtime을 사용하여 데이터베이스 변경사항을 실시간으로 감지합니다.</li>
          <li>수동 새로고침 버튼을 클릭하여 즉시 데이터를 업데이트할 수 있습니다.</li>
        </ul>
      </div>
    </div>
  )
}

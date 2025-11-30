/**
 * Central Hub Dashboard
 *
 * Minu 서비스(Find, Frame, Build, Keep)의 중앙 관리 대시보드
 * 실시간 동기화 및 알림 패널을 포함합니다.
 *
 * @module pages/admin/CentralHubDashboard
 */

import { EventTimeline } from '@/components/central-hub/EventTimeline';
import { IssueList } from '@/components/central-hub/IssueList';
import { StatisticsChart } from '@/components/central-hub/StatisticsChart';
import { RealtimeAlertPanel } from '@/components/central-hub/RealtimeAlertPanel';
import { ServiceStatusDashboard } from '@/components/admin/ServiceStatusDashboard';
import { ExportButton } from '@/components/skills/ExportButton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Activity, ListTodo, BarChart3, Bell } from 'lucide-react';
import {
  useRealtimeServiceStatus,
  useConnectionStatusDisplay,
} from '@/hooks/useRealtimeServiceStatus';
import { useRealtimeEventStream } from '@/hooks/useRealtimeEventStream';
import { useServiceHealth } from '@/hooks/useServiceHealth';
import { cn } from '@/lib/utils';

// ============================================================================
// 메인 컴포넌트
// ============================================================================

/**
 * Central Hub Dashboard
 *
 * Minu 서비스들의 상태, 이벤트, 이슈를 한눈에 확인하고 관리하는 대시보드입니다.
 *
 * 주요 기능:
 * - 4개 서비스의 헬스 상태 카드 (실시간 동기화)
 * - 탭 기반 뷰 (Overview, Events, Issues, Alerts)
 * - 실시간 알림 패널
 * - Excel 내보내기 기능
 */
export default function CentralHubDashboard() {
  // 실시간 서비스 상태 (전역)
  const { connectionState: serviceConnectionState, isConnected } = useRealtimeServiceStatus();
  const serviceStatusDisplay = useConnectionStatusDisplay(serviceConnectionState);

  // 실시간 이벤트 스트림 (알림 카운트용)
  const { unreadCount } = useRealtimeEventStream();

  // 서비스 헬스 데이터 (ServiceStatusDashboard용)
  const { data: healthData, isLoading, refetch, isRefetching } = useServiceHealth();

  return (
    <div className="space-y-6">
      {/* 헤더: 제목 + 연결 상태 + Excel 내보내기 버튼 */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Central Hub Dashboard</h1>
            <p className="text-muted-foreground">
              Minu 서비스의 상태와 이벤트를 실시간으로 모니터링합니다.
            </p>
          </div>
          <ExportButton variant="outline" size="default">
            Excel 내보내기
          </ExportButton>
        </div>

        {/* 연결 상태 인디케이터 */}
        <div
          className={cn(
            'inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm w-fit',
            serviceStatusDisplay.statusBgColor
          )}
        >
          <div
            className={cn(
              'h-3 w-3 rounded-full animate-pulse',
              serviceStatusDisplay.statusColor.replace('text-', 'bg-')
            )}
          />
          <span className={serviceStatusDisplay.statusColor}>
            실시간 동기화: {serviceStatusDisplay.statusText}
          </span>
          {serviceStatusDisplay.isReconnecting && (
            <Badge variant="outline" className="text-xs">
              재연결 중...
            </Badge>
          )}
        </div>
      </div>

      {/* 탭 UI */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:w-[520px]">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="events" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">Events</span>
          </TabsTrigger>
          <TabsTrigger value="issues" className="flex items-center gap-2">
            <ListTodo className="h-4 w-4" />
            <span className="hidden sm:inline">Issues</span>
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Alerts</span>
            {unreadCount > 0 && (
              <Badge variant="default" className="ml-1 bg-blue-500 text-xs h-5 w-5 p-0 flex items-center justify-center">
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Overview 탭 */}
        <TabsContent value="overview" className="space-y-6">
          {/* 서비스 상태 대시보드 (2x2 그리드) */}
          <ServiceStatusDashboard
            healthData={healthData}
            isRealtimeConnected={isConnected}
            lastUpdated={serviceConnectionState.lastConnectedAt?.toISOString()}
            isLoading={isLoading}
            onRefresh={() => refetch()}
            isRefreshing={isRefetching}
          />

          {/* 통계 차트 */}
          <StatisticsChart />

          {/* 이벤트 타임라인 + 이슈 목록 (2열) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <EventTimeline limit={20} maxHeight="h-[400px]" />
            <IssueList maxHeight="h-[400px]" />
          </div>
        </TabsContent>

        {/* Events 탭 */}
        <TabsContent value="events">
          <EventTimeline limit={100} maxHeight="h-[600px]" />
        </TabsContent>

        {/* Issues 탭 */}
        <TabsContent value="issues">
          <IssueList maxHeight="h-[600px]" />
        </TabsContent>

        {/* Alerts 탭 (실시간 알림 패널) */}
        <TabsContent value="alerts">
          <RealtimeAlertPanel maxDisplay={50} maxHeight="h-[600px]" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

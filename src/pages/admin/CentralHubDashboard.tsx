/**
 * Central Hub Dashboard
 *
 * Minu 서비스(Find, Frame, Build, Keep)의 중앙 관리 대시보드
 * 4개 컴포넌트(ServiceHealthCard, EventTimeline, IssueList, StatisticsChart)를 통합하고
 * Excel 내보내기 기능을 제공합니다.
 *
 * @module pages/admin/CentralHubDashboard
 */

import { ServiceHealthCard } from '@/components/central-hub/ServiceHealthCard';
import { EventTimeline } from '@/components/central-hub/EventTimeline';
import { IssueList } from '@/components/central-hub/IssueList';
import { StatisticsChart } from '@/components/central-hub/StatisticsChart';
import { ExportButton } from '@/components/skills/ExportButton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity, ListTodo, BarChart3 } from 'lucide-react';
import type { ServiceId } from '@/types/central-hub.types';

// ============================================================================
// 상수
// ============================================================================

/** Minu 서비스 ID 목록 */
const SERVICE_IDS: ServiceId[] = ['minu-find', 'minu-frame', 'minu-build', 'minu-keep'];

// ============================================================================
// 메인 컴포넌트
// ============================================================================

/**
 * Central Hub Dashboard
 *
 * Minu 서비스들의 상태, 이벤트, 이슈를 한눈에 확인하고 관리하는 대시보드입니다.
 *
 * 주요 기능:
 * - 4개 서비스의 헬스 상태 카드
 * - 탭 기반 뷰 (Overview, Events, Issues)
 * - Excel 내보내기 기능
 */
export default function CentralHubDashboard() {
  return (
    <div className="space-y-6">
      {/* 헤더: 제목 + Excel 내보내기 버튼 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Central Hub Dashboard</h1>
          <p className="text-muted-foreground">
            Minu 서비스의 상태와 이벤트를 모니터링합니다.
          </p>
        </div>
        <ExportButton variant="outline" size="default">
          Excel 내보내기
        </ExportButton>
      </div>

      {/* 서비스 헬스 카드 그리드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {SERVICE_IDS.map((serviceId) => (
          <ServiceHealthCard key={serviceId} serviceId={serviceId} />
        ))}
      </div>

      {/* 탭 UI */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
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
        </TabsList>

        {/* Overview 탭 */}
        <TabsContent value="overview" className="space-y-6">
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
      </Tabs>
    </div>
  );
}

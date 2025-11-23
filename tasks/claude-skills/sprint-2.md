# Sprint 2: frontend-design Skill + 대시보드

> Central Hub 대시보드 UI 컴포넌트 구현

**시작일**: 2025-11-23
**완료일**: 2025-11-23
**실제 소요**: ~8시간 (병렬 에이전트 4개)
**상태**: ✅ 완료
**관련 명세**: [spec/claude-skills/requirements.md](../../spec/claude-skills/requirements.md)
**관련 설계**: [plan/claude-skills/architecture.md](../../plan/claude-skills/architecture.md)
**선행 조건**: Sprint 1 (xlsx Skill) 완료

---

## 목표

1. ServiceHealthCard 컴포넌트 구현
2. EventTimeline 컴포넌트 구현
3. IssueList 컴포넌트 구현
4. StatisticsChart 컴포넌트 구현
5. Central Hub 대시보드 페이지 통합
6. Realtime 연동
7. E2E 테스트 작성

---

## 작업 목록

### TASK-CS-009: ServiceHealthCard 컴포넌트

**예상 시간**: 2시간
**상태**: ⏳ 대기

**작업 내용**:

```typescript
// src/components/dashboard/ServiceHealthCard.tsx

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { useServiceHealth } from '@/hooks/useServiceHealth';
import { SERVICE_INFO, HEALTH_COLORS } from '@/types/central-hub.types';
import type { ServiceId, HealthStatus } from '@/types/central-hub.types';
import { cn } from '@/lib/utils';

interface ServiceHealthCardProps {
  serviceId: ServiceId;
  className?: string;
}

const statusIcons: Record<HealthStatus, React.ReactNode> = {
  healthy: <CheckCircle className="h-5 w-5 text-green-500" />,
  warning: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
  critical: <XCircle className="h-5 w-5 text-red-500" />,
  unknown: <Activity className="h-5 w-5 text-gray-500" />,
};

export function ServiceHealthCard({ serviceId, className }: ServiceHealthCardProps) {
  const { data: health, isLoading, error } = useServiceHealth(serviceId);

  if (isLoading) {
    return (
      <Card className={cn('animate-pulse', className)}>
        <CardHeader className="pb-2">
          <div className="h-5 bg-muted rounded w-24" />
        </CardHeader>
        <CardContent>
          <div className="h-8 bg-muted rounded w-16" />
        </CardContent>
      </Card>
    );
  }

  if (error || !health) {
    return (
      <Card className={cn('border-destructive', className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{SERVICE_INFO[serviceId]?.name || serviceId}</CardTitle>
        </CardHeader>
        <CardContent>
          <Badge variant="destructive">연결 오류</Badge>
        </CardContent>
      </Card>
    );
  }

  const serviceInfo = SERVICE_INFO[serviceId];
  const statusColor = HEALTH_COLORS[health.status];

  return (
    <Card className={cn('transition-all hover:shadow-md', className)}>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{serviceInfo?.icon}</span>
          <CardTitle className="text-sm font-medium">
            {serviceInfo?.name || serviceId}
          </CardTitle>
        </div>
        {statusIcons[health.status]}
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <Badge
            variant="outline"
            className={cn('text-xs', statusColor)}
          >
            {health.status === 'healthy' && '정상'}
            {health.status === 'warning' && '주의'}
            {health.status === 'critical' && '위험'}
            {health.status === 'unknown' && '알 수 없음'}
          </Badge>

          <span className="text-xs text-muted-foreground">
            {health.last_ping
              ? `${formatRelativeTime(health.last_ping)} 전`
              : '핑 없음'}
          </span>
        </div>

        {health.metrics && (
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            {Object.entries(health.metrics).slice(0, 4).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="text-muted-foreground">{key}:</span>
                <span className="font-medium">{String(value)}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function formatRelativeTime(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '방금';
  if (minutes < 60) return `${minutes}분`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간`;
  return `${Math.floor(hours / 24)}일`;
}
```

**완료 조건**:
- [ ] 4개 서비스 상태 카드 렌더링
- [ ] 상태별 색상 및 아이콘 표시
- [ ] 로딩/에러 상태 처리
- [ ] 마지막 핑 시간 상대 표시

---

### TASK-CS-010: EventTimeline 컴포넌트

**예상 시간**: 2시간
**상태**: ⏳ 대기

**작업 내용**:

```typescript
// src/components/dashboard/EventTimeline.tsx

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useServiceEvents } from '@/hooks/useServiceEvents';
import { SERVICE_INFO, EVENT_TYPE_LABELS } from '@/types/central-hub.types';
import type { ServiceId, ServiceEvent } from '@/types/central-hub.types';
import { cn } from '@/lib/utils';
import { Clock, Filter } from 'lucide-react';

interface EventTimelineProps {
  className?: string;
  limit?: number;
}

export function EventTimeline({ className, limit = 50 }: EventTimelineProps) {
  const [serviceFilter, setServiceFilter] = useState<ServiceId | 'all'>('all');
  const { data: events, isLoading } = useServiceEvents({
    serviceId: serviceFilter === 'all' ? undefined : serviceFilter,
    limit,
  });

  const eventTypeColors: Record<string, string> = {
    'issue.created': 'bg-red-100 text-red-800',
    'issue.resolved': 'bg-green-100 text-green-800',
    'service.health': 'bg-blue-100 text-blue-800',
    'project.created': 'bg-purple-100 text-purple-800',
    'project.updated': 'bg-yellow-100 text-yellow-800',
  };

  return (
    <Card className={cn('h-full', className)}>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4" />
          이벤트 타임라인
        </CardTitle>

        <Select value={serviceFilter} onValueChange={(v) => setServiceFilter(v as ServiceId | 'all')}>
          <SelectTrigger className="w-32 h-8">
            <Filter className="h-3 w-3 mr-1" />
            <SelectValue placeholder="필터" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            <SelectItem value="minu-find">Minu Find</SelectItem>
            <SelectItem value="minu-frame">Minu Frame</SelectItem>
            <SelectItem value="minu-build">Minu Build</SelectItem>
            <SelectItem value="minu-keep">Minu Keep</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>

      <CardContent className="p-0">
        <ScrollArea className="h-[400px] px-4">
          {isLoading ? (
            <div className="space-y-3 py-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse flex gap-3">
                  <div className="h-8 w-8 rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : events?.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              이벤트가 없습니다
            </div>
          ) : (
            <div className="relative py-2">
              {/* 타임라인 선 */}
              <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

              {events?.map((event, index) => (
                <EventItem
                  key={event.id}
                  event={event}
                  colorClass={eventTypeColors[event.event_type] || 'bg-gray-100 text-gray-800'}
                  isNew={index === 0}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

interface EventItemProps {
  event: ServiceEvent;
  colorClass: string;
  isNew?: boolean;
}

function EventItem({ event, colorClass, isNew }: EventItemProps) {
  const serviceInfo = SERVICE_INFO[event.service_id];

  return (
    <div className={cn(
      'relative pl-10 pb-4 transition-all',
      isNew && 'animate-in slide-in-from-top-2'
    )}>
      {/* 타임라인 점 */}
      <div className="absolute left-2.5 w-3 h-3 rounded-full bg-background border-2 border-primary" />

      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-lg">{serviceInfo?.icon}</span>
            <Badge variant="outline" className={cn('text-xs', colorClass)}>
              {EVENT_TYPE_LABELS[event.event_type] || event.event_type}
            </Badge>
          </div>

          {event.payload?.message && (
            <p className="mt-1 text-sm text-muted-foreground truncate">
              {event.payload.message}
            </p>
          )}
        </div>

        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {formatTime(event.created_at)}
        </span>
      </div>
    </div>
  );
}

function formatTime(date: string): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return '방금';
  if (diffMins < 60) return `${diffMins}분 전`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}시간 전`;

  return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}
```

**완료 조건**:
- [ ] 최근 50개 이벤트 시간순 표시
- [ ] 서비스별 필터링 작동
- [ ] 새 이벤트 애니메이션 효과
- [ ] 스크롤 영역 정상 작동

---

### TASK-CS-011: IssueList 컴포넌트

**예상 시간**: 2시간
**상태**: ⏳ 대기

**작업 내용**:

```typescript
// src/components/dashboard/IssueList.tsx

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useServiceIssues, useUpdateIssueStatus } from '@/hooks/useServiceIssues';
import { SERVICE_INFO, SEVERITY_COLORS, STATUS_COLORS } from '@/types/central-hub.types';
import type { ServiceIssue, IssueStatus, IssueSeverity } from '@/types/central-hub.types';
import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle2, Clock, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface IssueListProps {
  className?: string;
}

const severityOrder: IssueSeverity[] = ['critical', 'high', 'medium', 'low'];

export function IssueList({ className }: IssueListProps) {
  const [statusFilter, setStatusFilter] = useState<IssueStatus | 'all'>('all');
  const { data: issues, isLoading } = useServiceIssues({
    status: statusFilter === 'all' ? undefined : statusFilter,
  });

  // 심각도 순 정렬
  const sortedIssues = issues?.slice().sort((a, b) => {
    return severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity);
  });

  return (
    <Card className={cn('h-full', className)}>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          이슈 목록
          {issues && issues.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {issues.length}
            </Badge>
          )}
        </CardTitle>

        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as IssueStatus | 'all')}>
          <SelectTrigger className="w-28 h-8">
            <SelectValue placeholder="상태" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            <SelectItem value="open">열림</SelectItem>
            <SelectItem value="in_progress">진행 중</SelectItem>
            <SelectItem value="resolved">해결됨</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>

      <CardContent className="p-0">
        <ScrollArea className="h-[350px] px-4">
          {isLoading ? (
            <div className="space-y-3 py-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="animate-pulse p-3 border rounded-lg">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : sortedIssues?.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground flex flex-col items-center gap-2">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
              <span>해결되지 않은 이슈가 없습니다</span>
            </div>
          ) : (
            <div className="space-y-2 py-2">
              {sortedIssues?.map((issue) => (
                <IssueItem key={issue.id} issue={issue} />
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

interface IssueItemProps {
  issue: ServiceIssue;
}

function IssueItem({ issue }: IssueItemProps) {
  const updateStatus = useUpdateIssueStatus();
  const serviceInfo = SERVICE_INFO[issue.service_id];

  const handleStatusChange = async (newStatus: IssueStatus) => {
    await updateStatus.mutateAsync({ id: issue.id, status: newStatus });
  };

  return (
    <div className={cn(
      'p-3 border rounded-lg transition-all hover:bg-muted/50',
      issue.severity === 'critical' && 'border-l-4 border-l-red-500',
      issue.severity === 'high' && 'border-l-4 border-l-orange-500',
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-lg">{serviceInfo?.icon}</span>
            <Badge
              variant="outline"
              className={cn('text-xs', SEVERITY_COLORS[issue.severity])}
            >
              {issue.severity}
            </Badge>
            <Badge
              variant="outline"
              className={cn('text-xs', STATUS_COLORS[issue.status])}
            >
              {issue.status === 'open' && '열림'}
              {issue.status === 'in_progress' && '진행 중'}
              {issue.status === 'resolved' && '해결됨'}
            </Badge>
          </div>

          <h4 className="font-medium text-sm truncate">{issue.title}</h4>

          {issue.description && (
            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
              {issue.description}
            </p>
          )}

          <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDate(issue.created_at)}
            </span>
            {issue.assignee_id && (
              <span>담당자 배정됨</span>
            )}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleStatusChange('open')}>
              열림으로 변경
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleStatusChange('in_progress')}>
              진행 중으로 변경
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleStatusChange('resolved')}>
              해결됨으로 변경
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
```

**완료 조건**:
- [ ] 이슈 목록 심각도 순 정렬
- [ ] 상태별 필터링 작동
- [ ] 상태 변경 드롭다운 작동
- [ ] 심각도별 시각적 구분

---

### TASK-CS-012: StatisticsChart 컴포넌트

**예상 시간**: 2시간
**상태**: ⏳ 대기

**작업 내용**:

```typescript
// src/components/dashboard/StatisticsChart.tsx

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useServiceEventStats } from '@/hooks/useServiceEvents';
import { useServiceIssueStats } from '@/hooks/useServiceIssues';
import { BarChart, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatisticsChartProps {
  className?: string;
}

export function StatisticsChart({ className }: StatisticsChartProps) {
  const { data: eventStats } = useServiceEventStats();
  const { data: issueStats } = useServiceIssueStats();

  const stats = useMemo(() => {
    if (!eventStats || !issueStats) return null;

    return {
      totalEvents: eventStats.total,
      totalIssues: issueStats.total,
      openIssues: issueStats.byStatus.open || 0,
      criticalIssues: issueStats.bySeverity.critical || 0,
      resolutionRate: issueStats.total > 0
        ? Math.round((issueStats.byStatus.resolved || 0) / issueStats.total * 100)
        : 0,
      eventsByService: eventStats.byService,
      issuesByService: issueStats.byService,
    };
  }, [eventStats, issueStats]);

  if (!stats) {
    return (
      <Card className={cn('animate-pulse', className)}>
        <CardHeader>
          <div className="h-5 bg-muted rounded w-24" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart className="h-4 w-4" />
          통계 요약
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="총 이벤트"
            value={stats.totalEvents}
            trend="neutral"
          />
          <StatCard
            label="총 이슈"
            value={stats.totalIssues}
            trend={stats.openIssues > 5 ? 'down' : 'up'}
          />
          <StatCard
            label="미해결 이슈"
            value={stats.openIssues}
            trend={stats.openIssues > 3 ? 'down' : 'up'}
            highlight={stats.openIssues > 5}
          />
          <StatCard
            label="해결률"
            value={`${stats.resolutionRate}%`}
            trend={stats.resolutionRate >= 80 ? 'up' : 'down'}
          />
        </div>

        {/* 서비스별 이벤트 분포 */}
        <div className="mt-6">
          <h4 className="text-sm font-medium mb-3">서비스별 이벤트</h4>
          <div className="space-y-2">
            {Object.entries(stats.eventsByService).map(([service, count]) => (
              <ServiceBar
                key={service}
                service={service}
                count={count}
                total={stats.totalEvents}
              />
            ))}
          </div>
        </div>

        {/* 서비스별 이슈 분포 */}
        <div className="mt-6">
          <h4 className="text-sm font-medium mb-3">서비스별 이슈</h4>
          <div className="space-y-2">
            {Object.entries(stats.issuesByService).map(([service, count]) => (
              <ServiceBar
                key={service}
                service={service}
                count={count}
                total={stats.totalIssues}
                variant="issue"
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface StatCardProps {
  label: string;
  value: number | string;
  trend: 'up' | 'down' | 'neutral';
  highlight?: boolean;
}

function StatCard({ label, value, trend, highlight }: StatCardProps) {
  return (
    <div className={cn(
      'p-3 rounded-lg border',
      highlight && 'border-destructive bg-destructive/5'
    )}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        {trend === 'up' && <TrendingUp className="h-3 w-3 text-green-500" />}
        {trend === 'down' && <TrendingDown className="h-3 w-3 text-red-500" />}
        {trend === 'neutral' && <Minus className="h-3 w-3 text-gray-400" />}
      </div>
      <p className={cn(
        'text-2xl font-bold mt-1',
        highlight && 'text-destructive'
      )}>
        {value}
      </p>
    </div>
  );
}

interface ServiceBarProps {
  service: string;
  count: number;
  total: number;
  variant?: 'event' | 'issue';
}

function ServiceBar({ service, count, total, variant = 'event' }: ServiceBarProps) {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  const serviceName = service.replace('minu-', 'Minu ').replace(/^\w/, c => c.toUpperCase());

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs w-20 truncate">{serviceName}</span>
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            variant === 'event' ? 'bg-blue-500' : 'bg-orange-500'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground w-8 text-right">{count}</span>
    </div>
  );
}
```

**완료 조건**:
- [ ] 4개 주요 지표 카드 표시
- [ ] 서비스별 이벤트/이슈 분포 막대 그래프
- [ ] 트렌드 아이콘 표시
- [ ] 하이라이트 상태 작동

---

### TASK-CS-013: 대시보드 페이지 통합

**예상 시간**: 2시간
**상태**: ⏳ 대기
**의존성**: TASK-CS-009 ~ TASK-CS-012

**작업 내용**:

```typescript
// src/pages/admin/CentralHubDashboard.tsx

import { ServiceHealthCard } from '@/components/dashboard/ServiceHealthCard';
import { EventTimeline } from '@/components/dashboard/EventTimeline';
import { IssueList } from '@/components/dashboard/IssueList';
import { StatisticsChart } from '@/components/dashboard/StatisticsChart';
import { ExportButton } from '@/components/skills/ExportButton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { ServiceId } from '@/types/central-hub.types';
import { Activity, FileSpreadsheet, AlertTriangle, BarChart3 } from 'lucide-react';

const services: ServiceId[] = ['minu-find', 'minu-frame', 'minu-build', 'minu-keep'];

export function CentralHubDashboard() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Central Hub 대시보드</h1>
          <p className="text-muted-foreground">
            Minu 서비스 통합 모니터링
          </p>
        </div>
        <ExportButton />
      </div>

      {/* 서비스 헬스 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {services.map((serviceId) => (
          <ServiceHealthCard key={serviceId} serviceId={serviceId} />
        ))}
      </div>

      {/* 탭 콘텐츠 */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            개요
          </TabsTrigger>
          <TabsTrigger value="events" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            이벤트
          </TabsTrigger>
          <TabsTrigger value="issues" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            이슈
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <StatisticsChart />
            <EventTimeline limit={20} />
          </div>
          <IssueList />
        </TabsContent>

        <TabsContent value="events">
          <EventTimeline limit={100} className="h-[600px]" />
        </TabsContent>

        <TabsContent value="issues">
          <IssueList className="h-[600px]" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default CentralHubDashboard;
```

**완료 조건**:
- [ ] 대시보드 페이지 레이아웃 완성
- [ ] 4개 서비스 헬스 카드 표시
- [ ] 탭 전환 정상 작동
- [ ] Excel 내보내기 버튼 연동

---

### TASK-CS-014: Realtime 연동

**예상 시간**: 1시간
**상태**: ⏳ 대기
**의존성**: TASK-CS-013

**작업 내용**:

```typescript
// src/hooks/useRealtimeDashboard.ts

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '@/hooks/useSupabase';

export function useRealtimeDashboard() {
  const { supabase } = useSupabase();
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('dashboard-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'service_events' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['service-events'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'service_issues' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['service-issues'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'service_health' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['service-health'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, queryClient]);
}

// CentralHubDashboard.tsx에서 사용
// useRealtimeDashboard();
```

**완료 조건**:
- [ ] 이벤트 테이블 변경 시 UI 자동 업데이트
- [ ] 이슈 테이블 변경 시 UI 자동 업데이트
- [ ] 헬스 테이블 변경 시 UI 자동 업데이트
- [ ] 컴포넌트 언마운트 시 채널 정리

---

### TASK-CS-015: 반응형 레이아웃

**예상 시간**: 1시간
**상태**: ⏳ 대기
**의존성**: TASK-CS-013

**작업 내용**:

Tailwind CSS 반응형 클래스를 활용하여 모바일/태블릿/데스크톱 레이아웃 최적화

**완료 조건**:
- [ ] 모바일: 단일 컬럼 레이아웃
- [ ] 태블릿: 2컬럼 그리드
- [ ] 데스크톱: 4컬럼 그리드
- [ ] 스크롤 영역 터치 최적화

---

### TASK-CS-016: E2E 테스트 작성

**예상 시간**: 2시간
**상태**: ⏳ 대기
**의존성**: TASK-CS-013 ~ TASK-CS-015

**작업 내용**:

```typescript
// tests/e2e/dashboard/central-hub-dashboard.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Central Hub 대시보드', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="email"]', process.env.TEST_ADMIN_EMAIL!);
    await page.fill('[name="password"]', process.env.TEST_ADMIN_PASSWORD!);
    await page.click('button[type="submit"]');
    await page.waitForURL('/admin');
  });

  test('대시보드 페이지 로딩', async ({ page }) => {
    await page.goto('/admin/central-hub');
    await expect(page.getByRole('heading', { name: /Central Hub/i })).toBeVisible();
  });

  test('4개 서비스 헬스 카드 표시', async ({ page }) => {
    await page.goto('/admin/central-hub');
    await expect(page.getByText('Minu Find')).toBeVisible();
    await expect(page.getByText('Minu Frame')).toBeVisible();
    await expect(page.getByText('Minu Build')).toBeVisible();
    await expect(page.getByText('Minu Keep')).toBeVisible();
  });

  test('이벤트 타임라인 필터링', async ({ page }) => {
    await page.goto('/admin/central-hub');
    await page.click('[data-testid="event-filter"]');
    await page.click('text=Minu Find');
    // 필터링된 결과 확인
  });

  test('이슈 상태 변경', async ({ page }) => {
    await page.goto('/admin/central-hub');
    await page.click('[data-testid="issue-menu"]');
    await page.click('text=해결됨으로 변경');
    await expect(page.getByText('해결됨')).toBeVisible();
  });

  test('탭 전환', async ({ page }) => {
    await page.goto('/admin/central-hub');
    await page.click('text=이벤트');
    await expect(page.getByTestId('event-timeline')).toBeVisible();
    await page.click('text=이슈');
    await expect(page.getByTestId('issue-list')).toBeVisible();
  });
});
```

**완료 조건**:
- [ ] E2E 테스트 5개 작성
- [ ] 모든 테스트 통과
- [ ] CI/CD 파이프라인에 추가

---

## 완료 조건

- [ ] ServiceHealthCard 컴포넌트 완성
- [ ] EventTimeline 컴포넌트 완성
- [ ] IssueList 컴포넌트 완성
- [ ] StatisticsChart 컴포넌트 완성
- [ ] 대시보드 페이지 통합 완료
- [ ] Realtime 연동 완료
- [ ] 반응형 레이아웃 완료
- [ ] E2E 테스트 5개 통과
- [ ] Lighthouse 성능 점수 90+ 유지

---

## 다음 Sprint

[Sprint 3: docx Skill 통합](sprint-3.md)

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|----------|--------|
| 1.0.0 | 2025-11-23 | 초기 작성 | Claude |

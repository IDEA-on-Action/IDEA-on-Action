/**
 * AlertFilterPanel 컴포넌트
 *
 * 알림 필터링 UI 컴포넌트
 * 서비스별, 심각도별, 날짜 범위별 필터를 제공합니다.
 *
 * @module components/central-hub/AlertFilterPanel
 */

import { useState } from 'react';
import { Filter, X, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type {
  ServiceId,
  IssueSeverity,
  EventType,
} from '@/types/central-hub.types';
import { SERVICE_INFO } from '@/types/central-hub.types';
import type { StreamFilterOptions } from '@/hooks/useRealtimeEventStream';

// ============================================================================
// 타입 정의
// ============================================================================

interface AlertFilterPanelProps {
  /** 현재 필터 */
  filters: StreamFilterOptions;
  /** 필터 변경 콜백 */
  onFiltersChange: (filters: Partial<StreamFilterOptions>) => void;
  /** 추가 CSS 클래스 */
  className?: string;
}

// ============================================================================
// 상수
// ============================================================================

const ALL_SERVICES: ServiceId[] = ['minu-find', 'minu-frame', 'minu-build', 'minu-keep'];
const ALL_SEVERITIES: IssueSeverity[] = ['critical', 'high', 'medium', 'low'];
const ALL_EVENT_TYPES: EventType[] = [
  'progress.updated',
  'task.completed',
  'task.started',
  'milestone.reached',
  'issue.created',
  'issue.resolved',
  'issue.updated',
  'service.health',
  'user.action',
];

// ============================================================================
// 헬퍼 함수
// ============================================================================

/**
 * 심각도 한글 라벨
 */
function getSeverityLabel(severity: IssueSeverity): string {
  const labels: Record<IssueSeverity, string> = {
    critical: '심각',
    high: '높음',
    medium: '보통',
    low: '낮음',
  };
  return labels[severity];
}

/**
 * 심각도 배지 색상
 */
function getSeverityBadgeClass(severity: IssueSeverity): string {
  switch (severity) {
    case 'critical':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    case 'high':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    case 'low':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
  }
}

/**
 * 이벤트 타입 한글 라벨
 */
function getEventTypeLabel(eventType: EventType): string {
  const labels: Record<EventType, string> = {
    'progress.updated': '진행 상태 업데이트',
    'task.completed': '작업 완료',
    'task.started': '작업 시작',
    'milestone.reached': '마일스톤 달성',
    'issue.created': '이슈 생성',
    'issue.resolved': '이슈 해결',
    'issue.updated': '이슈 업데이트',
    'service.health': '서비스 헬스',
    'user.action': '사용자 액션',
  };
  return labels[eventType] || eventType;
}

// ============================================================================
// 메인 컴포넌트
// ============================================================================

/**
 * AlertFilterPanel
 *
 * 알림 필터링 UI를 제공하는 컴포넌트입니다.
 *
 * @param filters - 현재 필터 상태
 * @param onFiltersChange - 필터 변경 콜백
 * @param className - 추가 CSS 클래스
 */
export function AlertFilterPanel({
  filters,
  onFiltersChange,
  className,
}: AlertFilterPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  // 현재 활성화된 필터 수
  const activeFilterCount =
    (filters.serviceFilter?.length || 0) +
    (filters.severityFilter?.length || 0) +
    (filters.eventTypeFilter?.length || 0) +
    (filters.enableEvents === false ? 1 : 0) +
    (filters.enableIssues === false ? 1 : 0);

  // 서비스 필터 토글
  const toggleService = (serviceId: ServiceId) => {
    const current = filters.serviceFilter || [];
    const updated = current.includes(serviceId)
      ? current.filter((id) => id !== serviceId)
      : [...current, serviceId];

    onFiltersChange({
      serviceFilter: updated.length === 0 ? undefined : updated,
    });
  };

  // 심각도 필터 토글
  const toggleSeverity = (severity: IssueSeverity) => {
    const current = filters.severityFilter || [];
    const updated = current.includes(severity)
      ? current.filter((s) => s !== severity)
      : [...current, severity];

    onFiltersChange({
      severityFilter: updated.length === 0 ? undefined : updated,
    });
  };

  // 이벤트 타입 필터 토글
  const toggleEventType = (eventType: EventType) => {
    const current = filters.eventTypeFilter || [];
    const updated = current.includes(eventType)
      ? current.filter((t) => t !== eventType)
      : [...current, eventType];

    onFiltersChange({
      eventTypeFilter: updated.length === 0 ? undefined : updated,
    });
  };

  // 이벤트/이슈 활성화 토글
  const toggleEnableEvents = () => {
    onFiltersChange({ enableEvents: !filters.enableEvents });
  };

  const toggleEnableIssues = () => {
    onFiltersChange({ enableIssues: !filters.enableIssues });
  };

  // 모든 필터 초기화
  const resetFilters = () => {
    onFiltersChange({
      serviceFilter: undefined,
      severityFilter: undefined,
      eventTypeFilter: undefined,
      enableEvents: true,
      enableIssues: true,
    });
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* 필터 버튼 */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" />
            필터
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1 text-xs">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="end">
          <div className="space-y-4">
            {/* 헤더 */}
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">필터</h4>
              {activeFilterCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetFilters}
                  className="h-auto p-1 text-xs"
                >
                  초기화
                </Button>
              )}
            </div>

            <Separator />

            {/* 이벤트/이슈 활성화 */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground">
                알림 유형
              </Label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="enable-events"
                    checked={filters.enableEvents !== false}
                    onCheckedChange={toggleEnableEvents}
                  />
                  <Label htmlFor="enable-events" className="text-sm cursor-pointer">
                    이벤트 알림
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="enable-issues"
                    checked={filters.enableIssues !== false}
                    onCheckedChange={toggleEnableIssues}
                  />
                  <Label htmlFor="enable-issues" className="text-sm cursor-pointer">
                    이슈 알림
                  </Label>
                </div>
              </div>
            </div>

            <Separator />

            {/* 서비스 필터 */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground">
                서비스
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {ALL_SERVICES.map((serviceId) => {
                  const serviceInfo = SERVICE_INFO[serviceId];
                  const isSelected = filters.serviceFilter?.includes(serviceId);

                  return (
                    <div
                      key={serviceId}
                      className="flex items-center gap-2"
                    >
                      <Checkbox
                        id={`service-${serviceId}`}
                        checked={isSelected}
                        onCheckedChange={() => toggleService(serviceId)}
                      />
                      <Label
                        htmlFor={`service-${serviceId}`}
                        className="text-sm cursor-pointer"
                      >
                        {serviceInfo.name}
                      </Label>
                    </div>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* 심각도 필터 */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground">
                심각도 (이슈만)
              </Label>
              <div className="space-y-2">
                {ALL_SEVERITIES.map((severity) => {
                  const isSelected = filters.severityFilter?.includes(severity);

                  return (
                    <div
                      key={severity}
                      className="flex items-center gap-2"
                    >
                      <Checkbox
                        id={`severity-${severity}`}
                        checked={isSelected}
                        onCheckedChange={() => toggleSeverity(severity)}
                      />
                      <Label
                        htmlFor={`severity-${severity}`}
                        className="text-sm cursor-pointer flex items-center gap-2"
                      >
                        <Badge className={cn('text-xs', getSeverityBadgeClass(severity))}>
                          {getSeverityLabel(severity)}
                        </Badge>
                      </Label>
                    </div>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* 이벤트 타입 필터 */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground">
                이벤트 타입
              </Label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {ALL_EVENT_TYPES.map((eventType) => {
                  const isSelected = filters.eventTypeFilter?.includes(eventType);

                  return (
                    <div
                      key={eventType}
                      className="flex items-center gap-2"
                    >
                      <Checkbox
                        id={`event-${eventType}`}
                        checked={isSelected}
                        onCheckedChange={() => toggleEventType(eventType)}
                      />
                      <Label
                        htmlFor={`event-${eventType}`}
                        className="text-sm cursor-pointer"
                      >
                        {getEventTypeLabel(eventType)}
                      </Label>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* 활성 필터 배지 */}
      {activeFilterCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={resetFilters}
          className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <X className="h-3 w-3" />
          모두 지우기
        </Button>
      )}
    </div>
  );
}

export default AlertFilterPanel;

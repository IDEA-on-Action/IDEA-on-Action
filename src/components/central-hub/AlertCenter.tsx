/**
 * AlertCenter 컴포넌트
 *
 * Central Hub 알림 센터 - 고도화된 알림 관리 UI
 * 알림 그룹화, 일괄 처리, 우선순위 표시 기능 제공
 *
 * @module components/central-hub/AlertCenter
 */

import { useState, useMemo } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle2,
  Circle,
  CircleDot,
  RefreshCw,
  Trash2,
  Eye,
  Settings,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  useRealtimeEventStream,
  type StreamItem,
  getEventFromStreamItem,
  getIssueFromStreamItem,
} from '@/hooks/useRealtimeEventStream';
import { useConnectionStatusDisplay } from '@/hooks/useRealtimeServiceStatus';
import { cn } from '@/lib/utils';
import type {
  ServiceEvent,
  ServiceIssue,
  IssueSeverity,
  EventType,
  ServiceId,
} from '@/types/central-hub.types';
import { SERVICE_INFO } from '@/types/central-hub.types';
import { AlertFilterPanel } from './AlertFilterPanel';
import { AlertDetailModal } from './AlertDetailModal';
import { AlertSettings, type AlertSettingsData } from './AlertSettings';
import { useAlertSettings } from '@/hooks/useAlertSettings';
import { showIssueNotification } from '@/utils/notifications';

// ============================================================================
// 타입 정의
// ============================================================================

/**
 * 그룹화 기준
 */
export type GroupByOption = 'service' | 'date' | 'severity';

/**
 * 날짜 그룹
 */
type DateGroup = 'today' | 'yesterday' | 'this-week' | 'older';

/**
 * 알림 그룹
 */
interface AlertGroup {
  key: string;
  label: string;
  items: StreamItem[];
  count: number;
  unreadCount: number;
}

interface AlertCenterProps {
  /** 최대 높이 (기본: 'h-[600px]') */
  maxHeight?: string;
  /** 그룹화 기준 (기본: 'service') */
  groupBy?: GroupByOption;
  /** 추가 CSS 클래스 */
  className?: string;
}

// ============================================================================
// 헬퍼 함수
// ============================================================================

/**
 * 심각도별 아이콘 반환
 */
function getSeverityIcon(severity: IssueSeverity) {
  const iconProps = { className: 'h-4 w-4' };

  switch (severity) {
    case 'critical':
      return <AlertCircle {...iconProps} className={cn(iconProps.className, 'text-red-500')} />;
    case 'high':
      return <AlertTriangle {...iconProps} className={cn(iconProps.className, 'text-orange-500')} />;
    case 'medium':
      return <AlertTriangle {...iconProps} className={cn(iconProps.className, 'text-yellow-500')} />;
    case 'low':
      return <Info {...iconProps} className={cn(iconProps.className, 'text-green-500')} />;
    default:
      return <Info {...iconProps} className={cn(iconProps.className, 'text-gray-500')} />;
  }
}

/**
 * 이벤트 타입별 아이콘 반환
 */
function getEventTypeIcon(eventType: EventType) {
  const iconProps = { className: 'h-4 w-4 text-blue-500' };

  switch (eventType) {
    case 'task.completed':
    case 'issue.resolved':
    case 'milestone.reached':
      return <CheckCircle2 {...iconProps} className={cn(iconProps.className, 'text-green-500')} />;
    case 'issue.created':
      return <AlertCircle {...iconProps} className={cn(iconProps.className, 'text-red-500')} />;
    case 'progress.updated':
    case 'task.started':
      return <CircleDot {...iconProps} />;
    default:
      return <Circle {...iconProps} />;
  }
}

/**
 * 심각도별 배지 색상
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
 * 심각도 우선순위 값 (낮을수록 높은 우선순위)
 */
function getSeverityPriority(severity: IssueSeverity): number {
  const priorities: Record<IssueSeverity, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };
  return priorities[severity];
}

/**
 * 상대 시간 포맷
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return '방금 전';
  if (diffMinutes < 60) return `${diffMinutes}분 전`;
  if (diffHours < 24) return `${diffHours}시간 전`;
  return `${diffDays}일 전`;
}

/**
 * 날짜 그룹 계산
 */
function getDateGroup(date: Date): DateGroup {
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays <= 7) return 'this-week';
  return 'older';
}

/**
 * 날짜 그룹 라벨
 */
function getDateGroupLabel(group: DateGroup): string {
  const labels: Record<DateGroup, string> = {
    today: '오늘',
    yesterday: '어제',
    'this-week': '이번 주',
    older: '이전',
  };
  return labels[group];
}

/**
 * 항목에서 심각도 추출 (이슈만, 이벤트는 null)
 */
function getItemSeverity(item: StreamItem): IssueSeverity | null {
  const issue = getIssueFromStreamItem(item);
  return issue?.severity || null;
}

/**
 * 항목에서 서비스 ID 추출
 */
function getItemServiceId(item: StreamItem): ServiceId {
  const issue = getIssueFromStreamItem(item);
  if (issue) return issue.service_id;

  const event = getEventFromStreamItem(item);
  if (event) return event.service_id;

  return 'minu-find'; // fallback
}

// ============================================================================
// 서브 컴포넌트
// ============================================================================

/**
 * 로딩 스켈레톤
 */
function AlertCenterSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-6 w-32" />
          <div className="space-y-2 pl-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * 알림 아이템 (이슈)
 */
function IssueAlertItem({
  item,
  issue,
  isSelected,
  onToggleSelect,
  onMarkAsRead,
  onClick,
}: {
  item: StreamItem;
  issue: ServiceIssue;
  isSelected: boolean;
  onToggleSelect: (itemId: string) => void;
  onMarkAsRead: (itemId: string) => void;
  onClick: () => void;
}) {
  const serviceInfo = SERVICE_INFO[issue.service_id];
  const severity = issue.severity;
  const isPriority = severity === 'critical' || severity === 'high';

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 border rounded-lg transition-colors',
        item.isRead ? 'bg-muted/30' : 'bg-background hover:bg-muted/50',
        isPriority && !item.isRead && 'border-l-4 border-l-red-500'
      )}
    >
      {/* 체크박스 */}
      <div className="flex-shrink-0 mt-1">
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggleSelect(item.id)}
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {/* 아이콘 */}
      <div className="flex-shrink-0 mt-0.5">
        {getSeverityIcon(severity)}
      </div>

      {/* 내용 */}
      <div className="flex-1 min-w-0 space-y-1 cursor-pointer" onClick={onClick}>
        {/* 헤더: 서비스 + 심각도 배지 */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-xs">
            {serviceInfo.name}
          </Badge>
          <Badge className={cn('text-xs', getSeverityBadgeClass(severity))}>
            {getSeverityLabel(severity)}
          </Badge>
          {!item.isRead && (
            <Badge variant="default" className="text-xs bg-blue-500">
              NEW
            </Badge>
          )}
        </div>

        {/* 제목 */}
        <p className={cn('text-sm font-medium', item.isRead && 'text-muted-foreground')}>
          {issue.title}
        </p>

        {/* 설명 (있으면) */}
        {issue.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {issue.description}
          </p>
        )}

        {/* 푸터: 시간 + 읽음 버튼 */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{formatRelativeTime(item.receivedAt)}</span>
          {!item.isRead && (
            <>
              <span>•</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkAsRead(item.id);
                }}
                className="text-blue-600 hover:underline dark:text-blue-400 flex items-center gap-1"
              >
                <Eye className="h-3 w-3" />
                읽음 표시
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * 알림 아이템 (이벤트)
 */
function EventAlertItem({
  item,
  event,
  isSelected,
  onToggleSelect,
  onMarkAsRead,
  onClick,
}: {
  item: StreamItem;
  event: ServiceEvent;
  isSelected: boolean;
  onToggleSelect: (itemId: string) => void;
  onMarkAsRead: (itemId: string) => void;
  onClick: () => void;
}) {
  const serviceInfo = SERVICE_INFO[event.service_id];

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 border rounded-lg transition-colors',
        item.isRead ? 'bg-muted/30' : 'bg-background hover:bg-muted/50'
      )}
    >
      {/* 체크박스 */}
      <div className="flex-shrink-0 mt-1">
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggleSelect(item.id)}
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {/* 아이콘 */}
      <div className="flex-shrink-0 mt-0.5">
        {getEventTypeIcon(event.event_type)}
      </div>

      {/* 내용 */}
      <div className="flex-1 min-w-0 space-y-1 cursor-pointer" onClick={onClick}>
        {/* 헤더: 서비스 */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-xs">
            {serviceInfo.name}
          </Badge>
          {!item.isRead && (
            <Badge variant="default" className="text-xs bg-blue-500">
              NEW
            </Badge>
          )}
        </div>

        {/* 메시지 */}
        <p className={cn('text-sm', item.isRead && 'text-muted-foreground')}>
          {event.payload.message || event.payload.title || '이벤트 발생'}
        </p>

        {/* 푸터: 시간 + 읽음 버튼 */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{formatRelativeTime(item.receivedAt)}</span>
          {!item.isRead && (
            <>
              <span>•</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkAsRead(item.id);
                }}
                className="text-blue-600 hover:underline dark:text-blue-400 flex items-center gap-1"
              >
                <Eye className="h-3 w-3" />
                읽음 표시
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * 알림 아이템 (래퍼)
 */
function AlertItem({
  item,
  isSelected,
  onToggleSelect,
  onMarkAsRead,
  onItemClick,
}: {
  item: StreamItem;
  isSelected: boolean;
  onToggleSelect: (itemId: string) => void;
  onMarkAsRead: (itemId: string) => void;
  onItemClick: (item: StreamItem) => void;
}) {
  const issue = getIssueFromStreamItem(item);
  const event = getEventFromStreamItem(item);

  const handleClick = () => {
    onItemClick(item);
  };

  if (issue) {
    return (
      <IssueAlertItem
        item={item}
        issue={issue}
        isSelected={isSelected}
        onToggleSelect={onToggleSelect}
        onMarkAsRead={onMarkAsRead}
        onClick={handleClick}
      />
    );
  }

  if (event) {
    return (
      <EventAlertItem
        item={item}
        event={event}
        isSelected={isSelected}
        onToggleSelect={onToggleSelect}
        onMarkAsRead={onMarkAsRead}
        onClick={handleClick}
      />
    );
  }

  return null;
}

/**
 * 알림 그룹 컴포넌트
 */
function AlertGroupComponent({
  group,
  selectedItems,
  onToggleSelect,
  onMarkAsRead,
  onItemClick,
  defaultOpen = true,
}: {
  group: AlertGroup;
  selectedItems: Set<string>;
  onToggleSelect: (itemId: string) => void;
  onMarkAsRead: (itemId: string) => void;
  onItemClick: (item: StreamItem) => void;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  // 그룹 내 선택된 항목 수
  const selectedInGroupCount = group.items.filter((item) => selectedItems.has(item.id)).length;
  const allInGroupSelected = selectedInGroupCount === group.items.length && group.items.length > 0;
  const someInGroupSelected = selectedInGroupCount > 0 && !allInGroupSelected;

  // 그룹 전체 선택/해제
  const handleToggleGroupSelect = () => {
    if (allInGroupSelected) {
      // 전체 해제
      group.items.forEach((item) => onToggleSelect(item.id));
    } else {
      // 전체 선택
      group.items.forEach((item) => {
        if (!selectedItems.has(item.id)) {
          onToggleSelect(item.id);
        }
      });
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="space-y-2">
      <CollapsibleTrigger asChild>
        <div className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-lg cursor-pointer group">
          <div className="flex items-center gap-2">
            {isOpen ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}

            <Checkbox
              checked={allInGroupSelected}
              ref={(ref) => {
                if (ref) {
                  ref.indeterminate = someInGroupSelected;
                }
              }}
              onCheckedChange={handleToggleGroupSelect}
              onClick={(e) => e.stopPropagation()}
            />

            <span className="font-semibold text-sm">
              {group.label} ({group.count})
            </span>

            {group.unreadCount > 0 && (
              <Badge variant="default" className="bg-blue-500 text-xs">
                {group.unreadCount}
              </Badge>
            )}
          </div>
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-2 pl-4">
        {group.items.map((item) => (
          <AlertItem
            key={item.id}
            item={item}
            isSelected={selectedItems.has(item.id)}
            onToggleSelect={onToggleSelect}
            onMarkAsRead={onMarkAsRead}
            onItemClick={onItemClick}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

// ============================================================================
// 메인 컴포넌트
// ============================================================================

/**
 * AlertCenter
 *
 * 고도화된 알림 센터 컴포넌트입니다.
 * 그룹화, 일괄 처리, 우선순위 표시 기능을 제공합니다.
 *
 * @param maxHeight - 최대 높이 (기본: 'h-[600px]')
 * @param groupBy - 그룹화 기준 (기본: 'service')
 * @param className - 추가 CSS 클래스
 */
export function AlertCenter({
  maxHeight = 'h-[600px]',
  groupBy: initialGroupBy = 'service',
  className,
}: AlertCenterProps) {
  const { toast } = useToast();

  // 알림 설정
  const { settings: alertSettings, updateSettings: setAlertSettings } = useAlertSettings();

  // 로컬 상태
  const [selectedItem, setSelectedItem] = useState<StreamItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [groupBy, setGroupBy] = useState<GroupByOption>(initialGroupBy);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  // 실시간 스트림
  const {
    filteredItems,
    unreadCount,
    connectionState,
    isConnected,
    markAsRead,
    markAllAsRead,
    clearStream,
    reconnect,
    updateFilters,
  } = useRealtimeEventStream({
    maxItems: 200,
    onNewItem: (item) => {
      const issue = getIssueFromStreamItem(item);
      const event = getEventFromStreamItem(item);

      if (issue) {
        const shouldNotify =
          alertSettings.serviceNotifications[issue.service_id] &&
          alertSettings.severityNotifications[issue.severity];

        if (shouldNotify && (issue.severity === 'critical' || issue.severity === 'high')) {
          toast({
            title: '중요 이슈 발생',
            description: issue.title,
            variant: 'destructive',
          });

          if (alertSettings.enableBrowserNotifications) {
            showIssueNotification(
              issue.title,
              issue.severity,
              issue.service_id,
              () => {
                const streamItem = filteredItems.find((i) => {
                  const itemIssue = getIssueFromStreamItem(i);
                  return itemIssue?.id === issue.id;
                });
                if (streamItem) {
                  setSelectedItem(streamItem);
                  setIsDetailModalOpen(true);
                }
              }
            );
          }
        }
      } else if (event) {
        const shouldNotify = alertSettings.serviceNotifications[event.service_id];

        if (shouldNotify && (event.event_type === 'milestone.reached' || event.event_type === 'task.completed')) {
          toast({
            title: '알림',
            description: event.payload.message || '이벤트 발생',
          });
        }
      }
    },
  });

  // 연결 상태 표시
  const { statusText, statusColor, statusBgColor } = useConnectionStatusDisplay(connectionState);

  // 우선순위로 정렬된 항목 (critical/high가 먼저)
  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      // 읽지 않은 항목 우선
      if (a.isRead !== b.isRead) {
        return a.isRead ? 1 : -1;
      }

      // 심각도 우선 (이슈만)
      const severityA = getItemSeverity(a);
      const severityB = getItemSeverity(b);

      if (severityA && severityB) {
        const priorityDiff = getSeverityPriority(severityA) - getSeverityPriority(severityB);
        if (priorityDiff !== 0) return priorityDiff;
      } else if (severityA) {
        return -1; // 이슈가 이벤트보다 우선
      } else if (severityB) {
        return 1;
      }

      // 최신순
      return b.receivedAt.getTime() - a.receivedAt.getTime();
    });
  }, [filteredItems]);

  // 그룹화
  const groups = useMemo<AlertGroup[]>(() => {
    const groupMap = new Map<string, StreamItem[]>();

    sortedItems.forEach((item) => {
      let key: string;

      switch (groupBy) {
        case 'service': {
          const serviceId = getItemServiceId(item);
          key = serviceId;
          break;
        }
        case 'date': {
          const dateGroup = getDateGroup(item.receivedAt);
          key = dateGroup;
          break;
        }
        case 'severity': {
          const severity = getItemSeverity(item);
          key = severity || 'event';
          break;
        }
        default:
          key = 'all';
      }

      const existing = groupMap.get(key) || [];
      existing.push(item);
      groupMap.set(key, existing);
    });

    const result: AlertGroup[] = [];

    groupMap.forEach((items, key) => {
      let label: string;

      switch (groupBy) {
        case 'service':
          label = SERVICE_INFO[key as ServiceId]?.name || key;
          break;
        case 'date':
          label = getDateGroupLabel(key as DateGroup);
          break;
        case 'severity':
          label = key === 'event' ? '이벤트' : getSeverityLabel(key as IssueSeverity);
          break;
        default:
          label = key;
      }

      result.push({
        key,
        label,
        items,
        count: items.length,
        unreadCount: items.filter((i) => !i.isRead).length,
      });
    });

    // 정렬
    if (groupBy === 'severity') {
      result.sort((a, b) => {
        if (a.key === 'event') return 1;
        if (b.key === 'event') return -1;
        return getSeverityPriority(a.key as IssueSeverity) - getSeverityPriority(b.key as IssueSeverity);
      });
    } else if (groupBy === 'date') {
      const dateOrder: DateGroup[] = ['today', 'yesterday', 'this-week', 'older'];
      result.sort((a, b) => {
        return dateOrder.indexOf(a.key as DateGroup) - dateOrder.indexOf(b.key as DateGroup);
      });
    }

    return result;
  }, [sortedItems, groupBy]);

  // 선택 토글
  const handleToggleSelect = (itemId: string) => {
    setSelectedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  // 선택 항목 삭제
  const handleDeleteSelected = async () => {
    if (selectedItems.size === 0) return;

    try {
      // 선택된 항목들을 이벤트와 이슈로 분리
      const eventsToDelete: string[] = [];
      const issuesToDelete: string[] = [];

      filteredItems.forEach((item) => {
        if (selectedItems.has(item.id)) {
          if (item.type === 'event') {
            const event = getEventFromStreamItem(item);
            if (event?.id) eventsToDelete.push(event.id);
          } else if (item.type === 'issue') {
            const issue = getIssueFromStreamItem(item);
            if (issue?.id) issuesToDelete.push(issue.id);
          }
        }
      });

      // DB에서 삭제 (병렬 처리)
      const deletePromises: Promise<unknown>[] = [];

      if (eventsToDelete.length > 0) {
        deletePromises.push(
          supabase
            .from('service_events')
            .delete()
            .in('id', eventsToDelete)
        );
      }

      if (issuesToDelete.length > 0) {
        deletePromises.push(
          supabase
            .from('service_issues')
            .delete()
            .in('id', issuesToDelete)
        );
      }

      await Promise.all(deletePromises);

      // 로컬 상태에서 제거 (읽음 처리로 필터링)
      selectedItems.forEach((itemId) => {
        markAsRead(itemId);
      });

      setSelectedItems(new Set());

      toast({
        title: '삭제 완료',
        description: `${selectedItems.size}개 항목이 삭제되었습니다.`,
      });
    } catch (error) {
      console.error('Failed to delete selected items:', error);
      toast({
        title: '삭제 실패',
        description: '항목 삭제 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
  };

  // 아이템 클릭
  const handleItemClick = (item: StreamItem) => {
    setSelectedItem(item);
    setIsDetailModalOpen(true);
  };

  // 상세 모달 닫기
  const handleDetailModalClose = () => {
    setIsDetailModalOpen(false);
    setTimeout(() => setSelectedItem(null), 300);
  };

  // 설정 변경
  const handleSettingsChange = (newSettings: AlertSettingsData) => {
    setAlertSettings(newSettings);
  };

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader className="pb-3">
        {/* 제목 + 연결 상태 */}
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              알림 센터
              {unreadCount > 0 && (
                <Badge variant="default" className="bg-blue-500 text-xs">
                  {unreadCount}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>실시간 이벤트 및 이슈 관리</CardDescription>
          </div>

          {/* 연결 상태 인디케이터 */}
          <div className={cn('flex items-center gap-2 text-xs px-2 py-1 rounded-full', statusBgColor)}>
            <div className={cn('h-2 w-2 rounded-full', statusColor.replace('text-', 'bg-'))} />
            <span className={statusColor}>{statusText}</span>
          </div>
        </div>

        {/* 컨트롤 */}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {/* 그룹화 선택 */}
          <Select value={groupBy} onValueChange={(value) => setGroupBy(value as GroupByOption)}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue placeholder="그룹화" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="service">서비스별</SelectItem>
              <SelectItem value="date">날짜별</SelectItem>
              <SelectItem value="severity">심각도별</SelectItem>
            </SelectContent>
          </Select>

          {/* 필터 패널 */}
          <AlertFilterPanel filters={{}} onFiltersChange={updateFilters} />

          <Button
            variant="outline"
            size="sm"
            onClick={markAllAsRead}
            disabled={unreadCount === 0}
            className="text-xs"
          >
            <Eye className="h-3 w-3 mr-1" />
            모두 읽음
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={clearStream}
            disabled={filteredItems.length === 0}
            className="text-xs"
          >
            <Trash2 className="h-3 w-3 mr-1" />
            전체 삭제
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={reconnect}
            disabled={isConnected}
            className="text-xs"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            재연결
          </Button>

          {/* 설정 */}
          <AlertSettings
            settings={alertSettings}
            onSettingsChange={handleSettingsChange}
            showTrigger={true}
          />
        </div>

        {/* 선택 액션 */}
        {selectedItems.size > 0 && (
          <div className="flex items-center gap-2 mt-2 p-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
            <span className="text-xs text-blue-600 dark:text-blue-400">
              {selectedItems.size}개 선택됨
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeleteSelected}
              className="text-xs ml-auto"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              선택 삭제
            </Button>
          </div>
        )}
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden">
        {/* 로딩 */}
        {connectionState.status === 'connecting' && <AlertCenterSkeleton />}

        {/* 에러 */}
        {connectionState.status === 'error' && (
          <div className="flex flex-col items-center justify-center h-40 text-center">
            <AlertCircle className="h-10 w-10 text-red-500 mb-2" />
            <p className="text-sm text-muted-foreground">실시간 연결에 실패했습니다.</p>
            {connectionState.error && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                {connectionState.error.message}
              </p>
            )}
            <Button variant="outline" size="sm" onClick={reconnect} className="mt-3">
              <RefreshCw className="h-3 w-3 mr-1" />
              다시 시도
            </Button>
          </div>
        )}

        {/* 알림 목록 */}
        {(connectionState.status === 'connected' || connectionState.status === 'disconnected') && (
          <>
            {groups.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-center">
                <Info className="h-10 w-10 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">새로운 알림이 없습니다.</p>
              </div>
            ) : (
              <ScrollArea className={maxHeight}>
                <div className="space-y-4 pr-4">
                  {groups.map((group) => (
                    <AlertGroupComponent
                      key={group.key}
                      group={group}
                      selectedItems={selectedItems}
                      onToggleSelect={handleToggleSelect}
                      onMarkAsRead={markAsRead}
                      onItemClick={handleItemClick}
                      defaultOpen={groupBy === 'severity' ? group.key === 'critical' || group.key === 'high' : true}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}
          </>
        )}
      </CardContent>

      {/* 알림 상세 모달 */}
      <AlertDetailModal
        item={selectedItem}
        open={isDetailModalOpen}
        onClose={handleDetailModalClose}
        onMarkAsRead={markAsRead}
      />
    </Card>
  );
}

export default AlertCenter;

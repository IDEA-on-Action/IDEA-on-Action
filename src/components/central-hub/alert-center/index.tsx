/**
 * AlertCenter 컴포넌트
 *
 * Central Hub 알림 센터 - 고도화된 알림 관리 UI
 * 알림 그룹화, 일괄 처리, 우선순위 표시 기능 제공
 *
 * @module components/central-hub/alert-center
 */

import { useState, useMemo } from 'react';
import {
  AlertCircle,
  Info,
  RefreshCw,
  Trash2,
  Eye,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/useToast';
import { serviceEventsApi, serviceIssuesApi } from '@/integrations/cloudflare/client';
import {
  useRealtimeEventStream,
  type StreamItem,
  getEventFromStreamItem,
  getIssueFromStreamItem,
} from '@/hooks/useRealtimeEventStream';
import { useConnectionStatusDisplay } from '@/hooks/useRealtimeServiceStatus';
import { cn } from '@/lib/utils';
import type {
  IssueSeverity,
  ServiceId,
} from '@/types/central-hub.types';
import { SERVICE_INFO } from '@/types/central-hub.types';
import { AlertFilterPanel } from '../AlertFilterPanel';
import { AlertDetailModal } from '../AlertDetailModal';
import { AlertSettings, type AlertSettingsData } from '../AlertSettings';
import { useAlertSettings } from '@/hooks/useAlertSettings';
import { showIssueNotification } from '@/utils/notifications';

// 로컬 모듈
import type { AlertCenterProps, GroupByOption, AlertGroup, DateGroup } from './types';
import {
  getSeverityLabel,
  getSeverityPriority,
  getDateGroup,
  getDateGroupLabel,
  getItemSeverity,
  getItemServiceId,
} from './utils';
import { AlertCenterSkeleton } from './AlertCenterSkeleton';
import { AlertGroupComponent } from './AlertGroupComponent';

// 타입 re-export
export type { AlertCenterProps, GroupByOption, AlertGroup, DateGroup };

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

    // Workers 인증 토큰 확인
    const stored = localStorage.getItem('workers_auth_tokens');
    const tokens = stored ? JSON.parse(stored) : null;
    const accessToken = tokens?.accessToken;
    if (!accessToken) {
      toast({
        title: '인증 오류',
        description: '로그인이 필요합니다.',
        variant: 'destructive',
      });
      return;
    }

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

      // Workers API를 통해 삭제 (병렬 처리)
      const deletePromises: Promise<unknown>[] = [];

      if (eventsToDelete.length > 0) {
        deletePromises.push(
          serviceEventsApi.deleteMany(accessToken, eventsToDelete)
        );
      }

      if (issuesToDelete.length > 0) {
        deletePromises.push(
          serviceIssuesApi.deleteMany(accessToken, issuesToDelete)
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

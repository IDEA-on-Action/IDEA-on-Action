/**
 * RealtimeAlertPanel 컴포넌트
 *
 * Central Hub 실시간 알림 패널
 * useRealtimeEventStream을 활용하여 최근 이벤트/이슈를 실시간으로 표시합니다.
 *
 * @module components/central-hub/RealtimeAlertPanel
 */

import { useState } from 'react';
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
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/useToast';
import {
  useRealtimeEventStream,
  type StreamItem,
  getEventFromStreamItem,
  getIssueFromStreamItem,
} from '@/hooks/realtime/useRealtimeEventStream';
import { useConnectionStatusDisplay } from '@/hooks/realtime/useRealtimeServiceStatus';
import { cn } from '@/lib/utils';
import type {
  ServiceEvent,
  ServiceIssue,
  IssueSeverity,
  EventType,
} from '@/types/services/central-hub.types';
import { SERVICE_INFO, SEVERITY_COLORS } from '@/types/services/central-hub.types';
import { AlertFilterPanel } from './AlertFilterPanel';
import { AlertDetailModal } from './AlertDetailModal';
import { AlertSettings, type AlertSettingsData } from './AlertSettings';
import { useAlertSettings } from '@/hooks/realtime/useAlertSettings';
import { showIssueNotification } from '@/utils/notifications';

// ============================================================================
// 타입 정의
// ============================================================================

interface RealtimeAlertPanelProps {
  /** 최대 표시 항목 수 (기본: 10) */
  maxDisplay?: number;
  /** 최대 높이 (기본: 'h-[500px]') */
  maxHeight?: string;
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
 * 상대 시간 포맷 (방금 전, N분 전, N시간 전)
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

// ============================================================================
// 서브 컴포넌트
// ============================================================================

/**
 * 로딩 스켈레톤
 */
function AlertPanelSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-start gap-3 p-3 border rounded-lg">
          <Skeleton className="h-4 w-4 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-24" />
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
  onMarkAsRead,
}: {
  item: StreamItem;
  issue: ServiceIssue;
  onMarkAsRead: (itemId: string) => void;
}) {
  const serviceInfo = SERVICE_INFO[issue.service_id];

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 border rounded-lg transition-colors',
        item.isRead ? 'bg-muted/30' : 'bg-background hover:bg-muted/50'
      )}
    >
      {/* 아이콘 */}
      <div className="flex-shrink-0 mt-0.5">
        {getSeverityIcon(issue.severity)}
      </div>

      {/* 내용 */}
      <div className="flex-1 min-w-0 space-y-1">
        {/* 헤더: 서비스 + 심각도 배지 */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-xs">
            {serviceInfo.name}
          </Badge>
          <Badge className={cn('text-xs', getSeverityBadgeClass(issue.severity))}>
            {getSeverityLabel(issue.severity)}
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
                onClick={() => onMarkAsRead(item.id)}
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
  onMarkAsRead,
}: {
  item: StreamItem;
  event: ServiceEvent;
  onMarkAsRead: (itemId: string) => void;
}) {
  const serviceInfo = SERVICE_INFO[event.service_id];

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 border rounded-lg transition-colors',
        item.isRead ? 'bg-muted/30' : 'bg-background hover:bg-muted/50'
      )}
    >
      {/* 아이콘 */}
      <div className="flex-shrink-0 mt-0.5">
        {getEventTypeIcon(event.event_type)}
      </div>

      {/* 내용 */}
      <div className="flex-1 min-w-0 space-y-1">
        {/* 헤더: 서비스 + 이벤트 타입 */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-xs">
            {serviceInfo.name}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {getEventTypeLabel(event.event_type)}
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
                onClick={() => onMarkAsRead(item.id)}
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
  onMarkAsRead,
  onItemClick,
}: {
  item: StreamItem;
  onMarkAsRead: (itemId: string) => void;
  onItemClick: (item: StreamItem) => void;
}) {
  const issue = getIssueFromStreamItem(item);
  const event = getEventFromStreamItem(item);

  // 아이템 클릭 핸들러
  const handleClick = () => {
    onItemClick(item);
  };

  if (issue) {
    return (
      <div onClick={handleClick} className="cursor-pointer">
        <IssueAlertItem item={item} issue={issue} onMarkAsRead={onMarkAsRead} />
      </div>
    );
  }

  if (event) {
    return (
      <div onClick={handleClick} className="cursor-pointer">
        <EventAlertItem item={item} event={event} onMarkAsRead={onMarkAsRead} />
      </div>
    );
  }

  return null;
}

// ============================================================================
// 메인 컴포넌트
// ============================================================================

/**
 * RealtimeAlertPanel
 *
 * 실시간 알림 패널 컴포넌트입니다.
 * 최근 이벤트/이슈를 실시간으로 표시하고 읽음 상태를 관리합니다.
 *
 * @param maxDisplay - 최대 표시 항목 수 (기본: 10)
 * @param maxHeight - 최대 높이 (기본: 'h-[500px]')
 * @param className - 추가 CSS 클래스
 */
export function RealtimeAlertPanel({
  maxDisplay = 10,
  maxHeight = 'h-[500px]',
  className,
}: RealtimeAlertPanelProps) {
  const { toast } = useToast();

  // 알림 설정 (localStorage 연동)
  const { settings: alertSettings, updateSettings: setAlertSettings } = useAlertSettings();

  // 로컬 상태
  const [selectedItem, setSelectedItem] = useState<StreamItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

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
    maxItems: 100,
    onNewItem: (item) => {
      // 새 항목 수신 시 알림
      const issue = getIssueFromStreamItem(item);
      const event = getEventFromStreamItem(item);

      // 설정에 따라 알림 필터링
      if (issue) {
        const shouldNotify =
          alertSettings.serviceNotifications[issue.service_id] &&
          alertSettings.severityNotifications[issue.severity];

        if (shouldNotify && (issue.severity === 'critical' || issue.severity === 'high')) {
          // 토스트 알림
          toast({
            title: '중요 이슈 발생',
            description: issue.title,
            variant: 'destructive',
          });

          // 브라우저 알림
          if (alertSettings.enableBrowserNotifications) {
            showIssueNotification(
              issue.title,
              issue.severity,
              issue.service_id,
              () => {
                // 클릭 시 상세 모달 열기
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

          // 소리 재생
          if (alertSettings.enableSound) {
            // 브라우저 기본 알림 소리 사용 (silent: false)
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

  // 표시할 항목 (최근 N개만)
  const displayItems = filteredItems.slice(0, maxDisplay);

  // 아이템 클릭 핸들러
  const handleItemClick = (item: StreamItem) => {
    setSelectedItem(item);
    setIsDetailModalOpen(true);
  };

  // 상세 모달 닫기 핸들러
  const handleDetailModalClose = () => {
    setIsDetailModalOpen(false);
    // 모달이 완전히 닫힌 후 선택 항목 초기화
    setTimeout(() => setSelectedItem(null), 300);
  };

  // 설정 변경 핸들러 (이미 useAlertSettings에서 자동 저장됨)
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
              실시간 알림
              {unreadCount > 0 && (
                <Badge variant="default" className="bg-blue-500 text-xs">
                  {unreadCount}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>최근 이벤트 및 이슈</CardDescription>
          </div>

          {/* 연결 상태 인디케이터 */}
          <div className={cn('flex items-center gap-2 text-xs px-2 py-1 rounded-full', statusBgColor)}>
            <div className={cn('h-2 w-2 rounded-full', statusColor.replace('text-', 'bg-'))} />
            <span className={statusColor}>{statusText}</span>
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {/* 필터 패널 */}
          <AlertFilterPanel
            filters={{}}
            onFiltersChange={updateFilters}
          />

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

          {/* 설정 버튼 */}
          <AlertSettings
            settings={alertSettings}
            onSettingsChange={handleSettingsChange}
            showTrigger={true}
          />
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden">
        {/* 연결 중 로딩 */}
        {connectionState.status === 'connecting' && (
          <AlertPanelSkeleton />
        )}

        {/* 에러 상태 */}
        {connectionState.status === 'error' && (
          <div className="flex flex-col items-center justify-center h-40 text-center">
            <AlertCircle className="h-10 w-10 text-red-500 mb-2" />
            <p className="text-sm text-muted-foreground">
              실시간 연결에 실패했습니다.
            </p>
            {connectionState.error && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                {connectionState.error.message}
              </p>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={reconnect}
              className="mt-3"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              다시 시도
            </Button>
          </div>
        )}

        {/* 알림 목록 */}
        {(connectionState.status === 'connected' || connectionState.status === 'disconnected') && (
          <>
            {displayItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-center">
                <Info className="h-10 w-10 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  새로운 알림이 없습니다.
                </p>
              </div>
            ) : (
              <ScrollArea className={maxHeight}>
                <div className="space-y-3 pr-4">
                  {displayItems.map((item) => (
                    <AlertItem
                      key={item.id}
                      item={item}
                      onMarkAsRead={markAsRead}
                      onItemClick={handleItemClick}
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

export default RealtimeAlertPanel;

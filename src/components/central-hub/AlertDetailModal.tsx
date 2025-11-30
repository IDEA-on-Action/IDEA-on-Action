/**
 * AlertDetailModal 컴포넌트
 *
 * 알림 상세 정보를 표시하는 모달
 * 관련 서비스 링크 및 조치 버튼을 제공합니다.
 *
 * @module components/central-hub/AlertDetailModal
 */

import { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle2,
  Circle,
  CircleDot,
  ExternalLink,
  Check,
  Ban,
  Clock,
  User,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type {
  ServiceEvent,
  ServiceIssue,
  IssueSeverity,
  EventType,
  IssueStatus,
} from '@/types/central-hub.types';
import { SERVICE_INFO } from '@/types/central-hub.types';
import type { StreamItem } from '@/hooks/useRealtimeEventStream';
import {
  getEventFromStreamItem,
  getIssueFromStreamItem,
} from '@/hooks/useRealtimeEventStream';
import { useUpdateIssueStatus } from '@/hooks/useServiceIssues';

// ============================================================================
// 타입 정의
// ============================================================================

interface AlertDetailModalProps {
  /** 알림 아이템 */
  item: StreamItem | null;
  /** 열림 상태 */
  open: boolean;
  /** 닫기 콜백 */
  onClose: () => void;
  /** 읽음 표시 콜백 */
  onMarkAsRead?: (itemId: string) => void;
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
  const iconProps = { className: 'h-5 w-5' };

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
  const iconProps = { className: 'h-5 w-5 text-blue-500' };

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
 * 상태별 배지 색상
 */
function getStatusBadgeClass(status: IssueStatus): string {
  switch (status) {
    case 'open':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    case 'in_progress':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    case 'resolved':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    case 'closed':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
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
 * 상태 한글 라벨
 */
function getStatusLabel(status: IssueStatus): string {
  const labels: Record<IssueStatus, string> = {
    open: '열림',
    in_progress: '진행 중',
    resolved: '해결됨',
    closed: '닫힘',
  };
  return labels[status];
}

/**
 * 날짜 포맷
 */
function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

// ============================================================================
// 서브 컴포넌트
// ============================================================================

/**
 * 이슈 상세 정보
 */
function IssueDetail({ issue }: { issue: ServiceIssue }) {
  const serviceInfo = SERVICE_INFO[issue.service_id];

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-1">
          {getSeverityIcon(issue.severity)}
        </div>
        <div className="flex-1 space-y-2">
          <h3 className="font-semibold text-lg">{issue.title}</h3>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs">
              {serviceInfo.name}
            </Badge>
            <Badge className={cn('text-xs', getSeverityBadgeClass(issue.severity))}>
              {getSeverityLabel(issue.severity)}
            </Badge>
            <Badge className={cn('text-xs', getStatusBadgeClass(issue.status))}>
              {getStatusLabel(issue.status)}
            </Badge>
          </div>
        </div>
      </div>

      <Separator />

      {/* 설명 */}
      {issue.description && (
        <div className="space-y-1">
          <h4 className="text-sm font-semibold">설명</h4>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {issue.description}
          </p>
        </div>
      )}

      {/* 메타 정보 */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        {issue.reported_by && (
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground">
              <User className="h-3 w-3" />
              <span className="text-xs">보고자</span>
            </div>
            <p className="font-medium">{issue.reported_by}</p>
          </div>
        )}
        {issue.assigned_to && (
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground">
              <User className="h-3 w-3" />
              <span className="text-xs">담당자</span>
            </div>
            <p className="font-medium">{issue.assigned_to}</p>
          </div>
        )}
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span className="text-xs">생성일</span>
          </div>
          <p className="font-medium">{formatDate(issue.created_at)}</p>
        </div>
        {issue.resolved_at && (
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground">
              <CheckCircle2 className="h-3 w-3" />
              <span className="text-xs">해결일</span>
            </div>
            <p className="font-medium">{formatDate(issue.resolved_at)}</p>
          </div>
        )}
      </div>

      {/* 해결 내용 */}
      {issue.resolution && (
        <div className="space-y-1">
          <h4 className="text-sm font-semibold">해결 내용</h4>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {issue.resolution}
          </p>
        </div>
      )}

      {/* 프로젝트 ID */}
      {issue.project_id && (
        <div className="space-y-1">
          <h4 className="text-sm font-semibold">프로젝트 ID</h4>
          <p className="text-sm text-muted-foreground font-mono">
            {issue.project_id}
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * 이벤트 상세 정보
 */
function EventDetail({ event }: { event: ServiceEvent }) {
  const serviceInfo = SERVICE_INFO[event.service_id];

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-1">
          {getEventTypeIcon(event.event_type)}
        </div>
        <div className="flex-1 space-y-2">
          <h3 className="font-semibold text-lg">
            {event.payload.message || event.payload.title || '이벤트 발생'}
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs">
              {serviceInfo.name}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {getEventTypeLabel(event.event_type)}
            </Badge>
          </div>
        </div>
      </div>

      <Separator />

      {/* 이벤트 세부 정보 */}
      <div className="space-y-3">
        {/* 진행률 */}
        {event.payload.progress !== undefined && (
          <div className="space-y-1">
            <h4 className="text-sm font-semibold">진행률</h4>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all"
                  style={{ width: `${event.payload.progress}%` }}
                />
              </div>
              <span className="text-sm font-medium">{event.payload.progress}%</span>
            </div>
          </div>
        )}

        {/* 단계 */}
        {event.payload.stage && (
          <div className="space-y-1">
            <h4 className="text-sm font-semibold">단계</h4>
            <p className="text-sm text-muted-foreground">{event.payload.stage}</p>
          </div>
        )}

        {/* 작업 정보 */}
        {(event.payload.task_id || event.payload.task_name) && (
          <div className="space-y-1">
            <h4 className="text-sm font-semibold">작업</h4>
            <div className="text-sm space-y-1">
              {event.payload.task_name && (
                <p className="text-muted-foreground">{event.payload.task_name}</p>
              )}
              {event.payload.task_id && (
                <p className="text-xs text-muted-foreground font-mono">
                  ID: {event.payload.task_id}
                </p>
              )}
            </div>
          </div>
        )}

        {/* 마일스톤 정보 */}
        {(event.payload.milestone_id || event.payload.milestone_name) && (
          <div className="space-y-1">
            <h4 className="text-sm font-semibold">마일스톤</h4>
            <div className="text-sm space-y-1">
              {event.payload.milestone_name && (
                <p className="text-muted-foreground">{event.payload.milestone_name}</p>
              )}
              {event.payload.milestone_id && (
                <p className="text-xs text-muted-foreground font-mono">
                  ID: {event.payload.milestone_id}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 메타 정보 */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        {event.user_id && (
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground">
              <User className="h-3 w-3" />
              <span className="text-xs">사용자 ID</span>
            </div>
            <p className="font-medium font-mono text-xs">{event.user_id}</p>
          </div>
        )}
        {event.project_id && (
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground">
              <ExternalLink className="h-3 w-3" />
              <span className="text-xs">프로젝트 ID</span>
            </div>
            <p className="font-medium font-mono text-xs">{event.project_id}</p>
          </div>
        )}
        <div className="space-y-1 col-span-2">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span className="text-xs">발생 시간</span>
          </div>
          <p className="font-medium">{formatDate(event.created_at)}</p>
        </div>
      </div>

      {/* Payload 원본 (디버깅용) */}
      <details className="text-xs">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
          Payload 원본 보기
        </summary>
        <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
          {JSON.stringify(event.payload, null, 2)}
        </pre>
      </details>
    </div>
  );
}

// ============================================================================
// 메인 컴포넌트
// ============================================================================

/**
 * AlertDetailModal
 *
 * 알림 상세 정보를 표시하는 모달 컴포넌트입니다.
 *
 * @param item - 알림 아이템
 * @param open - 열림 상태
 * @param onClose - 닫기 콜백
 * @param onMarkAsRead - 읽음 표시 콜백
 * @param className - 추가 CSS 클래스
 */
export function AlertDetailModal({
  item,
  open,
  onClose,
  onMarkAsRead,
  className,
}: AlertDetailModalProps) {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const updateIssueStatus = useUpdateIssueStatus();

  if (!item) return null;

  const issue = getIssueFromStreamItem(item);
  const event = getEventFromStreamItem(item);

  const handleMarkAsRead = () => {
    if (!item.isRead && onMarkAsRead) {
      onMarkAsRead(item.id);
      toast({
        title: '읽음 처리됨',
        description: '알림을 읽음으로 표시했습니다.',
      });
    }
  };

  const handleResolve = async () => {
    if (!issue) return;

    setIsProcessing(true);
    try {
      await updateIssueStatus.mutateAsync({
        issueId: issue.id,
        status: 'resolved',
        resolution: '알림 패널에서 해결됨으로 표시',
      });

      toast({
        title: '이슈 해결됨',
        description: '이슈를 해결 상태로 변경했습니다.',
      });

      // 읽음 처리
      handleMarkAsRead();

      onClose();
    } catch (error) {
      toast({
        title: '오류',
        description: '이슈 해결 처리 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDismiss = () => {
    handleMarkAsRead();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className={cn('max-w-2xl max-h-[90vh] overflow-y-auto', className)}>
        <DialogHeader>
          <DialogTitle>알림 상세</DialogTitle>
          <DialogDescription>
            {item.type === 'issue' ? '이슈 상세 정보' : '이벤트 상세 정보'}
          </DialogDescription>
        </DialogHeader>

        {/* 컨텐츠 */}
        <div className="py-4">
          {issue && <IssueDetail issue={issue} />}
          {event && <EventDetail event={event} />}
        </div>

        {/* 푸터 */}
        <DialogFooter className="flex items-center justify-between sm:justify-between">
          <div className="flex items-center gap-2">
            {!item.isRead && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAsRead}
              >
                <Check className="h-4 w-4 mr-1" />
                읽음 표시
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {issue && issue.status === 'open' && (
              <Button
                variant="default"
                size="sm"
                onClick={handleResolve}
                disabled={isProcessing}
              >
                <CheckCircle2 className="h-4 w-4 mr-1" />
                해결됨으로 표시
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleDismiss}
            >
              <Ban className="h-4 w-4 mr-1" />
              닫기
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AlertDetailModal;

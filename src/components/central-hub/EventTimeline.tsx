/**
 * EventTimeline 컴포넌트
 *
 * Central Hub 대시보드용 이벤트 타임라인
 * Minu 서비스들의 이벤트를 시간순으로 표시합니다.
 *
 * @module components/central-hub/EventTimeline
 */

import { useMemo, useState } from 'react';
import {
  Play,
  AlertCircle,
  AlertTriangle,
  Activity,
  CheckCircle,
  Clock,
  Flag,
  User,
  Heart,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useServiceEvents } from '@/hooks/services/useServiceEvents';
import type {
  ServiceId,
  EventType,
  ServiceEvent,
} from '@/types/services/central-hub.types';

// ============================================================================
// 타입 정의
// ============================================================================

interface EventTimelineProps {
  /** 표시할 이벤트 수 (기본값: 50) */
  limit?: number;
  /** 서비스 필터 (기본값: 'all') */
  serviceFilter?: ServiceId | 'all';
  /** 최대 높이 (기본값: 'h-[400px]') */
  maxHeight?: string;
  /** 추가 CSS 클래스 */
  className?: string;
}

// ============================================================================
// 상수
// ============================================================================

/** 서비스별 색상 (Tailwind CSS 클래스) */
const SERVICE_COLORS: Record<ServiceId, { dot: string; bg: string; text: string }> = {
  'minu-find': {
    dot: 'bg-blue-500',
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-700 dark:text-blue-300',
  },
  'minu-frame': {
    dot: 'bg-violet-500',
    bg: 'bg-violet-100 dark:bg-violet-900/30',
    text: 'text-violet-700 dark:text-violet-300',
  },
  'minu-build': {
    dot: 'bg-amber-500',
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-700 dark:text-amber-300',
  },
  'minu-keep': {
    dot: 'bg-emerald-500',
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    text: 'text-emerald-700 dark:text-emerald-300',
  },
};

/** 서비스별 표시 이름 */
const SERVICE_NAMES: Record<ServiceId, string> = {
  'minu-find': 'Minu Find',
  'minu-frame': 'Minu Frame',
  'minu-build': 'Minu Build',
  'minu-keep': 'Minu Keep',
};

/** 이벤트 타입별 아이콘 */
const EVENT_ICONS: Record<EventType, React.ReactNode> = {
  'progress.updated': <Activity className="h-4 w-4" />,
  'task.completed': <CheckCircle className="h-4 w-4" />,
  'task.started': <Play className="h-4 w-4" />,
  'milestone.reached': <Flag className="h-4 w-4" />,
  'issue.created': <AlertCircle className="h-4 w-4" />,
  'issue.resolved': <CheckCircle className="h-4 w-4" />,
  'issue.updated': <AlertTriangle className="h-4 w-4" />,
  'service.health': <Heart className="h-4 w-4" />,
  'user.action': <User className="h-4 w-4" />,
};

/** 이벤트 타입별 레이블 */
const EVENT_LABELS: Record<EventType, string> = {
  'progress.updated': '진행률 업데이트',
  'task.completed': '작업 완료',
  'task.started': '작업 시작',
  'milestone.reached': '마일스톤 달성',
  'issue.created': '이슈 생성',
  'issue.resolved': '이슈 해결',
  'issue.updated': '이슈 업데이트',
  'service.health': '서비스 헬스',
  'user.action': '사용자 액션',
};

// ============================================================================
// 유틸리티 함수
// ============================================================================

/**
 * 상대 시간 포맷 (방금, 5분 전, 1시간 전 등)
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) {
    return '방금';
  } else if (diffMin < 60) {
    return `${diffMin}분 전`;
  } else if (diffHour < 24) {
    return `${diffHour}시간 전`;
  } else if (diffDay < 7) {
    return `${diffDay}일 전`;
  } else {
    return date.toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
    });
  }
}

/**
 * 이벤트 메시지 생성
 */
function getEventMessage(event: ServiceEvent): string {
  const { event_type, payload } = event;

  switch (event_type) {
    case 'progress.updated':
      return payload.message || `진행률: ${payload.progress || 0}%`;
    case 'task.completed':
      return payload.task_name || '작업 완료';
    case 'task.started':
      return payload.task_name || '작업 시작';
    case 'milestone.reached':
      return payload.milestone_name || '마일스톤 달성';
    case 'issue.created':
      return payload.title || '새 이슈 생성됨';
    case 'issue.resolved':
      return payload.title || '이슈 해결됨';
    case 'issue.updated':
      return payload.title || '이슈 업데이트됨';
    case 'service.health':
      return `상태: ${payload.status || 'unknown'}`;
    case 'user.action':
      return payload.message || '사용자 액션';
    default:
      return payload.message || event_type;
  }
}

// ============================================================================
// 컴포넌트
// ============================================================================

/**
 * 이벤트 타임라인 아이템
 */
function TimelineItem({
  event,
  isNew,
  isLast,
}: {
  event: ServiceEvent;
  isNew?: boolean;
  isLast?: boolean;
}) {
  const colors = SERVICE_COLORS[event.service_id];
  const icon = EVENT_ICONS[event.event_type] || <Activity className="h-4 w-4" />;
  const label = EVENT_LABELS[event.event_type] || event.event_type;
  const message = getEventMessage(event);

  return (
    <div
      className={cn(
        'relative flex gap-4 pb-6 last:pb-0',
        isNew && 'animate-fade-in'
      )}
    >
      {/* 타임라인 선 */}
      {!isLast && (
        <div
          className={cn(
            'absolute left-[15px] top-8 h-[calc(100%-24px)] w-0.5',
            colors.dot,
            'opacity-30'
          )}
          aria-hidden="true"
        />
      )}

      {/* 타임라인 점 */}
      <div
        className={cn(
          'relative z-10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full',
          colors.dot,
          'text-white shadow-sm'
        )}
      >
        {icon}
      </div>

      {/* 이벤트 내용 */}
      <div className="flex-1 min-w-0 pt-0.5">
        {/* 헤더: 서비스명 + 이벤트 타입 + 시간 */}
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <Badge variant="outline" className={cn(colors.bg, colors.text, 'text-xs')}>
            {SERVICE_NAMES[event.service_id]}
          </Badge>
          <span className="text-xs text-muted-foreground">{label}</span>
          <span className="text-xs text-muted-foreground ml-auto flex-shrink-0">
            {formatRelativeTime(event.created_at)}
          </span>
        </div>

        {/* 메시지 */}
        <p className="text-sm text-foreground truncate">{message}</p>

        {/* 메타데이터 (있는 경우) */}
        {event.payload.progress !== undefined && (
          <div className="mt-1.5 flex items-center gap-2">
            <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden max-w-[200px]">
              <div
                className={cn('h-full rounded-full', colors.dot)}
                style={{ width: `${Math.min(event.payload.progress, 100)}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground">
              {event.payload.progress}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 이벤트 타임라인 메인 컴포넌트
 */
export function EventTimeline({
  limit = 50,
  serviceFilter: initialServiceFilter = 'all',
  maxHeight = 'h-[400px]',
  className,
}: EventTimelineProps) {
  const [selectedService, setSelectedService] = useState<ServiceId | 'all'>(
    initialServiceFilter
  );

  // 이벤트 조회
  const { data: events, isLoading, error } = useServiceEvents({
    service_id: selectedService === 'all' ? undefined : selectedService,
    limit,
  });

  // 서비스 옵션
  const serviceOptions = useMemo(
    () => [
      { value: 'all', label: '전체 서비스' },
      { value: 'minu-find', label: 'Minu Find' },
      { value: 'minu-frame', label: 'Minu Frame' },
      { value: 'minu-build', label: 'Minu Build' },
      { value: 'minu-keep', label: 'Minu Keep' },
    ],
    []
  );

  return (
    <div className={cn('flex flex-col', className)}>
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h3 className="text-lg font-semibold">이벤트 타임라인</h3>
        <Select
          value={selectedService}
          onValueChange={(value) => setSelectedService(value as ServiceId | 'all')}
        >
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="서비스 선택" />
          </SelectTrigger>
          <SelectContent>
            {serviceOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 타임라인 */}
      <ScrollArea className={cn(maxHeight, 'pr-4')}>
        {/* 로딩 상태 */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
            <span className="ml-2 text-sm text-muted-foreground">로딩 중...</span>
          </div>
        )}

        {/* 에러 상태 */}
        {error && (
          <div className="flex items-center justify-center py-8 text-destructive">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span className="text-sm">이벤트를 불러오는데 실패했습니다.</span>
          </div>
        )}

        {/* 빈 상태 */}
        {!isLoading && !error && events?.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Clock className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">아직 이벤트가 없습니다.</p>
          </div>
        )}

        {/* 이벤트 목록 */}
        {!isLoading && !error && events && events.length > 0 && (
          <div className="space-y-0">
            {events.map((event, index) => (
              <TimelineItem
                key={event.id}
                event={event}
                isNew={index === 0}
                isLast={index === events.length - 1}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

export default EventTimeline;

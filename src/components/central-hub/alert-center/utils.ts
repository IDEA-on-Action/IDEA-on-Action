/**
 * AlertCenter 헬퍼 함수
 *
 * @module components/central-hub/alert-center/utils
 */

import {
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle2,
  Circle,
  CircleDot,
} from 'lucide-react';
import { createElement } from 'react';
import { cn } from '@/lib/utils';
import type {
  IssueSeverity,
  EventType,
  ServiceId,
} from '@/types/central-hub.types';
import type { StreamItem } from '@/hooks/useRealtimeEventStream';
import { getEventFromStreamItem, getIssueFromStreamItem } from '@/hooks/useRealtimeEventStream';
import type { DateGroup } from './types';

/**
 * 심각도별 아이콘 반환
 */
export function getSeverityIcon(severity: IssueSeverity) {
  const iconProps = { className: 'h-4 w-4' };

  switch (severity) {
    case 'critical':
      return createElement(AlertCircle, { ...iconProps, className: cn(iconProps.className, 'text-red-500') });
    case 'high':
      return createElement(AlertTriangle, { ...iconProps, className: cn(iconProps.className, 'text-orange-500') });
    case 'medium':
      return createElement(AlertTriangle, { ...iconProps, className: cn(iconProps.className, 'text-yellow-500') });
    case 'low':
      return createElement(Info, { ...iconProps, className: cn(iconProps.className, 'text-green-500') });
    default:
      return createElement(Info, { ...iconProps, className: cn(iconProps.className, 'text-gray-500') });
  }
}

/**
 * 이벤트 타입별 아이콘 반환
 */
export function getEventTypeIcon(eventType: EventType) {
  const iconProps = { className: 'h-4 w-4 text-blue-500' };

  switch (eventType) {
    case 'task.completed':
    case 'issue.resolved':
    case 'milestone.reached':
      return createElement(CheckCircle2, { ...iconProps, className: cn(iconProps.className, 'text-green-500') });
    case 'issue.created':
      return createElement(AlertCircle, { ...iconProps, className: cn(iconProps.className, 'text-red-500') });
    case 'progress.updated':
    case 'task.started':
      return createElement(CircleDot, iconProps);
    default:
      return createElement(Circle, iconProps);
  }
}

/**
 * 심각도별 배지 색상
 */
export function getSeverityBadgeClass(severity: IssueSeverity): string {
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
export function getSeverityLabel(severity: IssueSeverity): string {
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
export function getSeverityPriority(severity: IssueSeverity): number {
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
export function formatRelativeTime(date: Date): string {
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
export function getDateGroup(date: Date): DateGroup {
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
export function getDateGroupLabel(group: DateGroup): string {
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
export function getItemSeverity(item: StreamItem): IssueSeverity | null {
  const issue = getIssueFromStreamItem(item);
  return issue?.severity || null;
}

/**
 * 항목에서 서비스 ID 추출
 */
export function getItemServiceId(item: StreamItem): ServiceId {
  const issue = getIssueFromStreamItem(item);
  if (issue) return issue.service_id;

  const event = getEventFromStreamItem(item);
  if (event) return event.service_id;

  return 'minu-find'; // fallback
}

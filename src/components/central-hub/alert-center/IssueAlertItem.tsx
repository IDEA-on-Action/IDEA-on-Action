/**
 * 이슈 알림 아이템 컴포넌트
 *
 * @module components/central-hub/alert-center/IssueAlertItem
 */

import { Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import type { ServiceIssue } from '@/types/services/central-hub.types';
import { SERVICE_INFO } from '@/types/services/central-hub.types';
import type { StreamItem } from '@/hooks/realtime/useRealtimeEventStream';
import { getSeverityIcon, getSeverityBadgeClass, getSeverityLabel, formatRelativeTime } from './utils';

export interface IssueAlertItemProps {
  item: StreamItem;
  issue: ServiceIssue;
  isSelected: boolean;
  onToggleSelect: (itemId: string) => void;
  onMarkAsRead: (itemId: string) => void;
  onClick: () => void;
}

/**
 * 알림 아이템 (이슈)
 */
export function IssueAlertItem({
  item,
  issue,
  isSelected,
  onToggleSelect,
  onMarkAsRead,
  onClick,
}: IssueAlertItemProps) {
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

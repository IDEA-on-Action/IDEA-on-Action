/**
 * 이벤트 알림 아이템 컴포넌트
 *
 * @module components/central-hub/alert-center/EventAlertItem
 */

import { Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import type { ServiceEvent } from '@/types/central-hub.types';
import { SERVICE_INFO } from '@/types/central-hub.types';
import type { StreamItem } from '@/hooks/useRealtimeEventStream';
import { getEventTypeIcon, formatRelativeTime } from './utils';

export interface EventAlertItemProps {
  item: StreamItem;
  event: ServiceEvent;
  isSelected: boolean;
  onToggleSelect: (itemId: string) => void;
  onMarkAsRead: (itemId: string) => void;
  onClick: () => void;
}

/**
 * 알림 아이템 (이벤트)
 */
export function EventAlertItem({
  item,
  event,
  isSelected,
  onToggleSelect,
  onMarkAsRead,
  onClick,
}: EventAlertItemProps) {
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

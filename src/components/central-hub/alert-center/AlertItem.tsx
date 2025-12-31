/**
 * 알림 아이템 래퍼 컴포넌트
 *
 * @module components/central-hub/alert-center/AlertItem
 */

import type { StreamItem } from '@/hooks/useRealtimeEventStream';
import { getEventFromStreamItem, getIssueFromStreamItem } from '@/hooks/useRealtimeEventStream';
import { IssueAlertItem } from './IssueAlertItem';
import { EventAlertItem } from './EventAlertItem';

export interface AlertItemProps {
  item: StreamItem;
  isSelected: boolean;
  onToggleSelect: (itemId: string) => void;
  onMarkAsRead: (itemId: string) => void;
  onItemClick: (item: StreamItem) => void;
}

/**
 * 알림 아이템 (래퍼)
 */
export function AlertItem({
  item,
  isSelected,
  onToggleSelect,
  onMarkAsRead,
  onItemClick,
}: AlertItemProps) {
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

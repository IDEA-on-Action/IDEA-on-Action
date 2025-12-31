/**
 * 알림 그룹 컴포넌트
 *
 * @module components/central-hub/alert-center/AlertGroupComponent
 */

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { StreamItem } from '@/hooks/useRealtimeEventStream';
import type { AlertGroup } from './types';
import { AlertItem } from './AlertItem';

export interface AlertGroupComponentProps {
  group: AlertGroup;
  selectedItems: Set<string>;
  onToggleSelect: (itemId: string) => void;
  onMarkAsRead: (itemId: string) => void;
  onItemClick: (item: StreamItem) => void;
  defaultOpen?: boolean;
}

/**
 * 알림 그룹 컴포넌트
 */
export function AlertGroupComponent({
  group,
  selectedItems,
  onToggleSelect,
  onMarkAsRead,
  onItemClick,
  defaultOpen = true,
}: AlertGroupComponentProps) {
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

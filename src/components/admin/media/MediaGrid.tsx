/**
 * MediaGrid Component
 *
 * Grid layout for displaying media items with responsive columns.
 * Supports selection mode and empty state.
 */

import React from 'react';
import { ImageOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MediaItem } from './MediaItem';
import type { MediaItem as MediaItemType } from '@/types/cms/cms.types';

// =====================================================
// Types
// =====================================================

export interface MediaGridProps {
  items: MediaItemType[];
  selectedIds?: Set<string>;
  selectable?: boolean;
  isLoading?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
  onItemClick?: (item: MediaItemType) => void;
  onEdit?: (item: MediaItemType) => void;
  onDelete?: (item: MediaItemType) => void;
  onCopyUrl?: (url: string) => void;
  columns?: 2 | 3 | 4 | 5 | 6;
  className?: string;
}

// =====================================================
// Component
// =====================================================

export function MediaGrid({
  items,
  selectedIds = new Set(),
  selectable = true,
  isLoading = false,
  onSelect,
  onItemClick,
  onEdit,
  onDelete,
  onCopyUrl,
  columns = 4,
  className,
}: MediaGridProps) {
  // Column class mapping
  const columnClasses = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
    5: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5',
    6: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6',
  };

  // Loading State
  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center py-12', className)}>
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Loading media...</p>
        </div>
      </div>
    );
  }

  // Empty State
  if (items.length === 0) {
    return (
      <div className={cn('flex items-center justify-center py-12', className)}>
        <div className="text-center space-y-4">
          <div className="mx-auto h-16 w-16 rounded-full bg-muted flex items-center justify-center">
            <ImageOff className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-semibold">No media found</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Upload some images to get started
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Grid Layout
  return (
    <div className={cn('grid gap-4', columnClasses[columns], className)}>
      {items.map((item) => (
        <MediaItem
          key={item.id}
          item={item}
          selected={selectedIds.has(item.id)}
          selectable={selectable}
          onSelect={onSelect}
          onClick={onItemClick}
          onEdit={onEdit}
          onDelete={onDelete}
          onCopyUrl={onCopyUrl}
        />
      ))}
    </div>
  );
}

export default MediaGrid;

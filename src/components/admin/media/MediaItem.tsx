/**
 * MediaItem Component
 *
 * Individual media card component for displaying uploaded images.
 * Supports selection, preview, and actions.
 * R2 스토리지 마이그레이션 지원
 */

import React from 'react';
import { Check, MoreVertical, Trash2, Edit, Copy, ExternalLink, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatFileSize, formatRelativeTime } from '@/lib/cms-utils';
import type { MediaItem as MediaItemType } from '@/types/cms.types';
import { supabase } from '@/integrations/supabase/client';
import { rewriteStorageUrl } from '@/lib/storage/url-rewriter';

// =====================================================
// Types
// =====================================================

export interface MediaItemProps {
  item: MediaItemType;
  selected?: boolean;
  selectable?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
  onClick?: (item: MediaItemType) => void;
  onEdit?: (item: MediaItemType) => void;
  onDelete?: (item: MediaItemType) => void;
  onCopyUrl?: (url: string) => void;
  className?: string;
}

// =====================================================
// Helper Functions
// =====================================================

function getPublicUrl(storagePath: string): string {
  const { data } = supabase.storage.from('media-library').getPublicUrl(storagePath);
  // Supabase URL을 R2 URL로 변환
  return rewriteStorageUrl(data.publicUrl) || data.publicUrl;
}

// =====================================================
// Component
// =====================================================

export function MediaItem({
  item,
  selected = false,
  selectable = true,
  onSelect,
  onClick,
  onEdit,
  onDelete,
  onCopyUrl,
  className,
}: MediaItemProps) {
  const imageUrl = getPublicUrl(item.storage_path);
  const isImage = item.mime_type.startsWith('image/');

  // Handle card click
  const handleClick = (e: React.MouseEvent) => {
    // Don't trigger if clicking on checkbox or dropdown
    if ((e.target as HTMLElement).closest('[data-action]')) {
      return;
    }
    onClick?.(item);
  };

  // Handle checkbox change
  const handleCheckboxChange = (checked: boolean) => {
    onSelect?.(item.id, checked);
  };

  // Handle copy URL
  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(imageUrl);
      onCopyUrl?.(imageUrl);
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };

  return (
    <div
      className={cn(
        'group relative rounded-lg border bg-card overflow-hidden transition-all',
        'hover:border-primary/50 hover:shadow-md',
        selected && 'border-primary ring-2 ring-primary/20',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={handleClick}
    >
      {/* Image Preview */}
      <div className="aspect-square relative bg-muted">
        {isImage ? (
          <img
            src={imageUrl}
            alt={item.alt_text || item.original_filename}
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <ImageIcon className="h-12 w-12 text-muted-foreground" />
          </div>
        )}

        {/* Hover Overlay */}
        <div className={cn(
          'absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity',
          'flex items-center justify-center'
        )}>
          <Button
            size="sm"
            variant="secondary"
            onClick={(e) => {
              e.stopPropagation();
              onClick?.(item);
            }}
          >
            <ExternalLink className="h-4 w-4 mr-1" />
            Preview
          </Button>
        </div>

        {/* Selection Checkbox */}
        {selectable && (
          <div
            data-action="checkbox"
            className={cn(
              'absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity',
              selected && 'opacity-100'
            )}
          >
            <Checkbox
              checked={selected}
              onCheckedChange={handleCheckboxChange}
              className="bg-white/80 border-white"
            />
          </div>
        )}

        {/* Actions Menu */}
        <div
          data-action="menu"
          className={cn(
            'absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity',
          )}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                variant="secondary"
                className="h-8 w-8 bg-white/80 hover:bg-white"
              >
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleCopyUrl}>
                <Copy className="h-4 w-4 mr-2" />
                Copy URL
              </DropdownMenuItem>
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(item)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Details
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {onDelete && (
                <DropdownMenuItem
                  onClick={() => onDelete(item)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Selected Indicator */}
        {selected && (
          <div className="absolute top-2 right-2 h-6 w-6 rounded-full bg-primary flex items-center justify-center">
            <Check className="h-4 w-4 text-primary-foreground" />
          </div>
        )}
      </div>

      {/* File Info */}
      <div className="p-2">
        <div className="text-sm font-medium truncate" title={item.original_filename}>
          {item.original_filename}
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
          <span>{formatFileSize(item.file_size)}</span>
          <span>{formatRelativeTime(item.created_at)}</span>
        </div>
        {item.width && item.height && (
          <div className="text-xs text-muted-foreground">
            {item.width} x {item.height}
          </div>
        )}
      </div>
    </div>
  );
}

export default MediaItem;

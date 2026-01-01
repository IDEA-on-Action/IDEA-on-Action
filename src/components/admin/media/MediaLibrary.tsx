/**
 * MediaLibrary Component
 *
 * Main container component for the media library.
 * Combines uploader, search, grid, and modal components.
 * Supports both standalone and modal selection modes.
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  Trash2,
  ChevronLeft,
  ChevronRight,
  ImagePlus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useDebounce } from '@/hooks/useDebounce';
import { useMediaLibrary } from '@/hooks/media/useMediaLibrary';
import { MediaUploader } from './MediaUploader';
import { MediaGrid } from './MediaGrid';
import { MediaModal } from './MediaModal';
import { MediaFilter } from './MediaFilter';
import { toast } from 'sonner';
import type { MediaItem, MediaSearchParams } from '@/types/cms/cms.types';

// =====================================================
// Types
// =====================================================

export interface MediaLibraryProps {
  /**
   * Mode: 'manage' for full library management, 'select' for picking images
   */
  mode?: 'manage' | 'select';

  /**
   * Called when an image is selected (in 'select' mode)
   */
  onSelect?: (item: MediaItem) => void;

  /**
   * Allow multiple selection
   */
  allowMultiple?: boolean;

  /**
   * Number of columns in grid
   */
  columns?: 2 | 3 | 4 | 5 | 6;

  /**
   * Additional class names
   */
  className?: string;
}

// =====================================================
// Component
// =====================================================

export function MediaLibrary({
  mode = 'manage',
  onSelect,
  allowMultiple = false,
  columns = 4,
  className,
}: MediaLibraryProps) {
  // ===================================================================
  // State
  // ===================================================================

  const [filters, setFilters] = useState<MediaSearchParams>({
    page: 1,
    per_page: 20,
    sort_by: 'created_at',
    sort_order: 'desc',
  });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [showUploader, setShowUploader] = useState(false);

  // Debounced search for filters
  const debouncedSearch = useDebounce(filters.search || '', 300);

  // ===================================================================
  // Build Search Params
  // ===================================================================

  const searchParams: MediaSearchParams = useMemo(() => ({
    ...filters,
    search: debouncedSearch || undefined,
  }), [filters, debouncedSearch]);

  // ===================================================================
  // Media Library Hook
  // ===================================================================

  const {
    mediaItems,
    totalCount,
    currentPage,
    totalPages,
    isLoading,
    isUploading,
    uploadProgress,
    isUpdating,
    isDeleting,
    refetch,
    uploadMedia,
    updateMedia,
    deleteMedia,
    getPublicUrl,
    allowedMimeTypes,
    maxFileSize,
  } = useMediaLibrary({ params: searchParams });

  // ===================================================================
  // Handlers
  // ===================================================================

  // Handle selection toggle
  const handleSelect = useCallback((id: string, selected: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (selected) {
        if (!allowMultiple) {
          next.clear();
        }
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }, [allowMultiple]);

  // Handle item click (preview)
  const handleItemClick = useCallback((item: MediaItem) => {
    if (mode === 'select' && onSelect) {
      onSelect(item);
    } else {
      setPreviewItem(item);
    }
  }, [mode, onSelect]);

  // Handle edit
  const handleEdit = useCallback((item: MediaItem) => {
    setPreviewItem(item);
  }, []);

  // Handle delete single
  const handleDeleteSingle = useCallback((item: MediaItem) => {
    setSelectedIds(new Set([item.id]));
    setDeleteDialogOpen(true);
  }, []);

  // Handle delete selected
  const handleDeleteSelected = useCallback(() => {
    if (selectedIds.size > 0) {
      setDeleteDialogOpen(true);
    }
  }, [selectedIds]);

  // Confirm delete
  const confirmDelete = useCallback(() => {
    const ids = Array.from(selectedIds);
    deleteMedia(ids);
    setSelectedIds(new Set());
    setDeleteDialogOpen(false);
  }, [selectedIds, deleteMedia]);

  // Handle copy URL
  const handleCopyUrl = useCallback((url: string) => {
    toast.success('URL copied to clipboard');
  }, []);

  // Handle update
  const handleUpdate = useCallback((id: string, values: { alt_text?: string; filename?: string }) => {
    updateMedia({ id, values });
  }, [updateMedia]);

  // Handle upload
  const handleUpload = useCallback(async (files: File[]) => {
    await uploadMedia(files);
    setShowUploader(false);
  }, [uploadMedia]);

  // Select all / deselect all
  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === mediaItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(mediaItems.map(item => item.id)));
    }
  }, [selectedIds.size, mediaItems]);

  // ===================================================================
  // Render
  // ===================================================================

  // Handler for filter changes
  const handleFiltersChange = useCallback((newFilters: MediaSearchParams) => {
    setFilters(newFilters);
  }, []);

  // Handler for page changes
  const handlePageChange = useCallback((newPage: number) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  }, []);

  // ===================================================================
  // Render
  // ===================================================================

  return (
    <div className={cn('space-y-4', className)}>
      {/* Filter Component */}
      <MediaFilter
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onRefresh={() => refetch()}
        isLoading={isLoading}
        showDateFilter
      />

      {/* Toolbar */}
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            {totalCount} {totalCount === 1 ? 'file' : 'files'}
            {selectedIds.size > 0 && ` (${selectedIds.size} selected)`}
          </span>

          {mode === 'manage' && selectedIds.size > 0 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
              >
                {selectedIds.size === mediaItems.length ? 'Deselect all' : 'Select all'}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteSelected}
                disabled={isDeleting}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete ({selectedIds.size})
              </Button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowUploader(!showUploader)}
          >
            <ImagePlus className="h-4 w-4 mr-2" />
            Upload
          </Button>
        </div>
      </div>

      {/* Uploader (Collapsible) */}
      {showUploader && (
        <MediaUploader
          onUpload={handleUpload}
          isUploading={isUploading}
          uploadProgress={uploadProgress}
          maxFileSize={maxFileSize}
          allowedMimeTypes={allowedMimeTypes}
          multiple
          className="border rounded-lg p-4 bg-muted/30"
        />
      )}

      {/* Media Grid */}
      <MediaGrid
        items={mediaItems}
        selectedIds={selectedIds}
        selectable={mode === 'manage' || allowMultiple}
        isLoading={isLoading}
        onSelect={handleSelect}
        onItemClick={handleItemClick}
        onEdit={mode === 'manage' ? handleEdit : undefined}
        onDelete={mode === 'manage' ? handleDeleteSingle : undefined}
        onCopyUrl={handleCopyUrl}
        columns={columns}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1 || isLoading}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground px-4">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages || isLoading}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Preview Modal */}
      <MediaModal
        item={previewItem}
        open={!!previewItem}
        onOpenChange={(open) => !open && setPreviewItem(null)}
        onUpdate={mode === 'manage' ? handleUpdate : undefined}
        isUpdating={isUpdating}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Media</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedIds.size} {selectedIds.size === 1 ? 'file' : 'files'}?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default MediaLibrary;

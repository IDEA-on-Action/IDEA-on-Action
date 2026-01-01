/**
 * MediaFilter Component
 *
 * Reusable filter component for media library.
 * Includes search, type filter, date range, and sorting options.
 */

import React, { useCallback } from 'react';
import { Search, Filter, RefreshCw, X } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DateRangePicker } from '@/components/admin/ui/DateRangePicker';
import type { MediaSearchParams } from '@/types/cms/cms.types';

// =====================================================
// Types
// =====================================================

export interface MediaFilterProps {
  /**
   * Current filter values
   */
  filters: MediaSearchParams;

  /**
   * Callback when filters change
   */
  onFiltersChange: (filters: MediaSearchParams) => void;

  /**
   * Callback to refresh the list
   */
  onRefresh?: () => void;

  /**
   * Loading state
   */
  isLoading?: boolean;

  /**
   * Show date range filter
   */
  showDateFilter?: boolean;

  /**
   * Additional class names
   */
  className?: string;
}

// =====================================================
// Constants
// =====================================================

const MIME_TYPE_OPTIONS = [
  { value: '', label: 'All types' },
  { value: 'image/jpeg', label: 'JPEG' },
  { value: 'image/png', label: 'PNG' },
  { value: 'image/gif', label: 'GIF' },
  { value: 'image/webp', label: 'WebP' },
  { value: 'image/svg', label: 'SVG' },
] as const;

const SORT_OPTIONS = [
  { value: 'created_at-desc', label: 'Newest first' },
  { value: 'created_at-asc', label: 'Oldest first' },
  { value: 'filename-asc', label: 'Name (A-Z)' },
  { value: 'filename-desc', label: 'Name (Z-A)' },
  { value: 'file_size-desc', label: 'Largest first' },
  { value: 'file_size-asc', label: 'Smallest first' },
] as const;

// =====================================================
// Component
// =====================================================

export function MediaFilter({
  filters,
  onFiltersChange,
  onRefresh,
  isLoading = false,
  showDateFilter = true,
  className,
}: MediaFilterProps) {
  // ===================================================================
  // Handlers
  // ===================================================================

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onFiltersChange({
        ...filters,
        search: e.target.value || undefined,
        page: 1, // Reset to first page on search
      });
    },
    [filters, onFiltersChange]
  );

  const handleMimeTypeChange = useCallback(
    (value: string) => {
      onFiltersChange({
        ...filters,
        mime_type: value || undefined,
        page: 1, // Reset to first page on filter change
      });
    },
    [filters, onFiltersChange]
  );

  const handleSortChange = useCallback(
    (value: string) => {
      const [sortBy, sortOrder] = value.split('-') as [
        'created_at' | 'filename' | 'file_size',
        'asc' | 'desc'
      ];
      onFiltersChange({
        ...filters,
        sort_by: sortBy,
        sort_order: sortOrder,
      });
    },
    [filters, onFiltersChange]
  );

  const handleDateRangeChange = useCallback(
    (range: DateRange | undefined) => {
      onFiltersChange({
        ...filters,
        date_from: range?.from?.toISOString() || undefined,
        date_to: range?.to?.toISOString() || undefined,
        page: 1, // Reset to first page on filter change
      });
    },
    [filters, onFiltersChange]
  );

  const handleClearFilters = useCallback(() => {
    onFiltersChange({
      page: 1,
      per_page: filters.per_page,
      sort_by: 'created_at',
      sort_order: 'desc',
    });
  }, [filters.per_page, onFiltersChange]);

  // Check if any filters are active
  const hasActiveFilters =
    !!filters.search ||
    !!filters.mime_type ||
    !!filters.date_from ||
    !!filters.date_to;

  // Get current sort value
  const currentSortValue = `${filters.sort_by || 'created_at'}-${filters.sort_order || 'desc'}`;

  // Get date range value
  const dateRangeValue: DateRange | undefined =
    filters.date_from || filters.date_to
      ? {
          from: filters.date_from ? new Date(filters.date_from) : undefined,
          to: filters.date_to ? new Date(filters.date_to) : undefined,
        }
      : undefined;

  // ===================================================================
  // Render
  // ===================================================================

  return (
    <div className={cn('space-y-4', className)}>
      {/* Main Filter Row */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search files..."
            value={filters.search || ''}
            onChange={handleSearchChange}
            className="pl-9"
            aria-label="Search media files"
          />
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap gap-2">
          {/* MIME Type Filter */}
          <Select
            value={filters.mime_type || ''}
            onValueChange={handleMimeTypeChange}
          >
            <SelectTrigger className="w-[140px]" aria-label="Filter by file type">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              {MIME_TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Sort Select */}
          <Select value={currentSortValue} onValueChange={handleSortChange}>
            <SelectTrigger className="w-[160px]" aria-label="Sort media files">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Refresh Button */}
          {onRefresh && (
            <Button
              variant="outline"
              size="icon"
              onClick={onRefresh}
              disabled={isLoading}
              aria-label="Refresh media list"
            >
              <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
            </Button>
          )}
        </div>
      </div>

      {/* Date Range Filter (Second Row) */}
      {showDateFilter && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-2 flex-1 min-w-[280px] max-w-md">
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              Upload date:
            </span>
            <DateRangePicker
              value={dateRangeValue}
              onChange={handleDateRangeChange}
              placeholder="Select date range"
              disableFutureDates
              className="flex-1"
            />
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4 mr-1" />
              Clear filters
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default MediaFilter;

/**
 * Media Library TypeScript Type Definitions
 *
 * CMS Phase 5 - Media Library Module
 * Created: 2025-11-23
 *
 * This file provides dedicated media types that extend and complement
 * the base types defined in cms.types.ts
 *
 * IMPORTANT: Core types (MediaItem, MediaItemInsert, MediaItemUpdate,
 * MediaSearchParams) are defined in cms.types.ts. This file re-exports
 * them and provides additional utility types.
 *
 * Type mapping:
 * - UUID -> string
 * - TEXT -> string
 * - INTEGER -> number
 * - TIMESTAMPTZ -> string (ISO 8601)
 * - BOOLEAN -> boolean
 */

// =====================================================
// RE-EXPORT CORE TYPES FROM cms.types.ts
// =====================================================

// Import types for use in this file
import type { MediaItem as MediaItemType } from './cms.types';

// Re-export core types for convenience
// Primary types should be imported from '@/types/cms.types'
export type {
  MediaItem,
  MediaItemInsert,
  MediaItemUpdate,
  MediaSearchParams as MediaSearchParamsBase,
  MediaUploadProgress as MediaUploadProgressBase,
} from './cms.types';

/**
 * Request payload for uploading media
 */
export interface MediaUploadRequest {
  file: File;
  alt_text?: string;
}

/**
 * Response from media upload operation
 */
export interface MediaUploadResponse {
  success: boolean;
  media?: MediaItemType;
  error?: string;
}

// =====================================================
// MIME TYPE DEFINITIONS
// =====================================================

/**
 * Allowed MIME types for media uploads
 * Must match Supabase Storage bucket configuration
 */
export type MediaMimeType =
  | 'image/jpeg'
  | 'image/png'
  | 'image/gif'
  | 'image/webp'
  | 'image/svg+xml'
  | 'image/avif';

/**
 * MIME type categories for filtering
 */
export type MediaMimeCategory = 'image' | 'video' | 'document' | 'all';

/**
 * Map of MIME categories to their types
 */
export const MIME_TYPE_CATEGORIES: Record<MediaMimeCategory, string[]> = {
  image: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'image/avif',
  ],
  video: [],
  document: [],
  all: [],
};

// =====================================================
// FILTER & SEARCH TYPES
// =====================================================

/**
 * Filter parameters for querying media items
 */
export interface MediaFilter {
  mime_type?: MediaMimeType | string;
  search?: string;
  uploaded_by?: string;
  date_from?: string;
  date_to?: string;
}

/**
 * Pagination information for media lists
 */
export interface MediaPagination {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

/**
 * Sort options for media queries
 */
export type MediaSortField = 'created_at' | 'filename' | 'file_size' | 'updated_at';

/**
 * Sort direction
 */
export type MediaSortOrder = 'asc' | 'desc';

/**
 * Extended search parameters for media queries
 * Extends MediaSearchParamsBase from cms.types.ts
 */
export interface MediaSearchParamsExtended {
  search?: string;
  mime_type?: string | null;
  date_from?: string | null;
  date_to?: string | null;
  sort_by?: MediaSortField;
  sort_order?: MediaSortOrder;
  page?: number;
  per_page?: number;
}

// =====================================================
// INSERT & UPDATE TYPES
// =====================================================
// Note: MediaItemInsert and MediaItemUpdate are defined in cms.types.ts
// and re-exported above. The following are additional types.

// =====================================================
// UPLOAD PROGRESS TYPES
// =====================================================

/**
 * Upload status states
 */
export type MediaUploadStatus =
  | 'pending'
  | 'uploading'
  | 'processing'
  | 'completed'
  | 'error';

/**
 * Extended progress tracking for file uploads
 * Note: Base MediaUploadProgress is defined in cms.types.ts
 */
export interface MediaUploadProgressExtended {
  file: File;
  progress: number; // 0-100
  status: MediaUploadStatus;
  error?: string;
  result?: MediaItemType;
}

/**
 * Batch upload result
 */
export interface MediaBatchUploadResult {
  successful: MediaItemType[];
  failed: Array<{
    file: File;
    error: string;
  }>;
  total: number;
}

// =====================================================
// RESPONSE TYPES
// =====================================================

/**
 * Paginated response for media list queries
 */
export interface MediaListResponse {
  data: MediaItemType[];
  count: number;
  page: number;
  perPage: number;
  totalPages: number;
}

/**
 * Generic API response for media operations
 */
export interface MediaOperationResponse<T = MediaItemType> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// =====================================================
// STORAGE CONFIGURATION
// =====================================================

/**
 * Media storage bucket configuration
 */
export interface MediaStorageConfig {
  bucketName: string;
  maxFileSize: number; // bytes
  allowedMimeTypes: MediaMimeType[];
  cacheControl: string;
}

/**
 * Default storage configuration
 * Must match Supabase Storage bucket settings
 */
export const DEFAULT_MEDIA_STORAGE_CONFIG: MediaStorageConfig = {
  bucketName: 'media-library',
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedMimeTypes: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'image/avif',
  ],
  cacheControl: '31536000', // 1 year
};

// =====================================================
// UI COMPONENT TYPES
// =====================================================

/**
 * View mode for media grid display
 */
export type MediaViewMode = 'grid' | 'list';

/**
 * Selection mode for media items
 */
export type MediaSelectionMode = 'single' | 'multiple' | 'none';

/**
 * Media item actions available in UI
 */
export type MediaItemAction =
  | 'view'
  | 'edit'
  | 'download'
  | 'delete'
  | 'copy_url'
  | 'select';

/**
 * Props for media selection callbacks
 */
export interface MediaSelectionProps {
  onSelect?: (item: MediaItemType) => void;
  onMultiSelect?: (items: MediaItemType[]) => void;
  selectionMode?: MediaSelectionMode;
  selectedIds?: string[];
}

// =====================================================
// VALIDATION TYPES
// =====================================================

/**
 * File validation result
 */
export interface FileValidationResult {
  valid: boolean;
  error?: string;
  file?: File;
}

/**
 * Validation options for file uploads
 */
export interface FileValidationOptions {
  maxSize?: number;
  allowedTypes?: string[];
  allowedExtensions?: string[];
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Check if a MIME type is an image
 */
export function isImageMimeType(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

/**
 * Get file extension from MIME type
 */
export function getExtensionFromMimeType(mimeType: string): string {
  const extensions: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
    'image/avif': 'avif',
  };
  return extensions[mimeType] || '';
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Validate file against storage configuration
 */
export function validateMediaFile(
  file: File,
  config: MediaStorageConfig = DEFAULT_MEDIA_STORAGE_CONFIG
): FileValidationResult {
  if (file.size > config.maxFileSize) {
    return {
      valid: false,
      error: `File size exceeds ${formatFileSize(config.maxFileSize)} limit`,
    };
  }

  if (!config.allowedMimeTypes.includes(file.type as MediaMimeType)) {
    return {
      valid: false,
      error: `File type ${file.type} is not allowed`,
    };
  }

  return { valid: true, file };
}

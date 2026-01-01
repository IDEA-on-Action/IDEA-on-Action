/**
 * Media Upload Hook
 * @migration Supabase -> Cloudflare Workers (완전 마이그레이션 완료)
 *
 * Specialized hook for media file uploads with progress tracking.
 * Separate from useMediaLibrary for better reusability across different components.
 *
 * Features:
 * - Single and multiple file upload
 * - Progress tracking per file
 * - File validation (size, type)
 * - Auto thumbnail URL generation
 * - Optimistic progress updates
 * - Error handling per file
 *
 * @example
 * const {
 *   uploadMedia,
 *   uploadMultiple,
 *   isUploading,
 *   progress,
 *   error,
 *   reset
 * } = useMediaUpload();
 *
 * // Single file
 * await uploadMedia(file);
 *
 * // Multiple files
 * await uploadMultiple(files);
 */

import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { mediaApi } from '@/integrations/cloudflare/client';
import { useAuth } from '@/hooks/auth/useAuth';
import { toast } from 'sonner';
import { mediaQueryKeys } from '@/hooks/media/useMediaLibrary';
import type { MediaItem } from '@/types/cms.types';

// =====================================================
// Constants
// =====================================================

const MEDIA_BUCKET = 'cms-media';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
];

// =====================================================
// Types
// =====================================================

/**
 * Upload options for customizing upload behavior
 */
export interface UploadOptions {
  /** Custom folder path within storage (default: user_id/year/month) */
  folder?: string;
  /** Custom filename (default: auto-generated) */
  filename?: string;
  /** Whether to skip database record creation (default: false) */
  skipDatabaseInsert?: boolean;
  /** Alt text for the uploaded image */
  altText?: string;
}

/**
 * Status of individual file upload
 */
export type UploadStatus = 'pending' | 'uploading' | 'processing' | 'success' | 'error';

/**
 * Upload progress entry for each file
 */
export interface UploadProgressEntry {
  file: File;
  status: UploadStatus;
  progress: number;
  error?: string;
  result?: MediaItem;
}

/**
 * Upload result containing uploaded media item
 */
export interface UploadResult {
  success: boolean;
  data?: MediaItem;
  error?: string;
  url?: string;
}

// =====================================================
// Helper Functions
// =====================================================

/**
 * Validate media file
 */
function validateMediaFile(file: File): { valid: boolean; error?: string } {
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `파일 크기가 ${MAX_FILE_SIZE / 1024 / 1024}MB를 초과합니다.` };
  }

  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { valid: false, error: `지원하지 않는 파일 형식입니다: ${file.type}` };
  }

  return { valid: true };
}

/**
 * Generate unique filename
 */
function generateUniqueFilename(originalName: string): string {
  const ext = originalName.split('.').pop();
  const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
  return `${Date.now()}-${uuid}.${ext}`;
}

/**
 * Get image dimensions from file
 */
async function getImageDimensions(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      resolve(null);
      return;
    }

    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.width, height: img.height });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };

    img.src = url;
  });
}

// =====================================================
// Hook Implementation
// =====================================================

export function useMediaUpload() {
  const queryClient = useQueryClient();
  const { workersTokens } = useAuth();

  // State
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<Record<string, UploadProgressEntry>>({});
  const [error, setError] = useState<string | null>(null);

  // ===================================================================
  // Progress Helpers
  // ===================================================================

  /**
   * Update progress for a specific file
   */
  const updateProgress = useCallback((
    fileId: string,
    update: Partial<UploadProgressEntry>
  ) => {
    setProgress(prev => ({
      ...prev,
      [fileId]: {
        ...prev[fileId],
        ...update,
      },
    }));
  }, []);

  /**
   * Generate file ID for tracking
   */
  const getFileId = (file: File): string => {
    return `${file.name}-${file.size}-${file.lastModified}`;
  };

  // ===================================================================
  // Single File Upload
  // ===================================================================

  /**
   * Upload a single media file to Cloudflare Workers Storage
   */
  const uploadMedia = useCallback(async (
    file: File,
    options?: UploadOptions
  ): Promise<UploadResult> => {
    const token = workersTokens?.accessToken;
    if (!token) {
      return { success: false, error: '인증이 필요합니다.' };
    }

    const fileId = getFileId(file);

    // Initialize progress
    setProgress(prev => ({
      ...prev,
      [fileId]: {
        file,
        status: 'pending',
        progress: 0,
      },
    }));
    setError(null);

    try {
      // Validate file
      const validation = validateMediaFile(file);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Update status to uploading
      updateProgress(fileId, { status: 'uploading', progress: 10 });

      // Get image dimensions
      const dimensions = await getImageDimensions(file);

      // Update progress
      updateProgress(fileId, { progress: 30 });

      // Upload to Cloudflare Workers
      const result = await mediaApi.upload(token, [file], {
        folder: options?.folder,
        altText: options?.altText,
      });

      if (result.error) {
        throw new Error(`업로드 실패: ${result.error}`);
      }

      // Update progress
      updateProgress(fileId, { status: 'processing', progress: 80 });

      const uploadedItems = result.data as MediaItem[];
      const mediaItem = uploadedItems && uploadedItems.length > 0 ? uploadedItems[0] : null;

      if (!mediaItem) {
        throw new Error('업로드된 미디어 항목을 찾을 수 없습니다.');
      }

      // Update progress to complete
      updateProgress(fileId, {
        status: 'success',
        progress: 100,
        result: mediaItem,
      });

      // Invalidate media library queries
      queryClient.invalidateQueries({ queryKey: mediaQueryKeys.lists() });

      return {
        success: true,
        data: mediaItem,
        url: mediaApi.getPublicUrl(mediaItem.storage_path),
      };
    } catch (err) {
      const errorMessage = (err as Error).message;

      updateProgress(fileId, {
        status: 'error',
        progress: 0,
        error: errorMessage,
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  }, [workersTokens, queryClient, updateProgress]);

  // ===================================================================
  // Multiple Files Upload
  // ===================================================================

  /**
   * Upload multiple files sequentially
   */
  const uploadMultiple = useCallback(async (
    files: File[],
    options?: UploadOptions
  ): Promise<UploadResult[]> => {
    setIsUploading(true);
    setError(null);
    setProgress({});

    const results: UploadResult[] = [];
    let successCount = 0;
    let errorCount = 0;

    // Upload files sequentially to avoid overwhelming the server
    for (const file of files) {
      const result = await uploadMedia(file, options);
      results.push(result);

      if (result.success) {
        successCount++;
      } else {
        errorCount++;
      }
    }

    setIsUploading(false);

    // Show summary toast
    if (successCount > 0 && errorCount === 0) {
      toast.success(`${successCount}개 파일이 업로드되었습니다.`);
    } else if (successCount > 0 && errorCount > 0) {
      toast.warning(`${successCount}개 성공, ${errorCount}개 실패`);
    } else if (errorCount > 0) {
      toast.error(`${errorCount}개 파일 업로드 실패`);
    }

    return results;
  }, [uploadMedia]);

  // ===================================================================
  // Utility Functions
  // ===================================================================

  /**
   * Reset upload state
   */
  const reset = useCallback(() => {
    setIsUploading(false);
    setProgress({});
    setError(null);
  }, []);

  /**
   * Remove a specific file from progress tracking
   */
  const removeFromProgress = useCallback((fileId: string) => {
    setProgress(prev => {
      const next = { ...prev };
      delete next[fileId];
      return next;
    });
  }, []);

  /**
   * Get progress as array (useful for iteration)
   */
  const progressArray = Object.values(progress);

  /**
   * Get overall progress percentage
   */
  const overallProgress = progressArray.length > 0
    ? progressArray.reduce((sum, p) => sum + p.progress, 0) / progressArray.length
    : 0;

  // ===================================================================
  // Return API
  // ===================================================================

  return {
    // Methods
    uploadMedia,
    uploadMultiple,
    reset,
    removeFromProgress,

    // State
    isUploading,
    progress,
    progressArray,
    overallProgress,
    error,

    // Constants (for validation UI)
    allowedMimeTypes: ALLOWED_IMAGE_TYPES,
    maxFileSize: MAX_FILE_SIZE,
  };
}

export default useMediaUpload;

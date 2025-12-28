/**
 * Media Library Hook
 * @migration Supabase -> Cloudflare Workers (완전 마이그레이션 완료)
 *
 * Provides media CRUD operations with React Query integration.
 * Supports upload, list, search, delete, and metadata update.
 *
 * @example
 * const {
 *   mediaItems,
 *   isLoading,
 *   uploadMedia,
 *   deleteMedia,
 *   updateMedia,
 *   searchMedia
 * } = useMediaLibrary();
 */

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mediaApi } from '@/integrations/cloudflare/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { MediaItem, MediaItemUpdate, MediaSearchParams } from '@/types/cms.types';

// =====================================================
// Constants
// =====================================================

const DEFAULT_PER_PAGE = 20;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
];

// =====================================================
// Query Keys
// =====================================================

export const mediaQueryKeys = {
  all: ['media'] as const,
  lists: () => [...mediaQueryKeys.all, 'list'] as const,
  list: (params?: MediaSearchParams) => [...mediaQueryKeys.lists(), params] as const,
  detail: (id: string) => [...mediaQueryKeys.all, 'detail', id] as const,
};

// =====================================================
// Helper Functions
// =====================================================

/**
 * Validate file before upload
 */
function validateFile(file: File): { valid: boolean; error?: string } {
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit` };
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return { valid: false, error: `File type ${file.type} is not allowed` };
  }

  return { valid: true };
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

export interface UseMediaLibraryOptions {
  params?: MediaSearchParams;
  enabled?: boolean;
}

export function useMediaLibrary(options: UseMediaLibraryOptions = {}) {
  const { params, enabled = true } = options;
  const queryClient = useQueryClient();
  const { workersTokens } = useAuth();
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  // ===================================================================
  // List Media Items
  // ===================================================================

  const {
    data: mediaData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: mediaQueryKeys.list(params),
    queryFn: async () => {
      const token = workersTokens?.accessToken;
      if (!token) {
        throw new Error('인증이 필요합니다.');
      }

      try {
        const result = await mediaApi.list(token, {
          search: params?.search,
          mime_type: params?.mime_type,
          date_from: params?.date_from,
          date_to: params?.date_to,
          sort_by: params?.sort_by || 'created_at',
          sort_order: params?.sort_order || 'desc',
          page: params?.page || 1,
          per_page: params?.per_page || DEFAULT_PER_PAGE,
        });

        if (result.error) {
          console.error('[useMediaLibrary] List query error:', result.error);
          throw new Error(result.error);
        }

        const responseData = result.data as {
          data: MediaItem[];
          count: number;
          page: number;
          perPage: number;
          totalPages: number;
        };

        return {
          data: responseData.data || [],
          count: responseData.count || 0,
          page: responseData.page || 1,
          perPage: responseData.perPage || DEFAULT_PER_PAGE,
          totalPages: responseData.totalPages || 0,
        };
      } catch (error) {
        console.error('[useMediaLibrary] List query exception:', error);
        throw error;
      }
    },
    enabled: enabled && !!workersTokens?.accessToken,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // ===================================================================
  // Upload Media
  // ===================================================================

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]): Promise<MediaItem[]> => {
      const token = workersTokens?.accessToken;
      if (!token) {
        throw new Error('인증이 필요합니다.');
      }

      const results: MediaItem[] = [];

      for (const file of files) {
        // Validate file
        const validation = validateFile(file);
        if (!validation.valid) {
          toast.error(`${file.name}: ${validation.error}`);
          continue;
        }

        try {
          // Update progress
          setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));

          // Get image dimensions
          const dimensions = await getImageDimensions(file);

          // Update progress
          setUploadProgress(prev => ({ ...prev, [file.name]: 30 }));

          // Upload to storage
          const result = await mediaApi.upload(token, [file]);

          if (result.error) {
            throw new Error(result.error);
          }

          // Update progress
          setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));

          const uploadedItems = result.data as MediaItem[];
          if (uploadedItems && uploadedItems.length > 0) {
            results.push(...uploadedItems);
          }
        } catch (error) {
          console.error(`[useMediaLibrary] Upload failed for ${file.name}:`, error);
          toast.error(`Failed to upload ${file.name}`);
          setUploadProgress(prev => {
            const newProgress = { ...prev };
            delete newProgress[file.name];
            return newProgress;
          });
        }
      }

      return results;
    },
    onSuccess: (data) => {
      if (data.length > 0) {
        toast.success(`${data.length} file(s) uploaded successfully`);
        queryClient.invalidateQueries({ queryKey: mediaQueryKeys.lists() });
      }
      // Clear progress after a short delay
      setTimeout(() => setUploadProgress({}), 1000);
    },
    onError: (error: Error) => {
      toast.error(`Upload failed: ${error.message}`);
      setUploadProgress({});
    },
  });

  // ===================================================================
  // Update Media
  // ===================================================================

  const updateMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: MediaItemUpdate }): Promise<MediaItem> => {
      const token = workersTokens?.accessToken;
      if (!token) {
        throw new Error('인증이 필요합니다.');
      }

      const result = await mediaApi.update(token, id, {
        ...values,
        updated_at: new Date().toISOString(),
      });

      if (result.error) {
        throw new Error(result.error);
      }

      return result.data as MediaItem;
    },
    onSuccess: (data) => {
      toast.success('Media updated successfully');
      queryClient.invalidateQueries({ queryKey: mediaQueryKeys.lists() });
      queryClient.setQueryData(mediaQueryKeys.detail(data.id), data);
    },
    onError: (error: Error) => {
      toast.error(`Update failed: ${error.message}`);
    },
  });

  // ===================================================================
  // Delete Media (Soft Delete)
  // ===================================================================

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]): Promise<void> => {
      const token = workersTokens?.accessToken;
      if (!token) {
        throw new Error('인증이 필요합니다.');
      }

      const result = await mediaApi.delete(token, ids);

      if (result.error) {
        throw new Error(result.error);
      }
    },
    onSuccess: () => {
      toast.success('Media deleted successfully');
      queryClient.invalidateQueries({ queryKey: mediaQueryKeys.lists() });
    },
    onError: (error: Error) => {
      toast.error(`Delete failed: ${error.message}`);
    },
  });

  // ===================================================================
  // Permanently Delete Media
  // ===================================================================

  const permanentDeleteMutation = useMutation({
    mutationFn: async (ids: string[]): Promise<void> => {
      const token = workersTokens?.accessToken;
      if (!token) {
        throw new Error('인증이 필요합니다.');
      }

      const result = await mediaApi.permanentDelete(token, ids);

      if (result.error) {
        throw new Error(result.error);
      }
    },
    onSuccess: () => {
      toast.success('Media permanently deleted');
      queryClient.invalidateQueries({ queryKey: mediaQueryKeys.lists() });
    },
    onError: (error: Error) => {
      toast.error(`Permanent delete failed: ${error.message}`);
    },
  });

  // ===================================================================
  // Get Single Media Item
  // ===================================================================

  const getMediaItem = useCallback(async (id: string): Promise<MediaItem | null> => {
    const token = workersTokens?.accessToken;
    if (!token) {
      return null;
    }

    const result = await mediaApi.getById(token, id);

    if (result.error) {
      console.error('[useMediaLibrary] Get item error:', result.error);
      return null;
    }

    return result.data as MediaItem;
  }, [workersTokens]);

  // ===================================================================
  // Get Public URL
  // ===================================================================

  const getPublicUrl = useCallback((storagePath: string): string => {
    return mediaApi.getPublicUrl(storagePath);
  }, []);

  // ===================================================================
  // Return API
  // ===================================================================

  return {
    // Data
    mediaItems: mediaData?.data || [],
    totalCount: mediaData?.count || 0,
    currentPage: mediaData?.page || 1,
    totalPages: mediaData?.totalPages || 0,

    // State
    isLoading,
    error,
    uploadProgress,
    isUploading: uploadMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,

    // Methods
    refetch,
    uploadMedia: uploadMutation.mutateAsync,
    updateMedia: updateMutation.mutate,
    deleteMedia: deleteMutation.mutate,
    permanentDeleteMedia: permanentDeleteMutation.mutate,
    getMediaItem,
    getPublicUrl,

    // Constants
    allowedMimeTypes: ALLOWED_MIME_TYPES,
    maxFileSize: MAX_FILE_SIZE,
  };
}

export default useMediaLibrary;

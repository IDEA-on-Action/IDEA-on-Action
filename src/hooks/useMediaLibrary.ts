/**
 * Media Library Hook
 *
 * Provides media CRUD operations with React Query integration.
 * Supports upload, list, search, delete, and metadata update.
 *
 * Note: R2 마이그레이션 진행 중
 * - 새 프로젝트는 useR2Storage 사용 권장
 * - 기존 URL은 자동으로 R2 URL로 변환됨
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
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { rewriteStorageUrl } from '@/lib/storage/url-rewriter';
import type { MediaItem, MediaItemInsert, MediaItemUpdate, MediaSearchParams } from '@/types/cms.types';

// =====================================================
// Constants
// =====================================================

const MEDIA_BUCKET = 'media-library';
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
 * Generate unique filename with timestamp
 */
function generateUniqueFilename(originalFilename: string): string {
  const ext = originalFilename.split('.').pop() || '';
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}.${ext}`;
}

/**
 * Get public URL for storage path (R2 지원)
 */
function getPublicUrl(storagePath: string): string {
  const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(storagePath);
  // Supabase URL을 R2 URL로 변환
  return rewriteStorageUrl(data.publicUrl) || data.publicUrl;
}

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
      try {
        let query = supabase
          .from('media_library')
          .select('*', { count: 'exact' })
          .is('deleted_at', null);

        // Apply search filter
        if (params?.search) {
          query = query.ilike('filename', `%${params.search}%`);
        }

        // Apply mime type filter
        if (params?.mime_type) {
          query = query.ilike('mime_type', `${params.mime_type}%`);
        }

        // Apply date range filters
        if (params?.date_from) {
          query = query.gte('created_at', params.date_from);
        }
        if (params?.date_to) {
          query = query.lte('created_at', params.date_to);
        }

        // Apply sorting
        const sortBy = params?.sort_by || 'created_at';
        const sortOrder = params?.sort_order || 'desc';
        query = query.order(sortBy, { ascending: sortOrder === 'asc' });

        // Apply pagination
        const page = params?.page || 1;
        const perPage = params?.per_page || DEFAULT_PER_PAGE;
        const from = (page - 1) * perPage;
        const to = from + perPage - 1;
        query = query.range(from, to);

        const { data, error, count } = await query;

        if (error) {
          console.error('[useMediaLibrary] List query error:', error);
          throw error;
        }

        // 미디어 아이템의 URL을 R2 URL로 변환
        const normalizedData = (data || []).map(item => ({
          ...item,
          storage_path: item.storage_path,
          // URL 필드가 있으면 R2 URL로 변환
          url: item.url ? rewriteStorageUrl(item.url as string) : undefined,
        })) as MediaItem[];

        return {
          data: normalizedData,
          count: count || 0,
          page,
          perPage,
          totalPages: Math.ceil((count || 0) / perPage),
        };
      } catch (error) {
        console.error('[useMediaLibrary] List query exception:', error);
        throw error;
      }
    },
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // ===================================================================
  // Upload Media
  // ===================================================================

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]): Promise<MediaItem[]> => {
      const results: MediaItem[] = [];
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('User not authenticated');
      }

      for (const file of files) {
        // Validate file
        const validation = validateFile(file);
        if (!validation.valid) {
          toast.error(`${file.name}: ${validation.error}`);
          continue;
        }

        try {
          // Generate unique filename
          const uniqueFilename = generateUniqueFilename(file.name);
          const year = new Date().getFullYear();
          const month = String(new Date().getMonth() + 1).padStart(2, '0');
          const storagePath = `${user.id}/${year}/${month}/${uniqueFilename}`;

          // Update progress
          setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));

          // Upload to storage
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from(MEDIA_BUCKET)
            .upload(storagePath, file, {
              cacheControl: '31536000', // 1 year
              upsert: false,
            });

          if (uploadError) {
            throw uploadError;
          }

          // Update progress
          setUploadProgress(prev => ({ ...prev, [file.name]: 50 }));

          // Get image dimensions
          const dimensions = await getImageDimensions(file);

          // Insert metadata into database
          const insertData: MediaItemInsert = {
            filename: uniqueFilename,
            original_filename: file.name,
            file_size: file.size,
            mime_type: file.type,
            storage_path: storagePath,
            uploaded_by: user.id,
            width: dimensions?.width || null,
            height: dimensions?.height || null,
          };

          const { data: mediaItem, error: insertError } = await supabase
            .from('media_library')
            .insert(insertData)
            .select()
            .single();

          if (insertError) {
            // Cleanup uploaded file if metadata insert fails
            await supabase.storage.from(MEDIA_BUCKET).remove([storagePath]);
            throw insertError;
          }

          // Update progress
          setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
          results.push(mediaItem as MediaItem);
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
      const { data, error } = await supabase
        .from('media_library')
        .update({ ...values, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data as MediaItem;
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
      // Soft delete by setting deleted_at
      const { error } = await supabase
        .from('media_library')
        .update({ deleted_at: new Date().toISOString() })
        .in('id', ids);

      if (error) {
        throw error;
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
      // Get storage paths first
      const { data: items } = await supabase
        .from('media_library')
        .select('storage_path')
        .in('id', ids);

      if (items && items.length > 0) {
        // Delete from storage
        const paths = items.map(item => item.storage_path);
        await supabase.storage.from(MEDIA_BUCKET).remove(paths);
      }

      // Delete from database
      const { error } = await supabase
        .from('media_library')
        .delete()
        .in('id', ids);

      if (error) {
        throw error;
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
    const { data, error } = await supabase
      .from('media_library')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('[useMediaLibrary] Get item error:', error);
      return null;
    }

    return data as MediaItem;
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

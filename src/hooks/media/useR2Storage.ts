/**
 * R2 Storage Hook
 *
 * Cloudflare R2 스토리지 작업을 위한 React Query 기반 훅
 * Supabase Storage → R2 마이그레이션 후 useMediaUpload 대체
 *
 * @example
 * const {
 *   files,
 *   uploadFile,
 *   deleteFile,
 *   isUploading,
 *   uploadProgress,
 * } = useR2Storage({ folder: 'avatars' });
 */

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  storageClient,
  type MediaFile,
  type UploadResult,
  type StorageStats,
  ALLOWED_FILE_TYPES,
  ALL_ALLOWED_TYPES,
  MAX_FILE_SIZE,
} from '@/integrations/cloudflare/storage';
import { rewriteStorageUrl, getImageVariant } from '@/lib/storage/url-rewriter';

// =====================================================
// Query Keys
// =====================================================

export const r2StorageQueryKeys = {
  all: ['r2-storage'] as const,
  lists: () => [...r2StorageQueryKeys.all, 'list'] as const,
  list: (filters: { folder?: string; limit?: number }) =>
    [...r2StorageQueryKeys.lists(), filters] as const,
  stats: () => [...r2StorageQueryKeys.all, 'stats'] as const,
};

// =====================================================
// Types
// =====================================================

export interface UseR2StorageOptions {
  /** 파일 폴더 필터 */
  folder?: string;
  /** 페이지당 파일 수 */
  limit?: number;
  /** 쿼리 활성화 여부 */
  enabled?: boolean;
}

export interface UploadProgress {
  file: File;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
  result?: UploadResult;
}

// =====================================================
// Hook Implementation
// =====================================================

export function useR2Storage(options: UseR2StorageOptions = {}) {
  const { folder, limit = 50, enabled = true } = options;
  const queryClient = useQueryClient();

  // 업로드 진행 상태
  const [uploadProgress, setUploadProgress] = useState<Record<string, UploadProgress>>({});

  // ===================================================================
  // 파일 목록 조회
  // ===================================================================

  const filesQuery = useQuery({
    queryKey: r2StorageQueryKeys.list({ folder, limit }),
    queryFn: async () => {
      const result = await storageClient.listFiles({ folder, limit });
      return result;
    },
    enabled,
    staleTime: 1000 * 60 * 5, // 5분
  });

  // ===================================================================
  // 파일 업로드
  // ===================================================================

  const uploadMutation = useMutation({
    mutationFn: async ({ file, folder: uploadFolder }: { file: File; folder?: string }) => {
      return storageClient.uploadFile(file, { folder: uploadFolder || folder });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: r2StorageQueryKeys.lists() });
    },
  });

  /**
   * 단일 파일 업로드
   */
  const uploadFile = useCallback(
    async (file: File, uploadFolder?: string): Promise<UploadResult | null> => {
      const fileId = `${file.name}-${file.size}-${Date.now()}`;

      // 진행 상태 초기화
      setUploadProgress((prev) => ({
        ...prev,
        [fileId]: { file, status: 'pending', progress: 0 },
      }));

      try {
        // 파일 검증
        if (!ALL_ALLOWED_TYPES.includes(file.type)) {
          throw new Error(`허용되지 않는 파일 형식: ${file.type}`);
        }
        if (file.size > MAX_FILE_SIZE) {
          throw new Error(`파일 크기 초과 (최대 ${MAX_FILE_SIZE / 1024 / 1024}MB)`);
        }

        // 업로드 시작
        setUploadProgress((prev) => ({
          ...prev,
          [fileId]: { ...prev[fileId], status: 'uploading', progress: 30 },
        }));

        const result = await uploadMutation.mutateAsync({
          file,
          folder: uploadFolder,
        });

        // 완료
        setUploadProgress((prev) => ({
          ...prev,
          [fileId]: { ...prev[fileId], status: 'success', progress: 100, result },
        }));

        toast.success('파일이 업로드되었습니다.');
        return result;
      } catch (err) {
        const errorMessage = (err as Error).message;

        setUploadProgress((prev) => ({
          ...prev,
          [fileId]: { ...prev[fileId], status: 'error', progress: 0, error: errorMessage },
        }));

        toast.error(errorMessage);
        return null;
      }
    },
    [uploadMutation]
  );

  /**
   * 여러 파일 업로드
   */
  const uploadFiles = useCallback(
    async (files: File[], uploadFolder?: string): Promise<(UploadResult | null)[]> => {
      const results: (UploadResult | null)[] = [];

      for (const file of files) {
        const result = await uploadFile(file, uploadFolder);
        results.push(result);
      }

      const successCount = results.filter((r) => r !== null).length;
      const errorCount = results.length - successCount;

      if (successCount > 0 && errorCount === 0) {
        toast.success(`${successCount}개 파일 업로드 완료`);
      } else if (successCount > 0 && errorCount > 0) {
        toast.warning(`${successCount}개 성공, ${errorCount}개 실패`);
      }

      return results;
    },
    [uploadFile]
  );

  // ===================================================================
  // 파일 삭제
  // ===================================================================

  const deleteMutation = useMutation({
    mutationFn: async (fileId: string) => {
      return storageClient.deleteFile(fileId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: r2StorageQueryKeys.lists() });
      toast.success('파일이 삭제되었습니다.');
    },
    onError: (error) => {
      toast.error(`파일 삭제 실패: ${(error as Error).message}`);
    },
  });

  // ===================================================================
  // 스토리지 통계 (관리자용)
  // ===================================================================

  const statsQuery = useQuery({
    queryKey: r2StorageQueryKeys.stats(),
    queryFn: async () => {
      return storageClient.getStorageStats();
    },
    enabled: false, // 수동 호출용
    staleTime: 1000 * 60 * 10, // 10분
  });

  // ===================================================================
  // 유틸리티
  // ===================================================================

  /**
   * 업로드 진행 상태 초기화
   */
  const resetProgress = useCallback(() => {
    setUploadProgress({});
  }, []);

  /**
   * 특정 파일 진행 상태 제거
   */
  const removeProgress = useCallback((fileId: string) => {
    setUploadProgress((prev) => {
      const next = { ...prev };
      delete next[fileId];
      return next;
    });
  }, []);

  /**
   * 전체 업로드 진행률 계산
   */
  const progressArray = Object.values(uploadProgress);
  const overallProgress =
    progressArray.length > 0
      ? progressArray.reduce((sum, p) => sum + p.progress, 0) / progressArray.length
      : 0;

  /**
   * 업로드 중 여부
   */
  const isUploading = progressArray.some((p) => p.status === 'uploading');

  // ===================================================================
  // Return API
  // ===================================================================

  return {
    // 파일 목록
    files: filesQuery.data?.files || [],
    nextCursor: filesQuery.data?.nextCursor || null,
    isLoading: filesQuery.isLoading,
    isError: filesQuery.isError,
    error: filesQuery.error,
    refetch: filesQuery.refetch,

    // 업로드
    uploadFile,
    uploadFiles,
    isUploading,
    uploadProgress,
    progressArray,
    overallProgress,
    resetProgress,
    removeProgress,

    // 삭제
    deleteFile: deleteMutation.mutate,
    deleteFileAsync: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,

    // 통계
    stats: statsQuery.data as StorageStats | undefined,
    fetchStats: statsQuery.refetch,
    isLoadingStats: statsQuery.isLoading,

    // URL 유틸리티
    rewriteUrl: rewriteStorageUrl,
    getImageVariant,

    // 상수
    allowedTypes: ALL_ALLOWED_TYPES,
    allowedFileTypes: ALLOWED_FILE_TYPES,
    maxFileSize: MAX_FILE_SIZE,
    formatFileSize: storageClient.formatFileSize,
    r2PublicUrl: storageClient.R2_PUBLIC_URL,
  };
}

// =====================================================
// 추가 유틸리티 훅
// =====================================================

/**
 * R2 이미지 URL 훅
 * Supabase URL을 R2 URL로 자동 변환
 */
export function useR2ImageUrl(
  url: string | null | undefined,
  options?: {
    width?: number;
    height?: number;
    fit?: 'contain' | 'cover' | 'scale-down' | 'crop';
    quality?: number;
    format?: 'webp' | 'avif' | 'jpeg' | 'png';
  }
) {
  if (!url) return null;

  if (options && Object.keys(options).length > 0) {
    return getImageVariant(url, options);
  }

  return rewriteStorageUrl(url);
}

export default useR2Storage;

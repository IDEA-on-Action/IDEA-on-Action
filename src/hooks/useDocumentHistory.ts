/**
 * useDocumentHistory Hook
 *
 * 생성된 문서 이력 관리 (xlsx, docx, pptx)
 * - 문서 목록 조회
 * - 문서 저장
 * - 문서 삭제
 * - React Query 캐싱
 *
 * @module hooks/useDocumentHistory
 * @migration Supabase → Cloudflare Workers (완전 마이그레이션 완료)
 */

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { callWorkersApi } from '@/integrations/cloudflare/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import type {
  GeneratedDocument,
  CreateGeneratedDocument,
  UseDocumentHistoryResult,
  UseDocumentHistoryOptions,
  UseDocumentStatsResult,
  DocumentStats,
} from '@/types/document-history.types';

// ============================================================================
// Constants
// ============================================================================

const QUERY_KEY_PREFIX = 'document-history';
const STATS_QUERY_KEY_PREFIX = 'document-stats';

// ============================================================================
// useDocumentHistory Hook
// ============================================================================

/**
 * 문서 이력 관리 훅
 *
 * @param options - 옵션 (파일 유형 필터, 정렬 등)
 * @returns 문서 목록, 저장/삭제 함수, 로딩 상태
 *
 * @example
 * ```tsx
 * const { documents, isLoading, saveDocument, deleteDocument } = useDocumentHistory();
 *
 * // 문서 저장
 * await saveDocument({
 *   user_id: user.id,
 *   file_name: 'report.xlsx',
 *   file_type: 'xlsx',
 *   file_size: 12345,
 *   metadata: { title: '주간 보고서' },
 * });
 *
 * // 문서 삭제
 * await deleteDocument(documentId);
 * ```
 */
export function useDocumentHistory(
  options: UseDocumentHistoryOptions = {}
): UseDocumentHistoryResult {
  const { user, workersTokens } = useAuth();
  const queryClient = useQueryClient();
  const { fileType, orderBy = 'desc', limit } = options;

  // 문서 목록 조회
  const {
    data: documents = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [QUERY_KEY_PREFIX, user?.id, fileType, orderBy, limit],
    queryFn: async (): Promise<GeneratedDocument[]> => {
      if (!user) {
        return [];
      }

      const queryParams = new URLSearchParams();
      if (fileType) queryParams.set('file_type', fileType);
      if (orderBy) queryParams.set('order_by', orderBy);
      if (limit) queryParams.set('limit', String(limit));

      const queryString = queryParams.toString();
      const response = await callWorkersApi<GeneratedDocument[]>(
        `/api/v1/documents${queryString ? `?${queryString}` : ''}`,
        { token: workersTokens?.accessToken }
      );

      if (response.error) {
        throw new Error(`문서 목록 조회 실패: ${response.error}`);
      }

      return response.data || [];
    },
    enabled: !!user,
  });

  // 문서 저장
  const saveMutation = useMutation({
    mutationFn: async (doc: CreateGeneratedDocument): Promise<GeneratedDocument> => {
      const response = await callWorkersApi<GeneratedDocument>(
        '/api/v1/documents',
        {
          method: 'POST',
          token: workersTokens?.accessToken,
          body: doc,
        }
      );

      if (response.error) {
        throw new Error(`문서 저장 실패: ${response.error}`);
      }

      return response.data as GeneratedDocument;
    },
    onSuccess: (data) => {
      // 쿼리 캐시 무효화
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_PREFIX] });
      queryClient.invalidateQueries({ queryKey: [STATS_QUERY_KEY_PREFIX] });
      toast.success(`문서가 저장되었습니다: ${data.file_name}`);
    },
    onError: (error: Error) => {
      toast.error(`문서 저장 실패: ${error.message}`);
    },
  });

  // 문서 삭제
  const deleteMutation = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const response = await callWorkersApi(
        `/api/v1/documents/${id}`,
        {
          method: 'DELETE',
          token: workersTokens?.accessToken,
        }
      );

      if (response.error) {
        throw new Error(`문서 삭제 실패: ${response.error}`);
      }
    },
    onSuccess: () => {
      // 쿼리 캐시 무효화
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_PREFIX] });
      queryClient.invalidateQueries({ queryKey: [STATS_QUERY_KEY_PREFIX] });
      toast.success('문서가 삭제되었습니다');
    },
    onError: (error: Error) => {
      toast.error(`문서 삭제 실패: ${error.message}`);
    },
  });

  const saveDocument = useCallback(
    async (doc: CreateGeneratedDocument): Promise<GeneratedDocument> => {
      return saveMutation.mutateAsync(doc);
    },
    [saveMutation]
  );

  const deleteDocument = useCallback(
    async (id: string): Promise<void> => {
      return deleteMutation.mutateAsync(id);
    },
    [deleteMutation]
  );

  return {
    documents,
    isLoading,
    error: error as Error | null,
    saveDocument,
    deleteDocument,
    refetch,
  };
}

// ============================================================================
// useDocumentStats Hook
// ============================================================================

/**
 * 문서 통계 조회 훅
 *
 * @returns 파일 유형별 통계 (개수, 총 크기, 최신 생성 날짜)
 *
 * @example
 * ```tsx
 * const { stats, isLoading } = useDocumentStats();
 *
 * stats.forEach(({ file_type, count, total_size }) => {
 *   console.log(`${file_type}: ${count}개, ${total_size} bytes`);
 * });
 * ```
 */
export function useDocumentStats(): UseDocumentStatsResult {
  const { user, workersTokens } = useAuth();

  const {
    data: stats = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [STATS_QUERY_KEY_PREFIX, user?.id],
    queryFn: async (): Promise<DocumentStats[]> => {
      if (!user) {
        return [];
      }

      const response = await callWorkersApi<DocumentStats[]>(
        '/api/v1/documents/stats',
        { token: workersTokens?.accessToken }
      );

      if (response.error) {
        throw new Error(`통계 조회 실패: ${response.error}`);
      }

      return response.data || [];
    },
    enabled: !!user,
  });

  return {
    stats,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * 파일 크기를 읽기 쉬운 형식으로 변환
 *
 * @param bytes - 바이트 크기
 * @param decimals - 소수점 자릿수 (기본: 2)
 * @returns 포맷된 문자열 (예: "1.23 MB")
 */
export function formatFileSize(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * 파일 유형별 아이콘 이름 반환
 *
 * @param fileType - 파일 유형
 * @returns Lucide 아이콘 이름
 */
export function getFileTypeIcon(fileType: 'xlsx' | 'docx' | 'pptx'): string {
  const iconMap: Record<string, string> = {
    xlsx: 'FileSpreadsheet',
    docx: 'FileText',
    pptx: 'Presentation',
  };
  return iconMap[fileType] || 'File';
}

/**
 * 파일 유형별 라벨 반환
 *
 * @param fileType - 파일 유형
 * @returns 한글 라벨
 */
export function getFileTypeLabel(fileType: 'xlsx' | 'docx' | 'pptx'): string {
  const labelMap: Record<string, string> = {
    xlsx: 'Excel',
    docx: 'Word',
    pptx: 'PowerPoint',
  };
  return labelMap[fileType] || fileType.toUpperCase();
}

// ============================================================================
// Default Export
// ============================================================================

export default useDocumentHistory;

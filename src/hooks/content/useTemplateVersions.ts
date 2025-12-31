/**
 * useTemplateVersions Hook
 *
 * 템플릿 버전 관리 (조회, 복원, 비교)
 * - 버전 목록 조회 (생성자 정보 포함)
 * - 특정 버전으로 복원
 * - 버전 간 비교 (diff)
 * - 버전 통계 조회
 * - React Query 캐싱
 *
 * @module hooks/useTemplateVersions
 * @migration Supabase → Cloudflare Workers (완전 마이그레이션 완료)
 */

import { useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { callWorkersApi } from '@/integrations/cloudflare/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type {
  TemplateVersionWithCreator,
  TemplateVersionStats,
  UseTemplateVersionsResult,
  UseTemplateVersionsOptions,
  VersionDiff,
  VersionComparison,
  RestoreVersionResponse,
} from '@/types/template-version.types';

// ============================================================================
// Constants
// ============================================================================

const QUERY_KEY_PREFIX = 'template-versions';
const STATS_QUERY_KEY_PREFIX = 'template-version-stats';

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * 두 객체 간 차이점 계산 (간단한 diff)
 *
 * @param obj1 - 이전 객체
 * @param obj2 - 새 객체
 * @returns 차이점 (added, removed, changed)
 */
function calculateDiff(
  obj1: Record<string, unknown>,
  obj2: Record<string, unknown>
): VersionDiff {
  const added: string[] = [];
  const removed: string[] = [];
  const changed: string[] = [];

  const keys1 = new Set(Object.keys(obj1));
  const keys2 = new Set(Object.keys(obj2));

  // 추가된 키
  keys2.forEach((key) => {
    if (!keys1.has(key)) {
      added.push(key);
    }
  });

  // 삭제된 키
  keys1.forEach((key) => {
    if (!keys2.has(key)) {
      removed.push(key);
    }
  });

  // 변경된 키 (값이 다른 경우)
  keys1.forEach((key) => {
    if (keys2.has(key) && JSON.stringify(obj1[key]) !== JSON.stringify(obj2[key])) {
      changed.push(key);
    }
  });

  return { added, removed, changed };
}

/**
 * 변경 비율 계산 (0~1)
 *
 * @param diff - 차이점
 * @param totalKeys - 전체 키 개수
 * @returns 변경 비율 (0~1)
 */
function calculateChangeRate(diff: VersionDiff, totalKeys: number): number {
  if (totalKeys === 0) return 0;
  const changedCount = diff.added.length + diff.removed.length + diff.changed.length;
  return Math.min(changedCount / totalKeys, 1);
}

// ============================================================================
// useTemplateVersions Hook
// ============================================================================

/**
 * 템플릿 버전 관리 훅
 *
 * @param options - 옵션 (템플릿 ID, 통계 포함 여부)
 * @returns 버전 목록, 복원/비교 함수, 통계, 로딩 상태
 *
 * @example
 * ```tsx
 * const { versions, isLoading, restoreVersion, compareVersions, stats } =
 *   useTemplateVersions({ templateId: 'xxx-xxx-xxx' });
 *
 * // 버전 복원
 * await restoreVersion(versionId);
 *
 * // 버전 비교
 * const comparison = compareVersions(versionId1, versionId2);
 * console.log(comparison?.diff);
 * ```
 */
export function useTemplateVersions(
  options: UseTemplateVersionsOptions
): UseTemplateVersionsResult {
  const { user, workersTokens } = useAuth();
  const queryClient = useQueryClient();
  const { templateId, includeStats = true } = options;

  // 버전 목록 조회
  const {
    data: versions = [],
    isLoading: isLoadingVersions,
    error: versionsError,
    refetch: refetchVersions,
  } = useQuery({
    queryKey: [QUERY_KEY_PREFIX, templateId],
    queryFn: async (): Promise<TemplateVersionWithCreator[]> => {
      const response = await callWorkersApi<TemplateVersionWithCreator[]>(
        `/api/v1/templates/${templateId}/versions`,
        { token: workersTokens?.accessToken }
      );

      if (response.error) {
        throw new Error(`버전 목록 조회 실패: ${response.error}`);
      }

      return (response.data || []) as TemplateVersionWithCreator[];
    },
    enabled: !!templateId && !!user,
  });

  // 버전 통계 조회
  const {
    data: stats = null,
    isLoading: isLoadingStats,
    refetch: refetchStats,
  } = useQuery({
    queryKey: [STATS_QUERY_KEY_PREFIX, templateId],
    queryFn: async (): Promise<TemplateVersionStats | null> => {
      const response = await callWorkersApi<TemplateVersionStats>(
        `/api/v1/templates/${templateId}/versions/stats`,
        { token: workersTokens?.accessToken }
      );

      if (response.error) {
        throw new Error(`통계 조회 실패: ${response.error}`);
      }

      return (response.data as TemplateVersionStats) || null;
    },
    enabled: !!templateId && !!user && includeStats,
  });

  // 버전 복원 Mutation
  const restoreMutation = useMutation({
    mutationFn: async (versionId: string): Promise<RestoreVersionResponse> => {
      const response = await callWorkersApi<RestoreVersionResponse>(
        `/api/v1/templates/${templateId}/versions/${versionId}/restore`,
        {
          method: 'POST',
          token: workersTokens?.accessToken,
        }
      );

      if (response.error) {
        throw new Error(`버전 복원 실패: ${response.error}`);
      }

      return response.data as RestoreVersionResponse;
    },
    onSuccess: (data) => {
      // 쿼리 캐시 무효화
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_PREFIX] });
      queryClient.invalidateQueries({ queryKey: [STATS_QUERY_KEY_PREFIX] });
      queryClient.invalidateQueries({ queryKey: ['document-templates'] });

      toast.success(`버전 ${data.current_version}으로 복원되었습니다`);
    },
    onError: (error: Error) => {
      toast.error(`버전 복원 실패: ${error.message}`);
    },
  });

  /**
   * 특정 버전으로 복원
   */
  const restoreVersion = useCallback(
    async (versionId: string): Promise<void> => {
      if (!user) {
        toast.error('로그인이 필요합니다');
        return;
      }

      return restoreMutation.mutateAsync(versionId);
    },
    [user, restoreMutation]
  );

  /**
   * 두 버전 간 비교
   */
  const compareVersions = useCallback(
    (v1Id: string, v2Id: string): VersionComparison | null => {
      const v1 = versions.find((v) => v.id === v1Id);
      const v2 = versions.find((v) => v.id === v2Id);

      if (!v1 || !v2) {
        return null;
      }

      const diff = calculateDiff(v1.content, v2.content);
      const totalKeys = new Set([
        ...Object.keys(v1.content),
        ...Object.keys(v2.content),
      ]).size;
      const changeRate = calculateChangeRate(diff, totalKeys);

      return {
        oldVersion: v1,
        newVersion: v2,
        diff,
        changeRate,
      };
    },
    [versions]
  );

  /**
   * 데이터 새로고침
   */
  const refetch = useCallback(() => {
    refetchVersions();
    if (includeStats) {
      refetchStats();
    }
  }, [refetchVersions, refetchStats, includeStats]);

  // 로딩 상태 통합
  const isLoading = useMemo(() => {
    return isLoadingVersions || (includeStats && isLoadingStats);
  }, [isLoadingVersions, isLoadingStats, includeStats]);

  return {
    versions,
    isLoading,
    error: versionsError as Error | null,
    restoreVersion,
    compareVersions,
    stats,
    refetch,
  };
}

// ============================================================================
// Convenience Hooks
// ============================================================================

/**
 * 특정 템플릿의 최신 버전 조회
 *
 * @param templateId - 템플릿 ID
 * @returns 최신 버전 또는 null
 */
export function useLatestTemplateVersion(
  templateId: string
): TemplateVersionWithCreator | null {
  const { versions } = useTemplateVersions({ templateId, includeStats: false });
  return versions[0] || null;
}

/**
 * 특정 템플릿의 버전 개수 조회
 *
 * @param templateId - 템플릿 ID
 * @returns 버전 개수
 */
export function useTemplateVersionCount(templateId: string): number {
  const { stats } = useTemplateVersions({ templateId, includeStats: true });
  return stats?.total_versions || 0;
}

// ============================================================================
// Default Export
// ============================================================================

export default useTemplateVersions;

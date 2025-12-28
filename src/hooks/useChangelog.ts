/**
 * useChangelog Hook
 * @migration Supabase -> Cloudflare Workers (완전 마이그레이션 완료)
 *
 * TASK-022: Changelog 관련 React Query 훅
 *
 * Provides read operations for changelog entries
 * - 프로젝트별 필터링
 * - 페이지네이션
 * - 단일 항목 조회
 */

import { useQuery } from '@tanstack/react-query';
import { callWorkersApi } from '@/integrations/cloudflare/client';
import { useAuth } from './useAuth';
import { devLog } from '@/lib/errors';

// =====================================================
// TYPES
// =====================================================

/**
 * 변경 항목 타입
 */
interface ChangeItem {
  type: 'feature' | 'fix' | 'breaking';
  description: string;
}

/**
 * 프로젝트 기본 정보 (관계)
 */
interface ProjectSummary {
  id: string;
  title: string;
  slug: string;
}

/**
 * Changelog 엔트리 타입
 */
export interface ChangelogEntry {
  id: string;
  version: string;
  title: string;
  description: string | null;
  changes: ChangeItem[];
  project_id: string | null;
  github_release_url: string | null;
  released_at: string;
  created_at: string;
  project?: ProjectSummary | null;
}

/**
 * useChangelog 옵션
 */
interface UseChangelogOptions {
  projectId?: string;
  limit?: number;
}

// =====================================================
// QUERY KEYS
// =====================================================

const QUERY_KEYS = {
  all: ['changelog'] as const,
  lists: () => [...QUERY_KEYS.all, 'list'] as const,
  list: (options?: UseChangelogOptions) => [...QUERY_KEYS.lists(), options] as const,
  details: () => [...QUERY_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...QUERY_KEYS.details(), id] as const,
  byProjectSlug: (slug: string, limit?: number) => [...QUERY_KEYS.all, 'project-slug', slug, limit] as const,
};

// =====================================================
// 1. FETCH CHANGELOG LIST
// =====================================================

/**
 * Changelog 목록 조회 훅
 *
 * @param options.projectId - 특정 프로젝트 필터링
 * @param options.limit - 최대 조회 개수
 * @returns React Query 결과 (data, isLoading, error 등)
 *
 * @example
 * ```tsx
 * // 전체 changelog 조회
 * const { data: changelog } = useChangelog();
 *
 * // 특정 프로젝트의 changelog 조회 (최근 5개)
 * const { data } = useChangelog({ projectId: 'project-id', limit: 5 });
 * ```
 */
export function useChangelog(options?: UseChangelogOptions) {
  const { workersTokens } = useAuth();

  return useQuery({
    queryKey: QUERY_KEYS.list(options),
    queryFn: async () => {
      const token = workersTokens?.accessToken;
      const params = new URLSearchParams();
      params.append('order_by', 'released_at:desc');
      params.append('include', 'project');

      if (options?.projectId) {
        params.append('project_id', options.projectId);
      }
      if (options?.limit) {
        params.append('limit', options.limit.toString());
      }

      const { data, error } = await callWorkersApi<ChangelogEntry[]>(
        `/api/v1/changelog-entries?${params.toString()}`,
        { token }
      );

      if (error) {
        devLog('Changelog 조회 에러:', error);
        return [] as ChangelogEntry[];
      }

      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5분간 캐시 유지
  });
}

// =====================================================
// 2. FETCH SINGLE CHANGELOG ENTRY
// =====================================================

/**
 * 단일 Changelog 항목 조회 훅
 *
 * @param id - Changelog 엔트리 ID
 * @returns React Query 결과
 *
 * @example
 * ```tsx
 * const { data: entry, isLoading } = useChangelogEntry('entry-id');
 * ```
 */
export function useChangelogEntry(id: string) {
  const { workersTokens } = useAuth();

  return useQuery({
    queryKey: QUERY_KEYS.detail(id),
    queryFn: async () => {
      const token = workersTokens?.accessToken;
      const { data, error } = await callWorkersApi<ChangelogEntry>(
        `/api/v1/changelog-entries/${id}?include=project`,
        { token }
      );

      if (error) {
        devLog('ChangelogEntry 조회 에러:', error);
        throw new Error(error);
      }

      return data as ChangelogEntry;
    },
    enabled: !!id,
    staleTime: 10 * 60 * 1000, // 10분간 캐시 유지 (단일 항목은 더 길게)
  });
}

// =====================================================
// 3. FETCH CHANGELOG BY PROJECT SLUG
// =====================================================

/**
 * 프로젝트 슬러그로 Changelog 조회 훅
 *
 * @param projectSlug - 프로젝트 슬러그
 * @param limit - 최대 조회 개수
 * @returns React Query 결과
 *
 * @example
 * ```tsx
 * const { data } = useChangelogByProjectSlug('minu-find', 10);
 * ```
 */
export function useChangelogByProjectSlug(projectSlug: string, limit?: number) {
  const { workersTokens } = useAuth();

  return useQuery({
    queryKey: QUERY_KEYS.byProjectSlug(projectSlug, limit),
    queryFn: async () => {
      const token = workersTokens?.accessToken;

      // 먼저 프로젝트 ID 조회
      const { data: project, error: projectError } = await callWorkersApi<{ id: string }>(
        `/api/v1/projects/by-slug/${projectSlug}`,
        { token }
      );

      if (projectError || !project) {
        devLog('프로젝트 조회 에러:', projectError);
        return [] as ChangelogEntry[];
      }

      // 해당 프로젝트의 changelog 조회
      const params = new URLSearchParams();
      params.append('project_id', project.id);
      params.append('order_by', 'released_at:desc');
      if (limit) {
        params.append('limit', limit.toString());
      }

      const { data, error } = await callWorkersApi<ChangelogEntry[]>(
        `/api/v1/changelog-entries?${params.toString()}`,
        { token }
      );

      if (error) {
        devLog('Changelog 조회 에러:', error);
        return [] as ChangelogEntry[];
      }

      return data || [];
    },
    enabled: !!projectSlug,
    staleTime: 5 * 60 * 1000,
  });
}

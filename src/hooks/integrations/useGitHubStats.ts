/**
 * GitHub 통계 조회 훅
 *
 * GitHub 저장소의 통계 및 릴리즈 정보를 React Query로 관리합니다.
 * 캐싱을 통해 API 호출을 최소화하고 Rate Limit을 효율적으로 사용합니다.
 */

import { useQuery } from '@tanstack/react-query';
import {
  getRepoStats,
  getReleases,
  getLatestRelease,
  parseGitHubUrl,
  type GitHubRepoStats,
  type GitHubRelease,
} from '@/lib/github-api';

/**
 * GitHub 저장소 통계 조회 훅
 *
 * @param repoUrl - GitHub 저장소 URL (예: https://github.com/owner/repo)
 * @returns 저장소 통계 정보
 *
 * @example
 * ```tsx
 * const { data, isLoading, error } = useGitHubStats('https://github.com/facebook/react');
 * if (data) {
 *   console.log(`Stars: ${data.stars}, Forks: ${data.forks}`);
 * }
 * ```
 */
export function useGitHubStats(repoUrl: string | null | undefined) {
  return useQuery<GitHubRepoStats | null, Error>({
    queryKey: ['github-stats', repoUrl],
    queryFn: async () => {
      if (!repoUrl) return null;

      const parsed = parseGitHubUrl(repoUrl);
      if (!parsed) {
        console.warn('[useGitHubStats] 유효하지 않은 GitHub URL:', repoUrl);
        return null;
      }

      return getRepoStats(parsed.owner, parsed.repo);
    },
    enabled: !!repoUrl,
    staleTime: 60 * 60 * 1000, // 1시간
    gcTime: 24 * 60 * 60 * 1000, // 24시간
    retry: 1, // Rate Limit 등 오류 시 1회만 재시도
    retryDelay: 5000, // 5초 후 재시도
  });
}

/**
 * GitHub 릴리즈 목록 조회 훅
 *
 * @param repoUrl - GitHub 저장소 URL
 * @param limit - 조회할 릴리즈 수 (기본값: 10)
 * @returns 릴리즈 목록
 *
 * @example
 * ```tsx
 * const { data: releases } = useGitHubReleases('https://github.com/owner/repo', 5);
 * releases?.forEach(r => console.log(r.version));
 * ```
 */
export function useGitHubReleases(repoUrl: string | null | undefined, limit = 10) {
  return useQuery<GitHubRelease[], Error>({
    queryKey: ['github-releases', repoUrl, limit],
    queryFn: async () => {
      if (!repoUrl) return [];

      const parsed = parseGitHubUrl(repoUrl);
      if (!parsed) {
        console.warn('[useGitHubReleases] 유효하지 않은 GitHub URL:', repoUrl);
        return [];
      }

      return getReleases(parsed.owner, parsed.repo, limit);
    },
    enabled: !!repoUrl,
    staleTime: 30 * 60 * 1000, // 30분
    gcTime: 60 * 60 * 1000, // 1시간
    retry: 1,
  });
}

/**
 * GitHub 최신 릴리즈 조회 훅
 *
 * @param repoUrl - GitHub 저장소 URL
 * @returns 최신 릴리즈 정보 또는 null
 *
 * @example
 * ```tsx
 * const { data: latestRelease } = useGitHubLatestRelease('https://github.com/owner/repo');
 * if (latestRelease) {
 *   console.log(`최신 버전: ${latestRelease.version}`);
 * }
 * ```
 */
export function useGitHubLatestRelease(repoUrl: string | null | undefined) {
  return useQuery<GitHubRelease | null, Error>({
    queryKey: ['github-latest-release', repoUrl],
    queryFn: async () => {
      if (!repoUrl) return null;

      const parsed = parseGitHubUrl(repoUrl);
      if (!parsed) {
        console.warn('[useGitHubLatestRelease] 유효하지 않은 GitHub URL:', repoUrl);
        return null;
      }

      return getLatestRelease(parsed.owner, parsed.repo);
    },
    enabled: !!repoUrl,
    staleTime: 30 * 60 * 1000, // 30분
    gcTime: 60 * 60 * 1000, // 1시간
    retry: 1,
  });
}

/**
 * GitHub 통계 요약 생성
 *
 * @param stats - GitHub 저장소 통계
 * @returns 요약 문자열
 */
export function formatGitHubStatsSummary(stats: GitHubRepoStats | null | undefined): string {
  if (!stats) return '';

  const parts: string[] = [];

  if (stats.stars > 0) {
    parts.push(`⭐ ${formatNumber(stats.stars)}`);
  }
  if (stats.forks > 0) {
    parts.push(`🍴 ${formatNumber(stats.forks)}`);
  }
  if (stats.contributors > 0) {
    parts.push(`👥 ${stats.contributors}`);
  }

  return parts.join(' · ');
}

/**
 * 숫자 포맷팅 (1000 -> 1K, 1000000 -> 1M)
 */
function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

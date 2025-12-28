/**
 * useNewsletterArchive Hook
 * @migration Supabase -> Cloudflare Workers (완전 마이그레이션 완료)
 * TASK-022: Newsletter Archive 관련 React Query 훅
 *
 * Provides read operations for newsletter archive
 * - 아카이브 목록 조회
 * - 단일 항목 조회
 * - 이전/다음 네비게이션
 */

import { useQuery } from '@tanstack/react-query';
import { newsletterApi } from '@/integrations/cloudflare/client';

// =====================================================
// TYPES
// =====================================================

/**
 * Newsletter Archive 항목 타입
 */
export interface NewsletterArchiveItem {
  id: string;
  subject: string;
  content: string;
  preview: string | null;
  sent_at: string;
  recipient_count: number;
  open_rate: number | null;
  click_rate: number | null;
  created_at: string;
}

/**
 * 이전/다음 네비게이션용 간략 정보
 */
interface NewsletterNavItem {
  id: string;
  subject: string;
}

/**
 * 인접 뉴스레터 정보
 */
interface AdjacentNewsletters {
  prev: NewsletterNavItem | null;
  next: NewsletterNavItem | null;
}

/**
 * useNewsletterArchive 옵션
 */
interface UseNewsletterArchiveOptions {
  limit?: number;
}

// =====================================================
// QUERY KEYS
// =====================================================

const QUERY_KEYS = {
  all: ['newsletter-archive'] as const,
  lists: () => [...QUERY_KEYS.all, 'list'] as const,
  list: (options?: UseNewsletterArchiveOptions) => [...QUERY_KEYS.lists(), options] as const,
  details: () => [...QUERY_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...QUERY_KEYS.details(), id] as const,
  adjacent: (id: string) => [...QUERY_KEYS.all, 'adjacent', id] as const,
};

// =====================================================
// 1. FETCH NEWSLETTER ARCHIVE LIST
// =====================================================

/**
 * Newsletter Archive 목록 조회 훅
 *
 * @param options.limit - 최대 조회 개수
 * @returns React Query 결과 (data, isLoading, error 등)
 *
 * @example
 * ```tsx
 * // 전체 아카이브 조회
 * const { data: newsletters } = useNewsletterArchive();
 *
 * // 최근 10개만 조회
 * const { data } = useNewsletterArchive({ limit: 10 });
 * ```
 */
export function useNewsletterArchive(options?: UseNewsletterArchiveOptions) {
  return useQuery({
    queryKey: QUERY_KEYS.list(options),
    queryFn: async () => {
      const result = await newsletterApi.getArchive({ limit: options?.limit });

      if (result.error) {
        console.error('[useNewsletterArchive] 조회 에러:', result.error);
        throw new Error(result.error);
      }

      return (result.data ?? []) as NewsletterArchiveItem[];
    },
    staleTime: 5 * 60 * 1000, // 5분간 캐시 유지
  });
}

// =====================================================
// 2. FETCH SINGLE NEWSLETTER ARCHIVE ITEM
// =====================================================

/**
 * 단일 Newsletter Archive 항목 조회 훅
 *
 * @param id - Newsletter Archive 항목 ID
 * @returns React Query 결과
 *
 * @example
 * ```tsx
 * const { data: newsletter, isLoading } = useNewsletterArchiveItem('item-id');
 * ```
 */
export function useNewsletterArchiveItem(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.detail(id),
    queryFn: async () => {
      const result = await newsletterApi.getArchiveItem(id);

      if (result.error) {
        console.error('[useNewsletterArchiveItem] 조회 에러:', result.error);
        throw new Error(result.error);
      }

      return result.data as NewsletterArchiveItem;
    },
    enabled: !!id,
    staleTime: 10 * 60 * 1000, // 10분간 캐시 유지 (단일 항목은 더 길게)
  });
}

// =====================================================
// 3. FETCH ADJACENT NEWSLETTERS (이전/다음 네비게이션)
// =====================================================

/**
 * 이전/다음 Newsletter 조회 훅 (네비게이션용)
 *
 * @param currentId - 현재 Newsletter ID
 * @param currentSentAt - 현재 Newsletter 발송일시
 * @returns { prev, next } 이전/다음 Newsletter 정보
 *
 * @example
 * ```tsx
 * const { data: newsletter } = useNewsletterArchiveItem(id);
 * const { data: adjacent } = useAdjacentNewsletters(id, newsletter?.sent_at);
 *
 * // 네비게이션 버튼
 * {adjacent?.prev && <Link to={`/newsletter/${adjacent.prev.id}`}>이전</Link>}
 * {adjacent?.next && <Link to={`/newsletter/${adjacent.next.id}`}>다음</Link>}
 * ```
 */
export function useAdjacentNewsletters(currentId: string, currentSentAt: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.adjacent(currentId),
    queryFn: async (): Promise<AdjacentNewsletters> => {
      if (!currentSentAt) {
        return { prev: null, next: null };
      }

      const result = await newsletterApi.getAdjacentArchive(currentId, currentSentAt);

      if (result.error) {
        console.error('[useAdjacentNewsletters] 조회 에러:', result.error);
        return { prev: null, next: null };
      }

      const data = result.data as AdjacentNewsletters;
      return {
        prev: data?.prev || null,
        next: data?.next || null,
      };
    },
    enabled: !!currentId && !!currentSentAt,
    staleTime: 5 * 60 * 1000,
  });
}

// =====================================================
// 4. SEARCH NEWSLETTER ARCHIVE
// =====================================================

/**
 * Newsletter Archive 검색 훅
 *
 * @param searchTerm - 검색어 (subject, content에서 검색)
 * @param limit - 최대 결과 개수
 * @returns React Query 결과
 *
 * @example
 * ```tsx
 * const { data: results } = useSearchNewsletterArchive('업데이트', 20);
 * ```
 */
export function useSearchNewsletterArchive(searchTerm: string, limit: number = 20) {
  return useQuery({
    queryKey: ['newsletter-archive', 'search', searchTerm, limit],
    queryFn: async () => {
      if (!searchTerm.trim()) {
        return [];
      }

      const result = await newsletterApi.searchArchive(searchTerm, limit);

      if (result.error) {
        console.error('[useSearchNewsletterArchive] 검색 에러:', result.error);
        throw new Error(result.error);
      }

      return (result.data ?? []) as NewsletterArchiveItem[];
    },
    enabled: !!searchTerm.trim(),
    staleTime: 2 * 60 * 1000, // 2분 (검색 결과는 짧게)
  });
}

// =====================================================
// 5. GET NEWSLETTER STATS (통계)
// =====================================================

/**
 * Newsletter Archive 통계 정보
 */
export interface NewsletterArchiveStats {
  totalCount: number;
  avgOpenRate: number | null;
  avgClickRate: number | null;
  totalRecipients: number;
}

/**
 * Newsletter Archive 통계 조회 훅
 *
 * @returns 통계 정보 (총 개수, 평균 오픈율, 평균 클릭률, 총 수신자)
 *
 * @example
 * ```tsx
 * const { data: stats } = useNewsletterArchiveStats();
 * console.log(`총 ${stats?.totalCount}개 발송, 평균 오픈율 ${stats?.avgOpenRate}%`);
 * ```
 */
export function useNewsletterArchiveStats() {
  return useQuery({
    queryKey: ['newsletter-archive', 'stats'],
    queryFn: async (): Promise<NewsletterArchiveStats> => {
      const result = await newsletterApi.getArchiveStats();

      if (result.error) {
        console.error('[useNewsletterArchiveStats] 통계 조회 에러:', result.error);
        throw new Error(result.error);
      }

      const data = result.data as NewsletterArchiveStats;
      return {
        totalCount: data.totalCount || 0,
        avgOpenRate: data.avgOpenRate,
        avgClickRate: data.avgClickRate,
        totalRecipients: data.totalRecipients || 0,
      };
    },
    staleTime: 10 * 60 * 1000, // 10분 (통계는 자주 변하지 않음)
  });
}

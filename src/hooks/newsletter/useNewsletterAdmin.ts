/**
 * Newsletter Admin Hooks
 * @migration Supabase -> Cloudflare Workers (완전 마이그레이션 완료)
 *
 * 관리자용 뉴스레터 구독자 관리 훅
 *
 * @module useNewsletterAdmin
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { newsletterApi } from '@/integrations/cloudflare/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type {
  NewsletterSubscriber,
  NewsletterStats,
  NewsletterFilters,
  NewsletterSubscribersResponse,
  UpdateSubscriberStatusRequest,
} from '@/types/cms/newsletter.types';

/**
 * 뉴스레터 구독자 목록 조회 (관리자 전용)
 *
 * @param filters - 필터 옵션 (상태, 검색어, 날짜 범위, 페이지네이션)
 * @returns 구독자 목록 및 전체 개수
 *
 * @example
 * ```tsx
 * const { data, isLoading, error } = useNewsletterSubscribers({
 *   status: 'confirmed',
 *   search: 'user@example.com',
 *   limit: 50,
 *   offset: 0,
 * });
 * ```
 */
export function useNewsletterSubscribers(filters?: NewsletterFilters) {
  const { workersTokens } = useAuth();

  return useQuery<NewsletterSubscribersResponse>({
    queryKey: ['newsletter-subscribers', filters],
    queryFn: async () => {
      const token = workersTokens?.accessToken;
      if (!token) {
        throw new Error('인증이 필요합니다.');
      }

      const result = await newsletterApi.getSubscribers(token, {
        status: filters?.status,
        search: filters?.search,
        dateFrom: filters?.dateFrom,
        dateTo: filters?.dateTo,
        orderBy: filters?.orderBy,
        orderDirection: filters?.orderDirection,
        limit: filters?.limit || 50,
        offset: filters?.offset || 0,
      });

      if (result.error) {
        console.error('Newsletter subscribers query error:', result.error);
        throw new Error(`구독자 목록을 불러오는데 실패했습니다: ${result.error}`);
      }

      const responseData = result.data as { data: NewsletterSubscriber[]; count: number };
      return {
        data: responseData.data,
        count: responseData.count,
      };
    },
    enabled: !!workersTokens?.accessToken,
    staleTime: 30 * 1000, // 30초
  });
}

/**
 * 뉴스레터 통계 조회 (관리자 대시보드용)
 *
 * @returns 전체/상태별 구독자 수, 성장률, 구독 취소율
 *
 * @example
 * ```tsx
 * const { data: stats, isLoading } = useNewsletterAdminStats();
 * console.log(stats.total); // 1234
 * console.log(stats.growth.daily); // 12
 * ```
 */
export function useNewsletterAdminStats() {
  const { workersTokens } = useAuth();

  return useQuery<NewsletterStats>({
    queryKey: ['newsletter-admin-stats'],
    queryFn: async () => {
      const token = workersTokens?.accessToken;
      if (!token) {
        throw new Error('인증이 필요합니다.');
      }

      const result = await newsletterApi.getStats(token);

      if (result.error) {
        console.error('Newsletter stats query error:', result.error);
        throw new Error(`통계를 불러오는데 실패했습니다: ${result.error}`);
      }

      const data = result.data as {
        total: number;
        pending: number;
        confirmed: number;
        unsubscribed: number;
        growth?: { daily: number; weekly: number; monthly: number };
        churn_rate?: number;
      };

      return {
        total: data.total,
        pending: data.pending,
        confirmed: data.confirmed,
        unsubscribed: data.unsubscribed,
        growth: data.growth || { daily: 0, weekly: 0, monthly: 0 },
        churn_rate: data.churn_rate || (data.total > 0 ? (data.unsubscribed / data.total) * 100 : 0),
      };
    },
    enabled: !!workersTokens?.accessToken,
    staleTime: 60 * 1000, // 1분 (통계는 덜 자주 갱신)
  });
}

/**
 * 구독자 상태 변경 (관리자)
 *
 * @returns Mutation 객체
 *
 * @example
 * ```tsx
 * const updateStatus = useUpdateSubscriberStatus();
 * await updateStatus.mutateAsync({
 *   id: '123e4567-e89b-12d3-a456-426614174000',
 *   status: 'confirmed',
 * });
 * ```
 */
export function useUpdateSubscriberStatus() {
  const queryClient = useQueryClient();
  const { workersTokens } = useAuth();

  return useMutation({
    mutationFn: async ({ id, status }: UpdateSubscriberStatusRequest) => {
      const token = workersTokens?.accessToken;
      if (!token) {
        throw new Error('인증이 필요합니다.');
      }

      const result = await newsletterApi.updateStatus(token, id, status);

      if (result.error) {
        console.error('Update subscriber status error:', result.error);

        // Handle specific errors
        if (result.status === 403) {
          throw new Error('권한이 없습니다. 관리자 계정으로 로그인해주세요.');
        }

        throw new Error(`상태 변경에 실패했습니다: ${result.error}`);
      }

      return result.data as NewsletterSubscriber;
    },
    onSuccess: (data) => {
      // Invalidate queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ['newsletter-subscribers'] });
      queryClient.invalidateQueries({ queryKey: ['newsletter-admin-stats'] });

      // Show success toast
      const statusLabel = {
        pending: '확인 대기',
        confirmed: '확인 완료',
        unsubscribed: '구독 취소',
      }[data.status];

      toast.success(`구독자 상태가 "${statusLabel}"(으)로 변경되었습니다.`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

/**
 * 구독자 삭제 (GDPR 준수)
 *
 * @returns Mutation 객체
 *
 * @example
 * ```tsx
 * const deleteSubscriber = useDeleteSubscriber();
 * await deleteSubscriber.mutateAsync('123e4567-e89b-12d3-a456-426614174000');
 * ```
 */
export function useDeleteSubscriber() {
  const queryClient = useQueryClient();
  const { workersTokens } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      const token = workersTokens?.accessToken;
      if (!token) {
        throw new Error('인증이 필요합니다.');
      }

      const result = await newsletterApi.deleteSubscriber(token, id);

      if (result.error) {
        console.error('Delete subscriber error:', result.error);

        // Handle specific errors
        if (result.status === 403) {
          throw new Error('권한이 없습니다. 관리자 계정으로 로그인해주세요.');
        }

        throw new Error(`구독자 삭제에 실패했습니다: ${result.error}`);
      }
    },
    onSuccess: () => {
      // Invalidate queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ['newsletter-subscribers'] });
      queryClient.invalidateQueries({ queryKey: ['newsletter-admin-stats'] });

      // Show success toast
      toast.success('구독자가 삭제되었습니다.');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

/**
 * 구독자 일괄 삭제 (여러 구독자 삭제)
 *
 * @returns Mutation 객체
 *
 * @example
 * ```tsx
 * const bulkDelete = useBulkDeleteSubscribers();
 * await bulkDelete.mutateAsync(['id1', 'id2', 'id3']);
 * ```
 */
export function useBulkDeleteSubscribers() {
  const queryClient = useQueryClient();
  const { workersTokens } = useAuth();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const token = workersTokens?.accessToken;
      if (!token) {
        throw new Error('인증이 필요합니다.');
      }

      const result = await newsletterApi.bulkDeleteSubscribers(token, ids);

      if (result.error) {
        console.error('Bulk delete subscribers error:', result.error);

        if (result.status === 403) {
          throw new Error('권한이 없습니다. 관리자 계정으로 로그인해주세요.');
        }

        throw new Error(`일괄 삭제에 실패했습니다: ${result.error}`);
      }
    },
    onSuccess: (_, ids) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['newsletter-subscribers'] });
      queryClient.invalidateQueries({ queryKey: ['newsletter-admin-stats'] });

      // Show success toast
      toast.success(`${ids.length}명의 구독자가 삭제되었습니다.`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}


/**
 * CSV Export 훅
 *
 * 필터가 적용된 구독자 목록을 CSV로 내보내기
 *
 * @returns Mutation 객체
 *
 * @example
 * ```tsx
 * const exportCSV = useExportNewsletterCSV();
 * await exportCSV.mutateAsync({ status: 'confirmed', search: 'test' });
 * ```
 */
export function useExportNewsletterCSV() {
  const { workersTokens } = useAuth();

  return useMutation({
    mutationFn: async (filters?: NewsletterFilters) => {
      const token = workersTokens?.accessToken;
      if (!token) {
        throw new Error('인증이 필요합니다.');
      }

      // 전체 구독자 조회 (페이지네이션 없이)
      const result = await newsletterApi.getSubscribers(token, {
        status: filters?.status,
        search: filters?.search,
        dateFrom: filters?.dateFrom,
        dateTo: filters?.dateTo,
        orderBy: 'subscribed_at',
        orderDirection: 'desc',
        limit: 10000, // 최대 제한
        offset: 0,
      });

      if (result.error) {
        console.error('CSV export query error:', result.error);
        throw new Error(`CSV 내보내기 실패: ${result.error}`);
      }

      const responseData = result.data as { data: NewsletterSubscriber[] };

      // CSV 생성
      const csv = generateCSV(responseData.data);

      // 파일 다운로드
      downloadCSV(csv, `newsletter-subscribers-${getDateString()}.csv`);

      return responseData.data.length;
    },
    onSuccess: (count) => {
      toast.success(`${count}명의 구독자 데이터를 내보냈습니다.`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

/**
 * CSV 생성 헬퍼 함수
 */
function generateCSV(subscribers: NewsletterSubscriber[]): string {
  // CSV 헤더
  const headers = [
    'Email',
    'Status',
    'Subscribed At',
    'Confirmed At',
    'Unsubscribed At',
    'Source',
  ];

  // CSV 행
  const rows = subscribers.map((sub) => [
    sub.email,
    sub.status,
    sub.subscribed_at,
    sub.confirmed_at || '',
    sub.unsubscribed_at || '',
    sub.metadata?.source || '',
  ]);

  // CSV 문자열 생성
  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row
        .map((cell) => {
          // 특수문자 이스케이프 (쉼표, 따옴표, 줄바꿈)
          const cellStr = String(cell);
          if (
            cellStr.includes(',') ||
            cellStr.includes('"') ||
            cellStr.includes('\n')
          ) {
            return `"${cellStr.replace(/"/g, '""')}"`;
          }
          return cellStr;
        })
        .join(','),
    ),
  ].join('\n');

  return csvContent;
}

/**
 * CSV 파일 다운로드 헬퍼 함수
 */
function downloadCSV(csvContent: string, filename: string): void {
  // BOM 추가 (Excel에서 한글 깨짐 방지)
  const BOM = '\ufeff';
  const blob = new Blob([BOM + csvContent], {
    type: 'text/csv;charset=utf-8;',
  });

  // 다운로드 링크 생성
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // 메모리 정리
  URL.revokeObjectURL(url);
}

/**
 * 날짜 문자열 생성 (YYYY-MM-DD)
 */
function getDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * xlsx 데이터 조회 함수
 *
 * @deprecated Workers API로 마이그레이션됨 - 이 모듈은 레거시 호환성을 위해 유지됩니다.
 * 새 코드에서는 Workers API를 직접 사용하세요.
 *
 * @module skills/xlsx/queries
 */

import type { DateRange } from '@/types/skills.types';

/**
 * @deprecated Supabase 클라이언트 타입 (레거시 호환성)
 * Workers API로 마이그레이션 완료됨
 */
interface LegacySupabaseClient {
  from: (table: string) => {
    select: (columns: string, options?: { count?: string; head?: boolean }) => {
      order: (column: string, options?: { ascending: boolean }) => unknown;
      gte: (column: string, value: string) => unknown;
      lte: (column: string, value: string) => unknown;
      eq: (column: string, value: string) => unknown;
      in: (column: string, values: string[]) => unknown;
      range: (start: number, end: number) => unknown;
      limit: (count: number) => unknown;
    };
  };
}

// ============================================================================
// 타입 정의
// ============================================================================

/**
 * 페이지네이션 옵션
 */
export interface PaginationOptions {
  /** 페이지 번호 (0부터 시작) */
  page?: number;
  /** 페이지 크기 */
  pageSize?: number;
  /** 최대 레코드 수 */
  limit?: number;
}

/**
 * 조회 결과
 */
export interface QueryResult<T> {
  /** 데이터 */
  data: T[];
  /** 총 레코드 수 */
  total: number;
  /** 에러 메시지 */
  error?: string;
}

// ============================================================================
// 이벤트 조회
// ============================================================================

/**
 * 이벤트 로그 조회
 *
 * @param supabase - Supabase 클라이언트
 * @param dateRange - 날짜 범위
 * @param pagination - 페이지네이션 옵션
 * @returns 이벤트 목록
 *
 * @example
 * ```ts
 * const result = await queryEvents(supabase, {
 *   from: new Date('2025-01-01'),
 *   to: new Date('2025-01-31'),
 * }, { pageSize: 100 });
 * ```
 */
export async function queryEvents(
  supabase: LegacySupabaseClient,
  dateRange?: DateRange,
  pagination?: PaginationOptions
): Promise<QueryResult<Record<string, unknown>>> {
  try {
    let query = supabase
      .from('service_events')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    // 날짜 필터 적용
    if (dateRange) {
      query = query
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString());
    }

    // 페이지네이션 적용
    if (pagination?.page !== undefined && pagination?.pageSize) {
      const start = pagination.page * pagination.pageSize;
      const end = start + pagination.pageSize - 1;
      query = query.range(start, end);
    } else if (pagination?.limit) {
      query = query.limit(pagination.limit);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('[queryEvents] Error:', error);
      return { data: [], total: 0, error: error.message };
    }

    return { data: data || [], total: count || 0 };
  } catch (err) {
    console.error('[queryEvents] Exception:', err);
    return {
      data: [],
      total: 0,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

// ============================================================================
// 이슈 조회
// ============================================================================

/**
 * 이슈 조회
 *
 * @param supabase - Supabase 클라이언트
 * @param dateRange - 날짜 범위
 * @param filters - 추가 필터 (severity, status, serviceId)
 * @param pagination - 페이지네이션 옵션
 * @returns 이슈 목록
 *
 * @example
 * ```ts
 * const result = await queryIssues(supabase, undefined, {
 *   severity: 'high',
 *   status: 'open',
 * });
 * ```
 */
export async function queryIssues(
  supabase: LegacySupabaseClient,
  dateRange?: DateRange,
  filters?: {
    severity?: string;
    status?: string;
    serviceId?: string;
  },
  pagination?: PaginationOptions
): Promise<QueryResult<Record<string, unknown>>> {
  try {
    let query = supabase
      .from('service_issues')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    // 날짜 필터 적용
    if (dateRange) {
      query = query
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString());
    }

    // 추가 필터 적용
    if (filters?.severity) {
      query = query.eq('severity', filters.severity);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.serviceId) {
      query = query.eq('service_id', filters.serviceId);
    }

    // 페이지네이션 적용
    if (pagination?.page !== undefined && pagination?.pageSize) {
      const start = pagination.page * pagination.pageSize;
      const end = start + pagination.pageSize - 1;
      query = query.range(start, end);
    } else if (pagination?.limit) {
      query = query.limit(pagination.limit);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('[queryIssues] Error:', error);
      return { data: [], total: 0, error: error.message };
    }

    return { data: data || [], total: count || 0 };
  } catch (err) {
    console.error('[queryIssues] Exception:', err);
    return {
      data: [],
      total: 0,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

// ============================================================================
// 서비스 헬스 조회
// ============================================================================

/**
 * 서비스 헬스 조회
 *
 * @param supabase - Supabase 클라이언트
 * @param serviceId - 서비스 ID (선택)
 * @param dateRange - 날짜 범위
 * @returns 헬스 체크 목록
 *
 * @example
 * ```ts
 * const result = await queryServiceHealth(supabase, 'minu-find');
 * ```
 */
export async function queryServiceHealth(
  supabase: LegacySupabaseClient,
  serviceId?: string,
  dateRange?: DateRange
): Promise<QueryResult<Record<string, unknown>>> {
  try {
    let query = supabase
      .from('service_health')
      .select('*', { count: 'exact' })
      .order('updated_at', { ascending: false });

    // 서비스 필터
    if (serviceId) {
      query = query.eq('service_id', serviceId);
    }

    // 날짜 필터
    if (dateRange) {
      query = query
        .gte('updated_at', dateRange.from.toISOString())
        .lte('updated_at', dateRange.to.toISOString());
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('[queryServiceHealth] Error:', error);
      return { data: [], total: 0, error: error.message };
    }

    return { data: data || [], total: count || 0 };
  } catch (err) {
    console.error('[queryServiceHealth] Exception:', err);
    return {
      data: [],
      total: 0,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

// ============================================================================
// KPI 계산
// ============================================================================

/**
 * KPI 메트릭 계산
 *
 * @param supabase - Supabase 클라이언트
 * @param dateRange - 날짜 범위
 * @returns KPI 메트릭
 *
 * @example
 * ```ts
 * const kpi = await calculateKPIMetrics(supabase, {
 *   from: new Date('2025-01-01'),
 *   to: new Date('2025-01-31'),
 * });
 * ```
 */
export async function calculateKPIMetrics(
  supabase: LegacySupabaseClient,
  dateRange?: DateRange
): Promise<{
  totalEvents: number;
  totalIssues: number;
  openIssues: number;
  avgResponseTime: number;
  errorRate: number;
}> {
  try {
    // 이벤트 수 조회
    const eventsQuery = supabase
      .from('service_events')
      .select('*', { count: 'exact', head: true });

    if (dateRange) {
      eventsQuery
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString());
    }

    const { count: totalEvents } = await eventsQuery;

    // 이슈 수 조회
    const issuesQuery = supabase
      .from('service_issues')
      .select('*', { count: 'exact', head: true });

    if (dateRange) {
      issuesQuery
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString());
    }

    const { count: totalIssues } = await issuesQuery;

    // 미해결 이슈 수
    const openIssuesQuery = supabase
      .from('service_issues')
      .select('*', { count: 'exact', head: true })
      .in('status', ['open', 'in_progress']);

    const { count: openIssues } = await openIssuesQuery;

    // 평균 응답 시간 (서비스 헬스에서 계산)
    const { data: healthData } = await supabase
      .from('service_health')
      .select('response_time_ms');

    const avgResponseTime = healthData?.length
      ? healthData.reduce((sum, h) => sum + (h.response_time_ms || 0), 0) /
        healthData.length
      : 0;

    // 에러율 (서비스 헬스에서 계산)
    const { data: healthData2 } = await supabase
      .from('service_health')
      .select('error_rate');

    const errorRate = healthData2?.length
      ? healthData2.reduce((sum, h) => sum + (h.error_rate || 0), 0) /
        healthData2.length
      : 0;

    return {
      totalEvents: totalEvents || 0,
      totalIssues: totalIssues || 0,
      openIssues: openIssues || 0,
      avgResponseTime: Math.round(avgResponseTime),
      errorRate: Number(errorRate.toFixed(2)),
    };
  } catch (err) {
    console.error('[calculateKPIMetrics] Exception:', err);
    return {
      totalEvents: 0,
      totalIssues: 0,
      openIssues: 0,
      avgResponseTime: 0,
      errorRate: 0,
    };
  }
}

// ============================================================================
// 배치 조회
// ============================================================================

/**
 * 배치 조회 (대용량 데이터 처리)
 *
 * @param supabase - Supabase 클라이언트
 * @param table - 테이블 이름
 * @param batchSize - 배치 크기
 * @param onBatch - 배치 처리 콜백
 *
 * @example
 * ```ts
 * await queryInBatches(supabase, 'service_events', 1000, (batch) => {
 *   console.log(`Processing ${batch.length} records...`);
 * });
 * ```
 */
export async function queryInBatches(
  supabase: LegacySupabaseClient,
  table: string,
  batchSize: number,
  onBatch: (batch: Record<string, unknown>[]) => void | Promise<void>
): Promise<void> {
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const start = page * batchSize;
    const end = start + batchSize - 1;

    const { data, error } = await supabase
      .from(table)
      .select('*')
      .range(start, end);

    if (error) {
      console.error('[queryInBatches] Error:', error);
      break;
    }

    if (!data || data.length === 0) {
      hasMore = false;
      break;
    }

    await onBatch(data);

    if (data.length < batchSize) {
      hasMore = false;
    }

    page++;
  }
}

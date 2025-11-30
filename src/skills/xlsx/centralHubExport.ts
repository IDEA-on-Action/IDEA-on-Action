/**
 * Central Hub용 Excel 내보내기 함수
 *
 * 이벤트 로그, 이슈 현황, 서비스 헬스, KPI 요약 등
 * Central Hub 데이터를 Excel로 내보내기
 *
 * @module skills/xlsx/centralHubExport
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { DateRange } from '@/types/skills.types';
import { fetchEvents } from './generators/eventsSheet';
import { fetchIssues } from './generators/issuesSheet';
import { fetchHealth } from './generators/healthSheet';
import { calculateKPI } from './generators/kpiSheet';

// ============================================================================
// 타입 정의
// ============================================================================

/**
 * 이슈 필터
 */
export interface IssueFilters {
  /** 서비스 ID */
  serviceId?: string;
  /** 심각도 */
  severity?: 'critical' | 'high' | 'medium' | 'low';
  /** 상태 */
  status?: 'open' | 'in_progress' | 'resolved' | 'closed';
  /** 날짜 범위 */
  dateRange?: DateRange;
}

/**
 * KPI 요약 데이터
 */
export interface KPISummary {
  /** 총 이벤트 수 */
  totalEvents: number;
  /** 총 이슈 수 */
  totalIssues: number;
  /** 미해결 이슈 수 */
  openIssues: number;
  /** 평균 응답 시간 (ms) */
  avgResponseTime: number;
  /** 서비스별 헬스 현황 */
  healthByService: Record<string, string>;
  /** 기간 */
  period: string;
}

// ============================================================================
// Export 함수
// ============================================================================

/**
 * 이벤트 로그 내보내기
 *
 * @param supabase - Supabase 클라이언트
 * @param dateRange - 날짜 범위
 * @returns Excel Blob
 *
 * @example
 * ```ts
 * const blob = await exportEventLogs(supabase, {
 *   from: new Date('2025-01-01'),
 *   to: new Date('2025-01-31'),
 * });
 * ```
 */
export async function exportEventLogs(
  supabase: SupabaseClient,
  dateRange?: DateRange
): Promise<Blob> {
  const XLSX = await import('xlsx');
  const events = await fetchEvents(supabase, dateRange);

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(events);

  // 컬럼 너비 설정
  worksheet['!cols'] = [
    { wch: 12 }, // service
    { wch: 20 }, // eventType
    { wch: 15 }, // projectId
    { wch: 15 }, // userId
    { wch: 20 }, // createdAt
    { wch: 30 }, // payload
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, '이벤트 로그');

  const buffer = XLSX.write(workbook, {
    type: 'array',
    bookType: 'xlsx',
  });

  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

/**
 * 이슈 현황 내보내기
 *
 * @param supabase - Supabase 클라이언트
 * @param filters - 이슈 필터
 * @returns Excel Blob
 *
 * @example
 * ```ts
 * const blob = await exportIssues(supabase, {
 *   severity: 'high',
 *   status: 'open',
 * });
 * ```
 */
export async function exportIssues(
  supabase: SupabaseClient,
  filters?: IssueFilters
): Promise<Blob> {
  const XLSX = await import('xlsx');
  let issues = await fetchIssues(supabase, filters?.dateRange);

  // 필터 적용
  if (filters?.serviceId) {
    issues = issues.filter((issue) => issue.service === filters.serviceId);
  }
  if (filters?.severity) {
    issues = issues.filter((issue) => issue.severity === filters.severity);
  }
  if (filters?.status) {
    issues = issues.filter((issue) => issue.status === filters.status);
  }

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(issues);

  // 컬럼 너비 설정
  worksheet['!cols'] = [
    { wch: 12 }, // service
    { wch: 10 }, // severity
    { wch: 30 }, // title
    { wch: 40 }, // description
    { wch: 12 }, // status
    { wch: 15 }, // assigneeId
    { wch: 20 }, // resolvedAt
    { wch: 20 }, // createdAt
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, '이슈 현황');

  const buffer = XLSX.write(workbook, {
    type: 'array',
    bookType: 'xlsx',
  });

  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

/**
 * 서비스 헬스 이력 내보내기
 *
 * @param supabase - Supabase 클라이언트
 * @param serviceId - 서비스 ID (선택)
 * @returns Excel Blob
 *
 * @example
 * ```ts
 * const blob = await exportHealthHistory(supabase, 'minu-find');
 * ```
 */
export async function exportHealthHistory(
  supabase: SupabaseClient,
  serviceId?: string
): Promise<Blob> {
  const XLSX = await import('xlsx');
  let health = await fetchHealth(supabase);

  // 서비스 필터 적용
  if (serviceId) {
    health = health.filter((h) => h.service === serviceId);
  }

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(health);

  // 컬럼 너비 설정
  worksheet['!cols'] = [
    { wch: 15 }, // service
    { wch: 12 }, // status
    { wch: 15 }, // responseTimeMs
    { wch: 12 }, // errorRate
    { wch: 15 }, // uptimePercent
    { wch: 20 }, // lastPing
    { wch: 20 }, // updatedAt
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, '서비스 헬스');

  const buffer = XLSX.write(workbook, {
    type: 'array',
    bookType: 'xlsx',
  });

  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

/**
 * KPI 요약 시트 내보내기
 *
 * @param supabase - Supabase 클라이언트
 * @param dateRange - 날짜 범위
 * @returns Excel Blob
 *
 * @example
 * ```ts
 * const blob = await exportKPISummary(supabase, {
 *   from: new Date('2025-01-01'),
 *   to: new Date('2025-01-31'),
 * });
 * ```
 */
export async function exportKPISummary(
  supabase: SupabaseClient,
  dateRange?: DateRange
): Promise<Blob> {
  const XLSX = await import('xlsx');

  // 데이터 조회
  const [eventsResult, issuesResult] = await Promise.all([
    fetchEvents(supabase, dateRange),
    fetchIssues(supabase, dateRange),
  ]);

  const kpiData = calculateKPI(eventsResult, issuesResult);

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(kpiData);

  // 컬럼 너비 설정
  worksheet['!cols'] = [
    { wch: 25 }, // metric
    { wch: 15 }, // value
    { wch: 15 }, // change
    { wch: 20 }, // period
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, 'KPI 요약');

  const buffer = XLSX.write(workbook, {
    type: 'array',
    bookType: 'xlsx',
  });

  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

/**
 * 통합 리포트 내보내기 (모든 시트 포함)
 *
 * @param supabase - Supabase 클라이언트
 * @param dateRange - 날짜 범위
 * @returns Excel Blob
 *
 * @example
 * ```ts
 * const blob = await exportCentralHubReport(supabase, {
 *   from: new Date('2025-01-01'),
 *   to: new Date('2025-01-31'),
 * });
 * ```
 */
export async function exportCentralHubReport(
  supabase: SupabaseClient,
  dateRange?: DateRange
): Promise<Blob> {
  const XLSX = await import('xlsx');

  // 모든 데이터 조회
  const [eventsResult, issuesResult, healthResult] = await Promise.all([
    fetchEvents(supabase, dateRange),
    fetchIssues(supabase, dateRange),
    fetchHealth(supabase),
  ]);

  const kpiResult = calculateKPI(eventsResult, issuesResult);

  const workbook = XLSX.utils.book_new();

  // 1. 이벤트 로그 시트
  const eventsSheet = XLSX.utils.json_to_sheet(eventsResult);
  eventsSheet['!cols'] = [
    { wch: 12 },
    { wch: 20 },
    { wch: 15 },
    { wch: 15 },
    { wch: 20 },
    { wch: 30 },
  ];
  XLSX.utils.book_append_sheet(workbook, eventsSheet, '이벤트 로그');

  // 2. 이슈 현황 시트
  const issuesSheet = XLSX.utils.json_to_sheet(issuesResult);
  issuesSheet['!cols'] = [
    { wch: 12 },
    { wch: 10 },
    { wch: 30 },
    { wch: 40 },
    { wch: 12 },
    { wch: 15 },
    { wch: 20 },
    { wch: 20 },
  ];
  XLSX.utils.book_append_sheet(workbook, issuesSheet, '이슈 현황');

  // 3. 서비스 헬스 시트
  const healthSheet = XLSX.utils.json_to_sheet(healthResult);
  healthSheet['!cols'] = [
    { wch: 15 },
    { wch: 12 },
    { wch: 15 },
    { wch: 12 },
    { wch: 15 },
    { wch: 20 },
    { wch: 20 },
  ];
  XLSX.utils.book_append_sheet(workbook, healthSheet, '서비스 헬스');

  // 4. KPI 요약 시트
  const kpiSheet = XLSX.utils.json_to_sheet(kpiResult);
  kpiSheet['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(workbook, kpiSheet, 'KPI 요약');

  const buffer = XLSX.write(workbook, {
    type: 'array',
    bookType: 'xlsx',
  });

  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

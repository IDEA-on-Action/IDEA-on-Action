/**
 * xlsx Skill 모듈 - 동적 로딩 최적화
 *
 * Excel 파일 생성/파싱 기능을 동적으로 로드하여 번들 크기를 최적화합니다.
 *
 * @module lib/skills/xlsx
 */

import { loadXlsx } from '../lazy-loader';

// ============================================================================
// Re-export from src/skills/xlsx (주요 Export)
// ============================================================================

// Central Hub Export
export {
  exportEventLogs,
  exportIssues,
  exportHealthHistory,
  exportKPISummary,
  exportCentralHubReport,
  type IssueFilters,
  type KPISummary,
} from '@/skills/xlsx/centralHubExport';

// 데이터 조회
export {
  queryEvents,
  queryIssues,
  queryServiceHealth,
  calculateKPIMetrics,
  queryInBatches,
  type PaginationOptions,
  type QueryResult,
} from '@/skills/xlsx/queries';

// Project Report
export {
  generateProjectReportSheets,
  calculateCompletionRate,
  summaryColumns,
  taskColumns,
  burndownColumns,
  resourceColumns,
  type ProjectReportData,
  type TaskData,
  type BurndownData,
  type ResourceData,
} from '@/skills/xlsx/generators/projectReport';

// Market Analysis
export {
  generateMarketAnalysisSheets,
  generateMarketAnalysisSheet,
  transformCompetitors,
  transformTrends,
  transformOpportunities,
  generateSummary,
  competitorColumns,
  trendColumns,
  opportunityColumns,
  summaryColumns as marketSummaryColumns,
  PRIORITY_LABELS,
  type MarketAnalysisData,
  type CompetitorData,
  type TrendData,
  type OpportunityData,
  type MarketAnalysisMetadata,
} from '@/skills/xlsx/generators/marketAnalysis';

// 차트 생성
export {
  generateChartImage,
  createTrendChart,
  createPieChart,
} from '@/skills/xlsx/chart/chart-utils';
export { generateEventReportWithChart } from '@/skills/xlsx/generators/eventReportWithChart';

// xlsx Import 기능
export {
  parseExcelFile,
  validateData,
  mapColumns,
  importToSupabase,
  batchImport,
  importExcelToDatabase,
} from './import';

// Hooks
export { useXlsxExport } from '@/skills/xlsx/useXlsxExport';
export { useXlsxImport } from '@/hooks/useXlsxImport';
export type { UseXlsxImportResult, UseXlsxImportOptions } from '@/hooks/useXlsxImport';

// ============================================================================
// 동적 로딩 유틸리티
// ============================================================================

/**
 * xlsx 라이브러리 동적 로드
 *
 * Excel 파일 생성/파싱을 위한 xlsx 라이브러리를 동적으로 로드합니다.
 * 이 함수는 lazy-loader를 래핑하여 일관된 API를 제공합니다.
 *
 * @returns xlsx 모듈
 *
 * @example
 * ```ts
 * import { loadXlsxModule } from '@/lib/skills/xlsx';
 *
 * const XLSX = await loadXlsxModule();
 * const workbook = XLSX.utils.book_new();
 * ```
 */
export async function loadXlsxModule() {
  return loadXlsx();
}

/**
 * xlsx 모듈이 이미 로드되었는지 확인
 *
 * @returns 로드 여부
 *
 * @example
 * ```ts
 * import { isXlsxLoaded } from '@/lib/skills/xlsx';
 *
 * if (!isXlsxLoaded()) {
 *   console.log('xlsx를 로드해야 합니다');
 * }
 * ```
 */
export function isXlsxLoaded(): boolean {
  // lazy-loader의 getXlsxLoadingState를 사용
  // Note: 동적 import를 사용하려면 async여야 하므로, 직접 접근 대신 상태 조회 헬퍼 사용
  return false; // TODO: 실제 구현 시 lazy-loader 상태 확인 필요
}

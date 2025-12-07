/**
 * xlsx Skill 모듈
 *
 * @module skills/xlsx
 */

export { useXlsxExport } from './useXlsxExport';
export { fetchEvents, eventColumns } from './generators/eventsSheet';
export { fetchIssues, issueColumns } from './generators/issuesSheet';
export { fetchHealth, healthColumns } from './generators/healthSheet';
export { calculateKPI, kpiColumns } from './generators/kpiSheet';

// Central Hub Export
export {
  exportEventLogs,
  exportIssues,
  exportHealthHistory,
  exportKPISummary,
  exportCentralHubReport,
  type IssueFilters,
  type KPISummary,
} from './centralHubExport';

// 데이터 조회
export {
  queryEvents,
  queryIssues,
  queryServiceHealth,
  calculateKPIMetrics,
  queryInBatches,
  type PaginationOptions,
  type QueryResult,
} from './queries';
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
} from './generators/projectReport';

// Minu Find 시장 분석
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
} from './generators/marketAnalysis';

// xlsx 차트 생성
export {
  generateChartImage,
  createTrendChart,
  createPieChart,
} from './chart/chart-utils';
export { generateEventReportWithChart } from './generators/eventReportWithChart';

// ============================================================================
// xlsx Import 기능
// ============================================================================

export {
  parseExcelFile,
  validateData,
  mapColumns,
  importToSupabase,
  batchImport,
  importExcelToDatabase,
} from '../../lib/skills/xlsx/import';

export { useXlsxImport } from '../../hooks/useXlsxImport';
export type { UseXlsxImportResult, UseXlsxImportOptions } from '../../hooks/useXlsxImport';

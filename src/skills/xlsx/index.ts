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

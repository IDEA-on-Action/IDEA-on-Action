/**
 * 보고서 템플릿 모듈
 *
 * 주간/월간 보고서 템플릿을 통합 export 합니다.
 *
 * @module lib/skills/templates/reports
 */

// ============================================================================
// 주간 보고서
// ============================================================================

export {
  // 타입
  type CompletedTask,
  type InProgressTask,
  type WeeklyReportData,
  // 빌더 함수
  buildWeeklyReportSections,
  createWeeklyReportDocument,
  generateWeeklyReportBlob,
  downloadWeeklyReport,
} from './weekly-report';

// ============================================================================
// 월간 보고서
// ============================================================================

export {
  // 타입
  type KPIItem,
  type ProjectStatusItem,
  type ResourceItem,
  type MonthlyRiskItem,
  type MonthlyReportData,
  // 빌더 함수
  buildMonthlyReportSections,
  createMonthlyReportDocument,
  generateMonthlyReportBlob,
  downloadMonthlyReport,
} from './monthly-report';

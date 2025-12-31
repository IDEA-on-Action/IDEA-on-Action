/**
 * Claude Skills 타입 정의
 *
 * xlsx, docx, pptx 등 내보내기 기능을 위한 공통 타입
 *
 * @module types/skills
 */

import type { ServiceId } from '../services/central-hub.types';

// ============================================================================
// Skill 공통 타입
// ============================================================================

/**
 * Skill 유형
 */
export type SkillType = 'xlsx' | 'docx' | 'pptx' | 'pdf';

/**
 * Skill 에러
 */
export interface SkillError {
  code: SkillErrorCode;
  message: string;
  details?: unknown;
}

/**
 * Skill 에러 코드
 */
export type SkillErrorCode =
  | 'UNAUTHORIZED'      // 인증 필요
  | 'PERMISSION_DENIED' // 권한 없음
  | 'EXPORT_FAILED'     // 내보내기 실패
  | 'DATA_FETCH_FAILED' // 데이터 조회 실패
  | 'FILE_TOO_LARGE'    // 파일 크기 초과
  | 'INVALID_OPTIONS'   // 잘못된 옵션
  | 'UNKNOWN';          // 알 수 없는 에러

/**
 * 날짜 범위
 */
export interface DateRange {
  from: Date;
  to: Date;
}

// ============================================================================
// xlsx Skill 타입
// ============================================================================

/**
 * 시트 설정
 */
export interface SheetConfig {
  name: string;
  data: Record<string, unknown>[];
  columns?: ColumnConfig[];
}

/**
 * 컬럼 설정
 */
export interface ColumnConfig {
  key: string;
  header: string;
  width?: number;
  format?: 'text' | 'number' | 'date' | 'currency' | 'percent';
}

/**
 * xlsx 내보내기 옵션
 */
export interface UseXlsxExportOptions {
  /** 파일명 (기본값: central-hub-report-YYYY-MM-DD.xlsx) */
  filename?: string;
  /** 날짜 필터 */
  dateRange?: DateRange;
  /** 커스텀 시트 설정 */
  sheets?: SheetConfig[];
  /** 서비스 ID 필터 */
  serviceId?: ServiceId;
  /** 차트 포함 여부 (기본값: false) */
  includeCharts?: boolean;
  /** 차트 Canvas 참조 배열 (includeCharts가 true일 때 필수) */
  chartRefs?: React.RefObject<HTMLCanvasElement>[];
}

/**
 * xlsx 내보내기 결과
 */
export interface UseXlsxExportResult {
  /** Excel 내보내기 실행 */
  exportToExcel: (options?: UseXlsxExportOptions) => Promise<void>;
  /** 내보내기 진행 중 여부 */
  isExporting: boolean;
  /** 진행률 (0-100) */
  progress: number;
  /** 에러 정보 */
  error: SkillError | null;
}

// ============================================================================
// 시트별 데이터 타입
// ============================================================================

/**
 * 이벤트 시트 행
 */
export interface EventSheetRow {
  id: string;
  service: string;
  eventType: string;
  projectId: string;
  userId: string;
  createdAt: string;
  payload: string;
}

/**
 * 이슈 시트 행
 */
export interface IssueSheetRow {
  id: string;
  service: string;
  severity: string;
  title: string;
  description: string;
  status: string;
  assigneeId: string;
  resolvedAt: string;
  createdAt: string;
}

/**
 * 서비스 헬스 시트 행
 */
export interface HealthSheetRow {
  service: string;
  status: string;
  responseTimeMs: string;
  errorRate: string;
  uptimePercent: string;
  lastPing: string;
  updatedAt: string;
}

/**
 * KPI 시트 행
 */
export interface KPISheetRow {
  metric: string;
  value: number | string;
  change: string;
  period: string;
}

// ============================================================================
// 라벨 상수 (한글 변환용)
// ============================================================================

/**
 * 심각도 라벨
 */
export const SEVERITY_LABELS: Record<string, string> = {
  critical: '치명적',
  high: '높음',
  medium: '보통',
  low: '낮음',
};

/**
 * 상태 라벨
 */
export const STATUS_LABELS: Record<string, string> = {
  open: '미해결',
  in_progress: '진행중',
  resolved: '해결됨',
  closed: '종료',
};

/**
 * 헬스 상태 라벨
 */
export const HEALTH_LABELS: Record<string, string> = {
  healthy: '정상',
  degraded: '저하',
  unhealthy: '비정상',
  unknown: '알 수 없음',
};

/**
 * 이벤트 유형 라벨
 */
export const EVENT_TYPE_LABELS: Record<string, string> = {
  'progress.updated': '진행 상태 업데이트',
  'task.completed': '작업 완료',
  'task.started': '작업 시작',
  'milestone.reached': '마일스톤 달성',
  'issue.created': '이슈 생성',
  'issue.resolved': '이슈 해결',
  'issue.updated': '이슈 업데이트',
  'service.health': '서비스 헬스 체크',
  'user.action': '사용자 액션',
};

// ============================================================================
// docx Skill 타입 re-export
// ============================================================================

export * from '../documents/docx.types';

// pptx Skill 타입 제거됨 (v2.24.0) - 미사용 기능

// ============================================================================
// xlsx 차트 타입 re-export
// ============================================================================

export * from '../documents/xlsx-chart.types';

// ============================================================================
// xlsx Import 타입 re-export
// ============================================================================

export * from '../documents/xlsx-import.types';

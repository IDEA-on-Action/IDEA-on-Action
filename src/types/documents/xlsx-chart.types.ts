/**
 * xlsx 차트 타입 정의
 *
 * Excel 리포트 차트 이미지 삽입을 위한 타입
 *
 * @module types/xlsx-chart
 */

// ============================================================================
// 차트 내보내기 타입 (chart-exporter.ts와 동기화)
// ============================================================================

/**
 * 차트 내보내기 설정
 */
export interface ChartExportConfig {
  /** 차트 고유 ID */
  chartId: string;
  /** Canvas 요소 (null이면 건너뜀) */
  chartElement: HTMLCanvasElement | null;
  /** 저장될 파일명 (확장자 제외) */
  fileName: string;
}

// ============================================================================
// 차트 기본 타입
// ============================================================================

/**
 * 차트 종류
 */
export type ChartType = 'line' | 'bar' | 'pie' | 'area';

/**
 * 차트 데이터 포인트
 */
export interface ChartDataPoint {
  /** 데이터 레이블 (예: "2025-11-26", "진행중") */
  label: string;
  /** 데이터 값 */
  value: number;
  /** 선택적 색상 (파이 차트용) */
  color?: string;
}

/**
 * 차트 설정
 */
export interface ChartConfig {
  /** 차트 종류 */
  type: ChartType;
  /** 차트 데이터 */
  data: ChartDataPoint[];
  /** 차트 제목 (선택) */
  title?: string;
  /** 삽입 위치 (행, 열) */
  position: { row: number; col: number };
  /** 차트 크기 (선택, 기본값: 800x400) */
  size?: { width: number; height: number };
}

/**
 * 차트 생성 옵션
 */
export interface ChartGeneratorOptions {
  /** 차트 너비 (기본값: 800px) */
  width?: number;
  /** 차트 높이 (기본값: 400px) */
  height?: number;
  /** 배경색 (기본값: 투명) */
  backgroundColor?: string;
  /** 범례 표시 여부 (기본값: true) */
  showLegend?: boolean;
  /** 레이블 표시 여부 (기본값: true) */
  showLabels?: boolean;
  /** 그리드 표시 여부 (기본값: true) */
  showGrid?: boolean;
  /** 커스텀 색상 팔레트 */
  colorPalette?: string[];
}

// ============================================================================
// 차트 스타일 타입
// ============================================================================

/**
 * 차트 색상 팔레트 (IDEA on Action 브랜드)
 */
export const CHART_COLORS = {
  primary: '#0F172A',     // 네이비 (Slate 900)
  secondary: '#3B82F6',   // 블루 (Blue 500)
  success: '#10B981',     // 그린 (Emerald 500)
  warning: '#F59E0B',     // 오렌지 (Amber 500)
  danger: '#EF4444',      // 레드 (Red 500)
  info: '#06B6D4',        // 시안 (Cyan 500)
  neutral: '#64748B',     // 그레이 (Slate 500)
  white: '#FFFFFF',       // 화이트
  black: '#000000',       // 블랙
} as const;

/**
 * 차트 기본 색상 배열 (순환 사용)
 */
export const DEFAULT_CHART_COLORS = [
  CHART_COLORS.secondary,
  CHART_COLORS.success,
  CHART_COLORS.warning,
  CHART_COLORS.danger,
  CHART_COLORS.info,
  CHART_COLORS.neutral,
] as const;

/**
 * 차트 폰트 설정
 */
export interface ChartFontConfig {
  /** 폰트 패밀리 */
  family: string;
  /** 제목 폰트 크기 */
  titleSize: number;
  /** 레이블 폰트 크기 */
  labelSize: number;
  /** 범례 폰트 크기 */
  legendSize: number;
}

/**
 * 기본 폰트 설정
 */
export const DEFAULT_FONT_CONFIG: ChartFontConfig = {
  family: 'Inter, sans-serif',
  titleSize: 16,
  labelSize: 12,
  legendSize: 10,
};

/**
 * 차트 마진 설정
 */
export interface ChartMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * 기본 마진 설정
 */
export const DEFAULT_MARGINS: ChartMargins = {
  top: 40,
  right: 40,
  bottom: 40,
  left: 40,
};

// ============================================================================
// 차트별 특화 타입
// ============================================================================

/**
 * 라인 차트 설정
 */
export interface LineChartConfig extends ChartConfig {
  type: 'line';
  /** 라인 두께 (기본값: 2) */
  lineWidth?: number;
  /** 데이터 포인트 표시 여부 (기본값: true) */
  showPoints?: boolean;
  /** 라인 곡선 여부 (기본값: false) */
  curved?: boolean;
}

/**
 * 바 차트 설정
 */
export interface BarChartConfig extends ChartConfig {
  type: 'bar';
  /** 바 너비 비율 (0-1, 기본값: 0.8) */
  barWidthRatio?: number;
  /** 수평 바 여부 (기본값: false) */
  horizontal?: boolean;
}

/**
 * 파이 차트 설정
 */
export interface PieChartConfig extends ChartConfig {
  type: 'pie';
  /** 도넛 차트 여부 (기본값: false) */
  donut?: boolean;
  /** 도넛 중앙 구멍 크기 비율 (0-1, 기본값: 0.5) */
  donutHoleRatio?: number;
  /** 퍼센트 표시 여부 (기본값: true) */
  showPercentage?: boolean;
}

/**
 * 영역 차트 설정
 */
export interface AreaChartConfig extends ChartConfig {
  type: 'area';
  /** 영역 투명도 (0-1, 기본값: 0.3) */
  fillOpacity?: number;
  /** 라인 곡선 여부 (기본값: false) */
  curved?: boolean;
}

/**
 * 모든 차트 설정 유니온 타입
 */
export type AnyChartConfig =
  | LineChartConfig
  | BarChartConfig
  | PieChartConfig
  | AreaChartConfig;

// ============================================================================
// 차트 렌더링 타입
// ============================================================================

/**
 * Canvas 렌더링 컨텍스트 타입
 */
export interface ChartRenderContext {
  /** Canvas 요소 */
  canvas: HTMLCanvasElement;
  /** 2D 렌더링 컨텍스트 */
  ctx: CanvasRenderingContext2D;
  /** 차트 설정 */
  config: AnyChartConfig;
  /** 생성 옵션 */
  options: ChartGeneratorOptions;
}

/**
 * 차트 좌표계
 */
export interface ChartCoordinates {
  /** X축 최소값 */
  minX: number;
  /** X축 최대값 */
  maxX: number;
  /** Y축 최소값 */
  minY: number;
  /** Y축 최대값 */
  maxY: number;
  /** 차트 영역 너비 */
  width: number;
  /** 차트 영역 높이 */
  height: number;
}

/**
 * 렌더링된 차트 결과
 */
export interface RenderedChart {
  /** 차트 이미지 Blob */
  blob: Blob;
  /** 차트 설정 */
  config: AnyChartConfig;
  /** 생성 시간 (ms) */
  duration: number;
  /** 이미지 크기 (bytes) */
  size: number;
}

// ============================================================================
// 리포트 통합 타입
// ============================================================================

/**
 * 차트가 포함된 시트 설정
 */
export interface SheetWithChart {
  /** 시트 이름 */
  name: string;
  /** 차트 설정 (선택) */
  chart?: AnyChartConfig;
  /** 차트 이미지 Blob (선택) */
  chartBlob?: Blob;
}

/**
 * 트렌드 차트 데이터
 */
export interface TrendChartData {
  /** 날짜별 데이터 */
  data: Array<{ date: string; count: number }>;
  /** 차트 제목 */
  title: string;
}

/**
 * 분포 차트 데이터
 */
export interface DistributionChartData {
  /** 카테고리별 데이터 */
  data: Array<{ category: string; count: number }>;
  /** 차트 제목 */
  title: string;
}

// ============================================================================
// 에러 타입
// ============================================================================

/**
 * 차트 생성 에러
 */
export interface ChartGenerationError extends Error {
  code: ChartErrorCode;
  config?: AnyChartConfig;
  details?: unknown;
}

/**
 * 차트 에러 코드
 */
export type ChartErrorCode =
  | 'CANVAS_NOT_SUPPORTED'    // Canvas API 미지원
  | 'INVALID_DATA'            // 잘못된 데이터
  | 'RENDER_FAILED'           // 렌더링 실패
  | 'BLOB_CONVERSION_FAILED'  // Blob 변환 실패
  | 'IMAGE_TOO_LARGE'         // 이미지 크기 초과
  | 'UNKNOWN';                // 알 수 없는 에러

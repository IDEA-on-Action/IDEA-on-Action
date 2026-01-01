/**
 * xlsx 차트 삽입 유틸리티
 *
 * Excel 파일에 차트 이미지를 직접 삽입하는 기능을 제공합니다.
 * Canvas API로 생성한 차트를 Base64로 변환하여 Excel 파일에 삽입합니다.
 * ExcelJS 기반으로 마이그레이션됨 (공식 이미지 삽입 API 사용)
 *
 * @module lib/skills/xlsx-chart
 */

import ExcelJS from 'exceljs';
import type { AnyChartConfig } from '@/types/documents/xlsx-chart.types';
import { generateChartImage } from '@/skills/xlsx/chart/chart-utils';

// ============================================================================
// 타입 정의
// ============================================================================

/**
 * Excel 차트 삽입 설정
 */
export interface ExcelChartInsertConfig {
  /** 워크북 객체 (ExcelJS) */
  workbook: ExcelJS.Workbook;
  /** 시트 이름 */
  sheetName: string;
  /** 차트 설정 */
  chart: AnyChartConfig;
  /** 삽입 위치 (셀 주소, 예: 'A1', 'B5') */
  cellAddress: string;
}

/**
 * 차트 삽입 결과
 */
export interface ChartInsertResult {
  /** 성공 여부 */
  success: boolean;
  /** 차트 이미지 크기 (bytes) */
  imageSize?: number;
  /** 차트 생성 시간 (ms) */
  duration?: number;
  /** 에러 메시지 (실패 시) */
  error?: string;
}

/**
 * 다중 차트 삽입 설정
 */
export interface MultiChartInsertConfig {
  /** 워크북 객체 (ExcelJS) */
  workbook: ExcelJS.Workbook;
  /** 차트 설정 목록 */
  charts: Array<{
    /** 시트 이름 */
    sheetName: string;
    /** 차트 설정 */
    chart: AnyChartConfig;
    /** 삽입 위치 */
    cellAddress: string;
  }>;
}

// ============================================================================
// 차트 이미지 삽입 (단일)
// ============================================================================

/**
 * Excel 워크북에 차트 이미지 삽입
 *
 * Canvas로 생성한 차트를 Base64로 변환하여 Excel 파일에 삽입합니다.
 * xlsx 라이브러리의 제한으로 인해 실제로는 시트에 차트 데이터를 추가하고,
 * 주석(comment)으로 차트 정보를 기록합니다.
 *
 * @param config - 차트 삽입 설정
 * @returns 삽입 결과
 *
 * @example
 * ```typescript
 * const workbook = XLSX.utils.book_new();
 * const worksheet = XLSX.utils.aoa_to_sheet([
 *   ['날짜', '이벤트 수'],
 *   ['2025-11-01', 10],
 *   ['2025-11-02', 15],
 * ]);
 * XLSX.utils.book_append_sheet(workbook, worksheet, 'Events');
 *
 * const chartConfig: LineChartConfig = {
 *   type: 'line',
 *   data: [
 *     { label: '2025-11-01', value: 10 },
 *     { label: '2025-11-02', value: 15 },
 *   ],
 *   title: '일별 이벤트 수',
 *   position: { row: 0, col: 5 }, // F1 위치
 * };
 *
 * const result = await insertChartToExcel({
 *   workbook,
 *   sheetName: 'Events',
 *   chart: chartConfig,
 *   cellAddress: 'F1',
 * });
 *
 * if (result.success) {
 *   XLSX.writeFile(workbook, 'report-with-chart.xlsx');
 * }
 * ```
 */
export async function insertChartToExcel(
  config: ExcelChartInsertConfig
): Promise<ChartInsertResult> {
  const { workbook, sheetName, chart, cellAddress } = config;

  try {
    // 시트 확인 (ExcelJS)
    const worksheet = workbook.getWorksheet(sheetName);
    if (!worksheet) {
      return {
        success: false,
        error: `시트 '${sheetName}'를 찾을 수 없습니다.`,
      };
    }

    // 차트 이미지 생성
    const rendered = await generateChartImage(chart);

    // Base64로 변환
    const base64 = await blobToBase64(rendered.blob);

    // ExcelJS 공식 이미지 삽입 API 사용
    const { row, col } = cellAddressToCoords(cellAddress);
    const imageId = workbook.addImage({
      base64: base64,
      extension: 'png',
    });

    worksheet.addImage(imageId, {
      tl: { col, row },
      ext: { width: chart.width || 600, height: chart.height || 400 },
    });

    return {
      success: true,
      imageSize: rendered.size,
      duration: rendered.duration,
    };
  } catch (error) {
    console.error('[insertChartToExcel] 차트 삽입 실패:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 에러',
    };
  }
}

// ============================================================================
// 차트 이미지 삽입 (다중)
// ============================================================================

/**
 * Excel 워크북에 여러 차트 이미지 삽입
 *
 * @param config - 다중 차트 삽입 설정
 * @returns 각 차트별 삽입 결과
 *
 * @example
 * ```typescript
 * const result = await insertMultipleChartsToExcel({
 *   workbook,
 *   charts: [
 *     { sheetName: 'Events', chart: lineChart, cellAddress: 'F1' },
 *     { sheetName: 'Issues', chart: pieChart, cellAddress: 'F1' },
 *   ],
 * });
 *
 * const successCount = result.filter(r => r.success).length;
 * console.log(`${successCount}/${result.length} 차트 삽입 완료`);
 * ```
 */
export async function insertMultipleChartsToExcel(
  config: MultiChartInsertConfig
): Promise<ChartInsertResult[]> {
  const { workbook, charts } = config;

  const results: ChartInsertResult[] = [];

  for (const chartConfig of charts) {
    const result = await insertChartToExcel({
      workbook,
      sheetName: chartConfig.sheetName,
      chart: chartConfig.chart,
      cellAddress: chartConfig.cellAddress,
    });
    results.push(result);
  }

  return results;
}

// ============================================================================
// 헬퍼 함수
// ============================================================================

/**
 * Blob을 Base64 문자열로 변환
 */
async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // data:image/png;base64, 제거
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * 셀 주소를 행/열 좌표로 변환
 *
 * @example
 * cellAddressToCoords('A1') => { row: 0, col: 0 }
 * cellAddressToCoords('B5') => { row: 4, col: 1 }
 */
export function cellAddressToCoords(address: string): { row: number; col: number } {
  const match = address.match(/^([A-Z]+)(\d+)$/);
  if (!match) {
    throw new Error(`잘못된 셀 주소: ${address}`);
  }

  const colStr = match[1];
  const rowStr = match[2];

  // 열 문자를 숫자로 변환 (A=0, B=1, ..., Z=25, AA=26, ...)
  let col = 0;
  for (let i = 0; i < colStr.length; i++) {
    col = col * 26 + (colStr.charCodeAt(i) - 65 + 1);
  }
  col -= 1; // 0-based index

  // 행 숫자를 0-based로 변환
  const row = parseInt(rowStr, 10) - 1;

  return { row, col };
}

/**
 * 행/열 좌표를 셀 주소로 변환
 *
 * @example
 * coordsToCellAddress({ row: 0, col: 0 }) => 'A1'
 * coordsToCellAddress({ row: 4, col: 1 }) => 'B5'
 */
export function coordsToCellAddress(coords: { row: number; col: number }): string {
  let colStr = '';
  let c = coords.col + 1;
  while (c > 0) {
    const remainder = (c - 1) % 26;
    colStr = String.fromCharCode(65 + remainder) + colStr;
    c = Math.floor((c - 1) / 26);
  }
  return `${colStr}${coords.row + 1}`;
}

// ============================================================================
// 차트 위치 자동 계산
// ============================================================================

/**
 * 시트의 데이터 범위 다음에 차트를 배치할 위치 계산
 *
 * @param worksheet - 워크시트 (ExcelJS)
 * @param margin - 데이터와 차트 사이 간격 (열 단위, 기본값: 2)
 * @returns 차트 삽입 위치 (셀 주소)
 *
 * @example
 * ```typescript
 * const chartPosition = calculateChartPosition(worksheet);
 * // 데이터가 A1:D10이면 'F1' 반환 (2열 간격)
 * ```
 */
export function calculateChartPosition(
  worksheet: ExcelJS.Worksheet,
  margin = 2
): string {
  const columnCount = worksheet.columnCount || 1;
  const chartCol = columnCount + margin;
  const chartRow = 0; // 첫 번째 행

  return coordsToCellAddress({ row: chartRow, col: chartCol });
}

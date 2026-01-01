/**
 * xlsx 차트 삽입 유틸리티
 *
 * Excel 워크시트에 차트 이미지를 삽입하는 기능
 * ExcelJS 기반으로 마이그레이션됨 (공식 이미지 삽입 API 사용)
 *
 * @module lib/skills/xlsx/chartInsert
 */

import ExcelJS from 'exceljs';
import type {
  ChartInsertOptions,
  ChartPosition,
  ChartSize,
} from '@/types/documents/xlsx-chart.types';

// ============================================================================
// 타입 정의
// ============================================================================

/**
 * Excel 워크시트 타입
 */
type Worksheet = ExcelJS.Worksheet;

/**
 * Excel 워크북 타입
 */
type Workbook = ExcelJS.Workbook;

/**
 * 이미지 확장자 타입
 */
type ImageExtension = 'png' | 'jpeg' | 'gif';

// ============================================================================
// 헬퍼 함수
// ============================================================================

/**
 * 셀 주소를 행/열 인덱스로 변환
 * @example 'A1' -> { row: 0, col: 0 }
 * @example 'B5' -> { row: 4, col: 1 }
 */
function cellToRowCol(cell: string): { row: number; col: number } {
  const match = cell.match(/^([A-Z]+)(\d+)$/);
  if (!match) {
    throw new Error(`잘못된 셀 주소: ${cell}`);
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
 * 행/열 인덱스를 셀 주소로 변환
 * @example { row: 0, col: 0 } -> 'A1'
 * @example { row: 4, col: 1 } -> 'B5'
 */
function rowColToCell(row: number, col: number): string {
  let colStr = '';
  let c = col + 1;
  while (c > 0) {
    const remainder = (c - 1) % 26;
    colStr = String.fromCharCode(65 + remainder) + colStr;
    c = Math.floor((c - 1) / 26);
  }
  return `${colStr}${row + 1}`;
}

/**
 * 이미지 확장자 추출
 */
function getImageExtension(mimeType: string): ImageExtension {
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/jpeg') return 'jpeg';
  if (mimeType === 'image/gif') return 'gif';
  return 'png'; // 기본값
}

/**
 * 차트 위치 계산
 */
function calculatePosition(position: ChartPosition): { row: number; col: number } {
  const { row, col } = cellToRowCol(position.cell);
  return {
    row: row + (position.rowOffset || 0),
    col: col + (position.colOffset || 0),
  };
}

/**
 * 차트 크기 계산 (픽셀을 Excel 단위로 변환)
 */
function calculateSize(size?: ChartSize): { width: number; height: number } {
  // 기본 차트 크기 (xlsx-chart.types.ts의 ChartConfig 기본값과 동일)
  const DEFAULT_WIDTH = 800;
  const DEFAULT_HEIGHT = 400;

  const width = size?.width || DEFAULT_WIDTH;
  const height = size?.height || DEFAULT_HEIGHT;

  // Excel에서 1 행 높이 ≈ 15 픽셀, 1 열 너비 ≈ 8.43 픽셀
  // 여기서는 간단히 픽셀 값을 그대로 사용
  return { width, height };
}

// ============================================================================
// 공개 API
// ============================================================================

/**
 * 워크시트에 차트 이미지 삽입 (ExcelJS)
 *
 * @param workbook - 워크북 (이미지 등록용)
 * @param worksheet - 대상 워크시트
 * @param imageBase64 - Base64 인코딩된 이미지 데이터
 * @param options - 삽입 옵션
 * @returns 이미지 ID
 *
 * @example
 * ```typescript
 * const wb = new ExcelJS.Workbook();
 * const ws = wb.addWorksheet('Data');
 * const chartResult = await generateBarChartImage(data, options);
 * insertChartImageExcel(wb, ws, chartResult.imageBase64, {
 *   position: { cell: 'D2' },
 *   size: { width: 600, height: 400 },
 *   alt: 'Monthly Sales Chart'
 * });
 * ```
 */
export function insertChartImageExcel(
  workbook: Workbook,
  worksheet: Worksheet,
  imageBase64: string,
  options: ChartInsertOptions
): number {
  try {
    // 위치 계산
    const { row, col } = calculatePosition(options.position);
    const { width, height } = calculateSize(options.size);

    // 워크북에 이미지 등록 (ExcelJS)
    const imageId = workbook.addImage({
      base64: imageBase64,
      extension: 'png',
    });

    // 워크시트에 이미지 배치
    worksheet.addImage(imageId, {
      tl: { col, row },
      ext: { width, height },
    });

    return imageId;
  } catch (error) {
    throw new Error(
      `차트 이미지 삽입 실패: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * 워크시트에 차트 이미지 삽입 (레거시 호환용)
 *
 * @deprecated insertChartImageExcel 사용 권장
 * @param worksheet - 대상 워크시트
 * @param imageBase64 - Base64 인코딩된 이미지 데이터
 * @param options - 삽입 옵션
 * @returns 수정된 워크시트
 */
export function insertChartImage(
  worksheet: Worksheet,
  imageBase64: string,
  options: ChartInsertOptions
): Worksheet {
  // ExcelJS에서는 워크북이 필요하지만, 레거시 호환을 위해 메타데이터만 저장
  const { row, col } = calculatePosition(options.position);
  const { width, height } = calculateSize(options.size);

  // 커스텀 속성에 이미지 정보 저장 (나중에 워크북에서 처리)
  const imageInfo = {
    base64: imageBase64,
    position: { row, col },
    size: { width, height },
    alt: options.alt || 'Chart',
  };

  // 워크시트의 커스텀 속성에 저장
  if (!(worksheet as unknown as Record<string, unknown>)['__pendingImages']) {
    (worksheet as unknown as Record<string, unknown>)['__pendingImages'] = [];
  }
  ((worksheet as unknown as Record<string, unknown>)['__pendingImages'] as unknown[]).push(imageInfo);

  return worksheet;
}

/**
 * 여러 차트를 워크시트에 일괄 삽입 (ExcelJS)
 *
 * @param workbook - 워크북 (이미지 등록용)
 * @param worksheet - 대상 워크시트
 * @param charts - 차트 배열 (각 차트는 imageBase64와 options 포함)
 * @returns 이미지 ID 배열
 *
 * @example
 * ```typescript
 * const wb = new ExcelJS.Workbook();
 * const ws = wb.addWorksheet('Data');
 * const chart1 = await generateBarChartImage(data1, options1);
 * const chart2 = await generateLineChartImage(data2, options2);
 *
 * insertMultipleChartsExcel(wb, ws, [
 *   { imageBase64: chart1.imageBase64, options: { position: { cell: 'A10' } } },
 *   { imageBase64: chart2.imageBase64, options: { position: { cell: 'A25' } } },
 * ]);
 * ```
 */
export function insertMultipleChartsExcel(
  workbook: Workbook,
  worksheet: Worksheet,
  charts: Array<{ imageBase64: string; options: ChartInsertOptions }>
): number[] {
  return charts.map(chart =>
    insertChartImageExcel(workbook, worksheet, chart.imageBase64, chart.options)
  );
}

/**
 * 여러 차트를 워크시트에 일괄 삽입 (레거시 호환용)
 *
 * @deprecated insertMultipleChartsExcel 사용 권장
 */
export function insertMultipleCharts(
  worksheet: Worksheet,
  charts: Array<{ imageBase64: string; options: ChartInsertOptions }>
): Worksheet {
  let ws = worksheet;
  charts.forEach(chart => {
    ws = insertChartImage(ws, chart.imageBase64, chart.options);
  });
  return ws;
}

/**
 * 차트 삽입 가능 여부 확인
 *
 * @param worksheet - 대상 워크시트
 * @param position - 삽입 위치
 * @returns 삽입 가능 여부
 */
export function canInsertChart(
  worksheet: Worksheet,
  position: ChartPosition
): boolean {
  try {
    const { row, col } = calculatePosition(position);
    // 위치가 유효한지 확인
    return row >= 0 && col >= 0;
  } catch {
    return false;
  }
}

/**
 * 워크시트의 이미지 개수 조회
 *
 * @param worksheet - 대상 워크시트
 * @returns 이미지 개수
 */
export function getChartCount(worksheet: Worksheet): number {
  // ExcelJS에서는 워크시트의 이미지를 직접 조회할 수 있음
  const images = (worksheet as unknown as { getImages?: () => unknown[] }).getImages?.();
  if (images) {
    return images.length;
  }
  // 레거시 호환: __pendingImages 확인
  const pendingImages = (worksheet as unknown as Record<string, unknown>)['__pendingImages'] as unknown[] | undefined;
  return pendingImages?.length || 0;
}

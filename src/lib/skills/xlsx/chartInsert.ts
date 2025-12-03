/**
 * xlsx 차트 삽입 유틸리티
 *
 * Excel 워크시트에 차트 이미지를 삽입하는 기능
 *
 * @module lib/skills/xlsx/chartInsert
 */

import * as XLSX from 'xlsx';
import type {
  ChartInsertOptions,
  ChartPosition,
  ChartSize,
  DEFAULT_CHART_SIZE,
} from '@/types/xlsx-chart.types';

// ============================================================================
// 타입 정의
// ============================================================================

/**
 * Excel 워크시트 타입
 */
type Worksheet = XLSX.WorkSheet;

/**
 * 이미지 확장자 타입
 */
type ImageExtension = 'png' | 'jpeg' | 'jpg';

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
 * Base64 문자열을 ArrayBuffer로 변환
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * 이미지 확장자 추출
 */
function getImageExtension(mimeType: string): ImageExtension {
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/jpeg') return 'jpeg';
  if (mimeType === 'image/jpg') return 'jpg';
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
  const defaultSize = DEFAULT_CHART_SIZE as typeof DEFAULT_CHART_SIZE;
  const width = size?.width || defaultSize.width;
  const height = size?.height || defaultSize.height;

  // Excel에서 1 행 높이 ≈ 15 픽셀, 1 열 너비 ≈ 8.43 픽셀
  // 여기서는 간단히 픽셀 값을 그대로 사용
  return { width, height };
}

// ============================================================================
// 공개 API
// ============================================================================

/**
 * 워크시트에 차트 이미지 삽입
 *
 * @param worksheet - 대상 워크시트
 * @param imageBase64 - Base64 인코딩된 이미지 데이터
 * @param options - 삽입 옵션
 * @returns 수정된 워크시트
 *
 * @example
 * ```typescript
 * const ws = XLSX.utils.aoa_to_sheet([['Header 1', 'Header 2']]);
 * const chartResult = await generateBarChartImage(data, options);
 * insertChartImage(ws, chartResult.imageBase64, {
 *   position: { cell: 'D2' },
 *   size: { width: 600, height: 400 },
 *   alt: 'Monthly Sales Chart'
 * });
 * ```
 */
export function insertChartImage(
  worksheet: Worksheet,
  imageBase64: string,
  options: ChartInsertOptions
): Worksheet {
  try {
    // 위치 계산
    const { row, col } = calculatePosition(options.position);
    const { width, height } = calculateSize(options.size);

    // 이미지 데이터를 ArrayBuffer로 변환
    const imageBuffer = base64ToArrayBuffer(imageBase64);

    // xlsx 라이브러리는 기본적으로 이미지 삽입을 직접 지원하지 않음
    // 대신 워크시트의 '!images' 속성을 사용하여 이미지 정보 저장
    if (!worksheet['!images']) {
      worksheet['!images'] = [];
    }

    // 이미지 메타데이터 추가
    const imageData = {
      name: options.alt || 'Chart',
      data: imageBuffer,
      position: {
        type: 'twoCellAnchor',
        from: { row, col },
        to: {
          row: row + Math.ceil(height / 20), // 대략적인 행 수
          col: col + Math.ceil(width / 64),   // 대략적인 열 수
        },
      },
      ext: 'png',
    };

    worksheet['!images'].push(imageData);

    // 차트 위치에 플레이스홀더 텍스트 삽입
    const cellAddr = rowColToCell(row, col);
    if (!worksheet[cellAddr]) {
      worksheet[cellAddr] = {
        t: 's', // 문자열 타입
        v: options.alt || '[Chart]',
      };
    }

    return worksheet;
  } catch (error) {
    throw new Error(
      `차트 이미지 삽입 실패: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * 여러 차트를 워크시트에 일괄 삽입
 *
 * @param worksheet - 대상 워크시트
 * @param charts - 차트 배열 (각 차트는 imageBase64와 options 포함)
 * @returns 수정된 워크시트
 *
 * @example
 * ```typescript
 * const ws = XLSX.utils.aoa_to_sheet(data);
 * const chart1 = await generateBarChartImage(data1, options1);
 * const chart2 = await generateLineChartImage(data2, options2);
 *
 * insertMultipleCharts(ws, [
 *   { imageBase64: chart1.imageBase64, options: { position: { cell: 'A10' } } },
 *   { imageBase64: chart2.imageBase64, options: { position: { cell: 'A25' } } },
 * ]);
 * ```
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

    // 워크시트 범위 확인
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');

    // 위치가 현재 범위를 벗어나는 경우에도 삽입 가능
    // (새로운 셀이 자동으로 생성됨)
    return row >= 0 && col >= 0;
  } catch (error) {
    return false;
  }
}

/**
 * 워크시트의 모든 차트 제거
 *
 * @param worksheet - 대상 워크시트
 * @returns 수정된 워크시트
 */
export function removeAllCharts(worksheet: Worksheet): Worksheet {
  if (worksheet['!images']) {
    delete worksheet['!images'];
  }
  return worksheet;
}

/**
 * 차트 개수 조회
 *
 * @param worksheet - 대상 워크시트
 * @returns 차트 개수
 */
export function getChartCount(worksheet: Worksheet): number {
  return worksheet['!images']?.length || 0;
}

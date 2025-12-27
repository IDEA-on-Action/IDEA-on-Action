/**
 * ExcelJS 어댑터
 *
 * xlsx 라이브러리와 호환되는 ExcelJS wrapper 함수 제공
 * xlsx → ExcelJS 마이그레이션을 위한 어댑터 레이어
 *
 * @module lib/skills/excel/adapter
 */

import ExcelJS from 'exceljs';
import type {
  WorkbookOptions,
  ColumnDefinition,
  ImageInsertOptions,
  ImageData,
  ReadOptions,
  WriteOptions,
  SheetToJsonResult,
  CellStyle,
  ExcelError,
} from './types';

// ============================================================================
// 워크북 생성
// ============================================================================

/**
 * 새 워크북 생성
 *
 * @param options - 워크북 옵션
 * @returns ExcelJS 워크북
 *
 * @example
 * ```ts
 * const workbook = createWorkbook({ creator: 'IDEA on Action' });
 * ```
 */
export function createWorkbook(options?: WorkbookOptions): ExcelJS.Workbook {
  const workbook = new ExcelJS.Workbook();

  if (options) {
    workbook.creator = options.creator || 'IDEA on Action';
    workbook.lastModifiedBy = options.lastModifiedBy || options.creator || 'IDEA on Action';
    workbook.created = options.created || new Date();
    workbook.modified = options.modified || new Date();
  }

  return workbook;
}

// ============================================================================
// 시트 관리
// ============================================================================

/**
 * 워크시트 추가
 *
 * @param workbook - 워크북
 * @param name - 시트명
 * @returns 생성된 워크시트
 */
export function addWorksheet(
  workbook: ExcelJS.Workbook,
  name: string
): ExcelJS.Worksheet {
  return workbook.addWorksheet(name);
}

/**
 * 워크시트 가져오기
 *
 * @param workbook - 워크북
 * @param nameOrIndex - 시트명 또는 인덱스
 * @returns 워크시트 (없으면 undefined)
 */
export function getWorksheet(
  workbook: ExcelJS.Workbook,
  nameOrIndex: string | number
): ExcelJS.Worksheet | undefined {
  return workbook.getWorksheet(nameOrIndex);
}

// ============================================================================
// JSON ↔ 시트 변환
// ============================================================================

/**
 * JSON 데이터를 워크시트 행으로 변환
 *
 * xlsx의 `json_to_sheet` 대체
 *
 * @param worksheet - 대상 워크시트
 * @param data - JSON 데이터 배열
 * @param columns - 컬럼 정의 (선택사항)
 *
 * @example
 * ```ts
 * const worksheet = workbook.addWorksheet('Sheet1');
 * jsonToRows(worksheet, [
 *   { name: 'Alice', age: 30 },
 *   { name: 'Bob', age: 25 }
 * ]);
 * ```
 */
export function jsonToRows(
  worksheet: ExcelJS.Worksheet,
  data: Record<string, unknown>[],
  columns?: ColumnDefinition[]
): void {
  if (data.length === 0) return;

  // 컬럼 정의가 있으면 적용
  if (columns) {
    worksheet.columns = columns.map((col) => ({
      header: col.header,
      key: col.key,
      width: col.width || 15,
    }));
  } else {
    // 데이터에서 컬럼 추론
    const firstRow = data[0];
    const keys = Object.keys(firstRow);
    worksheet.columns = keys.map((key) => ({
      header: key,
      key: key,
      width: 15,
    }));
  }

  // 데이터 행 추가
  data.forEach((row) => {
    worksheet.addRow(row);
  });
}

/**
 * 워크시트를 JSON 배열로 변환
 *
 * xlsx의 `sheet_to_json` 대체
 *
 * @param worksheet - 워크시트
 * @param options - 읽기 옵션
 * @returns 변환된 JSON 데이터
 *
 * @example
 * ```ts
 * const result = rowsToJson(worksheet, { headerRow: 0 });
 * console.log(result.data);
 * ```
 */
export function rowsToJson<T = Record<string, unknown>>(
  worksheet: ExcelJS.Worksheet,
  options?: ReadOptions
): SheetToJsonResult<T> {
  const headerRowNum = (options?.headerRow ?? 0) + 1; // ExcelJS는 1-based
  const dataStartRowNum = (options?.dataStartRow ?? 1) + 1;

  const headers: string[] = [];
  const data: T[] = [];

  // 헤더 추출
  const headerRow = worksheet.getRow(headerRowNum);
  headerRow.eachCell((cell, colNumber) => {
    headers[colNumber - 1] = String(cell.value || `Column${colNumber}`);
  });

  // 데이터 추출
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber < dataStartRowNum) return;

    const rowData: Record<string, unknown> = {};
    let hasData = false;

    row.eachCell((cell, colNumber) => {
      const header = headers[colNumber - 1];
      if (header) {
        rowData[header] = cell.value;
        if (cell.value !== null && cell.value !== undefined) {
          hasData = true;
        }
      }
    });

    // 빈 행 건너뛰기
    if (hasData) {
      data.push(rowData as T);
    }
  });

  return {
    data,
    headers,
    rowCount: data.length,
  };
}

/**
 * 2D 배열을 워크시트에 추가
 *
 * xlsx의 `aoa_to_sheet` 대체
 *
 * @param worksheet - 워크시트
 * @param aoa - 2D 배열
 * @param origin - 시작 셀 (기본값: 'A1')
 */
export function aoaToRows(
  worksheet: ExcelJS.Worksheet,
  aoa: (string | number | boolean | Date | null | undefined)[][],
  origin?: string
): void {
  const startCell = origin || 'A1';
  const match = startCell.match(/^([A-Z]+)(\d+)$/);
  const startRow = match ? parseInt(match[2], 10) : 1;

  aoa.forEach((rowData, index) => {
    const row = worksheet.getRow(startRow + index);
    rowData.forEach((cellValue, colIndex) => {
      row.getCell(colIndex + 1).value = cellValue;
    });
    row.commit();
  });
}

// ============================================================================
// 파일 읽기/쓰기
// ============================================================================

/**
 * ArrayBuffer에서 워크북 로드
 *
 * xlsx의 `read` 대체 (비동기)
 *
 * @param buffer - 파일 버퍼
 * @returns 로드된 워크북
 *
 * @example
 * ```ts
 * const buffer = await file.arrayBuffer();
 * const workbook = await loadBuffer(buffer);
 * ```
 */
export async function loadBuffer(
  buffer: ArrayBuffer
): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  return workbook;
}

/**
 * 워크북을 ArrayBuffer로 변환
 *
 * xlsx의 `write` 대체 (비동기)
 *
 * @param workbook - 워크북
 * @returns ArrayBuffer
 *
 * @example
 * ```ts
 * const buffer = await writeBuffer(workbook);
 * const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
 * ```
 */
export async function writeBuffer(
  workbook: ExcelJS.Workbook
): Promise<ArrayBuffer> {
  return workbook.xlsx.writeBuffer() as Promise<ArrayBuffer>;
}

/**
 * 워크북을 Blob으로 변환 후 다운로드
 *
 * xlsx의 `writeFile` 대체 (비동기)
 *
 * @param workbook - 워크북
 * @param filename - 파일명
 *
 * @example
 * ```ts
 * await downloadWorkbook(workbook, 'report.xlsx');
 * ```
 */
export async function downloadWorkbook(
  workbook: ExcelJS.Workbook,
  filename: string
): Promise<void> {
  const buffer = await writeBuffer(workbook);
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ============================================================================
// 이미지 삽입
// ============================================================================

/**
 * 워크시트에 이미지 추가
 *
 * xlsx의 비공식 `ws['!images']` 대체 (공식 API)
 *
 * @param workbook - 워크북
 * @param worksheet - 워크시트
 * @param imageData - 이미지 데이터
 * @param options - 삽입 옵션
 * @returns 이미지 ID
 *
 * @example
 * ```ts
 * const imageId = addImage(workbook, worksheet, {
 *   base64: chartBase64,
 *   extension: 'png'
 * }, {
 *   tl: { col: 3, row: 1 },
 *   ext: { width: 600, height: 400 }
 * });
 * ```
 */
export function addImage(
  workbook: ExcelJS.Workbook,
  worksheet: ExcelJS.Worksheet,
  imageData: ImageData,
  options: ImageInsertOptions
): number {
  // 워크북에 이미지 등록
  const imageId = workbook.addImage({
    base64: imageData.base64,
    extension: imageData.extension,
  });

  // 워크시트에 이미지 배치
  worksheet.addImage(imageId, {
    tl: { col: options.tl.col, row: options.tl.row },
    ext: { width: options.ext.width, height: options.ext.height },
    editAs: options.editAs,
  });

  return imageId;
}

// ============================================================================
// 컬럼 너비 설정
// ============================================================================

/**
 * 컬럼 너비 설정
 *
 * xlsx의 `ws['!cols']` 대체
 *
 * @param worksheet - 워크시트
 * @param widths - 컬럼 너비 배열
 *
 * @example
 * ```ts
 * setColumnWidths(worksheet, [10, 20, 15, 30]);
 * ```
 */
export function setColumnWidths(
  worksheet: ExcelJS.Worksheet,
  widths: number[]
): void {
  widths.forEach((width, index) => {
    const column = worksheet.getColumn(index + 1);
    column.width = width;
  });
}

/**
 * 컬럼 자동 너비 조정
 *
 * @param worksheet - 워크시트
 * @param minWidth - 최소 너비 (기본값: 10)
 * @param maxWidth - 최대 너비 (기본값: 50)
 */
export function autoFitColumns(
  worksheet: ExcelJS.Worksheet,
  minWidth = 10,
  maxWidth = 50
): void {
  worksheet.columns.forEach((column) => {
    let maxLength = minWidth;

    column.eachCell?.({ includeEmpty: false }, (cell) => {
      const cellValue = cell.value?.toString() || '';
      const cellLength = cellValue.length + 2;
      if (cellLength > maxLength) {
        maxLength = Math.min(cellLength, maxWidth);
      }
    });

    column.width = maxLength;
  });
}

// ============================================================================
// 스타일 적용
// ============================================================================

/**
 * 헤더 행 스타일 적용
 *
 * @param worksheet - 워크시트
 * @param style - 셀 스타일
 */
export function styleHeaderRow(
  worksheet: ExcelJS.Worksheet,
  style?: CellStyle
): void {
  const headerRow = worksheet.getRow(1);
  const defaultStyle: CellStyle = {
    font: { bold: true, color: { argb: 'FFFFFFFF' } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } },
    alignment: { horizontal: 'center', vertical: 'middle' },
  };

  const appliedStyle = style || defaultStyle;

  headerRow.eachCell((cell) => {
    if (appliedStyle.font) cell.font = appliedStyle.font;
    if (appliedStyle.fill) cell.fill = appliedStyle.fill as ExcelJS.Fill;
    if (appliedStyle.alignment) cell.alignment = appliedStyle.alignment;
    if (appliedStyle.border) cell.border = appliedStyle.border;
  });
}

/**
 * 셀 범위에 스타일 적용
 *
 * @param worksheet - 워크시트
 * @param range - 셀 범위 (예: 'A1:D10')
 * @param style - 셀 스타일
 */
export function applyCellStyle(
  worksheet: ExcelJS.Worksheet,
  range: string,
  style: CellStyle
): void {
  // 범위 파싱
  const [start, end] = range.split(':');
  const startMatch = start.match(/^([A-Z]+)(\d+)$/);
  const endMatch = end?.match(/^([A-Z]+)(\d+)$/);

  if (!startMatch) return;

  const startCol = columnToNumber(startMatch[1]);
  const startRow = parseInt(startMatch[2], 10);
  const endCol = endMatch ? columnToNumber(endMatch[1]) : startCol;
  const endRow = endMatch ? parseInt(endMatch[2], 10) : startRow;

  for (let row = startRow; row <= endRow; row++) {
    for (let col = startCol; col <= endCol; col++) {
      const cell = worksheet.getCell(row, col);
      if (style.font) cell.font = style.font;
      if (style.fill) cell.fill = style.fill as ExcelJS.Fill;
      if (style.alignment) cell.alignment = style.alignment;
      if (style.border) cell.border = style.border;
      if (style.numFmt) cell.numFmt = style.numFmt;
    }
  }
}

// ============================================================================
// 유틸리티
// ============================================================================

/**
 * 셀 주소를 행/열 인덱스로 변환
 *
 * @param cell - 셀 주소 (예: 'A1')
 * @returns { row, col } (0-based)
 */
export function cellToRowCol(cell: string): { row: number; col: number } {
  const match = cell.match(/^([A-Z]+)(\d+)$/);
  if (!match) {
    throw new Error(`잘못된 셀 주소: ${cell}`);
  }

  const col = columnToNumber(match[1]) - 1;
  const row = parseInt(match[2], 10) - 1;

  return { row, col };
}

/**
 * 행/열 인덱스를 셀 주소로 변환
 *
 * @param row - 행 인덱스 (0-based)
 * @param col - 열 인덱스 (0-based)
 * @returns 셀 주소
 */
export function rowColToCell(row: number, col: number): string {
  return `${numberToColumn(col + 1)}${row + 1}`;
}

/**
 * 컬럼 문자를 숫자로 변환
 *
 * @param col - 컬럼 문자 (예: 'A', 'AA')
 * @returns 컬럼 번호 (1-based)
 */
function columnToNumber(col: string): number {
  let result = 0;
  for (let i = 0; i < col.length; i++) {
    result = result * 26 + (col.charCodeAt(i) - 64);
  }
  return result;
}

/**
 * 숫자를 컬럼 문자로 변환
 *
 * @param num - 컬럼 번호 (1-based)
 * @returns 컬럼 문자
 */
function numberToColumn(num: number): string {
  let result = '';
  while (num > 0) {
    const remainder = (num - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    num = Math.floor((num - 1) / 26);
  }
  return result;
}

// ============================================================================
// 시트 정보
// ============================================================================

/**
 * 워크북의 모든 시트명 반환
 *
 * @param workbook - 워크북
 * @returns 시트명 배열
 */
export function getSheetNames(workbook: ExcelJS.Workbook): string[] {
  return workbook.worksheets.map((ws) => ws.name);
}

/**
 * 워크시트 범위 가져오기
 *
 * @param worksheet - 워크시트
 * @returns 범위 문자열 (예: 'A1:D10')
 */
export function getSheetRange(worksheet: ExcelJS.Worksheet): string | null {
  const rowCount = worksheet.rowCount;
  const columnCount = worksheet.columnCount;

  if (rowCount === 0 || columnCount === 0) return null;

  return `A1:${numberToColumn(columnCount)}${rowCount}`;
}

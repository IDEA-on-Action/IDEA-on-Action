/**
 * ExcelJS 타입 정의
 *
 * ExcelJS 라이브러리 관련 타입 및 인터페이스
 *
 * @module lib/skills/excel/types
 */

import type { Workbook, Worksheet, Row, Cell, Column } from 'exceljs';

// ============================================================================
// Re-exports
// ============================================================================

export type { Workbook, Worksheet, Row, Cell, Column };

// ============================================================================
// 워크북 생성 옵션
// ============================================================================

/**
 * 워크북 생성 옵션
 */
export interface WorkbookOptions {
  /** 작성자 */
  creator?: string;
  /** 마지막 수정자 */
  lastModifiedBy?: string;
  /** 생성일 */
  created?: Date;
  /** 수정일 */
  modified?: Date;
}

// ============================================================================
// 시트 데이터 타입
// ============================================================================

/**
 * 시트 데이터 행
 */
export type SheetRow = (string | number | boolean | Date | null | undefined)[];

/**
 * 시트 데이터 (JSON 형식)
 */
export type SheetData = Record<string, unknown>[];

/**
 * 시트 생성 옵션
 */
export interface SheetOptions {
  /** 시트명 */
  name: string;
  /** 헤더 행 포함 여부 */
  includeHeader?: boolean;
  /** 컬럼 너비 설정 */
  columnWidths?: number[];
  /** 헤더 스타일 적용 여부 */
  styleHeader?: boolean;
}

// ============================================================================
// 컬럼 설정
// ============================================================================

/**
 * 컬럼 정의
 */
export interface ColumnDefinition {
  /** 컬럼 헤더 */
  header: string;
  /** 데이터 키 */
  key: string;
  /** 컬럼 너비 */
  width?: number;
  /** 숫자 포맷 */
  numFmt?: string;
  /** 정렬 */
  alignment?: {
    horizontal?: 'left' | 'center' | 'right';
    vertical?: 'top' | 'middle' | 'bottom';
    wrapText?: boolean;
  };
}

// ============================================================================
// 이미지 삽입 옵션
// ============================================================================

/**
 * 이미지 삽입 위치
 */
export interface ImagePosition {
  /** 시작 컬럼 (0-based) */
  col: number;
  /** 시작 행 (0-based) */
  row: number;
  /** 컬럼 오프셋 (EMUs) */
  colOff?: number;
  /** 행 오프셋 (EMUs) */
  rowOff?: number;
}

/**
 * 이미지 크기
 */
export interface ImageExtent {
  /** 너비 (픽셀) */
  width: number;
  /** 높이 (픽셀) */
  height: number;
}

/**
 * 이미지 삽입 옵션
 */
export interface ImageInsertOptions {
  /** 시작 위치 */
  tl: ImagePosition;
  /** 크기 */
  ext: ImageExtent;
  /** 편집 모드 */
  editAs?: 'oneCell' | 'twoCell' | 'absolute';
}

/**
 * 이미지 데이터
 */
export interface ImageData {
  /** Base64 인코딩된 이미지 */
  base64: string;
  /** 이미지 확장자 */
  extension: 'png' | 'jpeg' | 'gif';
}

// ============================================================================
// 파일 읽기/쓰기 옵션
// ============================================================================

/**
 * Excel 파일 읽기 옵션
 */
export interface ReadOptions {
  /** 읽을 시트 이름 (기본값: 첫 번째 시트) */
  sheetName?: string;
  /** 헤더 행 번호 (0-based, 기본값: 0) */
  headerRow?: number;
  /** 데이터 시작 행 번호 (0-based, 기본값: 1) */
  dataStartRow?: number;
}

/**
 * Excel 파일 쓰기 옵션
 */
export interface WriteOptions {
  /** 파일명 */
  filename?: string;
  /** 파일 형식 */
  type?: 'xlsx' | 'csv';
  /** 압축 사용 여부 */
  useSharedStrings?: boolean;
  /** 날짜 형식 */
  dateFormat?: string;
}

// ============================================================================
// 변환 결과 타입
// ============================================================================

/**
 * JSON → 시트 변환 결과
 */
export interface JsonToSheetResult {
  /** 워크시트 */
  worksheet: Worksheet;
  /** 총 행 수 */
  rowCount: number;
  /** 총 컬럼 수 */
  columnCount: number;
}

/**
 * 시트 → JSON 변환 결과
 */
export interface SheetToJsonResult<T = Record<string, unknown>> {
  /** 변환된 데이터 */
  data: T[];
  /** 헤더 */
  headers: string[];
  /** 총 행 수 */
  rowCount: number;
}

// ============================================================================
// 스타일 타입
// ============================================================================

/**
 * 셀 스타일
 */
export interface CellStyle {
  /** 폰트 */
  font?: {
    name?: string;
    size?: number;
    bold?: boolean;
    italic?: boolean;
    color?: { argb: string };
  };
  /** 채우기 */
  fill?: {
    type: 'pattern';
    pattern: 'solid';
    fgColor: { argb: string };
  };
  /** 테두리 */
  border?: {
    top?: { style: 'thin' | 'medium' | 'thick' };
    bottom?: { style: 'thin' | 'medium' | 'thick' };
    left?: { style: 'thin' | 'medium' | 'thick' };
    right?: { style: 'thin' | 'medium' | 'thick' };
  };
  /** 정렬 */
  alignment?: {
    horizontal?: 'left' | 'center' | 'right';
    vertical?: 'top' | 'middle' | 'bottom';
    wrapText?: boolean;
  };
  /** 숫자 형식 */
  numFmt?: string;
}

// ============================================================================
// 에러 타입
// ============================================================================

/**
 * ExcelJS 에러
 */
export class ExcelError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'ExcelError';
  }
}

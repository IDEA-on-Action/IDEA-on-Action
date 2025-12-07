/**
 * xlsx Import 유틸리티
 *
 * Excel 파일 파싱, 검증, 매핑, DB 삽입 기능
 *
 * @module lib/skills/xlsx/import
 */

import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import type {
  ImportConfig,
  ImportResult,
  ImportError,
  ImportProgress,
  ParsedExcelData,
  ValidationResult,
  ImportWarning,
  ValidationRule,
  ColumnMapping,
  BatchResult,
  BatchImportOptions,
} from '@/types/xlsx-import.types';

// ============================================================================
// 파일 파싱
// ============================================================================

/**
 * Excel 파일 파싱
 *
 * @param file - Excel 파일 객체
 * @param sheetName - 시트명 (선택사항, 기본값: 첫 번째 시트)
 * @param headerRow - 헤더 행 번호 (0-based, 기본값: 0)
 * @param dataStartRow - 데이터 시작 행 번호 (0-based, 기본값: 1)
 * @returns 파싱된 Excel 데이터
 */
export async function parseExcelFile(
  file: File,
  sheetName?: string,
  headerRow = 0,
  dataStartRow = 1
): Promise<ParsedExcelData> {
  const startTime = performance.now();

  // 파일 읽기
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, {
    type: 'array',
    cellDates: true,
    cellNF: true,
    cellText: false,
  });

  // 시트 선택
  const targetSheetName = sheetName || workbook.SheetNames[0];
  const worksheet = workbook.Sheets[targetSheetName];

  if (!worksheet) {
    throw new Error(`시트를 찾을 수 없습니다: ${targetSheetName}`);
  }

  // 시트를 JSON으로 변환
  const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    header: 1,
    raw: false,
    dateNF: 'yyyy-mm-dd',
  }) as unknown[][];

  if (rawData.length === 0) {
    throw new Error('빈 시트입니다.');
  }

  // 헤더 추출
  const headers = (rawData[headerRow] as string[]) || [];
  if (headers.length === 0) {
    throw new Error('헤더를 찾을 수 없습니다.');
  }

  // 데이터 행 추출 및 객체로 변환
  const dataRows = rawData.slice(dataStartRow);
  const rows: Record<string, unknown>[] = dataRows
    .map((row) => {
      const rowObj: Record<string, unknown> = {};
      headers.forEach((header, index) => {
        if (header) {
          rowObj[header] = (row as unknown[])[index] ?? null;
        }
      });
      return rowObj;
    })
    .filter((row) => {
      // 모든 값이 null/undefined/빈 문자열인 행 제거
      return Object.values(row).some((value) => {
        if (value === null || value === undefined) return false;
        if (typeof value === 'string' && value.trim() === '') return false;
        return true;
      });
    });

  const parseTime = performance.now() - startTime;

  return {
    sheetName: targetSheetName,
    headers,
    rows,
    totalRows: rawData.length,
    metadata: {
      filename: file.name,
      fileSize: file.size,
      parseTime,
      availableSheets: workbook.SheetNames,
    },
  };
}

// ============================================================================
// 데이터 검증
// ============================================================================

/**
 * 데이터 검증
 *
 * @param data - 검증할 데이터 배열
 * @param rules - 검증 규칙 배열
 * @param columnMapping - 컬럼 매핑 정보 (필수 필드 체크용)
 * @returns 검증 결과
 */
export function validateData(
  data: Record<string, unknown>[],
  rules: ValidationRule[] = [],
  columnMapping: ColumnMapping[] = []
): ValidationResult {
  const errors: ImportError[] = [];
  const warnings: ImportWarning[] = [];
  let validRowCount = 0;
  let invalidRowCount = 0;

  // 필수 필드 매핑 생성
  const requiredFields = new Set(
    columnMapping
      .filter((mapping) => mapping.required)
      .map((mapping) => mapping.excelColumn)
  );

  data.forEach((row, index) => {
    const rowNumber = index + 2; // 1-based + 헤더 행
    let hasError = false;

    // 필수 필드 검증
    requiredFields.forEach((field) => {
      const value = row[field];
      if (value === null || value === undefined || value === '') {
        errors.push({
          row: rowNumber,
          column: field,
          message: `필수 필드가 비어있습니다: ${field}`,
          type: 'validation',
          value,
        });
        hasError = true;
      }
    });

    // 커스텀 규칙 검증
    rules.forEach((rule) => {
      const value = row[rule.field];

      switch (rule.type) {
        case 'required':
          if (value === null || value === undefined || value === '') {
            errors.push({
              row: rowNumber,
              column: rule.field,
              message: rule.message,
              type: 'validation',
              value,
            });
            hasError = true;
          }
          break;

        case 'format':
          if (rule.pattern && value !== null && value !== undefined) {
            const strValue = String(value);
            if (!rule.pattern.test(strValue)) {
              errors.push({
                row: rowNumber,
                column: rule.field,
                message: rule.message,
                type: 'validation',
                value,
              });
              hasError = true;
            }
          }
          break;

        case 'range':
          if (typeof value === 'number') {
            if (rule.min !== undefined && value < rule.min) {
              errors.push({
                row: rowNumber,
                column: rule.field,
                message: `${rule.message} (최소: ${rule.min})`,
                type: 'validation',
                value,
              });
              hasError = true;
            }
            if (rule.max !== undefined && value > rule.max) {
              errors.push({
                row: rowNumber,
                column: rule.field,
                message: `${rule.message} (최대: ${rule.max})`,
                type: 'validation',
                value,
              });
              hasError = true;
            }
          }
          break;

        case 'custom':
          if (rule.validate && !rule.validate(value, row)) {
            errors.push({
              row: rowNumber,
              column: rule.field,
              message: rule.message,
              type: 'validation',
              value,
            });
            hasError = true;
          }
          break;
      }
    });

    if (hasError) {
      invalidRowCount++;
    } else {
      validRowCount++;
    }
  });

  return {
    isValid: errors.length === 0,
    validRowCount,
    invalidRowCount,
    errors,
    warnings,
  };
}

// ============================================================================
// 컬럼 매핑
// ============================================================================

/**
 * Excel 컬럼을 DB 필드로 매핑
 *
 * @param data - 원본 데이터 배열
 * @param mapping - 컬럼 매핑 설정
 * @returns 변환된 데이터 배열
 */
export function mapColumns(
  data: Record<string, unknown>[],
  mapping: ColumnMapping[]
): Record<string, unknown>[] {
  return data.map((row) => {
    const mappedRow: Record<string, unknown> = {};

    mapping.forEach((map) => {
      let value = row[map.excelColumn];

      // 기본값 적용
      if ((value === null || value === undefined || value === '') && map.defaultValue !== undefined) {
        value = map.defaultValue;
      }

      // 타입 변환
      if (value !== null && value !== undefined && value !== '') {
        switch (map.type) {
          case 'number':
            value = Number(value);
            if (isNaN(value as number)) {
              value = null;
            }
            break;

          case 'boolean':
            if (typeof value === 'string') {
              const lowerValue = value.toLowerCase();
              value = lowerValue === 'true' || lowerValue === '1' || lowerValue === 'yes';
            } else {
              value = Boolean(value);
            }
            break;

          case 'date':
            if (!(value instanceof Date)) {
              const dateValue = new Date(String(value));
              value = isNaN(dateValue.getTime()) ? null : dateValue.toISOString();
            } else {
              value = value.toISOString();
            }
            break;

          case 'json':
            if (typeof value === 'string') {
              try {
                value = JSON.parse(value);
              } catch {
                value = null;
              }
            }
            break;

          case 'string':
          default:
            value = String(value);
            break;
        }
      }

      // 커스텀 변환 함수 적용
      if (map.transform && value !== null && value !== undefined) {
        value = map.transform(value);
      }

      mappedRow[map.dbField] = value;
    });

    return mappedRow;
  });
}

// ============================================================================
// Supabase 삽입
// ============================================================================

/**
 * Supabase 테이블에 데이터 삽입
 *
 * @param tableName - 테이블명
 * @param data - 삽입할 데이터 배열
 * @returns 삽입 결과
 */
export async function importToSupabase(
  tableName: string,
  data: Record<string, unknown>[]
): Promise<{ success: boolean; insertedIds: string[]; error?: Error }> {
  try {
    const { data: insertedData, error } = await supabase
      .from(tableName)
      .insert(data)
      .select('id');

    if (error) {
      throw new Error(`DB 삽입 실패: ${error.message}`);
    }

    const insertedIds = (insertedData || []).map((item: { id: string }) => item.id);

    return {
      success: true,
      insertedIds,
    };
  } catch (error) {
    return {
      success: false,
      insertedIds: [],
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

// ============================================================================
// 배치 처리
// ============================================================================

/**
 * 배치 단위로 데이터 삽입
 *
 * @param options - 배치 삽입 옵션
 * @returns 전체 삽입 결과
 */
export async function batchImport(
  options: BatchImportOptions
): Promise<ImportResult> {
  const {
    tableName,
    data,
    batchSize = 100,
    onProgress,
    stopOnError = false,
  } = options;

  const startedAt = new Date();
  const totalRows = data.length;
  const totalBatches = Math.ceil(totalRows / batchSize);

  let successCount = 0;
  let failureCount = 0;
  const errors: ImportError[] = [];
  const importedIds: string[] = [];

  for (let i = 0; i < totalBatches; i++) {
    const start = i * batchSize;
    const end = Math.min(start + batchSize, totalRows);
    const batch = data.slice(start, end);

    // 진행 상태 업데이트
    if (onProgress) {
      const processedRows = start;
      const percentage = Math.round((processedRows / totalRows) * 100);
      onProgress({
        stage: 'importing',
        processedRows,
        totalRows,
        percentage,
        currentBatch: i + 1,
        totalBatches,
      });
    }

    try {
      const result = await importToSupabase(tableName, batch);

      if (result.success) {
        successCount += batch.length;
        importedIds.push(...result.insertedIds);
      } else {
        failureCount += batch.length;

        // 배치 단위 에러 기록
        batch.forEach((_, index) => {
          errors.push({
            row: start + index + 2, // 1-based + 헤더
            message: result.error?.message || '알 수 없는 에러',
            type: 'database',
          });
        });

        if (stopOnError) {
          break;
        }
      }
    } catch (error) {
      failureCount += batch.length;

      // 배치 단위 에러 기록
      batch.forEach((_, index) => {
        errors.push({
          row: start + index + 2,
          message: error instanceof Error ? error.message : String(error),
          type: 'database',
        });
      });

      if (stopOnError) {
        break;
      }
    }
  }

  const completedAt = new Date();
  const durationMs = completedAt.getTime() - startedAt.getTime();

  // 최종 진행 상태 업데이트
  if (onProgress) {
    onProgress({
      stage: errors.length > 0 ? 'error' : 'completed',
      processedRows: totalRows,
      totalRows,
      percentage: 100,
      currentBatch: totalBatches,
      totalBatches,
    });
  }

  return {
    successCount,
    failureCount,
    skippedCount: 0,
    totalCount: totalRows,
    errors,
    importedIds,
    startedAt,
    completedAt,
    durationMs,
  };
}

// ============================================================================
// 통합 가져오기 함수
// ============================================================================

/**
 * Excel 파일을 파싱하고 검증 후 DB에 삽입
 *
 * @param file - Excel 파일
 * @param tableName - 대상 테이블명
 * @param config - 가져오기 설정
 * @param onProgress - 진행 상태 콜백
 * @returns 가져오기 결과
 */
export async function importExcelToDatabase(
  file: File,
  tableName: string,
  config: ImportConfig,
  onProgress?: (progress: ImportProgress) => void
): Promise<ImportResult> {
  const startedAt = new Date();

  try {
    // 1. 파일 파싱
    if (onProgress) {
      onProgress({
        stage: 'parsing',
        processedRows: 0,
        totalRows: 0,
        percentage: 0,
      });
    }

    const parsedData = await parseExcelFile(
      file,
      config.sheetName,
      config.headerRow,
      config.dataStartRow
    );

    // 2. 데이터 검증
    if (onProgress) {
      onProgress({
        stage: 'validating',
        processedRows: 0,
        totalRows: parsedData.rows.length,
        percentage: 10,
      });
    }

    const validationResult = validateData(
      parsedData.rows,
      config.validationRules,
      config.columnMapping
    );

    if (!validationResult.isValid) {
      const completedAt = new Date();
      return {
        successCount: 0,
        failureCount: validationResult.invalidRowCount,
        skippedCount: 0,
        totalCount: parsedData.rows.length,
        errors: validationResult.errors,
        importedIds: [],
        startedAt,
        completedAt,
        durationMs: completedAt.getTime() - startedAt.getTime(),
      };
    }

    // 3. 컬럼 매핑
    if (onProgress) {
      onProgress({
        stage: 'mapping',
        processedRows: 0,
        totalRows: parsedData.rows.length,
        percentage: 20,
      });
    }

    const mappedData = mapColumns(parsedData.rows, config.columnMapping);

    // 4. 배치 삽입
    const batchResult = await batchImport({
      tableName,
      data: mappedData,
      batchSize: config.batchSize || 100,
      onProgress: (progress) => {
        if (onProgress) {
          onProgress({
            ...progress,
            percentage: 20 + Math.round((progress.percentage / 100) * 80),
          });
        }
      },
      stopOnError: false,
    });

    return batchResult;
  } catch (error) {
    const completedAt = new Date();
    return {
      successCount: 0,
      failureCount: 0,
      skippedCount: 0,
      totalCount: 0,
      errors: [
        {
          row: 0,
          message: error instanceof Error ? error.message : String(error),
          type: 'parsing',
        },
      ],
      importedIds: [],
      startedAt,
      completedAt,
      durationMs: completedAt.getTime() - startedAt.getTime(),
    };
  }
}

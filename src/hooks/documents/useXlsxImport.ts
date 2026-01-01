/**
 * xlsx Import Hook
 *
 * Excel 파일 가져오기를 위한 React Hook
 *
 * @module hooks/useXlsxImport
 */

import { useState, useCallback } from 'react';
import {
  parseExcelFile,
  validateData,
  mapColumns,
  importExcelToDatabase,
} from '@/lib/skills/xlsx/import';
import type {
  ImportConfig,
  ImportResult,
  ImportProgress,
  ImportError,
  ParsedExcelData,
  ValidationResult,
  ImportPreview,
  PreviewColumn,
  ColumnMapping,
} from '@/types/documents/xlsx-import.types';

// ============================================================================
// Hook 인터페이스
// ============================================================================

/**
 * useXlsxImport Hook 반환 타입
 */
export interface UseXlsxImportResult {
  /** 파일 업로드 및 파싱 */
  uploadFile: (file: File, config?: Partial<ImportConfig>) => Promise<void>;
  /** 미리보기 데이터 */
  previewData: ImportPreview | null;
  /** 파싱된 원본 데이터 */
  parsedData: ParsedExcelData | null;
  /** 컬럼 매핑 설정 */
  setColumnMapping: (mapping: ColumnMapping[]) => void;
  /** 현재 컬럼 매핑 */
  columnMapping: ColumnMapping[];
  /** 데이터 검증 실행 */
  validate: () => ValidationResult | null;
  /** 검증 결과 */
  validationResult: ValidationResult | null;
  /** 가져오기 실행 */
  executeImport: (tableName: string, config?: Partial<ImportConfig>) => Promise<ImportResult>;
  /** 진행 상태 */
  progress: ImportProgress;
  /** 가져오기 결과 */
  importResult: ImportResult | null;
  /** 로딩 상태 */
  isLoading: boolean;
  /** 에러 */
  error: ImportError | null;
  /** 상태 초기화 */
  reset: () => void;
}

/**
 * Hook 옵션
 */
export interface UseXlsxImportOptions {
  /** 기본 배치 크기 */
  defaultBatchSize?: number;
  /** 진행 상태 콜백 */
  onProgress?: (progress: ImportProgress) => void;
  /** 에러 콜백 */
  onError?: (error: ImportError) => void;
  /** 완료 콜백 */
  onComplete?: (result: ImportResult) => void;
}

// ============================================================================
// Hook 구현
// ============================================================================

/**
 * Excel 파일 가져오기 Hook
 *
 * @param options - Hook 옵션
 * @returns Hook 결과
 *
 * @example
 * ```tsx
 * const {
 *   uploadFile,
 *   previewData,
 *   setColumnMapping,
 *   executeImport,
 *   progress,
 * } = useXlsxImport({
 *   onComplete: (result) => {
 *     toast.success(`${result.successCount}개 행 가져오기 완료`);
 *   },
 * });
 *
 * // 1. 파일 업로드
 * await uploadFile(file);
 *
 * // 2. 컬럼 매핑 설정
 * setColumnMapping([
 *   { excelColumn: '이름', dbField: 'name', type: 'string', required: true },
 *   { excelColumn: '나이', dbField: 'age', type: 'number' },
 * ]);
 *
 * // 3. 가져오기 실행
 * await executeImport('users');
 * ```
 */
export function useXlsxImport(options: UseXlsxImportOptions = {}): UseXlsxImportResult {
  const {
    defaultBatchSize = 100,
    onProgress,
    onError,
    onComplete,
  } = options;

  // ============================================================================
  // 상태 관리
  // ============================================================================

  const [parsedData, setParsedData] = useState<ParsedExcelData | null>(null);
  const [previewData, setPreviewData] = useState<ImportPreview | null>(null);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping[]>([]);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [progress, setProgress] = useState<ImportProgress>({
    stage: 'idle',
    processedRows: 0,
    totalRows: 0,
    percentage: 0,
  });
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ImportError | null>(null);

  // ============================================================================
  // 파일 업로드 및 파싱
  // ============================================================================

  const uploadFile = useCallback(
    async (file: File, config: Partial<ImportConfig> = {}) => {
      setIsLoading(true);
      setError(null);
      setProgress({
        stage: 'parsing',
        processedRows: 0,
        totalRows: 0,
        percentage: 0,
      });

      try {
        // 파일 파싱
        const parsed = await parseExcelFile(
          file,
          config.sheetName,
          config.headerRow,
          config.dataStartRow
        );

        setParsedData(parsed);

        // 미리보기 데이터 생성
        const preview = generatePreview(parsed);
        setPreviewData(preview);

        // 자동 컬럼 매핑 생성 (DB 필드명은 빈 값)
        const autoMapping: ColumnMapping[] = parsed.headers.map((header) => ({
          excelColumn: header,
          dbField: header.toLowerCase().replace(/\s+/g, '_'), // 기본 변환
          type: inferColumnType(parsed.rows, header),
          required: false,
        }));
        setColumnMapping(autoMapping);

        setProgress({
          stage: 'idle',
          processedRows: 0,
          totalRows: parsed.rows.length,
          percentage: 100,
        });
      } catch (err) {
        const importError: ImportError = {
          row: 0,
          message: err instanceof Error ? err.message : String(err),
          type: 'parsing',
        };
        setError(importError);
        if (onError) {
          onError(importError);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [onError]
  );

  // ============================================================================
  // 데이터 검증
  // ============================================================================

  const validate = useCallback((): ValidationResult | null => {
    if (!parsedData) {
      return null;
    }

    setProgress({
      stage: 'validating',
      processedRows: 0,
      totalRows: parsedData.rows.length,
      percentage: 0,
    });

    const result = validateData(
      parsedData.rows,
      [],
      columnMapping
    );

    setValidationResult(result);

    setProgress({
      stage: 'idle',
      processedRows: parsedData.rows.length,
      totalRows: parsedData.rows.length,
      percentage: 100,
    });

    return result;
  }, [parsedData, columnMapping]);

  // ============================================================================
  // 가져오기 실행
  // ============================================================================

  const executeImport = useCallback(
    async (
      tableName: string,
      config: Partial<ImportConfig> = {}
    ): Promise<ImportResult> => {
      if (!parsedData) {
        throw new Error('파일을 먼저 업로드해주세요.');
      }

      if (columnMapping.length === 0) {
        throw new Error('컬럼 매핑을 설정해주세요.');
      }

      setIsLoading(true);
      setError(null);

      try {
        // 가져오기 설정 생성
        const importConfig: ImportConfig = {
          sheetName: config.sheetName || parsedData.sheetName,
          headerRow: config.headerRow ?? 0,
          dataStartRow: config.dataStartRow ?? 1,
          columnMapping,
          validationRules: config.validationRules || [],
          batchSize: config.batchSize || defaultBatchSize,
          duplicateHandling: config.duplicateHandling || 'skip',
          skipEmptyRows: config.skipEmptyRows ?? true,
        };

        // 진행 상태 핸들러
        const handleProgress = (p: ImportProgress) => {
          setProgress(p);
          if (onProgress) {
            onProgress(p);
          }
        };

        // 가져오기 실행
        const result = await importExcelToDatabase(
          new File([await parsedData.metadata.filename], parsedData.metadata.filename),
          tableName,
          importConfig,
          handleProgress
        );

        setImportResult(result);

        // 에러가 있는 경우
        if (result.errors.length > 0 && onError) {
          onError(result.errors[0]);
        }

        // 완료 콜백
        if (onComplete) {
          onComplete(result);
        }

        return result;
      } catch (err) {
        const importError: ImportError = {
          row: 0,
          message: err instanceof Error ? err.message : String(err),
          type: 'database',
        };
        setError(importError);
        if (onError) {
          onError(importError);
        }
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [parsedData, columnMapping, defaultBatchSize, onProgress, onError, onComplete]
  );

  // ============================================================================
  // 상태 초기화
  // ============================================================================

  const reset = useCallback(() => {
    setParsedData(null);
    setPreviewData(null);
    setColumnMapping([]);
    setValidationResult(null);
    setProgress({
      stage: 'idle',
      processedRows: 0,
      totalRows: 0,
      percentage: 0,
    });
    setImportResult(null);
    setIsLoading(false);
    setError(null);
  }, []);

  // ============================================================================
  // 반환
  // ============================================================================

  return {
    uploadFile,
    previewData,
    parsedData,
    setColumnMapping,
    columnMapping,
    validate,
    validationResult,
    executeImport,
    progress,
    importResult,
    isLoading,
    error,
    reset,
  };
}

// ============================================================================
// 유틸리티 함수
// ============================================================================

/**
 * 미리보기 데이터 생성
 */
function generatePreview(parsed: ParsedExcelData): ImportPreview {
  const sampleRows = parsed.rows.slice(0, 10);

  const columns: PreviewColumn[] = parsed.headers.map((header) => {
    const columnValues = parsed.rows.map((row) => row[header]);
    const sampleValues = columnValues.slice(0, 3);
    const emptyCount = columnValues.filter(
      (v) => v === null || v === undefined || v === ''
    ).length;
    const uniqueCount = new Set(columnValues).size;

    return {
      excelColumn: header,
      dbField: null,
      inferredType: inferColumnType(parsed.rows, header),
      sampleValues,
      emptyCount,
      uniqueCount,
    };
  });

  // 예상 가져오기 시간 계산 (행당 10ms 기준)
  const estimatedImportTime = parsed.rows.length * 10;

  return {
    sampleRows,
    columns,
    totalRows: parsed.rows.length,
    estimatedImportTime,
  };
}

/**
 * 컬럼 데이터 타입 추론
 */
function inferColumnType(
  rows: Record<string, unknown>[],
  columnName: string
): 'string' | 'number' | 'boolean' | 'date' | 'mixed' {
  const values = rows
    .map((row) => row[columnName])
    .filter((v) => v !== null && v !== undefined && v !== '');

  if (values.length === 0) {
    return 'string';
  }

  const types = new Set(values.map((v) => typeof v));

  if (types.size > 1) {
    return 'mixed';
  }

  const firstValue = values[0];

  if (typeof firstValue === 'number') {
    return 'number';
  }

  if (typeof firstValue === 'boolean') {
    return 'boolean';
  }

  if (firstValue instanceof Date) {
    return 'date';
  }

  // 문자열인 경우 날짜 형식 확인
  if (typeof firstValue === 'string') {
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (datePattern.test(firstValue)) {
      return 'date';
    }
  }

  return 'string';
}

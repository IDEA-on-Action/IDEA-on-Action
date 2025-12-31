/**
 * xlsx Import 타입 정의
 *
 * Excel 파일을 읽어 데이터베이스로 가져오는 기능을 위한 타입
 *
 * @module types/xlsx-import
 */

// ============================================================================
// Import 설정 타입
// ============================================================================

/**
 * 가져오기 설정
 */
export interface ImportConfig {
  /** 시트명 (기본값: 첫 번째 시트) */
  sheetName?: string;
  /** 헤더가 있는 행 번호 (0-based, 기본값: 0) */
  headerRow?: number;
  /** 데이터 시작 행 번호 (0-based, 기본값: 1) */
  dataStartRow?: number;
  /** 컬럼 매핑 설정 */
  columnMapping: ColumnMapping[];
  /** 검증 규칙 */
  validationRules?: ValidationRule[];
  /** 배치 크기 (기본값: 100) */
  batchSize?: number;
  /** 중복 데이터 처리 방식 (기본값: 'skip') */
  duplicateHandling?: 'skip' | 'overwrite' | 'error';
  /** 빈 행 건너뛰기 (기본값: true) */
  skipEmptyRows?: boolean;
}

/**
 * 컬럼 매핑
 *
 * Excel 열을 DB 필드로 매핑
 */
export interface ColumnMapping {
  /** Excel 열 이름 (헤더 텍스트) */
  excelColumn: string;
  /** DB 테이블 필드명 */
  dbField: string;
  /** 데이터 타입 */
  type: 'string' | 'number' | 'boolean' | 'date' | 'json';
  /** 필수 여부 (기본값: false) */
  required?: boolean;
  /** 기본값 (필드가 비어있을 때 사용) */
  defaultValue?: unknown;
  /** 변환 함수 */
  transform?: (value: unknown) => unknown;
}

/**
 * 검증 규칙
 */
export interface ValidationRule {
  /** 대상 필드명 */
  field: string;
  /** 검증 타입 */
  type: 'required' | 'format' | 'range' | 'custom';
  /** 에러 메시지 */
  message: string;
  /** 검증 함수 (custom 타입인 경우) */
  validate?: (value: unknown, row: Record<string, unknown>) => boolean;
  /** 최소값 (range 타입인 경우) */
  min?: number;
  /** 최대값 (range 타입인 경우) */
  max?: number;
  /** 정규식 패턴 (format 타입인 경우) */
  pattern?: RegExp;
}

// ============================================================================
// Import 결과 타입
// ============================================================================

/**
 * 가져오기 결과
 */
export interface ImportResult {
  /** 성공한 행 수 */
  successCount: number;
  /** 실패한 행 수 */
  failureCount: number;
  /** 건너뛴 행 수 (중복 등) */
  skippedCount: number;
  /** 총 처리된 행 수 */
  totalCount: number;
  /** 에러 목록 */
  errors: ImportError[];
  /** 가져온 데이터 ID 목록 */
  importedIds?: string[];
  /** 처리 시작 시간 */
  startedAt: Date;
  /** 처리 완료 시간 */
  completedAt: Date;
  /** 처리 시간 (밀리초) */
  durationMs: number;
}

/**
 * 가져오기 에러
 */
export interface ImportError {
  /** 행 번호 (1-based) */
  row: number;
  /** 열 이름 */
  column?: string;
  /** 에러 메시지 */
  message: string;
  /** 에러 타입 */
  type: 'validation' | 'parsing' | 'database' | 'duplicate';
  /** 원본 값 */
  value?: unknown;
  /** 추가 상세 정보 */
  details?: Record<string, unknown>;
}

// ============================================================================
// Import 진행 상태 타입
// ============================================================================

/**
 * 가져오기 진행 상태
 */
export interface ImportProgress {
  /** 현재 단계 */
  stage: ImportStage;
  /** 처리된 행 수 */
  processedRows: number;
  /** 총 행 수 */
  totalRows: number;
  /** 진행률 (0-100) */
  percentage: number;
  /** 현재 배치 번호 */
  currentBatch?: number;
  /** 총 배치 수 */
  totalBatches?: number;
  /** 예상 남은 시간 (밀리초) */
  estimatedTimeRemainingMs?: number;
}

/**
 * 가져오기 단계
 */
export type ImportStage =
  | 'idle'           // 대기 중
  | 'parsing'        // 파일 파싱 중
  | 'validating'     // 데이터 검증 중
  | 'mapping'        // 컬럼 매핑 중
  | 'importing'      // DB 삽입 중
  | 'completed'      // 완료
  | 'error';         // 에러

// ============================================================================
// Import 옵션 타입
// ============================================================================

/**
 * 가져오기 옵션
 */
export interface ImportOptions {
  /** 테이블명 */
  tableName: string;
  /** 파일 객체 */
  file: File;
  /** 가져오기 설정 */
  config: ImportConfig;
  /** 진행 상태 콜백 */
  onProgress?: (progress: ImportProgress) => void;
  /** 에러 콜백 */
  onError?: (error: ImportError) => void;
  /** 건조 실행 (실제 DB 삽입 없이 검증만) */
  dryRun?: boolean;
}

// ============================================================================
// 파싱 결과 타입
// ============================================================================

/**
 * Excel 파싱 결과
 */
export interface ParsedExcelData {
  /** 시트명 */
  sheetName: string;
  /** 헤더 행 */
  headers: string[];
  /** 데이터 행 */
  rows: Record<string, unknown>[];
  /** 총 행 수 (빈 행 포함) */
  totalRows: number;
  /** 파싱 메타데이터 */
  metadata: {
    /** 파일명 */
    filename: string;
    /** 파일 크기 (bytes) */
    fileSize: number;
    /** 파싱 시간 (밀리초) */
    parseTime: number;
    /** 시트 목록 */
    availableSheets: string[];
  };
}

// ============================================================================
// 검증 결과 타입
// ============================================================================

/**
 * 데이터 검증 결과
 */
export interface ValidationResult {
  /** 검증 통과 여부 */
  isValid: boolean;
  /** 유효한 행 수 */
  validRowCount: number;
  /** 무효한 행 수 */
  invalidRowCount: number;
  /** 검증 에러 목록 */
  errors: ImportError[];
  /** 경고 목록 */
  warnings: ImportWarning[];
}

/**
 * 가져오기 경고
 */
export interface ImportWarning {
  /** 행 번호 (1-based) */
  row: number;
  /** 열 이름 */
  column?: string;
  /** 경고 메시지 */
  message: string;
  /** 경고 타입 */
  type: 'format' | 'missing' | 'conversion';
}

// ============================================================================
// 미리보기 타입
// ============================================================================

/**
 * 가져오기 미리보기 데이터
 */
export interface ImportPreview {
  /** 샘플 데이터 (최대 10행) */
  sampleRows: Record<string, unknown>[];
  /** 컬럼 정보 */
  columns: PreviewColumn[];
  /** 총 행 수 */
  totalRows: number;
  /** 예상 가져오기 시간 (밀리초) */
  estimatedImportTime: number;
}

/**
 * 미리보기 컬럼 정보
 */
export interface PreviewColumn {
  /** Excel 열 이름 */
  excelColumn: string;
  /** 매핑된 DB 필드 (없으면 null) */
  dbField: string | null;
  /** 데이터 타입 */
  inferredType: 'string' | 'number' | 'boolean' | 'date' | 'mixed';
  /** 샘플 값 (최대 3개) */
  sampleValues: unknown[];
  /** 빈 값 개수 */
  emptyCount: number;
  /** 고유 값 개수 */
  uniqueCount: number;
}

// ============================================================================
// 배치 처리 타입
// ============================================================================

/**
 * 배치 처리 결과
 */
export interface BatchResult {
  /** 배치 번호 */
  batchNumber: number;
  /** 성공한 행 수 */
  successCount: number;
  /** 실패한 행 수 */
  failureCount: number;
  /** 에러 목록 */
  errors: ImportError[];
  /** 삽입된 ID 목록 */
  insertedIds: string[];
}

/**
 * 배치 처리 옵션
 */
export interface BatchImportOptions {
  /** 테이블명 */
  tableName: string;
  /** 데이터 배열 */
  data: Record<string, unknown>[];
  /** 배치 크기 (기본값: 100) */
  batchSize?: number;
  /** 진행 상태 콜백 */
  onProgress?: (progress: ImportProgress) => void;
  /** 에러 시 중단 여부 (기본값: false) */
  stopOnError?: boolean;
}

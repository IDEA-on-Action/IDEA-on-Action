/**
 * Document History 타입 정의
 *
 * 생성된 문서(xlsx, docx, pptx) 이력 관리를 위한 타입
 *
 * @module types/document-history
 */

// ============================================================================
// Database Types
// ============================================================================

/**
 * 생성된 문서 이력 (DB 레코드)
 */
export interface GeneratedDocument {
  id: string;
  user_id: string;
  template_id: string | null;
  file_name: string;
  file_type: 'xlsx' | 'docx' | 'pptx';
  file_size: number;
  storage_path: string | null;
  metadata: Record<string, unknown>;
  input_data: Record<string, unknown>;
  generated_at: string;
}

/**
 * 문서 생성 요청 (INSERT 용)
 */
export interface CreateGeneratedDocument {
  user_id: string;
  template_id?: string | null;
  file_name: string;
  file_type: 'xlsx' | 'docx' | 'pptx';
  file_size: number;
  storage_path?: string | null;
  metadata?: Record<string, unknown>;
  input_data?: Record<string, unknown>;
}

/**
 * 문서 통계
 */
export interface DocumentStats {
  file_type: 'xlsx' | 'docx' | 'pptx';
  count: number;
  total_size: number;
  latest_generated_at: string | null;
}

// ============================================================================
// Hook Types
// ============================================================================

/**
 * useDocumentHistory 훅 반환 타입
 */
export interface UseDocumentHistoryResult {
  /** 문서 목록 */
  documents: GeneratedDocument[];
  /** 로딩 상태 */
  isLoading: boolean;
  /** 에러 정보 */
  error: Error | null;
  /** 문서 저장 */
  saveDocument: (doc: CreateGeneratedDocument) => Promise<GeneratedDocument>;
  /** 문서 삭제 */
  deleteDocument: (id: string) => Promise<void>;
  /** 데이터 새로고침 */
  refetch: () => void;
}

/**
 * useDocumentHistory 옵션
 */
export interface UseDocumentHistoryOptions {
  /** 파일 유형 필터 */
  fileType?: 'xlsx' | 'docx' | 'pptx';
  /** 정렬 순서 (기본: 최신순) */
  orderBy?: 'asc' | 'desc';
  /** 페이지당 개수 */
  limit?: number;
}

/**
 * useDocumentStats 훅 반환 타입
 */
export interface UseDocumentStatsResult {
  /** 파일 유형별 통계 */
  stats: DocumentStats[];
  /** 로딩 상태 */
  isLoading: boolean;
  /** 에러 정보 */
  error: Error | null;
  /** 데이터 새로고침 */
  refetch: () => void;
}

// ============================================================================
// UI Component Types
// ============================================================================

/**
 * DocumentHistoryList 컴포넌트 Props
 */
export interface DocumentHistoryListProps {
  /** 파일 유형 필터 (선택) */
  fileType?: 'xlsx' | 'docx' | 'pptx';
  /** 클래스명 (선택) */
  className?: string;
  /** 재다운로드 핸들러 (선택) */
  onRedownload?: (doc: GeneratedDocument) => void;
  /** 빈 상태 메시지 (선택) */
  emptyMessage?: string;
}

/**
 * DocumentHistoryRow Props
 */
export interface DocumentHistoryRowProps {
  /** 문서 데이터 */
  document: GeneratedDocument;
  /** 삭제 핸들러 */
  onDelete: (id: string) => void;
  /** 재다운로드 핸들러 (선택) */
  onRedownload?: (doc: GeneratedDocument) => void;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * 파일 유형별 아이콘 맵
 */
export type FileTypeIconMap = {
  [K in 'xlsx' | 'docx' | 'pptx']: string;
};

/**
 * 파일 크기 포맷 옵션
 */
export interface FormatFileSizeOptions {
  /** 소수점 자릿수 (기본: 2) */
  decimals?: number;
  /** 단위 (기본: auto) */
  unit?: 'B' | 'KB' | 'MB' | 'GB' | 'auto';
}

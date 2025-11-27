/**
 * Template Version 타입 정의
 *
 * 문서 템플릿 버전 관리를 위한 타입
 *
 * @module types/template-version
 */

// ============================================================================
// Database Types
// ============================================================================

/**
 * 템플릿 버전 (DB 레코드)
 */
export interface TemplateVersion {
  id: string;
  template_id: string;
  version: number;
  content: Record<string, unknown>;
  change_summary: string | null;
  created_by: string | null;
  created_at: string;
}

/**
 * 템플릿 버전 조회 결과 (생성자 정보 포함)
 */
export interface TemplateVersionWithCreator extends TemplateVersion {
  creator_email: string | null;
}

/**
 * 템플릿 버전 통계
 */
export interface TemplateVersionStats {
  template_id: string;
  total_versions: number;
  current_version: number;
  first_version_date: string;
  last_version_date: string;
  unique_contributors: number;
}

/**
 * 템플릿 버전 생성 요청 (INSERT 용)
 */
export interface CreateTemplateVersion {
  template_id: string;
  version: number;
  content: Record<string, unknown>;
  change_summary?: string;
  created_by?: string;
}

// ============================================================================
// Comparison Types
// ============================================================================

/**
 * 버전 간 차이점
 */
export interface VersionDiff {
  /** 추가된 항목 (키 경로) */
  added: string[];
  /** 삭제된 항목 (키 경로) */
  removed: string[];
  /** 변경된 항목 (키 경로) */
  changed: string[];
}

/**
 * 버전 비교 결과
 */
export interface VersionComparison {
  /** 이전 버전 */
  oldVersion: TemplateVersion;
  /** 새 버전 */
  newVersion: TemplateVersion;
  /** 차이점 */
  diff: VersionDiff;
  /** 변경 비율 (0~1) */
  changeRate: number;
}

// ============================================================================
// Hook Types
// ============================================================================

/**
 * useTemplateVersions 훅 반환 타입
 */
export interface UseTemplateVersionsResult {
  /** 버전 목록 */
  versions: TemplateVersionWithCreator[];
  /** 로딩 상태 */
  isLoading: boolean;
  /** 에러 정보 */
  error: Error | null;
  /** 특정 버전으로 복원 */
  restoreVersion: (versionId: string) => Promise<void>;
  /** 버전 간 비교 */
  compareVersions: (v1Id: string, v2Id: string) => VersionComparison | null;
  /** 버전 통계 조회 */
  stats: TemplateVersionStats | null;
  /** 데이터 새로고침 */
  refetch: () => void;
}

/**
 * useTemplateVersions 훅 옵션
 */
export interface UseTemplateVersionsOptions {
  /** 템플릿 ID */
  templateId: string;
  /** 자동으로 통계도 조회할지 여부 (기본: true) */
  includeStats?: boolean;
}

// ============================================================================
// UI Component Types
// ============================================================================

/**
 * TemplateVersionHistory 컴포넌트 Props
 */
export interface TemplateVersionHistoryProps {
  /** 템플릿 ID */
  templateId: string;
  /** 클래스명 (선택) */
  className?: string;
  /** 버전 선택 핸들러 (선택) */
  onVersionSelect?: (version: TemplateVersionWithCreator) => void;
  /** 복원 완료 핸들러 (선택) */
  onRestoreComplete?: (version: TemplateVersionWithCreator) => void;
  /** 최대 표시 개수 (기본: 10) */
  maxItems?: number;
}

/**
 * VersionComparisonModal Props
 */
export interface VersionComparisonModalProps {
  /** 템플릿 ID */
  templateId: string;
  /** 비교할 버전 1 ID */
  version1Id: string;
  /** 비교할 버전 2 ID */
  version2Id: string;
  /** 열림 상태 */
  isOpen: boolean;
  /** 닫기 핸들러 */
  onClose: () => void;
}

/**
 * VersionListItem Props
 */
export interface VersionListItemProps {
  /** 버전 데이터 */
  version: TemplateVersionWithCreator;
  /** 현재 버전 여부 */
  isCurrent: boolean;
  /** 선택 핸들러 */
  onSelect: (version: TemplateVersionWithCreator) => void;
  /** 복원 핸들러 */
  onRestore: (versionId: string) => void;
  /** 비교 핸들러 */
  onCompare?: (versionId: string) => void;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * 변경 타입
 */
export type ChangeType = 'added' | 'removed' | 'changed';

/**
 * 변경 항목
 */
export interface ChangeItem {
  /** 변경 타입 */
  type: ChangeType;
  /** 키 경로 (예: 'sections.0.title') */
  path: string;
  /** 이전 값 (삭제/변경 시) */
  oldValue?: unknown;
  /** 새 값 (추가/변경 시) */
  newValue?: unknown;
}

/**
 * 복원 확인 데이터
 */
export interface RestoreConfirmationData {
  /** 복원할 버전 */
  version: TemplateVersionWithCreator;
  /** 현재 버전과의 차이점 */
  diff: VersionDiff;
  /** 복원 시 손실될 변경사항 개수 */
  lossCount: number;
}

// ============================================================================
// API Response Types
// ============================================================================

/**
 * 버전 복원 API 응답
 */
export interface RestoreVersionResponse {
  id: string;
  name: string;
  current_version: number;
  updated_at: string;
}

/**
 * 버전 목록 조회 API 응답
 */
export type GetTemplateVersionsResponse = TemplateVersionWithCreator[];

/**
 * 버전 통계 조회 API 응답
 */
export type GetTemplateVersionStatsResponse = TemplateVersionStats;

// ============================================================================
// Constants
// ============================================================================

/**
 * 변경 타입별 색상 맵
 */
export const CHANGE_TYPE_COLOR_MAP: Record<ChangeType, string> = {
  added: 'text-green-600',
  removed: 'text-red-600',
  changed: 'text-yellow-600',
};

/**
 * 변경 타입별 라벨 맵
 */
export const CHANGE_TYPE_LABEL_MAP: Record<ChangeType, string> = {
  added: '추가됨',
  removed: '삭제됨',
  changed: '변경됨',
};

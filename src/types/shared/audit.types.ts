/**
 * Audit Log Types - v2.36.0
 * 운영 모니터링 및 감사 추적 시스템 타입 정의
 */

// ============================================================================
// Actor Types
// ============================================================================

/** 액터(행위자) 타입 */
export type ActorType = 'user' | 'system' | 'service' | 'admin';

// ============================================================================
// Action Types
// ============================================================================

/** 수행 가능한 액션 타입 */
export type AuditAction =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'login'
  | 'logout'
  | 'grant'
  | 'revoke'
  | 'cancel'
  | 'refund';

// ============================================================================
// Event Types
// ============================================================================

/** 이벤트 타입 (resource.action 형식) */
export type EventType =
  // User Events
  | 'user.login'
  | 'user.logout'
  | 'user.created'
  | 'user.updated'
  | 'user.deleted'
  | 'user.password_reset'
  | 'user.email_verified'
  // Subscription Events
  | 'subscription.created'
  | 'subscription.updated'
  | 'subscription.cancelled'
  | 'subscription.renewed'
  | 'subscription.expired'
  // Payment Events
  | 'payment.succeeded'
  | 'payment.failed'
  | 'payment.refunded'
  // Team Events
  | 'team.created'
  | 'team.updated'
  | 'team.deleted'
  | 'team.member_added'
  | 'team.member_removed'
  | 'team.member_role_changed'
  // Permission Events
  | 'permission.granted'
  | 'permission.revoked'
  // Session Events
  | 'session.created'
  | 'session.revoked'
  | 'session.expired'
  // Service Events
  | 'service.created'
  | 'service.updated'
  | 'service.deleted'
  | 'service.published'
  | 'service.unpublished'
  // Order Events
  | 'order.created'
  | 'order.updated'
  | 'order.cancelled'
  | 'order.refunded'
  // Security Events
  | 'security.2fa_enabled'
  | 'security.2fa_disabled'
  | 'security.suspicious_login'
  | 'security.account_locked';

// ============================================================================
// Resource Types
// ============================================================================

/** 리소스 타입 */
export type ResourceType =
  | 'user'
  | 'subscription'
  | 'payment'
  | 'team'
  | 'permission'
  | 'session'
  | 'service'
  | 'order'
  | 'blog'
  | 'notice'
  | 'cart'
  | 'security';

// ============================================================================
// Core Interfaces
// ============================================================================

/** 변경 내역 (이전 값 → 새 값) */
export interface ChangeRecord {
  old: unknown;
  new: unknown;
}

/** 감사 로그 변경사항 맵 */
export type AuditChanges = Record<string, ChangeRecord>;

/** 감사 로그 메타데이터 */
export type AuditMetadata = Record<string, unknown>;

/** 기본 감사 로그 엔트리 */
export interface AuditLogEntry {
  id: string;
  event_type: EventType | string; // string도 허용 (확장성)
  action: AuditAction;
  actor_id: string | null;
  actor_type: ActorType;
  resource_type: ResourceType | null;
  resource_id: string | null;
  changes: AuditChanges | null;
  metadata: AuditMetadata | null;
  ip_address: string | null;
  user_agent: string | null;
  session_id: string | null;
  created_at: string;
}

/** 사용자 정보가 포함된 감사 로그 */
export interface AuditLogWithUser extends AuditLogEntry {
  actor?: {
    id: string;
    email?: string;
    full_name?: string;
  };
}

// ============================================================================
// Filter & Query Types
// ============================================================================

/** 감사 로그 필터 */
export interface AuditLogFilters {
  /** 액터(행위자) ID */
  actor_id?: string;
  /** 액터 타입 */
  actor_type?: ActorType;
  /** 이벤트 타입 */
  event_type?: EventType | string;
  /** 액션 */
  action?: AuditAction;
  /** 리소스 타입 */
  resource_type?: ResourceType;
  /** 리소스 ID */
  resource_id?: string;
  /** 시작 날짜 (ISO 문자열) */
  start_date?: string;
  /** 종료 날짜 (ISO 문자열) */
  end_date?: string;
  /** 세션 ID */
  session_id?: string;
  /** IP 주소 */
  ip_address?: string;
}

/** 페이지네이션 옵션 */
export interface AuditLogPagination {
  /** 페이지 번호 (0부터 시작) */
  page: number;
  /** 페이지당 항목 수 */
  pageSize: number;
  /** 전체 항목 수 */
  total?: number;
}

// ============================================================================
// Statistics & Analytics Types
// ============================================================================

/** 감사 로그 통계 */
export interface AuditStatistics {
  event_type: string;
  action: string;
  event_count: number;
  unique_actors: number;
  last_occurrence: string;
}

/** 이벤트별 집계 데이터 */
export interface EventAggregation {
  event_type: string;
  count: number;
  percentage: number;
}

/** 시간대별 이벤트 데이터 */
export interface TimeSeriesData {
  timestamp: string;
  count: number;
  event_type?: string;
}

// ============================================================================
// Audit Context Types
// ============================================================================

/** HTTP 요청에서 추출한 감사 컨텍스트 */
export interface AuditContext {
  ip_address?: string;
  user_agent?: string;
  session_id?: string;
  actor_id?: string;
}

/** 감사 로그 생성을 위한 입력 데이터 */
export interface CreateAuditLogInput {
  event_type: EventType | string;
  action: AuditAction;
  actor_id?: string;
  actor_type?: ActorType;
  resource_type?: ResourceType;
  resource_id?: string;
  changes?: AuditChanges;
  metadata?: AuditMetadata;
  context?: AuditContext;
}

// ============================================================================
// Display & UI Types
// ============================================================================

/** 이벤트 타입별 표시 설정 */
export interface EventTypeConfig {
  label: string;
  icon: string;
  color: string;
  description: string;
}

/** 액션별 표시 설정 */
export interface ActionConfig {
  label: string;
  variant: 'default' | 'destructive' | 'success' | 'warning' | 'info';
  icon: string;
}

/** 감사 로그 표시 옵션 */
export interface AuditLogDisplayOptions {
  showChanges: boolean;
  showMetadata: boolean;
  showUserAgent: boolean;
  showIpAddress: boolean;
  compactMode: boolean;
}

// ============================================================================
// Export Hook Types
// ============================================================================

/** 감사 로그 내보내기 포맷 */
export type ExportFormat = 'json' | 'csv' | 'xlsx' | 'pdf';

/** 감사 로그 내보내기 옵션 */
export interface AuditLogExportOptions {
  format: ExportFormat;
  filters?: AuditLogFilters;
  includeMetadata?: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
}

// ============================================================================
// Validation Types
// ============================================================================

/** 감사 로그 검증 결과 */
export interface AuditLogValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}
